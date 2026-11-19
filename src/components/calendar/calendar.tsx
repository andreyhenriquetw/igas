"use client";

import { ptBR } from "date-fns/locale";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  CircleX,
  Clock3,
  Download,
  FileCheck2,
  List,
  Pencil,
  Plus,
  Save,
  ShieldAlert,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type TouchEvent,
} from "react";
import { TIME_ZONE, formatLocalDateTime, localDayBoundaryToUtc } from "@/lib/time";
import { buildContractText, downloadContractPdf } from "@/lib/contract";
import { changeKey, getWeekStart, monthBounds } from "@/lib/calendar-dates";
import { getPaymentStatus, hasPaidAtLeastHalf } from "@/lib/payment";
import type {
  CalendarEntryDto,
  EntryStatus,
  ReservationModeDto,
} from "@/types/calendar";

type Props = {
  initialEntries: CalendarEntryDto[];
  modes: ReservationModeDto[];
};

type ViewMode = "month" | "week" | "list";
type StatusFilter = "ALL" | EntryStatus;
type Draft = {
  kind: "BOOKING" | "BLOCK";
  guestName: string;
  guestContact: string;
  guestCpf: string;
  guestAddress: string;
  modeId: string;
  startsAt: string;
  endsAt: string;
  totalAmount: string;
  paidAmount: string;
  status: "PENDING" | "CONFIRMED";
  notes: string;
};

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function dayKey(date: Date) {
  return formatInTimeZone(date, TIME_ZONE, "yyyy-MM-dd");
}

function keyDate(key: string) {
  return new Date(`${key}T12:00:00.000Z`);
}

function formatCpf(value: string) {
  return value
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function changeMonth(key: string, months: number) {
  const date = new Date(`${key.slice(0, 7)}-01T12:00:00.000Z`);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}

function newDraft(
  modes: ReservationModeDto[],
  day: string,
  kind: "BOOKING" | "BLOCK" = "BOOKING",
): Draft {
  const mode = modes.find((item) => item.active);
  const startTime = mode?.defaultStart ?? "08:00";
  const startsAt = fromZonedTime(`${day}T${startTime}`, TIME_ZONE);
  const endsAt = new Date(startsAt.getTime() + (mode?.durationMinutes ?? 720) * 60_000);
  return {
    kind,
    guestName: "",
    guestContact: "",
    guestCpf: "",
    guestAddress: "",
    modeId: mode?.id ?? "",
    startsAt: formatLocalDateTime(startsAt, "yyyy-MM-dd'T'HH:mm"),
    endsAt: formatLocalDateTime(endsAt, "yyyy-MM-dd'T'HH:mm"),
    totalAmount: "",
    paidAmount: "0",
    status: "PENDING",
    notes: "",
  };
}

function paymentLabel(total: number, paid: number) {
  const status = getPaymentStatus(total, paid);
  if (status === "PAID") return "Pago integral";
  if (status === "HALF_PAID") return "50% ou mais";
  if (status === "PARTIAL") return "Pagamento parcial";
  return "Não pago";
}

function statusLabel(status: EntryStatus) {
  return {
    CONFIRMED: "Confirmada",
    PENDING: "Pendente",
    CANCELLED: "Cancelada",
    BLOCKED: "Bloqueada",
  }[status];
}

function EntryBadges({ entry }: { entry: CalendarEntryDto }) {
  if (entry.kind === "BLOCK") {
    return <span className="badge badge-blocked">Bloqueio</span>;
  }
  const total = entry.totalAmount ?? 0;
  const paid = entry.paidAmount ?? 0;
  return (
    <div className="entry-badges">
      <span className={`badge badge-${entry.status.toLowerCase()}`}>{statusLabel(entry.status)}</span>
      <span className={`badge ${hasPaidAtLeastHalf(total, paid) ? "badge-paid" : "badge-unpaid"}`}>
        {paymentLabel(total, paid)}
      </span>
      <span className={`badge ${entry.contractStatus === "GENERATED" ? "badge-contract-ready" : "badge-contract-pending"}`}>
        Contrato {entry.contractStatus === "GENERATED" ? "gerado" : "pendente"}
      </span>
    </div>
  );
}

export function Calendar({ initialEntries, modes }: Props) {
  const today = dayKey(new Date());
  const [anchor, setAnchor] = useState(today);
  const initialBounds = monthBounds(today);
  const [periodStart, setPeriodStart] = useState(initialBounds.first);
  const [periodEnd, setPeriodEnd] = useState(initialBounds.last);
  const [entries, setEntries] = useState(initialEntries);
  const [view, setView] = useState<ViewMode>("month");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [modal, setModal] = useState<"details" | "form" | "contract" | null>(null);
  const [selected, setSelected] = useState<CalendarEntryDto | null>(null);
  const [draft, setDraft] = useState<Draft>(() => newDraft(modes, today));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [syncError, setSyncError] = useState("");
  const [loading, setLoading] = useState(false);
  const [contractBusy, setContractBusy] = useState(false);
  const [contractDraft, setContractDraft] = useState("");
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<-1 | 0 | 1>(0);

  const refresh = useCallback(async () => {
    if (!periodStart || !periodEnd || periodStart > periodEnd) return;
    const response = await fetch(
      `/api/entries?from=${encodeURIComponent(periodStart)}&to=${encodeURIComponent(changeKey(periodEnd, 1))}`,
      { cache: "no-store" },
    );
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Não foi possível atualizar a agenda.");
    setEntries(result.entries as CalendarEntryDto[]);
    setSyncError("");
  }, [periodEnd, periodStart]);

  useEffect(() => {
    let active = true;
    const update = async () => {
      try {
        await refresh();
      } catch (refreshError) {
        if (active) setSyncError(refreshError instanceof Error ? refreshError.message : "Falha na sincronização.");
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") void update();
    };
    void update();
    const interval = window.setInterval(update, 6000);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refresh]);

  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(() => setMessage(""), 4000);
    return () => window.clearTimeout(timeout);
  }, [message]);

  const filtered = useMemo(
    () => entries.filter((entry) => statusFilter === "ALL" || entry.status === statusFilter),
    [entries, statusFilter],
  );
  const sortedEntries = useMemo(
    () => [...filtered].sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    [filtered],
  );

  function setPeriodToMonth(monthAnchor: string) {
    const bounds = monthBounds(monthAnchor);
    setPeriodStart(bounds.first);
    setPeriodEnd(bounds.last);
  }

  function navigate(direction: -1 | 1) {
    if (view === "month") {
      const nextAnchor = changeMonth(anchor, direction);
      setAnchor(nextAnchor);
      setPeriodToMonth(nextAnchor);
      return;
    }

    const weekStart = getWeekStart(anchor);
    const nextStart = changeKey(weekStart, direction * 7);
    const nextAnchor = changeKey(nextStart, 2);
    setAnchor(nextAnchor);
    setPeriodStart(nextStart);
    setPeriodEnd(changeKey(nextStart, 6));
  }

  function goToday() {
    setAnchor(today);
    if (view === "month") {
      setPeriodToMonth(today);
    } else {
      const start = getWeekStart(today);
      setPeriodStart(start);
      setPeriodEnd(changeKey(start, 6));
    }
  }

  function handleTouchStart(event: TouchEvent<HTMLElement>) {
    const touch = event.changedTouches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
    setIsSwiping(false);
    setSwipeDirection(0);
  }

  function handleTouchMove(event: TouchEvent<HTMLElement>) {
    if (!touchStart.current) return;

    const touch = event.changedTouches[0];
    const distanceX = touch.clientX - touchStart.current.x;
    const distanceY = touch.clientY - touchStart.current.y;
    if (Math.abs(distanceX) <= Math.abs(distanceY) * 1.25) return;

    event.preventDefault();
    setIsSwiping(true);
    setSwipeDirection(distanceX < 0 ? 1 : -1);
    setSwipeOffset(distanceX);
  }

  function handleTouchEnd(event: TouchEvent<HTMLElement>) {
    if (!touchStart.current) return;

    const touch = event.changedTouches[0];
    const distanceX = touch.clientX - touchStart.current.x;
    const distanceY = touch.clientY - touchStart.current.y;
    touchStart.current = null;

    setIsSwiping(false);
    if (Math.abs(distanceX) < 48 || Math.abs(distanceX) <= Math.abs(distanceY) * 1.25) {
      setSwipeOffset(0);
      setSwipeDirection(0);
      return;
    }

    const direction = distanceX < 0 ? 1 : -1;
    const panelWidth = event.currentTarget.getBoundingClientRect().width;
    setSwipeOffset(direction * -panelWidth);
    window.setTimeout(() => {
      navigate(direction);
      setSwipeOffset(0);
      setSwipeDirection(0);
    }, 180);
  }

  function openNew(day = today, kind: "BOOKING" | "BLOCK" = "BOOKING") {
    setEditingId(null);
    setSelected(null);
    setDraft(newDraft(modes, day, kind));
    setError("");
    setModal("form");
  }

  function openDetails(entry: CalendarEntryDto) {
    setSelected(entry);
    setModal("details");
    setError("");
  }

  function openEdit(entry: CalendarEntryDto) {
    setSelected(entry);
    setEditingId(entry.id);
    setDraft({
      kind: entry.kind,
      guestName: entry.guestName ?? "",
      guestContact: entry.guestContact ?? "",
      guestCpf: entry.guestCpf ?? "",
      guestAddress: entry.guestAddress ?? "",
      modeId: entry.modeId ?? "",
      startsAt: formatLocalDateTime(entry.startsAt, "yyyy-MM-dd'T'HH:mm"),
      endsAt: formatLocalDateTime(entry.endsAt, "yyyy-MM-dd'T'HH:mm"),
      totalAmount: entry.totalAmount?.toFixed(2) ?? "",
      paidAmount: entry.paidAmount?.toFixed(2) ?? "0",
      status: entry.status === "CONFIRMED" ? "CONFIRMED" : "PENDING",
      notes: entry.notes ?? "",
    });
    setError("");
    setModal("form");
  }

  function changeMode(modeId: string) {
    const mode = modes.find((item) => item.id === modeId);
    const day = draft.startsAt.slice(0, 10) || today;
    const next = newDraft(mode ? [mode] : modes, day, "BOOKING");
    setDraft((current) => ({
      ...current,
      modeId,
      startsAt: next.startsAt,
      endsAt: next.endsAt,
    }));
  }

  async function saveEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const payload =
      draft.kind === "BOOKING"
        ? {
            ...draft,
            totalAmount: Number(draft.totalAmount),
            paidAmount: Number(draft.paidAmount),
          }
        : {
            kind: "BLOCK",
            startsAt: draft.startsAt,
            endsAt: draft.endsAt,
            notes: draft.notes,
          };
    try {
      const response = await fetch(editingId ? `/api/entries/${editingId}` : "/api/entries", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Não foi possível salvar.");
      setModal(null);
      setSelected(result.entry as CalendarEntryDto);
      setMessage(editingId ? "Alterações salvas." : "Entrada adicionada à agenda.");
      await refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Não foi possível salvar.");
    } finally {
      setLoading(false);
    }
  }

  async function updateEntry(patch: { status?: EntryStatus }) {
    if (!selected) return;
    setError("");
    setLoading(true);
    try {
      const response = await fetch(`/api/entries/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Não foi possível atualizar.");
      setSelected(result.entry as CalendarEntryDto);
      setEntries((current) => current.map((entry) => entry.id === selected.id ? result.entry : entry));
      setMessage("Situação atualizada.");
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Não foi possível atualizar.");
    } finally {
      setLoading(false);
    }
  }

  async function openContractEditor(entry: CalendarEntryDto) {
    setContractBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/entries/${entry.id}/contract`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Não foi possível carregar o contrato.");
      setContractDraft(result.contractText ?? buildContractText(entry));
      setSelected(entry);
      setModal("contract");
    } catch (contractError) {
      setError(contractError instanceof Error ? contractError.message : "Não foi possível carregar o contrato.");
    } finally {
      setContractBusy(false);
    }
  }

  async function persistContract(entry: CalendarEntryDto, contractText: string) {
    const response = await fetch(`/api/entries/${entry.id}/contract`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contractText }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Não foi possível salvar o contrato.");
    return result.entry as CalendarEntryDto;
  }

  async function saveContract(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setContractBusy(true);
    setError("");
    try {
      const entry = await persistContract(selected, contractDraft);
      setSelected(entry);
      setEntries((current) => current.map((item) => item.id === entry.id ? entry : item));
      setModal("details");
      setMessage("Contrato salvo.");
    } catch (contractError) {
      setError(contractError instanceof Error ? contractError.message : "Não foi possível salvar o contrato.");
    } finally {
      setContractBusy(false);
    }
  }

  async function downloadContract(entry: CalendarEntryDto) {
    setContractBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/entries/${entry.id}/contract`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Não foi possível carregar o contrato.");
      const contractText = result.contractText ?? buildContractText(entry);
      const updatedEntry = result.contractText ? entry : await persistContract(entry, contractText);
      downloadContractPdf(contractText, entry.guestName ?? "reserva");
      setSelected(updatedEntry);
      setEntries((current) => current.map((item) => item.id === updatedEntry.id ? updatedEntry : item));
      setMessage("Contrato baixado em PDF.");
    } catch (contractError) {
      setError(contractError instanceof Error ? contractError.message : "Não foi possível baixar o contrato.");
    } finally {
      setContractBusy(false);
    }
  }

  const monthDate = keyDate(anchor);
  const monthBoundsForGrid = monthBounds(anchor);
  const weekStart = getWeekStart(anchor);
  const validPeriod = Boolean(periodStart && periodEnd && periodStart <= periodEnd);
  const calendarDays = view === "month"
    ? Array.from({ length: 42 }, (_, index) => changeKey(monthBoundsForGrid.gridStart, index))
    : Array.from({ length: 7 }, (_, index) => changeKey(weekStart, index));
  const swipeAnchor = swipeDirection === 0 ? anchor : changeMonth(anchor, swipeDirection);
  const swipeBounds = monthBounds(swipeAnchor);
  const swipeDays = view === "month"
    ? Array.from({ length: 42 }, (_, index) => changeKey(swipeBounds.gridStart, index))
    : Array.from({ length: 7 }, (_, index) => changeKey(getWeekStart(swipeAnchor), index));
  const heading = view === "month"
    ? formatInTimeZone(monthDate, TIME_ZONE, "MMMM 'de' yyyy", { locale: ptBR })
    : view === "week"
      ? `${formatInTimeZone(keyDate(weekStart), TIME_ZONE, "d 'de' MMM", { locale: ptBR })} – ${formatInTimeZone(keyDate(changeKey(weekStart, 6)), TIME_ZONE, "d 'de' MMM", { locale: ptBR })}`
      : validPeriod
        ? `${formatInTimeZone(keyDate(periodStart), TIME_ZONE, "d 'de' MMM", { locale: ptBR })} – ${formatInTimeZone(keyDate(periodEnd), TIME_ZONE, "d 'de' MMM", { locale: ptBR })}`
        : "Selecione um período";
  const activeBookings = filtered.filter((entry) => entry.kind === "BOOKING" && entry.status !== "CANCELLED");
  const pendingCount = activeBookings.filter((entry) => entry.status === "PENDING").length;
  const blockCount = filtered.filter((entry) => entry.kind === "BLOCK").length;

  function entriesForDay(day: string) {
    const start = localDayBoundaryToUtc(day);
    const end = localDayBoundaryToUtc(changeKey(day, 1));
    return filtered.filter((entry) => new Date(entry.startsAt) < end && new Date(entry.endsAt) > start);
  }

  function dayCell(day: string, monthAnchor = anchor) {
    const items = entriesForDay(day);
    const inMonth = day.slice(0, 7) === monthAnchor.slice(0, 7);
    const dayStart = localDayBoundaryToUtc(day);
    const dayEnd = localDayBoundaryToUtc(changeKey(day, 1));
    const occupied = entries.some((entry) => (
      entry.status !== "CANCELLED"
      && new Date(entry.startsAt) < dayEnd
      && new Date(entry.endsAt) > dayStart
    ));
    const availabilityVisible = day >= periodStart && day <= periodEnd && (view === "week" || inMonth);
    return (
      <div
        className={`day-cell ${inMonth ? "" : "outside-month"} ${day === today ? "today" : ""} ${occupied ? "occupied" : ""}`}
        key={day}
        onClick={(event) => {
          if (event.target instanceof Element && event.target.closest("button")) return;
          openNew(day);
        }}
      >
        <div className="day-heading">
          <button className="day-number" type="button" onClick={() => openNew(day)} aria-label={`Criar reserva em ${day}`}>
            {formatInTimeZone(keyDate(day), TIME_ZONE, "d")}
          </button>
          {availabilityVisible && (
            <span
              className={`day-status ${occupied ? "occupied" : "available"}`}
              title={occupied ? "Dia agendado ou bloqueado" : "Dia livre"}
              aria-label={occupied ? "Dia agendado ou bloqueado" : "Dia livre"}
            >
              {occupied ? <CircleX size={14} /> : <CheckCircle2 size={14} />}
            </span>
          )}
        </div>
        <div className="day-items">
          {items.slice(0, view === "month" ? 3 : 8).map((entry) => (
            <button
              className={`calendar-entry entry-${entry.status.toLowerCase()}`}
              key={entry.id}
              type="button"
              onClick={() => openDetails(entry)}
              title={`${entry.guestName ?? "Bloqueio"} · ${formatLocalDateTime(entry.startsAt, "HH:mm")}`}
            >
              <span className="entry-dot" />
              <span className="entry-time">{formatLocalDateTime(entry.startsAt, "HH:mm")}</span>
              <span className="entry-name">{entry.kind === "BLOCK" ? "Bloqueio" : entry.guestName}</span>
              {entry.kind === "BOOKING" && entry.status === "CONFIRMED" && entry.guestName?.trim() && (
                <span className="entry-mobile-name">{entry.guestName.trim().split(/\s+/)[0]}</span>
              )}
              {entry.kind === "BOOKING" && hasPaidAtLeastHalf(entry.totalAmount ?? 0, entry.paidAmount ?? 0) && (
                <Check size={11} className="entry-paid-icon" aria-label="Pagou pelo menos 50%" />
              )}
              {entry.kind === "BOOKING" && entry.contractStatus === "GENERATED" && (
                <FileCheck2 size={11} aria-label="Contrato gerado" />
              )}
            </button>
          ))}
          {items.length > (view === "month" ? 3 : 8) && (
            <span className="more-events">+{items.length - (view === "month" ? 3 : 8)} mais</span>
          )}
        </div>
        <button className="add-day-entry" type="button" onClick={() => openNew(day)} aria-label={`Adicionar reserva em ${day}`}>
          <Plus size={14} />
        </button>
      </div>
    );
  }

  const visibleList = sortedEntries.filter((entry) => {
    const last = changeKey(periodEnd, 1);
    return new Date(entry.startsAt) < localDayBoundaryToUtc(last)
      && new Date(entry.endsAt) > localDayBoundaryToUtc(periodStart);
  });

  return (
    <main className="app-main">
      {message && <div className="toast success-toast" role="status"><CheckCircle2 size={17} />{message}</div>}
      {syncError && <div className="sync-warning" role="alert"><AlertCircle size={17} />{syncError}<button type="button" onClick={() => void refresh()}>Tentar novamente</button></div>}

      <section className="stats-row" aria-label="Resumo do período">
        <div className="stat-card"><span>Reservas ativas</span><strong>{activeBookings.length}</strong><CalendarDays size={18} /></div>
        <div className="stat-card"><span>Pendentes</span><strong>{pendingCount}</strong><Clock3 size={18} /></div>
        <div className="stat-card"><span>Datas bloqueadas</span><strong>{blockCount}</strong><ShieldAlert size={18} /></div>
      </section>

      <section
        className="calendar-panel"
      >
        <div className="calendar-toolbar">
          <div className="period-heading">
            <div className="period-controls">
              <button className="icon-button" type="button" onClick={() => navigate(-1)} aria-label="Período anterior"><ArrowLeft size={18} /></button>
              <button className="icon-button" type="button" onClick={() => navigate(1)} aria-label="Próximo período"><ArrowRight size={18} /></button>
              <button className="button button-today" type="button" onClick={goToday}>Hoje</button>
            </div>
            <h2>{heading}</h2>
          </div>
          <div className="view-switch" role="tablist" aria-label="Visualização da agenda">
            {([
              ["month", "Mês", CalendarDays],
              ["week", "Semana", Clock3],
              ["list", "Lista", List],
            ] as const).map(([key, label, Icon]) => (
              <button
                className={view === key ? "view-option selected" : "view-option"}
                key={key}
                type="button"
                role="tab"
                aria-selected={view === key}
                onClick={() => setView(key)}
              >
                <Icon size={15} /><span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="filters-row">
          <label className="filter-field">
            <span>De</span>
            <input aria-label="Início do período" type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} />
          </label>
          <label className="filter-field">
            <span>Até</span>
            <input aria-label="Fim do período" type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} />
          </label>
          <label className="filter-field status-filter">
            <span>Situação</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}>
              <option value="ALL">Todas</option>
              <option value="CONFIRMED">Confirmadas</option>
              <option value="PENDING">Pendentes</option>
              <option value="BLOCKED">Bloqueios</option>
              <option value="CANCELLED">Canceladas</option>
            </select>
          </label>
          {!validPeriod && <span className="filter-error">A data final deve ser igual ou posterior à inicial.</span>}
        </div>

        <div className="calendar-legend">
          <span><i className="legend-dot confirmed" /> Confirmada</span>
          <span><i className="legend-dot pending" /> Pendente</span>
          <span><i className="legend-dot blocked" /> Bloqueada</span>
          <span><CheckCircle2 className="availability-icon available" size={15} /> Dia livre</span>
          <span><CircleX className="availability-icon occupied" size={15} /> Agendado ou bloqueado</span>
        </div>

        {view === "list" ? (
          <div className="entry-list">
            {visibleList.length === 0 ? (
              <div className="empty-state"><CalendarDays size={28} /><strong>Nenhuma entrada neste período</strong><span>Experimente ajustar os filtros ou criar uma reserva.</span></div>
            ) : visibleList.map((entry) => (
              <button className={`list-entry list-${entry.status.toLowerCase()}`} key={entry.id} type="button" onClick={() => openDetails(entry)}>
                <span className="list-date">
                  <strong>{formatLocalDateTime(entry.startsAt, "dd")}</strong>
                  <small>{formatLocalDateTime(entry.startsAt, "MMM").replace(".", "")}</small>
                </span>
                <span className="list-entry-main">
                  <strong>{entry.kind === "BLOCK" ? "Data bloqueada" : entry.guestName}</strong>
                  <small>{formatLocalDateTime(entry.startsAt, "EEE, dd/MM · HH:mm")} – {formatLocalDateTime(entry.endsAt, "dd/MM · HH:mm")}</small>
                  {entry.kind === "BOOKING" && <small className="mode-line">{entry.mode?.name} · {paymentLabel(entry.totalAmount ?? 0, entry.paidAmount ?? 0)}</small>}
                </span>
                <span className="list-entry-badges"><EntryBadges entry={entry} /></span>
                <ArrowRight size={17} className="list-arrow" />
              </button>
            ))}
          </div>
        ) : (
          <div
            className={`calendar-grid ${view === "week" ? "week-grid" : ""} ${isSwiping ? "is-swiping" : ""}`}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {swipeDirection !== 0 && (
              <div
                className={`calendar-swipe-page calendar-swipe-next`}
                style={{ transform: `translateX(${swipeDirection > 0 ? "100%" : "-100%"}) translateX(${swipeOffset}px)` }}
                aria-hidden="true"
              >
                <div className="weekday-row">
                  {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((weekday) => <span key={weekday}>{weekday}</span>)}
                </div>
                <div className={view === "week" ? "days-grid week-days" : "days-grid"}>
                  {swipeDays.map((day) => dayCell(day, swipeAnchor))}
                </div>
              </div>
            )}
            <div
              className="calendar-swipe-page"
              style={{ transform: `translateX(${swipeOffset}px)` }}
            >
              <div className="weekday-row">
                {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((weekday) => <span key={weekday}>{weekday}</span>)}
              </div>
              <div className={view === "week" ? "days-grid week-days" : "days-grid"}>
                {calendarDays.map((day) => dayCell(day))}
              </div>
            </div>
          </div>
        )}
      </section>

      {modal && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(null); }}>
          {modal === "details" && selected ? (
            <section className="modal-card detail-modal" role="dialog" aria-modal="true" aria-labelledby="detail-title">
              <div className="modal-heading">
                <div>
                  <p className="eyebrow">{selected.kind === "BLOCK" ? "BLOQUEIO DE AGENDA" : "DETALHES DA RESERVA"}</p>
                  <h2 id="detail-title">{selected.kind === "BLOCK" ? "Data bloqueada" : selected.guestName}</h2>
                </div>
                <button className="icon-button" type="button" onClick={() => setModal(null)} aria-label="Fechar"><X size={20} /></button>
              </div>
              <div className="detail-datetime">
                <CalendarDays size={18} />
                <span>{formatLocalDateTime(selected.startsAt, "EEEE, dd 'de' MMMM 'de' yyyy")}</span>
                <strong>{formatLocalDateTime(selected.startsAt, "HH:mm")} – {formatLocalDateTime(selected.endsAt, "dd/MM 'às' HH:mm")}</strong>
              </div>
              <EntryBadges entry={selected} />
              {selected.kind === "BOOKING" && (
                <div className="detail-grid">
                  <div><small>Modalidade</small><strong>{selected.mode?.name ?? "—"}</strong></div>
                  <div><small>Contato</small><strong>{selected.guestContact || "Não informado"}</strong></div>
                  <div><small>CPF</small><strong>{selected.guestCpf || "Não informado"}</strong></div>
                  <div className="detail-full"><small>Endereço</small><strong>{selected.guestAddress || "Não informado"}</strong></div>
                  <div><small>Valor total</small><strong>{money.format(selected.totalAmount ?? 0)}</strong></div>
                  <div><small>Valor pago</small><strong>{money.format(selected.paidAmount ?? 0)}</strong></div>
                  <div><small>Saldo restante</small><strong>{money.format((selected.totalAmount ?? 0) - (selected.paidAmount ?? 0))}</strong></div>
                  <div><small>Pagou pelo menos 50%?</small><strong>{hasPaidAtLeastHalf(selected.totalAmount ?? 0, selected.paidAmount ?? 0) ? "Sim" : "Ainda não"}</strong></div>
                </div>
              )}
              {selected.notes && <div className="notes-box"><small>Observações</small><p>{selected.notes}</p></div>}
              {error && <p className="form-error" role="alert">{error}</p>}
              <div className="modal-actions detail-actions">
                {selected.kind === "BOOKING" && selected.status !== "CANCELLED" && (
                  <button className="button button-secondary" type="button" disabled={loading} onClick={() => openEdit(selected)}>Editar reserva</button>
                )}
                {selected.kind === "BLOCK" && selected.status !== "CANCELLED" && (
                  <button className="button button-secondary" type="button" disabled={loading} onClick={() => openEdit(selected)}>Editar bloqueio</button>
                )}
                {selected.kind === "BOOKING" && (
                  <>
                    <button className="button button-secondary" type="button" disabled={contractBusy || loading} onClick={() => void openContractEditor(selected)}>
                      <Pencil size={16} /> Editar contrato
                    </button>
                    <button className="button button-primary" type="button" disabled={contractBusy || loading} onClick={() => void downloadContract(selected)}>
                      <Download size={16} /> {contractBusy ? "Preparando…" : "Baixar contrato PDF"}
                    </button>
                  </>
                )}
                {selected.status !== "CANCELLED" && (
                  <button
                    className="button button-danger"
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      if (window.confirm(selected.kind === "BLOCK" ? "Liberar este horário?" : "Cancelar esta reserva?")) {
                        void updateEntry({ status: "CANCELLED" });
                      }
                    }}
                  >
                    {selected.kind === "BLOCK" ? "Liberar horário" : "Cancelar reserva"}
                  </button>
                )}
                {selected.kind === "BOOKING" && selected.status === "PENDING" && (
                  <button className="button button-primary" type="button" disabled={loading} onClick={() => void updateEntry({ status: "CONFIRMED" })}>
                    <CheckCircle2 size={16} /> Confirmar reserva
                  </button>
                )}
              </div>
            </section>
          ) : modal === "contract" && selected ? (
            <section className="modal-card contract-modal" role="dialog" aria-modal="true" aria-labelledby="contract-title">
              <div className="modal-heading">
                <div>
                  <p className="eyebrow">CONTRATO DA RESERVA</p>
                  <h2 id="contract-title">Editar contrato</h2>
                </div>
                <button className="icon-button" type="button" onClick={() => { setError(""); setModal("details"); }} aria-label="Voltar aos detalhes"><X size={20} /></button>
              </div>
              <p className="muted contract-help">
                Revise os dados e complete as condições específicas do estabelecimento. O texto salvo será usado no PDF desta reserva.
              </p>
              <form className="form-stack modal-form" onSubmit={saveContract}>
                <label className="field">
                  <span>Texto do contrato</span>
                  <textarea
                    className="contract-textarea"
                    autoFocus
                    value={contractDraft}
                    onChange={(event) => setContractDraft(event.target.value)}
                    maxLength={20000}
                    required
                  />
                </label>
                {error && <p className="form-error" role="alert">{error}</p>}
                <div className="modal-actions">
                  <button className="button button-secondary" type="button" disabled={contractBusy} onClick={() => { setError(""); setModal("details"); }}>Voltar</button>
                  <button className="button button-primary" type="submit" disabled={contractBusy}>
                    <Save size={16} /> {contractBusy ? "Salvando…" : "Salvar contrato"}
                  </button>
                </div>
              </form>
            </section>
          ) : (
            <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="form-title">
              <div className="modal-heading">
                <div>
                  <p className="eyebrow">{editingId ? "EDITAR AGENDA" : "ADICIONAR À AGENDA"}</p>
                  <h2 id="form-title">{draft.kind === "BLOCK" ? "Bloquear período" : editingId ? "Editar reserva" : "Nova reserva"}</h2>
                </div>
                <button className="icon-button" type="button" onClick={() => setModal(null)} aria-label="Fechar"><X size={20} /></button>
              </div>
              {!editingId && (
                <div className="entry-kind-switch">
                  <button type="button" className={draft.kind === "BOOKING" ? "selected" : ""} onClick={() => setDraft((current) => ({ ...current, kind: "BOOKING" }))}>Reserva</button>
                  <button type="button" className={draft.kind === "BLOCK" ? "selected" : ""} onClick={() => setDraft((current) => ({ ...current, kind: "BLOCK" }))}>Bloqueio</button>
                </div>
              )}
              <form className="form-stack modal-form" onSubmit={saveEntry}>
                {draft.kind === "BOOKING" && (
                  <>
                    <label className="field">
                      <span>Nome do hóspede</span>
                      <input name="guestName" value={draft.guestName} onChange={(event) => setDraft({ ...draft, guestName: event.target.value })} maxLength={120} required />
                    </label>
                    <label className="field">
                      <span>Contato <small>(telefone ou e-mail)</small></span>
                      <input name="guestContact" value={draft.guestContact} onChange={(event) => setDraft({ ...draft, guestContact: event.target.value })} maxLength={160} />
                    </label>
                    <label className="field">
                      <span>CPF <small>(opcional)</small></span>
                      <input
                        name="guestCpf"
                        inputMode="numeric"
                        value={draft.guestCpf}
                        onChange={(event) => setDraft({ ...draft, guestCpf: formatCpf(event.target.value) })}
                        maxLength={14}
                        placeholder="000.000.000-00"
                      />
                    </label>
                    <label className="field">
                      <span>Endereço <small>(opcional)</small></span>
                      <textarea
                        name="guestAddress"
                        autoComplete="street-address"
                        value={draft.guestAddress}
                        onChange={(event) => setDraft({ ...draft, guestAddress: event.target.value })}
                        maxLength={300}
                        placeholder="Rua, número, bairro, cidade e CEP"
                      />
                    </label>
                    <label className="field">
                      <span>Modalidade</span>
                      <select value={draft.modeId} onChange={(event) => changeMode(event.target.value)} required>
                        <option value="" disabled>Selecione</option>
                        {modes.filter((mode) => mode.active || mode.id === draft.modeId).map((mode) => (
                          <option key={mode.id} value={mode.id}>{mode.name} · padrão {mode.defaultStart}, {Math.floor(mode.durationMinutes / 60)}h{mode.durationMinutes % 60 ? ` ${mode.durationMinutes % 60}min` : ""}</option>
                        ))}
                      </select>
                    </label>
                  </>
                )}
                <div className="field-row">
                  <label className="field">
                    <span>Entrada</span>
                    <input type="datetime-local" value={draft.startsAt} onChange={(event) => setDraft({ ...draft, startsAt: event.target.value })} required />
                  </label>
                  <label className="field">
                    <span>Saída</span>
                    <input type="datetime-local" value={draft.endsAt} onChange={(event) => setDraft({ ...draft, endsAt: event.target.value })} required />
                  </label>
                </div>
                {draft.kind === "BOOKING" && (
                  <>
                    <div className="field-row">
                      <label className="field">
                        <span>Valor total <small>(R$)</small></span>
                        <input type="number" inputMode="decimal" min="0.01" step="0.01" value={draft.totalAmount} onChange={(event) => setDraft({ ...draft, totalAmount: event.target.value })} required />
                      </label>
                      <label className="field">
                        <span>Valor já pago <small>(R$)</small></span>
                        <input type="number" inputMode="decimal" min="0" step="0.01" value={draft.paidAmount} onChange={(event) => setDraft({ ...draft, paidAmount: event.target.value })} required />
                      </label>
                    </div>
                    {draft.totalAmount && Number(draft.totalAmount) > 0 && (
                      <p className={`payment-hint ${hasPaidAtLeastHalf(Number(draft.totalAmount), Number(draft.paidAmount || 0)) ? "paid" : ""}`}>
                        <CheckCircle2 size={15} />
                        {paymentLabel(Number(draft.totalAmount), Number(draft.paidAmount || 0))}
                      </p>
                    )}
                    <label className="field">
                      <span>Situação</span>
                      <select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as Draft["status"] })}>
                        <option value="PENDING">Pendente</option>
                        <option value="CONFIRMED">Confirmada</option>
                      </select>
                    </label>
                  </>
                )}
                <label className="field">
                  <span>Observações</span>
                  <textarea rows={3} value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} maxLength={2000} />
                </label>
                {error && <p className="form-error" role="alert">{error}</p>}
                <div className="modal-actions">
                  <button className="button button-secondary" type="button" onClick={() => setModal(null)}>Voltar</button>
                  <button className="button button-primary" type="submit" disabled={loading}>
                    {loading ? "Salvando…" : editingId ? "Salvar alterações" : draft.kind === "BLOCK" ? "Bloquear período" : "Salvar reserva"}
                  </button>
                </div>
              </form>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
