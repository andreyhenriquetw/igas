"use client";

import { CheckCircle2, CircleAlert, LoaderCircle, ShieldCheck } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { uppercaseName } from "@/lib/name";
import { formatLocalDateTime } from "@/lib/time";

type AcceptanceData = {
  contractText: string;
  guestName: string;
  status: "PENDING" | "ACCEPTED";
  acceptedAt: string | null;
  acceptedName: string | null;
};

function formatCpf(value: string) {
  return value
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function ContractAcceptance({ token }: { token: string }) {
  const [data, setData] = useState<AcceptanceData | null>(null);
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/contract-acceptance/${encodeURIComponent(token)}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Não foi possível carregar o contrato.");
        setData(result as AcceptanceData);
      })
      .catch((loadError: unknown) => {
        if (controller.signal.aborted) return;
        setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar o contrato.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [token]);

  async function submitAcceptance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch(`/api/contract-acceptance/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, cpf, accepted }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Não foi possível registrar o aceite.");
      setData((current) => current && {
        ...current,
        status: "ACCEPTED",
        acceptedAt: result.acceptedAt,
        acceptedName: result.acceptedName,
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Não foi possível registrar o aceite.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="acceptance-page">
      <section className="acceptance-card">
        <div className="acceptance-heading">
          <div className="acceptance-icon"><ShieldCheck size={23} /></div>
          <div>
            <p className="eyebrow">ÍGAS BALNEÁRIO</p>
            <h1>Contrato de locação</h1>
          </div>
        </div>

        {loading ? (
          <p className="acceptance-status"><LoaderCircle size={17} className="acceptance-spinner" /> Carregando o contrato…</p>
        ) : error && !data ? (
          <p className="acceptance-error" role="alert"><CircleAlert size={18} /> {error}</p>
        ) : data ? (
          <>
            <p className="acceptance-intro">
              Confira os dados e todas as condições da locação antes de registrar seu aceite.
            </p>
            <pre className="acceptance-contract">{data.contractText}</pre>

            {data.status === "ACCEPTED" ? (
              <div className="acceptance-success" role="status">
                <CheckCircle2 size={21} />
                <div>
                  <strong>Aceite registrado no sistema ÍGAS</strong>
                  <span>{data.acceptedName} · {data.acceptedAt ? formatLocalDateTime(data.acceptedAt, "dd/MM/yyyy 'às' HH:mm") : ""}</span>
                </div>
              </div>
            ) : (
              <form className="acceptance-form" onSubmit={submitAcceptance}>
                <label className="field">
                  <span>Seu nome completo</span>
                  <input value={name} onChange={(event) => setName(uppercaseName(event.target.value))} autoComplete="name" maxLength={120} required />
                </label>
                <label className="field">
                  <span>CPF do locatário</span>
                  <input
                    value={cpf}
                    onChange={(event) => setCpf(formatCpf(event.target.value))}
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={14}
                    placeholder="000.000.000-00"
                    required
                  />
                </label>
                <label className="acceptance-checkbox">
                  <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />
                  <span>Li o contrato acima e concordo com as condições da locação.</span>
                </label>
                {error && <p className="form-error" role="alert">{error}</p>}
                <button className="button button-primary acceptance-submit" type="submit" disabled={!accepted || submitting}>
                  {submitting ? <LoaderCircle size={17} className="acceptance-spinner" /> : <CheckCircle2 size={17} />}
                  {submitting ? "Registrando aceite…" : "Confirmar aceite"}
                </button>
                <p className="acceptance-disclaimer">
                  Este registro confirma seu aceite no sistema ÍGAS. Não é uma assinatura gov.br nem um certificado digital.
                </p>
              </form>
            )}
          </>
        ) : null}
      </section>
    </main>
  );
}
