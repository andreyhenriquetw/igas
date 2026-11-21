import { formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import { TIME_ZONE } from "@/lib/time";

export type ReportPeriod = "week" | "month" | "year";

export type ReportEntry = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "BLOCKED";
  guestName: string | null;
  guestContact: string | null;
  totalAmount: number | null;
  paidAmount: number | null;
  modeName: string | null;
};

export type ReportDetailCategory = "received" | "outstanding" | "settled" | "cancelled";

type ReportBucket = {
  key: string;
  label: string;
  received: number;
  outstanding: number;
  cancelledCount: number;
  cancelledValue: number;
};

type ModeSummary = {
  name: string;
  activeCount: number;
  pendingCount: number;
  paidCount: number;
  received: number;
  outstanding: number;
  cancelledCount: number;
};

export type ReportSummary = {
  totalReceived: number;
  totalOutstanding: number;
  activeContractValue: number;
  fullyPaidCount: number;
  openBalanceCount: number;
  activeCount: number;
  pendingConfirmationCount: number;
  cancelledCount: number;
  cancelledValue: number;
  buckets: ReportBucket[];
  byMode: ModeSummary[];
};

export function getReportRange(referenceDay: string, period: ReportPeriod) {
  const date = new Date(`${referenceDay}T12:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== referenceDay) {
    throw new RangeError("A data de referência do relatório é inválida.");
  }

  if (period === "week") {
    date.setUTCDate(date.getUTCDate() - date.getUTCDay());
    const from = date.toISOString().slice(0, 10);
    date.setUTCDate(date.getUTCDate() + 7);
    return { from, to: date.toISOString().slice(0, 10) };
  }

  if (period === "month") {
    date.setUTCDate(1);
    const from = date.toISOString().slice(0, 10);
    date.setUTCMonth(date.getUTCMonth() + 1);
    return { from, to: date.toISOString().slice(0, 10) };
  }

  date.setUTCMonth(0, 1);
  const from = date.toISOString().slice(0, 10);
  date.setUTCFullYear(date.getUTCFullYear() + 1);
  return { from, to: date.toISOString().slice(0, 10) };
}

export function filterReportEntries(entries: ReportEntry[], category: ReportDetailCategory) {
  return entries.filter((entry) => {
    if (category === "cancelled") return entry.status === "CANCELLED";
    if (entry.status !== "PENDING" && entry.status !== "CONFIRMED") return false;

    const total = Math.max(0, entry.totalAmount ?? 0);
    const paid = Math.max(0, entry.paidAmount ?? 0);
    if (category === "received") return paid > 0;
    if (category === "outstanding") return total - paid > 0;
    return total > 0 && paid >= total;
  });
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(day: string, amount: number) {
  const date = new Date(`${day}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return dayKey(date);
}

function getBuckets(referenceDay: string, period: ReportPeriod): ReportBucket[] {
  const range = getReportRange(referenceDay, period);
  if (period === "week") {
    return Array.from({ length: 7 }, (_, index) => {
      const key = addDays(range.from, index);
      return {
        key,
        label: formatInTimeZone(`${key}T12:00:00.000Z`, "UTC", "dd/MM", { locale: ptBR }),
        received: 0,
        outstanding: 0,
        cancelledCount: 0,
        cancelledValue: 0,
      };
    });
  }

  if (period === "month") {
    const daysInMonth = (
      new Date(`${range.to}T12:00:00.000Z`).getTime()
      - new Date(`${range.from}T12:00:00.000Z`).getTime()
    ) / 86_400_000;
    return Array.from({ length: Math.ceil(daysInMonth / 7) }, (_, index) => {
      const firstDay = index * 7 + 1;
      const lastDay = Math.min(firstDay + 6, daysInMonth);
      return {
        key: String(firstDay),
        label: `${firstDay}–${lastDay}`,
        received: 0,
        outstanding: 0,
        cancelledCount: 0,
        cancelledValue: 0,
      };
    });
  }

  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(`${range.from}T12:00:00.000Z`);
    date.setUTCMonth(index);
    const key = dayKey(date);
    return {
      key,
      label: formatInTimeZone(`${key}T12:00:00.000Z`, "UTC", "MMM", { locale: ptBR }).replace(".", ""),
      received: 0,
      outstanding: 0,
      cancelledCount: 0,
      cancelledValue: 0,
    };
  });
}

export function summarizeReport(entries: ReportEntry[], referenceDay: string, period: ReportPeriod): ReportSummary {
  const buckets = getBuckets(referenceDay, period);
  const byMode = new Map<string, ModeSummary>();
  const summary: Omit<ReportSummary, "buckets" | "byMode"> = {
    totalReceived: 0,
    totalOutstanding: 0,
    activeContractValue: 0,
    fullyPaidCount: 0,
    openBalanceCount: 0,
    activeCount: 0,
    pendingConfirmationCount: 0,
    cancelledCount: 0,
    cancelledValue: 0,
  };

  for (const entry of entries) {
    if (entry.status !== "CANCELLED" && entry.status !== "PENDING" && entry.status !== "CONFIRMED") continue;

    const total = Math.max(0, entry.totalAmount ?? 0);
    const paid = Math.max(0, entry.paidAmount ?? 0);
    const modeName = entry.modeName?.trim() || "Sem modalidade";
    let mode = byMode.get(modeName);
    if (!mode) {
      mode = {
        name: modeName,
        activeCount: 0,
        pendingCount: 0,
        paidCount: 0,
        received: 0,
        outstanding: 0,
        cancelledCount: 0,
      };
      byMode.set(modeName, mode);
    }

    const entryDay = formatInTimeZone(entry.startsAt, TIME_ZONE, "yyyy-MM-dd");
    const bucket = period === "week"
      ? buckets.find((item) => item.key === entryDay)
      : period === "month"
        ? buckets.find((item) => Number(entryDay.slice(8, 10)) >= Number(item.key)
          && Number(entryDay.slice(8, 10)) <= Number(item.key) + 6)
        : buckets.find((item) => item.key.slice(0, 7) === entryDay.slice(0, 7));

    if (entry.status === "CANCELLED") {
      summary.cancelledCount += 1;
      summary.cancelledValue += total;
      mode.cancelledCount += 1;
      if (bucket) {
        bucket.cancelledCount += 1;
        bucket.cancelledValue += total;
      }
      continue;
    }

    const outstanding = Math.max(0, total - paid);
    summary.activeCount += 1;
    summary.totalReceived += paid;
    summary.totalOutstanding += outstanding;
    summary.activeContractValue += total;
    mode.activeCount += 1;
    mode.received += paid;
    mode.outstanding += outstanding;

    if (entry.status === "PENDING") {
      summary.pendingConfirmationCount += 1;
      mode.pendingCount += 1;
    }
    if (total > 0 && paid >= total) {
      summary.fullyPaidCount += 1;
      mode.paidCount += 1;
    }
    if (outstanding > 0) summary.openBalanceCount += 1;
    if (bucket) {
      bucket.received += paid;
      bucket.outstanding += outstanding;
    }
  }

  return {
    ...summary,
    buckets,
    byMode: [...byMode.values()].sort((a, b) => b.activeCount + b.cancelledCount - a.activeCount - a.cancelledCount),
  };
}
