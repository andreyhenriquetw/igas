import assert from "node:assert/strict";
import test from "node:test";
import { filterReportEntries, getReportRange, summarizeReport, type ReportEntry } from "./reports";

test("calcula períodos de relatório semanal, mensal e anual", () => {
  assert.deepEqual(getReportRange("2026-11-20", "week"), { from: "2026-11-15", to: "2026-11-22" });
  assert.deepEqual(getReportRange("2026-02-20", "month"), { from: "2026-02-01", to: "2026-03-01" });
  assert.deepEqual(getReportRange("2026-02-20", "year"), { from: "2026-01-01", to: "2027-01-01" });
});

test("resume pagamentos ativos e cancelamentos sem somar bloqueios", () => {
  const entries: ReportEntry[] = [
    {
      id: "paid",
      startsAt: "2026-03-03T12:00:00.000Z",
      endsAt: "2026-03-03T20:00:00.000Z",
      status: "CONFIRMED",
      guestName: "Pessoa paga",
      guestContact: "1111",
      totalAmount: 100,
      paidAmount: 100,
      modeName: "Day-use",
    },
    {
      id: "partial",
      startsAt: "2026-03-04T12:00:00.000Z",
      endsAt: "2026-03-04T20:00:00.000Z",
      status: "PENDING",
      guestName: "Pessoa parcial",
      guestContact: "2222",
      totalAmount: 200,
      paidAmount: 50,
      modeName: "Day-use",
    },
    {
      id: "cancelled",
      startsAt: "2026-03-05T12:00:00.000Z",
      endsAt: "2026-03-05T20:00:00.000Z",
      status: "CANCELLED",
      guestName: "Pessoa cancelada",
      guestContact: "3333",
      totalAmount: 80,
      paidAmount: 20,
      modeName: "Day-use",
    },
    {
      id: "blocked",
      startsAt: "2026-03-06T12:00:00.000Z",
      endsAt: "2026-03-06T20:00:00.000Z",
      status: "BLOCKED",
      guestName: null,
      guestContact: null,
      totalAmount: null,
      paidAmount: null,
      modeName: null,
    },
  ];

  const report = summarizeReport(entries, "2026-03-04", "month");
  assert.equal(report.totalReceived, 150);
  assert.equal(report.totalOutstanding, 150);
  assert.equal(report.activeContractValue, 300);
  assert.equal(report.fullyPaidCount, 1);
  assert.equal(report.openBalanceCount, 1);
  assert.equal(report.activeCount, 2);
  assert.equal(report.pendingConfirmationCount, 1);
  assert.equal(report.cancelledCount, 1);
  assert.equal(report.cancelledValue, 80);
  assert.equal(report.buckets[0]?.received, 150);
  assert.equal(report.buckets[0]?.cancelledCount, 1);
  assert.equal(report.byMode[0]?.activeCount, 2);
  assert.equal(report.byMode[0]?.cancelledCount, 1);
});

test("filtra reservas para cada lista detalhada sem incluir valores indevidos", () => {
  const entries: ReportEntry[] = [
    {
      id: "paid",
      startsAt: "2026-03-03T12:00:00.000Z",
      endsAt: "2026-03-03T20:00:00.000Z",
      status: "CONFIRMED",
      guestName: "Pago",
      guestContact: null,
      totalAmount: 100,
      paidAmount: 100,
      modeName: "Day-use",
    },
    {
      id: "open",
      startsAt: "2026-03-04T12:00:00.000Z",
      endsAt: "2026-03-04T20:00:00.000Z",
      status: "PENDING",
      guestName: "Em aberto",
      guestContact: null,
      totalAmount: 200,
      paidAmount: 50,
      modeName: "Day-use",
    },
    {
      id: "cancelled",
      startsAt: "2026-03-05T12:00:00.000Z",
      endsAt: "2026-03-05T20:00:00.000Z",
      status: "CANCELLED",
      guestName: "Cancelado",
      guestContact: null,
      totalAmount: 80,
      paidAmount: 20,
      modeName: "Day-use",
    },
  ];

  assert.deepEqual(filterReportEntries(entries, "received").map((entry) => entry.id), ["paid", "open"]);
  assert.deepEqual(filterReportEntries(entries, "outstanding").map((entry) => entry.id), ["open"]);
  assert.deepEqual(filterReportEntries(entries, "settled").map((entry) => entry.id), ["paid"]);
  assert.deepEqual(filterReportEntries(entries, "cancelled").map((entry) => entry.id), ["cancelled"]);
});

test("agrupa por dia na semana e por mês no ano usando o fuso de São Paulo", () => {
  const entries: ReportEntry[] = [
    {
      id: "week-entry",
      startsAt: "2026-11-15T03:00:00.000Z",
      endsAt: "2026-11-15T12:00:00.000Z",
      status: "CONFIRMED",
      guestName: null,
      guestContact: null,
      totalAmount: 100,
      paidAmount: 50,
      modeName: "Day-use",
    },
    {
      id: "year-entry",
      startsAt: "2026-12-31T23:00:00.000Z",
      endsAt: "2027-01-01T04:00:00.000Z",
      status: "CONFIRMED",
      guestName: null,
      guestContact: null,
      totalAmount: 200,
      paidAmount: 100,
      modeName: "Day-use",
    },
  ];

  const week = summarizeReport(entries.slice(0, 1), "2026-11-18", "week");
  assert.equal(week.buckets[0]?.label, "15/11");
  assert.equal(week.buckets[0]?.received, 50);

  const year = summarizeReport(entries.slice(1), "2026-06-15", "year");
  assert.equal(year.buckets[11]?.label, "dez");
  assert.equal(year.buckets[11]?.received, 100);
});
