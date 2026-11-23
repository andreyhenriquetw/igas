"use client";

import { CalendarDays, X } from "lucide-react";
import type { ReactNode } from "react";
import { hasPaidAtLeastHalf } from "@/lib/payment";
import { formatLocalDateTime } from "@/lib/time";
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
            <small>Data e horário</small>
            <strong>{formatLocalDateTime(entry.startsAt, "EEEE, dd 'de' MMMM 'de' yyyy")}</strong>
            <span>{formatLocalDateTime(entry.startsAt, "HH:mm")} – {formatLocalDateTime(entry.endsAt, "dd/MM 'às' HH:mm")}</span>
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
