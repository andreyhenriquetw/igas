"use client";

import { useState } from "react";
import { CalendarCheck2, Check, CircleX, Copy, RefreshCw } from "lucide-react";
import {
  formatLocalDateKey,
  formatLocalDateTime,
  getReservationDateKeys,
} from "@/lib/time";
import type { CalendarEntryDto } from "@/types/calendar";

type Props = {
  initialEntries: CalendarEntryDto[];
};

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function BookingsDashboard({ initialEntries }: Props) {
  const [entries, setEntries] = useState(initialEntries);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function updateStatus(entryId: string, status: "CONFIRMED" | "CANCELLED") {
    setLoadingId(entryId);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/entries/${entryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Não foi possível atualizar.");
      setEntries((current) => current.filter((entry) => entry.id !== entryId));
      setMessage(status === "CONFIRMED" ? "Agendamento confirmado." : "Solicitação cancelada.");
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Não foi possível atualizar.");
    } finally {
      setLoadingId(null);
    }
  }

  async function refresh() {
    setError("");
    try {
      const response = await fetch("/api/entries?kind=BOOKING&status=PENDING", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setEntries((result.entries as CalendarEntryDto[]).filter((entry) => entry.kind === "BOOKING" && entry.status === "PENDING"));
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Não foi possível atualizar.");
    }
  }

  async function copyPublicLink() {
    const url = `${window.location.origin}/cliente`;
    await navigator.clipboard.writeText(url);
    setMessage("Link público copiado.");
  }

  return (
    <main className="app-main settings-main">
      <section className="page-intro">
        <div>
          <p className="eyebrow">SOLICITAÇÕES ONLINE</p>
          <h1>Agendamentos</h1>
          <p className="muted">Acompanhe e confirme os pedidos feitos pelo link público.</p>
        </div>
        <div className="booking-actions">
          <button className="button button-secondary" type="button" onClick={() => void copyPublicLink()}>
            <Copy size={16} /> Copiar link público
          </button>
          <button className="button button-secondary" type="button" onClick={() => void refresh()}>
            <RefreshCw size={16} /> Atualizar
          </button>
        </div>
      </section>

      {message && <p className="form-success" role="status">{message}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}

      {entries.length === 0 ? (
        <section className="empty-bookings">
          <CalendarCheck2 size={28} />
          <h2>Não há solicitações pendentes</h2>
          <p>Novos agendamentos aparecerão aqui automaticamente.</p>
        </section>
      ) : (
        <div className="bookings-list">
          {entries.map((entry) => (
            <article className="booking-card" key={entry.id}>
              <div className="booking-card-heading">
                <div>
                  <p className="eyebrow">{entry.mode?.name ?? "Reserva"}</p>
                  <h2>{entry.guestName}</h2>
                </div>
                <span className="badge badge-pending">Pendente</span>
              </div>
              <dl className="booking-card-details">
                <div>
                  <dt>Período da reserva</dt>
                  <dd>{formatLocalDateTime(entry.startsAt, "dd/MM/yyyy 'às' HH:mm")} – {formatLocalDateTime(entry.endsAt, "dd/MM/yyyy 'às' HH:mm")}</dd>
                </div>
                <div>
                  <dt>{entry.mode?.code === "OVERNIGHT"
                    ? `Noites incluídas (${getReservationDateKeys(entry.startsAt, entry.endsAt, entry.mode?.code).length})`
                    : "Dias incluídos"}
                  </dt>
                  <dd>{getReservationDateKeys(entry.startsAt, entry.endsAt, entry.mode?.code).map(formatLocalDateKey).join(", ")}</dd>
                </div>
                <div>
                  <dt>Contato</dt>
                  <dd>{entry.guestContact || "Não informado"}</dd>
                </div>
                <div>
                  <dt>CPF</dt>
                  <dd>{entry.guestCpf || "Não informado"}</dd>
                </div>
                <div>
                  <dt>Endereço</dt>
                  <dd>{entry.guestAddress || "Não informado"}</dd>
                </div>
                <div>
                  <dt>Valor</dt>
                  <dd>{entry.totalAmount === null ? "A definir pelo proprietário" : money.format(entry.totalAmount)}</dd>
                </div>
              </dl>
              {entry.notes && <p className="booking-notes"><strong>Observações:</strong> {entry.notes}</p>}
              <div className="booking-actions">
                <button
                  className="button button-primary"
                  type="button"
                  disabled={loadingId !== null}
                  onClick={() => void updateStatus(entry.id, "CONFIRMED")}
                >
                  <Check size={16} /> Confirmar
                </button>
                <button
                  className="button button-secondary"
                  type="button"
                  disabled={loadingId !== null}
                  onClick={() => void updateStatus(entry.id, "CANCELLED")}
                >
                  <CircleX size={16} /> Recusar
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
