"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { changeKey, monthBounds } from "@/lib/calendar-dates";
import { getOvernightDurationMinutes } from "@/lib/overnight";
import { isDateAvailableForMode } from "@/lib/public-availability";

type Mode = {
  id: string;
  code: string;
  name: string;
  defaultStart: string;
  durationMinutes: number;
  price: number | null;
};

const NO_OCCUPIED_PERIODS: Array<{ startsAt: string; endsAt: string }> = [];
const WHATSAPP_CONTACTS = [
  { name: "Denis", phone: "5593991606969", displayPhone: "(93) 99160-6969" },
  { name: "Junior", phone: "5593991293000", displayPhone: "(93) 99129-3000" },
];

function formatCpf(value: string) {
  return value
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function endTimeForMode(mode: Mode) {
  const [hour, minute] = mode.defaultStart.split(":").map(Number);
  const endMinutes = hour * 60 + minute + mode.durationMinutes;
  return `${String(Math.floor(endMinutes / 60) % 24).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;
}

function formatDateKey(value: string) {
  return `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}`;
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function scheduleLabel(mode: Mode, date: string, durationNights = 1) {
  if (mode.code === "OVERNIGHT") {
    const [hour, minute] = mode.defaultStart.split(":").map(Number);
    const endMinutes = hour * 60 + minute + getOvernightDurationMinutes(durationNights);
    const endTimeForStay = `${String(Math.floor(endMinutes / 60) % 24).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;
    if (!date) return `Entrada às ${mode.defaultStart} · saída às ${endTimeForStay} após ${durationNights} ${durationNights === 1 ? "noite" : "noites"}`;
    return `${mode.defaultStart} de ${formatDateKey(date)} – ${endTimeForStay} de ${formatDateKey(addDays(date, durationNights))}`;
  }
  const endTime = endTimeForMode(mode);
  if (mode.durationMinutes < 1440) return `${mode.defaultStart} – ${endTime}`;
  if (!date) return `${mode.defaultStart} – ${endTime} do dia seguinte`;
  return `${mode.defaultStart} de ${formatDateKey(date)} – ${endTime} de ${formatDateKey(addDays(date, 1))}`;
}

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function modePrice(mode: Mode, durationDays = 1) {
  if (mode.code === "OVERNIGHT") {
    return money.format(750 * durationDays);
  }
  return mode.price !== null
    ? money.format(mode.price)
    : mode.durationMinutes >= 1440 ? "R$ 1.500" : "R$ 800";
}

function modeOptionLabel(mode: Mode) {
  return mode.code === "OVERNIGHT"
    ? mode.name
    : `${mode.name} — ${modePrice(mode)}`;
}

export function PublicBooking() {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" })
    .format(new Date())
    .replaceAll("/", "-");
  const heroBackgroundRef = useRef<HTMLDivElement>(null);
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const [modes, setModes] = useState<Mode[]>([]);
  const [modeId, setModeId] = useState("");
  const [date, setDate] = useState("");
  const [durationDays, setDurationDays] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(`${today.slice(0, 7)}-01`);
  const [menuOpen, setMenuOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [whatsappMessage, setWhatsappMessage] = useState("");
  const [availability, setAvailability] = useState<{
    period: string;
    occupied: Array<{ startsAt: string; endsAt: string }>;
    error: string;
  }>({ period: "", occupied: [], error: "" });
  const [guestName, setGuestName] = useState("");
  const [guestContact, setGuestContact] = useState("");
  const [guestCpf, setGuestCpf] = useState("");
  const [guestAddress, setGuestAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [rating, setRating] = useState(0);
  const [reviewName, setReviewName] = useState("");
  const [reviewContact, setReviewContact] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [reviewType, setReviewType] = useState("Lazer");

  useEffect(() => {
    document.documentElement.dataset.theme = "dark";
  }, []);

  useEffect(() => {
    const video = heroVideoRef.current;
    if (!video) return;

    const mobileViewport = window.matchMedia("(max-width: 768px)");
    let observer: IntersectionObserver | null = null;
    let isVisible = false;

    const syncPlayback = (isVisible: boolean) => {
      if (mobileViewport.matches && isVisible) {
        void video.play().catch(() => {});
      } else {
        video.pause();
      }
    };

    observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
        syncPlayback(isVisible);
      },
      { threshold: 0 },
    );
    observer.observe(video);

    const syncViewport = () => syncPlayback(isVisible);
    mobileViewport.addEventListener("change", syncViewport);

    return () => {
      observer?.disconnect();
      mobileViewport.removeEventListener("change", syncViewport);
      video.pause();
    };
  }, []);

  useEffect(() => {
    const heroBackground = heroBackgroundRef.current;
    if (!heroBackground) return;

    let frame = 0;
    const updatePosition = () => {
      frame = 0;
      heroBackground.style.transform = `scale(1.06) translateY(${window.scrollY * 0.2}px)`;
    };
    const onScroll = () => {
      if (frame === 0) frame = window.requestAnimationFrame(updatePosition);
    };

    updatePosition();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame !== 0) window.cancelAnimationFrame(frame);
    };
  }, []);

  const calendarBounds = monthBounds(calendarMonth);
  const calendarEnd = changeKey(calendarBounds.gridStart, calendarBounds.gridDays);
  const availabilityPeriod = `${calendarBounds.gridStart}:${calendarEnd}`;

  useEffect(() => {
    let active = true;
    const query = new URLSearchParams({ from: calendarBounds.gridStart, to: calendarEnd });
    void fetch(`/api/public/bookings?${query}`, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Não foi possível consultar a disponibilidade.");
        if (active) {
          setModes(result.modes);
          setModeId((current) => result.modes.some((mode: Mode) => mode.id === current)
            ? current
            : result.modes[0]?.id ?? "");
          setAvailability({
            period: availabilityPeriod,
            occupied: result.occupied ?? [],
            error: "",
          });
        }
      })
      .catch((availabilityError) => {
        if (active) {
          setAvailability({
            period: availabilityPeriod,
            occupied: [],
            error: availabilityError instanceof Error
              ? availabilityError.message
              : "Não foi possível consultar a disponibilidade.",
          });
        }
      });
    return () => {
      active = false;
    };
  }, [availabilityPeriod, calendarBounds.gridStart, calendarEnd]);

  const calendarDays = Array.from({ length: calendarBounds.gridDays }, (_, index) => changeKey(calendarBounds.gridStart, index));
  const occupied = availability.period === availabilityPeriod ? availability.occupied : NO_OCCUPIED_PERIODS;
  const availabilityLoading = availability.period !== availabilityPeriod;
  const availabilityError = availability.period === availabilityPeriod ? availability.error : "";
  const calendarMonthLabel = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${calendarMonth}T12:00:00.000Z`));

  const selectedMode = useMemo(() => modes.find((mode) => mode.id === modeId), [modes, modeId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedMode || !date) {
      setError("Selecione uma modalidade e uma data.");
      return;
    }
    if (conflict) {
      setError(selectedMode.code === "OVERNIGHT"
        ? `Não há disponibilidade para ${durationDays} ${Number(durationDays) === 1 ? "noite" : "noites"} a partir de ${formatDateKey(date)}. Escolha outra data ou reduza a quantidade de noites.`
        : "Esta data não está disponível para a modalidade escolhida. Escolha outra data.");
      return;
    }
    if (availabilityLoading) {
      setError("Aguarde a confirmação da disponibilidade antes de continuar.");
      return;
    }
    if (availabilityError) {
      setError(availabilityError);
      return;
    }
    if (selectedMode.code === "OVERNIGHT" && Number(durationDays) < 1) {
      setError("Selecione pelo menos 1 noite para o pernoite.");
      return;
    }
    const overnightDays = durationDays ? Number(durationDays) : 1;

    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/public/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestName,
          guestContact,
          guestCpf,
          guestAddress,
          modeId,
          date,
          durationDays: selectedMode.code === "OVERNIGHT" ? overnightDays : undefined,
          notes,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Não foi possível solicitar o agendamento.");
      const message = [
        "Olá, ÍGAS! 👋",
        "",
        "Quero finalizar minha solicitação de reserva pelo site:",
        "",
        `👤 Nome: ${guestName.trim()}`,
        `📞 Telefone ou WhatsApp: ${guestContact.trim()}`,
        `🪪 CPF: ${guestCpf.trim()}`,
        `🏡 Modalidade: ${selectedMode.name}`,
        `💰 Valor: ${modePrice(selectedMode, overnightDays)}`,
        ...(selectedMode.code === "OVERNIGHT"
          ? [
            `📅 Check-in: ${formatDateKey(date)} às ${selectedMode.defaultStart}`,
            `🌙 Noites reservadas (${overnightDays}): ${Array.from({ length: overnightDays }, (_, index) => formatDateKey(addDays(date, index))).join(", ")}`,
            `🕒 Check-out: ${formatDateKey(addDays(date, overnightDays))} às ${selectedMode.defaultStart}`,
          ]
          : [
            `📅 Data: ${formatDateKey(date)}`,
            `🕒 Horário: ${scheduleLabel(selectedMode, date, overnightDays)}`,
          ]),
        ...(guestAddress.trim() ? [`📍 Endereço: ${guestAddress.trim()}`] : []),
        ...(notes.trim() ? [`📝 Observações: ${notes.trim()}`] : []),
        "",
        "Aguardo a confirmação. Obrigado(a)! 😊",
      ].join("\n");
      setWhatsappMessage(message);
      setSuccess(result.message);
      setBookingOpen(false);
      setSuccessOpen(true);
      setGuestName("");
      setGuestContact("");
      setGuestCpf("");
      setGuestAddress("");
      setNotes("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Não foi possível solicitar o agendamento.");
    } finally {
      setLoading(false);
    }
  }

  function toggleTheme() {
    const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
  }

  function openBooking() {
    setError("");
    setSuccess("");
    if (!date || !selectedMode || availabilityLoading || availabilityError || !isDateAvailableForMode(date, selectedMode, occupied)) {
      document.getElementById("reserva")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    setBookingOpen(true);
  }

  function navigateCalendar(months: number) {
    const [year, month] = calendarMonth.slice(0, 7).split("-").map(Number);
    const nextMonth = new Date(Date.UTC(year, month - 1 + months, 1, 12));
    setCalendarMonth(nextMonth.toISOString().slice(0, 10));
    setDate("");
  }

  function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (reviewName.trim().length < 2 || !/^[^@]+@[^@]+\.[^@]+$/.test(reviewContact) || reviewText.trim().length < 10 || rating === 0) {
      setError("Preencha os dados, o comentário e selecione uma avaliação.");
      return;
    }
    const reviews = JSON.parse(localStorage.getItem("igas-reviews") || "[]");
    reviews.push({
      name: reviewName.trim(),
      contact: reviewContact.trim(),
      rating,
      comment: reviewText.trim(),
      stayType: reviewType,
      date: today,
    });
    localStorage.setItem("igas-reviews", JSON.stringify(reviews));
    setReviewName("");
    setReviewContact("");
    setReviewText("");
    setReviewType("Lazer");
    setRating(0);
    setSuccess("Avaliação enviada. Obrigado por compartilhar sua experiência!");
    setSuccessOpen(true);
  }

  function returnToClientHome() {
    setSuccessOpen(false);
    setBookingOpen(false);
    setModeId(modes[0]?.id ?? "");
    setDate("");
    setDurationDays("");
    setGuestName("");
    setGuestContact("");
    setGuestCpf("");
    setGuestAddress("");
    setNotes("");
    setError("");
    setSuccess("");
    setWhatsappMessage("");
    setLoading(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const conflict = Boolean(
    date
    && selectedMode
    && (!durationDays && selectedMode.code === "OVERNIGHT"
      ? false
      : !isDateAvailableForMode(
        date,
        selectedMode,
        occupied,
        selectedMode.code === "OVERNIGHT" ? Number(durationDays) : 1,
      )),
  );

  useEffect(() => {
    if (!bookingOpen || !conflict) return;

    const timer = window.setTimeout(() => {
      setBookingOpen(false);
      setError("");
      setDate("");
      document.getElementById("reserva")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 10000);

    return () => window.clearTimeout(timer);
  }, [bookingOpen, conflict]);

  return (
    <main className="client-site">
      <nav className="client-nav">
        <div className="client-nav-inner">
          <a className="client-brand" href="#inicio" aria-label="Balneário Ígas">
            <img className="client-logo-dark" src="/igas-logo-transparent.png" alt="" />
            <img className="client-logo-light" src="/igaspreto.png" alt="" />
          </a>
          <div className="client-nav-links">
            <a href="#inicio">Início</a>
            <a href="#galeria">Galeria</a>
            <a href="#modalidades">Modalidades</a>
            <a href="#avaliacoes">Avaliações</a>
          </div>
          <div className="client-nav-actions">
            <button className="client-theme" type="button" onClick={toggleTheme} aria-label="Alternar tema">
              <span className="client-theme-sun" aria-hidden="true">☀️</span>
              <span className="client-theme-moon" aria-hidden="true">🌙</span>
            </button>
            <button className="client-menu" type="button" onClick={() => setMenuOpen(true)} aria-label="Abrir menu">
              <span /><span /><span />
            </button>
          </div>
        </div>
      </nav>

      {menuOpen && (
        <div className="client-mobile-menu">
          <button type="button" onClick={() => setMenuOpen(false)} aria-label="Fechar menu">✕</button>
          <a href="#inicio" onClick={() => setMenuOpen(false)}>Início</a>
          <a href="#galeria" onClick={() => setMenuOpen(false)}>Galeria</a>
          <a href="#modalidades" onClick={() => setMenuOpen(false)}>Modalidades</a>
          <a href="#avaliacoes" onClick={() => setMenuOpen(false)}>Avaliações</a>
        </div>
      )}

      <section className="client-hero" id="inicio">
        <div className="client-hero-bg" ref={heroBackgroundRef} />
        <video
          ref={heroVideoRef}
          className="client-hero-mobile-video"
          src="https://xd90tgazad.ufs.sh/f/r9YwIz1ulNCW754khGcXUqNfa4tPhKW12jnRZwBTS8mQIFGO"
          muted
          autoPlay
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
        />
        <div className="client-hero-content">
          <span className="client-hero-eyebrow">Seu lazer, nossa prioridade</span>
          <h1>Momentos de lazer<br />com o <em>melhor conforto</em></h1>
          <p>Descubra o Balneário Ígas e viva experiências inesquecíveis em um ambiente acolhedor e preparado para toda a família.</p>
          <div className="client-hero-actions">
            <button type="button" onClick={openBooking}>Reservar agora</button>
            <a href="#galeria">Conhecer o balneário</a>
          </div>
        </div>
        <div className="client-hero-stats">
          <div><strong>2</strong><span>Modalidades</span></div>
          <div><strong>100%</strong><span>De lazer</span></div>
          <div><strong>Todos</strong><span>Os públicos</span></div>
          <div><strong>Ígas</strong><span>Balneário</span></div>
        </div>
      </section>

      <section className="client-booking-bar" aria-label="Agendamento rápido">
        <div className="client-booking-content" id="reserva">
          <h2>Reserve seu momento</h2>
          <div className="client-calendar-layout">
            <div className="client-calendar-panel">
              <div className="client-calendar-header">
                <button type="button" onClick={() => navigateCalendar(-1)} aria-label="Mês anterior">‹</button>
                <h3>{calendarMonthLabel}</h3>
                <button type="button" onClick={() => navigateCalendar(1)} aria-label="Próximo mês">›</button>
              </div>
              <div className="client-calendar-weekdays" aria-hidden="true">
                {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((weekday) => <span key={weekday}>{weekday}</span>)}
              </div>
              <div className="client-calendar-days">
                {calendarDays.map((day) => {
                  const inMonth = day.slice(0, 7) === calendarMonth.slice(0, 7);
                  const past = day < today;
                  const selectedStayDays = selectedMode?.code === "OVERNIGHT" && durationDays
                    ? Number(durationDays)
                    : 1;
                  const isSelectedStayDay = Boolean(
                    date
                    && day >= date
                    && day <= addDays(date, selectedStayDays - 1),
                  );
                  const available = Boolean(selectedMode
                    && !availabilityLoading
                    && !availabilityError
                    && isDateAvailableForMode(day, selectedMode, occupied, 1));
                  const dayClasses = [
                    "client-calendar-day",
                    !inMonth && "outside-month",
                    day === today && "today",
                    day === date && "selected",
                    isSelectedStayDay && day !== date && "selected-stay",
                    past && "past",
                    inMonth && !past && !availabilityLoading && !availabilityError
                      ? available ? "available" : "unavailable"
                      : "",
                  ].filter(Boolean).join(" ");
                  const status = past ? "Data passada" : availabilityLoading
                    ? "Consultando disponibilidade"
                    : availabilityError ? "Disponibilidade indisponível"
                      : available ? "Disponível" : "Indisponível";
                  const selectedStayOrdinal = date
                    ? Math.floor(
                      (new Date(`${day}T12:00:00.000Z`).getTime() - new Date(`${date}T12:00:00.000Z`).getTime()) / 86_400_000,
                    ) + 1
                    : 0;
                  const dayLabel = isSelectedStayDay && day !== date
                    ? `${selectedMode?.code === "OVERNIGHT" ? `Noite ${selectedStayOrdinal} incluída` : `Dia ${selectedStayOrdinal} do período selecionado`}; ${status.toLocaleLowerCase("pt-BR")} como data de início`
                    : status;
                  return (
                    <button
                      className={dayClasses}
                      type="button"
                      key={day}
                      disabled={!inMonth || past || availabilityLoading || Boolean(availabilityError) || !available}
                      aria-label={`${day.slice(-2)}: ${dayLabel}`}
                      aria-pressed={day === date}
                      onClick={() => setDate(day)}
                      style={day === date ? {
                        background: "#c4963a",
                        borderColor: "#e8be72",
                        color: "#fff",
                      } : undefined}
                    >
                      {Number(day.slice(-2))}
                    </button>
                  );
                })}
              </div>
              <div className="client-calendar-legend">
                <span><i className="legend-available" />Disponível</span>
                <span><i className="legend-unavailable" />Indisponível</span>
                <span><i className="legend-selected" />Período selecionado</span>
              </div>
              {availabilityLoading && <p className="client-calendar-message" role="status">Consultando datas...</p>}
              {availabilityError && <p className="client-calendar-error" role="alert">{availabilityError}</p>}
              {conflict && date && selectedMode && (
                <p className="client-calendar-error" role="alert">
                  {selectedMode.code === "OVERNIGHT"
                    ? `Não há disponibilidade para ${durationDays} ${Number(durationDays) === 1 ? "noite" : "noites"} a partir de ${formatDateKey(date)}. Escolha outra data ou reduza a quantidade de noites.`
                    : "Esta data não está disponível para a modalidade escolhida. Escolha outra data."}
                </p>
              )}
            </div>
            <div className="client-booking-options">
              <label>Modalidade
                <select value={modeId} onChange={(event) => {
                  setModeId(event.target.value);
                  setDurationDays("");
                  setError("");
                }}>
                  {modes.map((mode) => <option value={mode.id} key={mode.id}>{modeOptionLabel(mode)}</option>)}
                </select>
              </label>
              {selectedMode?.code === "OVERNIGHT" && (
                <>
                  <label>Quantas noites deseja ficar
                    <select value={durationDays} onChange={(event) => setDurationDays(event.target.value)} required>
                      <option value="">Selecione a quantidade de noites</option>
                      {Array.from({ length: 7 }, (_, index) => index + 1).map((days) => (
                        <option key={days} value={days}>
                          {days} {days === 1 ? "noite" : "noites"} — {money.format(750 * days)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="client-overnight-example" role="note">
                    <strong>Exemplo de pernoite</strong>
                    <span>
                      {durationDays && date
                        ? `${durationDays} ${Number(durationDays) === 1 ? "noite" : "noites"}: entrada em ${formatDateKey(date)}; noites incluídas: ${Array.from({ length: Number(durationDays) }, (_, index) => formatDateKey(addDays(date, index))).join(", ")}; saída em ${formatDateKey(addDays(date, Number(durationDays)))} às ${selectedMode.defaultStart}.`
                        : "Cada noite corresponde a uma data dormida. Exemplo: 3 noites a partir do dia 24 incluem as noites de 24, 25 e 26, com saída às 08:00 do dia 27."}
                    </span>
                  </div>
                </>
              )}
              <div className="client-date-selection">
                <span>Valor da modalidade</span>
                <strong>
                  {selectedMode?.code === "OVERNIGHT" && !durationDays
                    ? "Selecione quantas noites deseja ficar"
                    : selectedMode
                      ? modePrice(selectedMode, selectedMode.code === "OVERNIGHT" ? Number(durationDays) : 1)
                      : "Selecione uma modalidade"}
                </strong>
              </div>
              <label>Horário previsto
                <input
                  value={selectedMode?.code === "OVERNIGHT" && !durationDays
                    ? "Selecione quantas noites deseja ficar"
                    : selectedMode
                      ? scheduleLabel(selectedMode, date, selectedMode.code === "OVERNIGHT" ? Number(durationDays) : 1)
                      : "Carregando..."}
                  readOnly
                />
              </label>
              <div className="client-date-selection">
                <span>Data escolhida</span>
                <strong>{date ? `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}` : "Selecione uma data disponível"}</strong>
              </div>
              <button
                type="button"
                onClick={openBooking}
                disabled={!date || modes.length === 0 || conflict || availabilityLoading || Boolean(availabilityError) || (selectedMode?.code === "OVERNIGHT" && !durationDays)}
              >
                Solicitar reserva
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="client-section client-gallery" id="galeria">
        <div className="client-section-heading">
          <span>Passeio visual</span>
          <h2>Um olhar pelo <em>Ígas</em></h2>
          <i />
        </div>
        <div className="client-gallery-grid">
          {[
            ["/IMG_8870.JPG.jpeg", "Áreas do balneário", "gallery-one"],
            ["https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=700&q=80", "Piscina", "gallery-two"],
            ["https://images.unsplash.com/photo-1540541338287-41700207dee6?w=700&q=80", "Descanso", "gallery-three"],
            ["https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=700&q=80", "Encontros", "gallery-four"],
            ["https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=700&q=80", "Conforto", "gallery-five"],
            ["https://images.unsplash.com/photo-1462275646964-a0e3386b89fa?w=700&q=80", "Natureza", "gallery-six"],
          ].map(([src, label, className]) => (
            <figure className={className} key={label}>
              <img src={src} alt={label} loading="lazy" />
              <figcaption>{label}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="client-section client-modes" id="modalidades">
        <div className="client-section-heading centered">
          <span>Opções de lazer</span>
          <h2>Modalidades disponíveis</h2>
          <i />
        </div>
        <div className="client-mode-grid">
          {modes.map((mode) => (
            <article key={mode.id}>
              <img src={mode.name.toLowerCase().includes("pernoite") ? "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=700&q=80" : "/IMG_8870.JPG.jpeg"} alt={mode.name} />
              <div>
                <h3>{mode.name}</h3>
                <p><strong>{mode.code === "OVERNIGHT" ? `A partir de ${modePrice(mode, 2)}` : modePrice(mode)}</strong></p>
                <div className="client-tags">
                  <span>À partir das {mode.defaultStart}</span>
                  <span>{mode.code === "OVERNIGHT" ? `Saída às ${mode.defaultStart} após a última noite` : mode.durationMinutes >= 1440 ? `Saída às ${endTimeForMode(mode)} do dia seguinte` : `Saída às ${endTimeForMode(mode)}`}</span>
                </div>
                <button type="button" onClick={() => { setModeId(mode.id); document.getElementById("reserva")?.scrollIntoView({ behavior: "smooth" }); }}>Reservar</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="client-section client-amenities">
        <div className="client-section-heading centered">
          <span>Estrutura completa</span>
          <h2>Diferenciais do Ígas</h2>
          <i />
        </div>
        <div className="client-amenity-grid">
          {[
            ["🏊", "Área aquática"],
            ["🌿", "Contato com a natureza"],
            ["🛏️", "Dois quartos Climatizado"],
            ["📺🔊", "TV e som"],
            ["🎱", "Bilhar"],
            ["🏕️", "Ambiente para pernoite"],
            ["🔥", "Churrasqueira e Cozinha"],
            ["🪢", "Espaço para atar 10 redes"],
            ["📶", "Internet WIFI"],
            ["🍺", "Cervejeira"],
          ].map(([icon, label]) => (
            <div key={label}><b>{icon}</b><span>{label}</span></div>
          ))}
        </div>
      </section>

      <section className="client-section client-review" id="avaliacoes">
        <div className="client-section-heading centered">
          <span>Avaliações</span>
          <h2>Compartilhe sua experiência</h2>
          <i />
        </div>
        <form onSubmit={submitReview}>
          <div className="client-review-row">
            <label>Nome completo *
              <input value={reviewName} onChange={(event) => setReviewName(event.target.value)} placeholder="Seu nome" />
            </label>
            <label>E-mail *
              <input type="email" value={reviewContact} onChange={(event) => setReviewContact(event.target.value)} placeholder="voce@exemplo.com" />
            </label>
          </div>
          <div className="client-review-row">
            <label>Idade
              <input type="number" min="1" max="120" placeholder="30" />
            </label>
            <label>Tipo de visita
              <select value={reviewType} onChange={(event) => setReviewType(event.target.value)}>
                <option>Lazer</option><option>Família</option><option>Confraternização</option><option>Feriado</option>
              </select>
            </label>
          </div>
          <label>Avaliação geral *
            <div className="client-stars">
              {[1, 2, 3, 4, 5].map((value) => (
                <button type="button" className={value <= rating ? "active" : ""} onClick={() => setRating(value)} key={value}>★</button>
              ))}
            </div>
          </label>
          <label>Seu comentário *
            <textarea value={reviewText} onChange={(event) => setReviewText(event.target.value)} rows={4} placeholder="Conte-nos sobre sua experiência no Ígas…" />
          </label>
          {error && <p className="client-form-error">{error}</p>}
          <button type="submit" disabled>Enviar avaliação ✦</button>
        </form>
      </section>

      <footer className="client-footer">
        <strong>♛ BALNEÁRIO ÍGAS</strong>
        <p>Seu lazer, nossa prioridade</p>
        <nav>
          <a href="#inicio">Início</a>
          <a href="#galeria">Galeria</a>
          <a href="#modalidades">Modalidades</a>
          <a href="#avaliacoes">Avaliações</a>
        </nav>
        <small>© {new Date().getFullYear()} Balneário Ígas. Todos os direitos reservados.</small>
      </footer>

      {bookingOpen && (
        <div className="client-overlay" role="dialog" aria-modal="true" aria-labelledby="booking-modal-title">
          <div className="client-modal">
            <button className="client-modal-close" type="button" onClick={() => setBookingOpen(false)} aria-label="Fechar">✕</button>
            <h2 id="booking-modal-title">Confirmar solicitação</h2>
            <p>
              {selectedMode?.name} — {selectedMode?.code === "OVERNIGHT" && !durationDays
                ? "Selecione quantas noites deseja ficar"
                : selectedMode ? modePrice(selectedMode, selectedMode.code === "OVERNIGHT" ? Number(durationDays) : 1) : ""}
              {" — "}
              {selectedMode?.code === "OVERNIGHT" && !durationDays
                ? "Selecione quantas noites deseja ficar"
                : selectedMode ? scheduleLabel(selectedMode, date, selectedMode.code === "OVERNIGHT" ? Number(durationDays) : 1) : ""}
            </p>
            <form className="public-booking-form" onSubmit={submit}>
              <label>Nome completo
                <input value={guestName} onChange={(event) => setGuestName(event.target.value)} required maxLength={120} />
              </label>
              <label>Telefone ou WhatsApp
                <input value={guestContact} onChange={(event) => setGuestContact(event.target.value)} required maxLength={160} />
              </label>
              <div className="public-form-grid">
                <label>CPF
                  <input value={guestCpf} onChange={(event) => setGuestCpf(formatCpf(event.target.value))} placeholder="000.000.000-00" required inputMode="numeric" maxLength={14} />
                </label>
                <label>Modalidade
                  <select value={modeId} onChange={(event) => {
                    setModeId(event.target.value);
                    setDurationDays("");
                    setError("");
                  }} required>
                    {modes.map((mode) => <option value={mode.id} key={mode.id}>{modeOptionLabel(mode)}</option>)}
                  </select>
                </label>
              </div>
              {selectedMode?.code === "OVERNIGHT" && (
                <label>Quantas noites deseja ficar
                  <select value={durationDays} onChange={(event) => setDurationDays(event.target.value)} required>
                    <option value="">Selecione a quantidade de noites</option>
                    {Array.from({ length: 7 }, (_, index) => index + 1).map((days) => (
                      <option key={days} value={days}>{days} {days === 1 ? "noite" : "noites"} — {money.format(750 * days)}</option>
                    ))}
                  </select>
                </label>
              )}
              <div className="client-date-selection">
                <span>Data escolhida</span>
                <strong>{date ? `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}` : "Selecione uma data no calendário"}</strong>
              </div>
              {conflict && date && selectedMode && (
                <p className="client-form-error" role="alert">
                  {selectedMode.code === "OVERNIGHT"
                    ? `Não há disponibilidade para ${durationDays} ${Number(durationDays) === 1 ? "noite" : "noites"} a partir de ${formatDateKey(date)}. Escolha outra data ou reduza a quantidade de noites.`
                    : "Esta data não está disponível para a modalidade escolhida. Escolha outra data."}
                </p>
              )}
              <label>Endereço <span>(opcional)</span>
                <input value={guestAddress} onChange={(event) => setGuestAddress(event.target.value)} maxLength={300} />
              </label>
              <label>Observações <span>(opcional)</span>
                <textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={2000} rows={3} />
              </label>
              {error && <p className="client-form-error">{error}</p>}
              <button className="client-modal-submit" type="submit" disabled={loading || modes.length === 0 || !date || conflict || (selectedMode?.code === "OVERNIGHT" && !durationDays)}>
                {loading ? "Enviando..." : "Confirmar reserva ✦"}
              </button>
            </form>
          </div>
        </div>
      )}

      {successOpen && (
        <div className="client-success-overlay" role="dialog" aria-modal="true">
          <div>
            <span>✨</span>
            <h2>Solicitação enviada</h2>
            <p><strong>Obrigatório enviar mensagem!</strong></p>
            <p>Para finalizar sua reserva, escolha com quem deseja enviar as últimas informações!</p>
            <div className="client-whatsapp-contacts">
              {WHATSAPP_CONTACTS.map((contact) => (
                <a
                  className="client-whatsapp-contact"
                  href={`https://wa.me/${contact.phone}?text=${encodeURIComponent(whatsappMessage)}`}
                  key={contact.name}
                  target="_blank"
                  rel="noreferrer"
                  onClick={returnToClientHome}
                >
                  <span className="client-whatsapp-contact-icon" aria-hidden="true">
                    <svg width="23" height="23" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.198-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.297-.496.099-.198.05-.372-.025-.521-.075-.149-.669-1.612-.916-2.213-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.875 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.693.626.711.226 1.358.194 1.87.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.29.173-1.414-.074-.123-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.999-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.002-5.45 4.438-9.886 9.893-9.886 2.64.001 5.12 1.03 6.99 2.902a9.825 9.825 0 0 1 2.895 6.994c-.003 5.45-4.44 9.886-9.895 9.886m8.413-18.3A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c-.001 2.096.547 4.142 1.588 5.946L.057 24l6.304-1.654a11.882 11.882 0 0 0 5.684 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 0 0-3.48-8.398Z" />
                    </svg>
                  </span>
                  <span className="client-whatsapp-contact-info">
                    <strong>{contact.name}</strong>
                    <small>{contact.displayPhone}</small>
                  </span>
                  <span className="client-whatsapp-contact-action">Conversar <span aria-hidden="true">↗</span></span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
