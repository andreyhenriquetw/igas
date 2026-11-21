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
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  getReportRange,
  filterReportEntries,
  summarizeReport,
  type ReportDetailCategory,
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
              {value > 0 && (
                <text
                  className="report-bar-value"
                  x={x + barWidth / 2}
                  y={Math.max(top + 10, y - 7)}
                  textAnchor="middle"
                >
                  {count ? String(value) : formatCurrency(value)}
                </text>
              )}
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
  const chartKind = count ? "cancelled" : metric;
  const statusLabel = count ? "Canceladas" : metric === "received" ? "Pagos" : "A receber";

  return (
    <article className={`report-chart-card report-chart-${chartKind} ${count ? "report-chart-cancellations" : ""}`}>
      <div className="report-chart-heading">
        <span className="report-chart-icon" style={{ color }} aria-hidden="true">
          {count ? <CircleX size={22} /> : metric === "received" ? <CircleDollarSign size={22} /> : <Clock3 size={22} />}
        </span>
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <span className="report-chart-status" style={{ color }} aria-label={statusLabel}>
          {count ? <CircleX size={15} /> : metric === "received" ? <BadgeCheck size={15} /> : <Clock3 size={15} />}
          {statusLabel}
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
  const [detailCategory, setDetailCategory] = useState<ReportDetailCategory | null>(null);
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
  const detailEntries = useMemo(
    () => entries && detailCategory ? filterReportEntries(entries, detailCategory) : [],
    [detailCategory, entries],
  );

  const detailContent = detailCategory ? {
    received: {
      eyebrow: "PAGAMENTOS REGISTRADOS",
      title: "Reservas com valores recebidos",
      description: "Clientes com pagamento informado neste período.",
      empty: "Nenhuma reserva com pagamento registrado neste período.",
      amountLabel: "Valor pago",
    },
    outstanding: {
      eyebrow: "SALDOS PENDENTES",
      title: "Reservas em aberto",
      description: "Clientes com saldo restante para pagar.",
      empty: "Nenhuma reserva com saldo em aberto neste período.",
      amountLabel: "Falta pagar",
    },
    settled: {
      eyebrow: "PAGAMENTO INTEGRAL",
      title: "Reservas quitadas",
      description: "Clientes que já quitaram o valor total da reserva.",
      empty: "Nenhuma reserva quitada neste período.",
      amountLabel: "Total pago",
    },
    cancelled: {
      eyebrow: "RESERVAS CANCELADAS",
      title: "Cancelamentos",
      description: "Clientes com reservas canceladas neste período.",
      empty: "Nenhuma reserva cancelada neste período.",
      amountLabel: "Valor contratado",
    },
  }[detailCategory] : null;

  useEffect(() => {
    if (!detailCategory) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setDetailCategory(null);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [detailCategory]);

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
            <button className="report-kpi report-kpi-received" type="button" aria-haspopup="dialog" onClick={() => setDetailCategory("received")}>
              <span className="stat-icon"><Wallet size={18} /></span>
              <span className="stat-content">
                <span className="stat-label">Recebido</span>
                <strong>{formatCurrency(summary.totalReceived)}</strong>
                <span className="report-kpi-description">Valores pagos em reservas ativas</span>
              </span>
            </button>
            <button className="report-kpi report-kpi-outstanding" type="button" aria-haspopup="dialog" onClick={() => setDetailCategory("outstanding")}>
              <span className="stat-icon"><Clock3 size={18} /></span>
              <span className="stat-content">
                <span className="stat-label">Em aberto</span>
                <strong>{formatCurrency(summary.totalOutstanding)}</strong>
                <span className="report-kpi-description">Saldo restante das reservas ativas</span>
              </span>
            </button>
            <button className="report-kpi report-kpi-settled" type="button" aria-haspopup="dialog" onClick={() => setDetailCategory("settled")}>
              <span className="stat-icon"><BadgeCheck size={18} /></span>
              <span className="stat-content">
                <span className="stat-label">Reservas quitadas</span>
                <strong>{summary.fullyPaidCount}</strong>
                <span className="report-kpi-description">Pagamento integral informado</span>
              </span>
            </button>
            <button className="report-kpi report-kpi-cancelled" type="button" aria-haspopup="dialog" onClick={() => setDetailCategory("cancelled")}>
              <span className="stat-icon"><CircleX size={18} /></span>
              <span className="stat-content">
                <span className="stat-label">Cancelamentos</span>
                <strong>{summary.cancelledCount}</strong>
                <span className="report-kpi-description">{formatCurrency(summary.cancelledValue)} em reservas canceladas</span>
              </span>
            </button>
          </section>

          {detailCategory && detailContent && (
            <div className="modal-backdrop" onMouseDown={(event) => {
              if (event.target === event.currentTarget) setDetailCategory(null);
            }}>
              <section className={`modal-card report-detail-modal report-detail-${detailCategory}`} role="dialog" aria-modal="true" aria-labelledby="report-detail-title">
                <div className="modal-heading">
                  <span className="report-detail-heading-icon" aria-hidden="true">
                    {detailCategory === "received" ? <Wallet size={24} />
                      : detailCategory === "outstanding" ? <Clock3 size={24} />
                        : detailCategory === "settled" ? <BadgeCheck size={24} />
                          : <CircleX size={24} />}
                  </span>
                  <div>
                    <p className="eyebrow">{detailContent.eyebrow}</p>
                    <h2 id="report-detail-title">{detailContent.title}</h2>
                    <p className="report-detail-description">{detailContent.description} <span>{rangeLabel}</span></p>
                  </div>
                  <button
                    className="icon-button"
                    type="button"
                    autoFocus
                    onClick={() => setDetailCategory(null)}
                    aria-label="Fechar detalhes"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="report-detail-summary">
                  <strong>{detailEntries.length}</strong>
                  <span>{detailEntries.length === 1 ? "reserva encontrada" : "reservas encontradas"}</span>
                </div>
                {detailEntries.length === 0 ? (
                  <p className="report-detail-empty">{detailContent.empty}</p>
                ) : (
                  <ul className="report-detail-list">
                    {detailEntries.map((entry) => {
                      const total = Math.max(0, entry.totalAmount ?? 0);
                      const paid = Math.max(0, entry.paidAmount ?? 0);
                      const outstanding = Math.max(0, total - paid);
                      const amount = detailCategory === "outstanding"
                        ? outstanding
                        : detailCategory === "cancelled" ? total : paid;

                      return (
                        <li className="report-detail-item" key={entry.id}>
                          <div className="report-detail-person">
                            <strong>{entry.guestName?.trim() || "Cliente não identificado"}</strong>
                            <span>{entry.guestContact?.trim() || "Contato não informado"}</span>
                          </div>
                          <div className="report-detail-booking">
                            <span>
                              {formatLocalDateTime(entry.startsAt, "dd/MM 'às' HH:mm")}
                              {" – "}
                              {formatLocalDateTime(entry.endsAt, "dd/MM 'às' HH:mm")}
                            </span>
                            <span>{entry.modeName?.trim() || "Sem modalidade"}</span>
                          </div>
                          <div className="report-detail-amount">
                            <small>{detailContent.amountLabel}</small>
                            <strong
                              className={detailCategory === "outstanding" ? "report-detail-open-amount" : undefined}
                              style={detailCategory === "outstanding" ? { color: "var(--amber)" } : undefined}
                            >
                              {formatCurrency(amount)}
                            </strong>
                            {detailCategory === "received" && outstanding > 0 && (
                              <span className="report-detail-balance">
                                <small>Falta pagar</small>
                                <strong>{formatCurrency(outstanding)}</strong>
                              </span>
                            )}
                          </div>
                          {detailCategory === "cancelled" && (
                            <p className="report-detail-note">Valor contratado; não representa estorno.</p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </div>
          )}

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
            <div className="report-quick-active">
              <span className="report-quick-icon"><BadgeCheck size={17} /></span>
              <span>Reservas ativas</span>
              <strong>{summary.activeCount}</strong>
            </div>
            <div className="report-quick-pending">
              <span className="report-quick-icon"><Clock3 size={17} /></span>
              <span>Aguardando confirmação</span>
              <strong>{summary.pendingConfirmationCount}</strong>
            </div>
            <div className="report-quick-open">
              <span className="report-quick-icon"><CircleDollarSign size={17} /></span>
              <span>Com saldo em aberto</span>
              <strong>{summary.openBalanceCount}</strong>
            </div>
            <div className="report-quick-percent">
              <span className="report-quick-icon"><Wallet size={17} /></span>
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
