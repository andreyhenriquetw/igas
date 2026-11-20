import { EntryKind, EntryStatus } from "@/generated/prisma/enums";
import type { CalendarEntry, ReservationMode } from "@/generated/prisma/client";
import { localDayBoundaryToUtc } from "@/lib/time";
import { getPrisma } from "@/lib/prisma";
import type { CalendarEntryDto } from "@/types/calendar";

export function serializeEntry(
  entry: CalendarEntry & { mode: ReservationMode | null },
): CalendarEntryDto {
  const contractAcceptanceStatus = entry.contractAcceptedAt
    ? "ACCEPTED"
    : entry.contractAcceptanceExpiresAt
      ? entry.contractAcceptanceExpiresAt > new Date()
        ? "PENDING"
        : "EXPIRED"
      : "NONE";

  return {
    ...entry,
    startsAt: entry.startsAt.toISOString(),
    endsAt: entry.endsAt.toISOString(),
    totalAmount: entry.totalAmount ? Number(entry.totalAmount.toString()) : null,
    paidAmount: entry.paidAmount ? Number(entry.paidAmount.toString()) : null,
    contractAcceptanceStatus,
    contractAcceptanceExpiresAt: entry.contractAcceptanceExpiresAt?.toISOString() ?? null,
    landlordAcceptedAt: getLandlordAcceptedAt(entry.kind, entry.createdAt),
    contractAcceptedAt: entry.contractAcceptedAt?.toISOString() ?? null,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
}

export function getLandlordAcceptedAt(kind: EntryKind, createdAt: Date): string | null {
  return kind === EntryKind.BOOKING ? createdAt.toISOString() : null;
}

export async function findEntriesForPeriod(from: string, to: string) {
  const validDate = (value: string) => {
    const date = new Date(`${value}T12:00:00.000Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  };
  if (!validDate(from) || !validDate(to)) throw new Error("INVALID_PERIOD");

  const startsAt = localDayBoundaryToUtc(from);
  const endsAt = localDayBoundaryToUtc(to);
  if (!Number.isFinite(startsAt.getTime()) || !Number.isFinite(endsAt.getTime()) || startsAt >= endsAt) {
    throw new Error("INVALID_PERIOD");
  }

  const entries = await getPrisma().calendarEntry.findMany({
    where: {
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
    },
    include: { mode: true },
    orderBy: { startsAt: "asc" },
  });
  return entries.map(serializeEntry);
}

export const activeStatuses = [
  EntryStatus.PENDING,
  EntryStatus.CONFIRMED,
  EntryStatus.BLOCKED,
];
