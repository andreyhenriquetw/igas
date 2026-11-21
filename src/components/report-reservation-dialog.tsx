"use client";

import {
  CheckCircle2,
  Copy,
  Download,
  Link2,
  MessageCircle,
  Pencil,
  Save,
  X,
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { ReservationDetailsDialog } from "@/components/calendar/reservation-details-dialog";
import {
  buildContractText,
  downloadAcceptedContractPdf,
  downloadContractPdf,
  personalizeContractText,
} from "@/lib/contract";
import { formatLocalDateTime } from "@/lib/time";
import { toWhatsAppPhoneNumber } from "@/lib/whatsapp";
import type { CalendarEntryDto } from "@/types/calendar";

type Props = {
  entryId: string;
  onClose: () => void;
  onSaved: (entry: CalendarEntryDto) => void;
};

type AcceptanceLink = {
  entryId: string;
  url: string;
  expiresAt: string;
};

function contractSignatureData(entry: CalendarEntryDto) {
  return {
    landlordAcceptedAt: entry.landlordAcceptedAt,
    tenantAcceptedName: entry.contractAcceptedName,
    tenantAcceptedAt: entry.contractAcceptedAt,
  };
}

export function ReportReservationDialog({ entryId, onClose, onSaved }: Props) {
  const [entry, setEntry] = useState<CalendarEntryDto | null>(null);
  const [paidAmount, setPaidAmount] = useState("");
  const [contractDraft, setContractDraft] = useState("");
  const [acceptanceLink, setAcceptanceLink] = useState<AcceptanceLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [contractBusy, setContractBusy] = useState(false);
  const [acceptanceBusy, setAcceptanceBusy] = useState(false);
  const [editingPayment, setEditingPayment] = useState(false);
  const [editingContract, setEditingContract] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/entries/${encodeURIComponent(entryId)}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = await response.json() as { entry?: CalendarEntryDto; error?: string };
        if (!response.ok) throw new Error(result.error ?? "Não foi possível carregar a reserva.");
        if (!result.entry) throw new Error("Os detalhes da reserva estão incompletos.");
        setEntry(result.entry);
        setPaidAmount((result.entry.paidAmount ?? 0).toFixed(2));
      })
      .catch((loadError: unknown) => {
        if (controller.signal.aborted) return;
        setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar a reserva.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [entryId]);

  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(() => setMessage(""), 2400);
    return () => window.clearTimeout(timeout);
  }, [message]);

  function applyUpdatedEntry(updatedEntry: CalendarEntryDto) {
    setEntry(updatedEntry);
    setPaidAmount((updatedEntry.paidAmount ?? 0).toFixed(2));
    onSaved(updatedEntry);
  }

  async function savePayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!entry) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/entries/${encodeURIComponent(entry.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paidAmount: Number(paidAmount) }),
      });
      const result = await response.json() as { entry?: CalendarEntryDto; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Não foi possível salvar o pagamento.");
      if (!result.entry) throw new Error("A resposta do pagamento está incompleta.");
      applyUpdatedEntry(result.entry);
      setMessage("Pagamento salvo.");
      setEditingPayment(false);
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : "Não foi possível salvar o pagamento.");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(status: "CANCELLED" | "CONFIRMED") {
    if (!entry) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/entries/${encodeURIComponent(entry.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const result = await response.json() as { entry?: CalendarEntryDto; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Não foi possível atualizar a reserva.");
      if (!result.entry) throw new Error("A resposta da reserva está incompleta.");
      applyUpdatedEntry(result.entry);
      setMessage(status === "CANCELLED" ? "Reserva cancelada." : "Reserva confirmada.");
    } catch (updateError: unknown) {
      setError(updateError instanceof Error ? updateError.message : "Não foi possível atualizar a reserva.");
    } finally {
      setSaving(false);
    }
  }

  async function openContractEditor() {
    if (!entry) return;
    setContractBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/entries/${encodeURIComponent(entry.id)}/contract`, { cache: "no-store" });
      const result = await response.json() as { contractText?: string | null; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Não foi possível carregar o contrato.");
      setContractDraft(personalizeContractText(result.contractText ?? buildContractText(entry), entry));
      setEditingContract(true);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar o contrato.");
    } finally {
      setContractBusy(false);
    }
  }

  async function persistContract(contractText: string) {
    if (!entry) throw new Error("A reserva não está carregada.");
    const response = await fetch(`/api/entries/${encodeURIComponent(entry.id)}/contract`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contractText }),
    });
    const result = await response.json() as { entry?: CalendarEntryDto; error?: string };
    if (!response.ok) throw new Error(result.error ?? "Não foi possível salvar o contrato.");
    if (!result.entry) throw new Error("A resposta do contrato está incompleta.");
    return result.entry;
  }

  async function saveContract(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setContractBusy(true);
    setError("");
    setMessage("");
    try {
      const updatedEntry = await persistContract(contractDraft);
      applyUpdatedEntry(updatedEntry);
      setAcceptanceLink(null);
      setEditingContract(false);
      setMessage("Contrato salvo.");
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : "Não foi possível salvar o contrato.");
    } finally {
      setContractBusy(false);
    }
  }

  async function downloadContract() {
    if (!entry) return;
    setContractBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/entries/${encodeURIComponent(entry.id)}/contract`, { cache: "no-store" });
      const result = await response.json() as { contractText?: string | null; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Não foi possível carregar o contrato.");
      const contractText = personalizeContractText(result.contractText ?? buildContractText(entry), entry);
      const updatedEntry = result.contractText ? entry : await persistContract(contractText);
      downloadContractPdf(contractText, entry.guestName ?? "reserva", contractSignatureData(entry));
      applyUpdatedEntry(updatedEntry);
      setMessage("Contrato baixado em PDF.");
    } catch (downloadError: unknown) {
      setError(downloadError instanceof Error ? downloadError.message : "Não foi possível baixar o contrato.");
    } finally {
      setContractBusy(false);
    }
  }

  async function generateAcceptanceLink() {
    if (!entry) return;
    setAcceptanceBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/entries/${encodeURIComponent(entry.id)}/acceptance-link`, { method: "POST" });
      const result = await response.json() as {
        entry?: CalendarEntryDto;
        token?: string;
        expiresAt?: string;
        error?: string;
      };
      if (!response.ok) throw new Error(result.error ?? "Não foi possível gerar o link de aceite.");
      if (!result.entry || !result.token || !result.expiresAt) {
        throw new Error("A resposta do link de aceite está incompleta.");
      }
      applyUpdatedEntry(result.entry);
      setAcceptanceLink({
        entryId: entry.id,
        url: `${window.location.origin}/contrato/aceite/${result.token}`,
        expiresAt: result.expiresAt,
      });
      setMessage("Link de aceite criado.");
    } catch (linkError: unknown) {
      setError(linkError instanceof Error ? linkError.message : "Não foi possível gerar o link de aceite.");
    } finally {
      setAcceptanceBusy(false);
    }
  }

  async function copyAcceptanceLink(url: string) {
    setError("");
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Link de aceite copiado.");
    } catch {
      setError("Não foi possível copiar automaticamente. Selecione o link exibido e copie manualmente.");
    }
  }

  async function sendAcceptedContractViaWhatsApp() {
    if (!entry || entry.contractAcceptanceStatus !== "ACCEPTED" || !entry.contractAcceptedAt) {
      setError("O contrato ainda não tem aceite registrado.");
      return;
    }
    const phoneNumber = toWhatsAppPhoneNumber(entry.guestContact ?? "");
    if (!phoneNumber) {
      setError("Cadastre um telefone válido com DDD na reserva antes de enviar pelo WhatsApp.");
      return;
    }
    const whatsappWindow = window.open("about:blank", "_blank");
    if (!whatsappWindow) {
      setError("Permita a abertura de pop-ups para preparar o envio pelo WhatsApp.");
      return;
    }
    whatsappWindow.opener = null;
    setContractBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/entries/${encodeURIComponent(entry.id)}/contract`, { cache: "no-store" });
      const result = await response.json() as { contractText?: string | null; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Não foi possível carregar o contrato.");
      const contractText = personalizeContractText(result.contractText ?? buildContractText(entry), entry);
      downloadAcceptedContractPdf(contractText, entry.guestName ?? "reserva", contractSignatureData(entry));
      const acceptedAt = formatLocalDateTime(entry.contractAcceptedAt, "dd/MM/yyyy 'às' HH:mm");
      const message = `Olá, ${entry.guestName ?? "tudo bem"}! Segue o contrato da sua reserva no ÍGAS, com o aceite registrado em ${acceptedAt}.`;
      whatsappWindow.location.href = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
      setMessage("PDF baixado. Anexe-o na conversa do WhatsApp e toque em enviar.");
    } catch (sendError: unknown) {
      whatsappWindow.close();
      setError(sendError instanceof Error ? sendError.message : "Não foi possível preparar o contrato para envio.");
    } finally {
      setContractBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="modal-backdrop report-reservation-backdrop">
        <section className="modal-card report-reservation-modal" role="dialog" aria-modal="true" aria-busy="true">
          <div className="modal-heading">
            <h2>Detalhes da reserva</h2>
            <button className="icon-button" type="button" onClick={onClose} aria-label="Fechar detalhes">
              <X size={20} />
            </button>
          </div>
          <p className="muted" role="status">Carregando informações da reserva…</p>
        </section>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="modal-backdrop report-reservation-backdrop" onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}>
        <section className="modal-card report-reservation-modal" role="dialog" aria-modal="true" aria-labelledby="report-reservation-error-title">
          <div className="modal-heading">
            <h2 id="report-reservation-error-title">Detalhes da reserva</h2>
            <button className="icon-button" type="button" onClick={onClose} aria-label="Fechar detalhes">
              <X size={20} />
            </button>
          </div>
          <p className="form-error" role="alert">{error || "Não foi possível carregar a reserva."}</p>
        </section>
      </div>
    );
  }

  const total = entry.totalAmount ?? 0;
  const canEdit = entry.kind === "BOOKING" && entry.status !== "CANCELLED";
  const phoneNumber = toWhatsAppPhoneNumber(entry.guestContact ?? "");

  if (editingContract) {
    return (
      <div className="modal-backdrop report-reservation-backdrop" onMouseDown={(event) => {
        if (event.target === event.currentTarget) setEditingContract(false);
      }}>
        <section className="modal-card contract-modal" role="dialog" aria-modal="true" aria-labelledby="report-contract-title">
          <div className="modal-heading">
            <div>
              <p className="eyebrow">CONTRATO DA RESERVA</p>
              <h2 id="report-contract-title">Editar contrato</h2>
            </div>
            <button className="icon-button" type="button" onClick={() => setEditingContract(false)} aria-label="Voltar aos detalhes">
              <X size={20} />
            </button>
          </div>
          <p className="muted contract-help">
            Revise as condições do estabelecimento. Os dados da reserva são atualizados automaticamente no contrato.
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
              <button className="button button-secondary" type="button" disabled={contractBusy} onClick={() => setEditingContract(false)}>
                Voltar
              </button>
              <button className="button button-primary" type="submit" disabled={contractBusy}>
                <Save size={16} /> {contractBusy ? "Salvando…" : "Salvar contrato"}
              </button>
            </div>
          </form>
        </section>
      </div>
    );
  }

  if (editingPayment) {
    return (
      <div className="modal-backdrop report-reservation-backdrop" onMouseDown={(event) => {
        if (event.target === event.currentTarget) setEditingPayment(false);
      }}>
        <section className="modal-card reservation-form-modal report-reservation-modal" role="dialog" aria-modal="true" aria-labelledby="report-payment-title">
          <div className="modal-heading">
            <div>
              <p className="eyebrow">EDITAR AGENDA</p>
              <h2 id="report-payment-title">Editar reserva</h2>
            </div>
            <button className="icon-button" type="button" onClick={() => setEditingPayment(false)} aria-label="Voltar aos detalhes">
              <X size={20} />
            </button>
          </div>
          <p className="muted">
            {entry.guestName} · {formatLocalDateTime(entry.startsAt, "dd/MM/yyyy 'às' HH:mm")}
          </p>
          <form className="form-stack modal-form" onSubmit={savePayment}>
            <label className="field">
              <span>Valor total <small>(R$)</small></span>
              <input value={total.toFixed(2)} readOnly />
            </label>
            <label className="field">
              <span>Valor já pago <small>(R$)</small></span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                max={total}
                step="0.01"
                value={paidAmount}
                onChange={(event) => setPaidAmount(event.target.value)}
                required
              />
            </label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <div className="modal-actions">
              <button className="button button-secondary" type="button" onClick={() => setEditingPayment(false)}>Voltar</button>
              <button className="button button-primary" type="submit" disabled={saving}>
                <Save size={16} /> {saving ? "Salvando…" : "Salvar pagamento"}
              </button>
            </div>
          </form>
        </section>
      </div>
    );
  }

  return (
    <div className="modal-backdrop report-reservation-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <ReservationDetailsDialog entry={entry} error={error} onClose={onClose}>
        <div className="modal-actions detail-actions report-reservation-actions">
          {canEdit && (
            <button className="button button-secondary" type="button" disabled={saving} onClick={() => setEditingPayment(true)}>
              <Pencil size={16} /> Editar reserva
            </button>
          )}
          {entry.kind === "BOOKING" && (
            <>
              <button className="button button-secondary" type="button" disabled={contractBusy || saving} onClick={() => void openContractEditor()}>
                <Pencil size={16} /> Editar contrato
              </button>
              <button className="button button-primary" type="button" disabled={contractBusy || saving} onClick={() => void downloadContract()}>
                <Download size={16} /> {contractBusy ? "Preparando…" : "Baixar contrato PDF"}
              </button>
              <button
                className="button button-secondary"
                type="button"
                disabled={acceptanceBusy || saving || entry.status === "CANCELLED" || !entry.guestCpf || entry.contractAcceptanceStatus === "ACCEPTED"}
                onClick={() => void generateAcceptanceLink()}
              >
                <Link2 size={16} />
                {acceptanceBusy ? "Gerando link…" : entry.contractAcceptanceStatus === "PENDING" ? "Gerar novo link" : "Gerar link de aceite"}
              </button>
              {entry.contractAcceptanceStatus === "ACCEPTED" && (
                <button className="button button-secondary" type="button" disabled={contractBusy || saving || !phoneNumber} onClick={() => void sendAcceptedContractViaWhatsApp()}>
                  <MessageCircle size={16} /> {contractBusy ? "Preparando…" : "Enviar contrato aceito via WhatsApp"}
                </button>
              )}
            </>
          )}
          {entry.status !== "CANCELLED" && (
            <button
              className="button button-danger"
              type="button"
              disabled={saving}
              onClick={() => {
                if (window.confirm(entry.kind === "BLOCK" ? "Liberar este horário?" : "Cancelar esta reserva?")) {
                  void updateStatus("CANCELLED");
                }
              }}
            >
              {entry.kind === "BLOCK" ? "Liberar horário" : "Cancelar reserva"}
            </button>
          )}
          {entry.kind === "BOOKING" && entry.status === "PENDING" && (
            <button className="button button-primary" type="button" disabled={saving} onClick={() => void updateStatus("CONFIRMED")}>
              <CheckCircle2 size={16} /> Confirmar reserva
            </button>
          )}
          {message && <p className="report-payment-success" role="status">{message}</p>}
        </div>
        {entry.kind === "BOOKING" && (
          <div className="acceptance-link-panel">
            {entry.contractAcceptanceStatus === "ACCEPTED" && !phoneNumber && (
              <p className="muted">Cadastre um telefone válido com DDD nos dados da reserva para enviar o contrato pelo WhatsApp.</p>
            )}
            <p className="muted contract-signing-help">
              {entry.status === "CANCELLED"
                ? "Reservas canceladas não podem receber novos links de aceite."
                : entry.guestCpf
                  ? "Envie o link ao locatário. Ele poderá conferir o contrato e registrar o aceite por 7 dias. Esse registro é interno ao ÍGAS, não uma assinatura gov.br."
                  : "Cadastre o CPF do locatário para poder gerar um link de aceite."}
            </p>
            {acceptanceLink?.entryId === entry.id && (
              <div className="acceptance-link-row">
                <input aria-label="Link de aceite do contrato" readOnly value={acceptanceLink.url} onFocus={(event) => event.currentTarget.select()} />
                <button className="button button-secondary" type="button" onClick={() => void copyAcceptanceLink(acceptanceLink.url)}>
                  <Copy size={16} /> Copiar
                </button>
                <small>Expira em {formatLocalDateTime(acceptanceLink.expiresAt, "dd/MM/yyyy 'às' HH:mm")}</small>
              </div>
            )}
          </div>
        )}
      </ReservationDetailsDialog>
    </div>
  );
}
