"use client";

import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  CircleDollarSign,
  CircleX,
  Clock3,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  getReportRange,
  summarizeReport,
  type ReportEntry,
  type ReportPeriod,
  type ReportSummary,
} from "@/lib/reports";
import { formatLocalDateTime, localDayBoundaryToUtc } from "@/lib/time";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function formatCurrency(value: number) {
  return currency.format(value);
}

function formatCompactNumber(value: number) {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  }
  return Math.round(value).toLocaleString("pt-BR");
}

function formatRangeLabel(range: { from: string; to: string }, period: ReportPeriod) {
  const firstDay = localDayBoundaryToUtc(range.from);
  if (period === "year") return formatLocalDateTime(firstDay, "yyyy");
  if (period === "month") return formatLocalDateTime(firstDay, "MMMM 'de' yyyy");
  const lastDay = localDayBoundaryToUtc(range.to);
  lastDay.setUTCDate(lastDay.getUTCDate() - 1);
  return `${formatLocalDateTime(firstDay, "d 'de' MMM")} – ${formatLocalDateTime(lastDay, "d 'de' MMM 'de' yyyy")}`;
}

function exportReport(summary: ReportSummary, rangeLabel: string, range: { from: string; to: string }) {
  const rows = [
    ["Relatório financeiro ÍGAS", rangeLabel],
    [],
    ["Indicador", "Valor"],
    ["Recebido em reservas ativas", summary.totalReceived.toFixed(2).replace(".", ",")],
    ["Saldo a receber", summary.totalOutstanding.toFixed(2).replace(".", ",")],
    ["Valor contratado ativo", summary.activeContractValue.toFixed(2).replace(".", ",")],
    ["Reservas quitadas", String(summary.fullyPaidCount)],
    ["Reservas ativas", String(summary.activeCount)],
    ["Aguardando confirmação", String(summary.pendingConfirmationCount)],
    ["Reservas com saldo em aberto", String(summary.openBalanceCount)],
    ["Reservas canceladas", String(summary.cancelledCount)],
    ["Valor contratado cancelado (não representa estorno)", summary.cancelledValue.toFixed(2).replace(".", ",")],
    [],
    ["Faixa", "Recebido (R$)", "Em aberto (R$)", "Cancelamentos", "Valor cancelado (R$)"],
    ...summary.buckets.map((bucket) => [
      bucket.label,
      bucket.received.toFixed(2).replace(".", ","),
      bucket.outstanding.toFixed(2).replace(".", ","),
      String(bucket.cancelledCount),
      bucket.cancelledValue.toFixed(2).replace(".", ","),
    ]),
    [],
    ["Modalidade", "Ativas", "Aguardando confirmação", "Quitadas", "Recebido (R$)", "Em aberto (R$)", "Canceladas"],
    ...summary.byMode.map((mode) => [
      mode.name,
      String(mode.activeCount),
      String(mode.pendingCount),
      String(mode.paidCount),
      mode.received.toFixed(2).replace(".", ","),
      mode.outstanding.toFixed(2).replace(".", ","),
      String(mode.cancelledCount),
    ]),
  ];
  const csvCell = (value: string) => {
    const safeValue = /^[\s]*[=+\-@]/.test(value) ? `'${value}` : value;
    return `"${safeValue.replaceAll('"', '""')}"`;
  };
  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(";")).join("\r\n")}`;
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `relatorio-igas-${range.from}-${range.to}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function ReportBarChart({
  title,
  buckets,
  metric,
  color,
  count = false,
}: {
  title: string;
  buckets: ReportSummary["buckets"];
  metric: "received" | "outstanding" | "cancelledCount";
  color: string;
  count?: boolean;
}) {
  const width = 420;
  const height = 250;
  const left = 55;
  const right = 12;
  const top = 14;
  const bottom = 45;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const baseline = top + plotHeight;
  const values = buckets.map((bucket) => bucket[metric]);
  const largest = Math.max(0, ...values);
  const step = Math.max(1, Math.ceil(largest / 4));
  const max = step * 4;
  const slot = plotWidth / Math.max(1, buckets.length);
  const barWidth = Math.min(34, slot * 0.58);

  function axisLabel(value: number) {
    return count ? String(value) : `R$ ${formatCompactNumber(value)}`;
  }

  function valueLabel(value: number) {
    if (metric === "cancelledCount") return `${value} ${value === 1 ? "reserva" : "reservas"}`;
    return formatCurrency(value);
  }

  return (
    <div className="report-chart-wrap">
      <svg
        className="report-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={title}
        preserveAspectRatio="none"
      >
        <title>{title}</title>
        <desc>{buckets.map((bucket) => `${bucket.label}: ${valueLabel(bucket[metric])}`).join(". ")}</desc>
        {Array.from({ length: 5 }, (_, index) => {
          const value = max - (step * index);
          const y = top + (plotHeight * index) / 4;
          return (
            <g key={value}>
              <line className="report-grid-line" x1={left} x2={width - right} y1={y} y2={y} />
              <text className="report-axis-label" x={left - 8} y={y + 3} textAnchor="end">
                {axisLabel(value)}
              </text>
            </g>
          );
        })}
        {buckets.map((bucket, index) => {
          const value = bucket[metric];
          const barHeight = (value / max) * plotHeight;
          const x = left + slot * index + (slot - barWidth) / 2;
          const y = baseline - barHeight;
          return (
            <g key={bucket.key}>
              <rect
                className="report-bar"
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(value > 0 ? 2 : 0, barHeight)}
                rx={5}
                fill={color}
                style={{ animationDelay: `${index * 35}ms` }}
              >
                <title>{`${bucket.label}: ${valueLabel(value)}`}</title>
              </rect>
              <text className="report-axis-label report-bucket-label" x={left + slot * index + slot / 2} y={height - 13} textAnchor="middle">
                {bucket.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function ChartPanel({
  title,
  description,
  value,
  detail,
  buckets,
  metric,
  color,
  count = false,
}: {
  title: string;
  description: string;
  value: string;
  detail: string;
  buckets: ReportSummary["buckets"];
  metric: "received" | "outstanding" | "cancelledCount";
  color: string;
  count?: boolean;
}) {
  return (
    <article className={`report-chart-card ${count ? "report-chart-cancellations" : ""}`}>
      <div className="report-chart-heading">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <span className="report-chart-icon" style={{ color }} aria-hidden="true">
          {count ? <CircleX size={18} /> : <CircleDollarSign size={18} />}
        </span>
      </div>
      <strong className="report-chart-total">{value}</strong>
      <span className="report-chart-detail">{detail}</span>
      <ReportBarChart title={title} buckets={buckets} metric={metric} color={color} count={count} />
    </article>
  );
}

function ReportSkeleton() {
  return (
    <div className="reports-loading" role="status">
      <span className="visually-hidden">Carregando relatórios financeiros…</span>
      <div className="report-kpis">
        {Array.from({ length: 4 }, (_, index) => <div className="report-skeleton report-skeleton-kpi" key={index} />)}
      </div>
      <div className="report-chart-grid">
        {Array.from({ length: 3 }, (_, index) => <div className="report-skeleton report-skeleton-chart" key={index} />)}
      </div>
      <div className="report-skeleton report-skeleton-table" />
    </div>
  );
}

export function ReportsDashboard() {
  const [period, setPeriod] = useState<ReportPeriod>("month");
  const [referenceDay, setReferenceDay] = useState(() => formatLocalDateTime(new Date(), "yyyy-MM-dd"));
  const [result, setResult] = useState<{ key: string; entries: ReportEntry[] } | null>(null);
  const [requestError, setRequestError] = useState<{ key: string; message: string } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const range = getReportRange(referenceDay, period);
  const rangeLabel = formatRangeLabel(range, period);
  const requestKey = `${range.from}:${range.to}:${refreshKey}`;
  const entries = result?.key === requestKey ? result.entries : null;
  const error = requestError?.key === requestKey ? requestError.message : "";
  const loading = entries === null && !error;
  const summary = useMemo(
    () => entries ? summarizeReport(entries, referenceDay, period) : null,
    [entries, period, referenceDay],
  );

  useEffect(() => {
    const controller = new AbortController();
    const key = `${range.from}:${range.to}:${refreshKey}`;

    void fetch(`/api/reports?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = await response.json() as { entries?: ReportEntry[]; error?: string };
        if (!response.ok) throw new Error(result.error ?? "Não foi possível carregar os relatórios.");
        if (!Array.isArray(result.entries)) throw new Error("A resposta dos relatórios está incompleta.");
        setResult({ key, entries: result.entries });
      })
      .catch((loadError: unknown) => {
        if (controller.signal.aborted) return;
        setRequestError({
          key,
          message: loadError instanceof Error ? loadError.message : "Não foi possível carregar os relatórios.",
        });
      });

    return () => controller.abort();
  }, [range.from, range.to, refreshKey]);

  function navigatePeriod(direction: -1 | 1) {
    setReferenceDay((current) => {
      const date = new Date(`${current}T12:00:00.000Z`);
      if (period === "week") {
        date.setUTCDate(date.getUTCDate() + direction * 7);
      } else if (period === "month") {
        date.setUTCDate(1);
        date.setUTCMonth(date.getUTCMonth() + direction);
      } else {
        date.setUTCMonth(0, 1);
        date.setUTCFullYear(date.getUTCFullYear() + direction);
      }
      return date.toISOString().slice(0, 10);
    });
  }

  return (
    <main className="app-main reports-main">
      <section className="page-intro reports-intro">
        <div>
          <p className="eyebrow">VISÃO FINANCEIRA</p>
          <h1>Relatórios</h1>
          <p className="muted">Acompanhe pagamentos, valores em aberto e cancelamentos.</p>
        </div>
        <button
          className="button button-secondary report-export"
          type="button"
          disabled={!summary || loading}
          onClick={() => summary && exportReport(summary, rangeLabel, range)}
        >
          <ArrowDownToLine size={16} /> Exportar CSV
        </button>
      </section>

      <section className="report-toolbar" aria-label="Filtros do relatório">
        <div className="report-period-tabs" role="group" aria-label="Agrupar relatórios por">
          {([
            ["week", "Semana"],
            ["month", "Mês"],
            ["year", "Ano"],
          ] as const).map(([value, label]) => (
            <button
              className={period === value ? "report-period-tab selected" : "report-period-tab"}
              key={value}
              type="button"
              aria-pressed={period === value}
              onClick={() => setPeriod(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="report-period-navigation">
          <button className="icon-button" type="button" onClick={() => navigatePeriod(-1)} aria-label="Período anterior">
            <ArrowLeft size={17} />
          </button>
          <strong aria-live="polite">{rangeLabel}</strong>
          <button className="icon-button" type="button" onClick={() => navigatePeriod(1)} aria-label="Próximo período">
            <ArrowRight size={17} />
          </button>
          <label className="report-date-picker">
            <CalendarDays size={16} aria-hidden="true" />
            <span className="visually-hidden">Escolher data de referência</span>
            <input
              type="date"
              value={referenceDay}
              onChange={(event) => {
                if (event.target.value) setReferenceDay(event.target.value);
              }}
            />
          </label>
        </div>
      </section>

      <p className="report-period-note">
        {period === "week" ? "Visão diária da semana selecionada."
          : period === "month" ? "Visão semanal do mês selecionado."
            : "Visão mensal do ano selecionado."}
        {" "}Os valores são organizados pela data de entrada da reserva.
      </p>

      {error ? (
        <div className="report-error" role="alert">
          <div><CircleX size={18} /><span>{error}</span></div>
          <button className="button button-secondary" type="button" onClick={() => setRefreshKey((current) => current + 1)}>
            <RefreshCw size={15} /> Tentar novamente
          </button>
        </div>
      ) : loading || !summary ? (
        <ReportSkeleton />
      ) : (
        <>
          <section className="report-kpis" aria-label="Indicadores financeiros do período">
            <article className="report-kpi report-kpi-received">
              <div className="report-kpi-heading"><span>Recebido</span><Wallet size={18} /></div>
              <strong>{formatCurrency(summary.totalReceived)}</strong>
              <p>Valores pagos em reservas ativas</p>
            </article>
            <article className="report-kpi report-kpi-outstanding">
              <div className="report-kpi-heading"><span>Em aberto</span><Clock3 size={18} /></div>
              <strong>{formatCurrency(summary.totalOutstanding)}</strong>
              <p>Saldo restante das reservas ativas</p>
            </article>
            <article className="report-kpi report-kpi-settled">
              <div className="report-kpi-heading"><span>Reservas quitadas</span><BadgeCheck size={18} /></div>
              <strong>{summary.fullyPaidCount}</strong>
              <p>Pagamento integral informado</p>
            </article>
            <article className="report-kpi report-kpi-cancelled">
              <div className="report-kpi-heading"><span>Cancelamentos</span><CircleX size={18} /></div>
              <strong>{summary.cancelledCount}</strong>
              <p>{formatCurrency(summary.cancelledValue)} em reservas canceladas</p>
            </article>
          </section>

          <section className="report-chart-grid" aria-label="Gráficos do período">
            <ChartPanel
              title="Valores já pagos"
              description="Valor informado como pago, agrupado pela data de entrada."
              value={formatCurrency(summary.totalReceived)}
              detail="Total registrado como pago"
              buckets={summary.buckets}
              metric="received"
              color="var(--report-paid)"
            />
            <ChartPanel
              title="Valores a receber"
              description="Saldo restante nas reservas não canceladas."
              value={formatCurrency(summary.totalOutstanding)}
              detail={`${summary.openBalanceCount} ${summary.openBalanceCount === 1 ? "reserva com saldo" : "reservas com saldo"}`}
              buckets={summary.buckets}
              metric="outstanding"
              color="var(--report-open)"
            />
            <ChartPanel
              title="Reservas canceladas"
              description="Quantidade de reservas canceladas por período."
              value={String(summary.cancelledCount)}
              detail={`${formatCurrency(summary.cancelledValue)} em valores contratados`}
              buckets={summary.buckets}
              metric="cancelledCount"
              color="var(--report-cancelled)"
              count
            />
          </section>

          <section className="report-quick-summary" aria-label="Resumo operacional">
            <div><span>Reservas ativas</span><strong>{summary.activeCount}</strong></div>
            <div><span>Aguardando confirmação</span><strong>{summary.pendingConfirmationCount}</strong></div>
            <div><span>Com saldo em aberto</span><strong>{summary.openBalanceCount}</strong></div>
            <div>
              <span>Percentual recebido</span>
              <strong>{summary.activeContractValue > 0
                ? `${Math.round((summary.totalReceived / summary.activeContractValue) * 100)}%`
                : "—"}</strong>
            </div>
          </section>

          <section className="report-breakdown">
            <div className="report-section-heading">
              <div>
                <p className="eyebrow">DETALHAMENTO</p>
                <h2>Resultado por modalidade</h2>
              </div>
              <span>{rangeLabel}</span>
            </div>
            <div className="report-table-scroll">
              <table className="report-table">
                <thead>
                  <tr>
                    <th scope="col">Modalidade</th>
                    <th scope="col">Ativas</th>
                    <th scope="col">Pend. confirmação</th>
                    <th scope="col">Quitadas</th>
                    <th scope="col">Recebido</th>
                    <th scope="col">Em aberto</th>
                    <th scope="col">Canceladas</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.byMode.length === 0 ? (
                    <tr><td className="report-empty-row" colSpan={7}>Nenhuma reserva encontrada neste período.</td></tr>
                  ) : summary.byMode.map((mode) => (
                    <tr key={mode.name}>
                      <th scope="row">{mode.name}</th>
                      <td>{mode.activeCount}</td>
                      <td>{mode.pendingCount}</td>
                      <td>{mode.paidCount}</td>
                      <td>{formatCurrency(mode.received)}</td>
                      <td>{formatCurrency(mode.outstanding)}</td>
                      <td>{mode.cancelledCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <p className="report-footnote">
            Os valores recebidos e em aberto consideram somente reservas não canceladas. O valor associado a cancelamentos é o valor contratado antes do cancelamento e não representa um estorno.
          </p>
        </>
      )}
    </main>
  );
}
