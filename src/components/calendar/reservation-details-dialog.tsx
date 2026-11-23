"use client";

import { CalendarDays, X } from "lucide-react";
import type { ReactNode } from "react";
import { hasPaidAtLeastHalf } from "@/lib/payment";
import {
  formatLocalDateKey,
  formatLocalDateTime,
  getReservationDateKeys,
} from "@/lib/time";
import type { CalendarEntryDto } from "@/types/calendar";

type Props = {
  entry: CalendarEntryDto;
  error?: string;
  onClose: () => void;
  children?: ReactNode;
};

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function statusLabel(status: CalendarEntryDto["status"]) {
  return {
    CONFIRMED: "Confirmada",
    PENDING: "Pendente",
    CANCELLED: "Cancelada",
    BLOCKED: "Bloqueada",
  }[status];
}

function acceptanceLabel(entry: CalendarEntryDto) {
  if (entry.status === "CANCELLED") return "Reserva cancelada";
  if (entry.contractAcceptanceStatus === "ACCEPTED") {
    return `Aceito por ${entry.contractAcceptedName ?? entry.guestName}`;
  }
  if (entry.contractAcceptanceStatus === "PENDING") return "Aguardando aceite do cliente";
  if (entry.contractAcceptanceStatus === "EXPIRED") return "Link de aceite expirado";
  return "Link de aceite ainda não enviado";
}

export function ReservationDetailsDialog({ entry, error, onClose, children }: Props) {
  const total = entry.totalAmount ?? 0;
  const paid = entry.paidAmount ?? 0;
  const amountsDefined = entry.totalAmount !== null && entry.paidAmount !== null;
  const minimumPayment = !amountsDefined ? "A definir" : hasPaidAtLeastHalf(total, paid) ? "Sim" : "Ainda não";
  const reservationDays = getReservationDateKeys(entry.startsAt, entry.endsAt, entry.mode?.code)
    .map(formatLocalDateKey);

  return (
    <section
      className="modal-card detail-modal reservation-details-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reservation-details-title"
    >
      <div className="modal-heading">
        <span className="reservation-modal-icon" aria-hidden="true"><CalendarDays size={21} /></span>
        <div>
          <p className="eyebrow">{entry.kind === "BLOCK" ? "BLOQUEIO DE AGENDA" : "DETALHES DA RESERVA"}</p>
          <h2 id="reservation-details-title">{entry.kind === "BLOCK" ? "Data bloqueada" : entry.guestName}</h2>
        </div>
        <button className="icon-button" type="button" onClick={onClose} aria-label="Fechar">
          <X size={20} />
        </button>
      </div>
      <div className="reservation-detail-content">
        <div className="detail-datetime detail-datetime-card">
          <span className="detail-date-icon" aria-hidden="true"><CalendarDays size={19} /></span>
          <div>
            <small>
              Período da reserva · {reservationDays.length} {entry.mode?.code === "OVERNIGHT"
                ? reservationDays.length === 1 ? "noite" : "noites"
                : reservationDays.length === 1 ? "dia" : "dias"}
            </small>
            <strong>Entrada: {formatLocalDateTime(entry.startsAt, "EEEE, dd 'de' MMMM 'de' yyyy 'às' HH:mm")}</strong>
            <span>Saída: {formatLocalDateTime(entry.endsAt, "EEEE, dd 'de' MMMM 'de' yyyy 'às' HH:mm")}</span>
            <span>{entry.mode?.code === "OVERNIGHT" ? "Noites incluídas" : "Dias incluídos"}: {reservationDays.join(", ")}</span>
          </div>
          <span className={`detail-status detail-status-${entry.status.toLowerCase()}`}>{statusLabel(entry.status)}</span>
        </div>

        {entry.kind === "BOOKING" && (
          <div className="detail-grid reservation-detail-grid">
            <div><small>Modalidade</small><strong>{entry.mode?.name ?? "—"}</strong></div>
            <div><small>Contato</small><strong>{entry.guestContact || "Não informado"}</strong></div>
            <div><small>CPF</small><strong>{entry.guestCpf || "Não informado"}</strong></div>
            <div><small>Endereço</small><strong>{entry.guestAddress || "Não informado"}</strong></div>
            <div><small>Valor total</small><strong>{amountsDefined ? money.format(total) : "A definir"}</strong></div>
            <div><small>Valor pago</small><strong>{amountsDefined ? money.format(paid) : "—"}</strong></div>
            <div><small>Saldo restante</small><strong>{amountsDefined ? money.format(total - paid) : "—"}</strong></div>
            <div><small>Pagamento mínimo</small><strong>{minimumPayment}</strong></div>
            <div className="detail-full">
              <small>Aceite do contrato</small>
              <strong>{acceptanceLabel(entry)}</strong>
              {entry.contractAcceptedAt && (
                <span>{formatLocalDateTime(entry.contractAcceptedAt, "dd/MM/yyyy 'às' HH:mm")}</span>
              )}
              {entry.contractAcceptanceStatus === "PENDING" && entry.contractAcceptanceExpiresAt && (
                <span>Válido até {formatLocalDateTime(entry.contractAcceptanceExpiresAt, "dd/MM/yyyy 'às' HH:mm")}</span>
              )}
            </div>
          </div>
        )}

        {entry.notes && (
          <section className="notes-box">
            <small>Observações</small>
            <p>{entry.notes}</p>
          </section>
        )}
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {children}
    </section>
  );
}
