import { NextResponse } from "next/server";
import { EntryKind } from "@/generated/prisma/enums";
import { apiError, validationError } from "@/lib/api-error";
import { requireUser } from "@/lib/auth-helpers";
import { getPrisma } from "@/lib/prisma";
import { localDayBoundaryToUtc } from "@/lib/time";

function isValidDay(value: string | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export async function GET(request: Request) {
  try {
    await requireUser();
    const { searchParams } = new URL(request.url);
    const fromValue = searchParams.get("from");
    const toValue = searchParams.get("to");
    if (!isValidDay(fromValue) || !isValidDay(toValue)) {
      return validationError("Informe um período de consulta válido.");
    }

    const startsAt = localDayBoundaryToUtc(fromValue);
    const endsAt = localDayBoundaryToUtc(toValue);
    if (
      startsAt >= endsAt
      || endsAt.getTime() - startsAt.getTime() > 370 * 86_400_000
    ) {
      return validationError("O período deve ter até um ano.");
    }

    const entries = await getPrisma().calendarEntry.findMany({
      where: {
        kind: EntryKind.BOOKING,
        startsAt: { gte: startsAt, lt: endsAt },
      },
      select: {
        startsAt: true,
        status: true,
        totalAmount: true,
        paidAmount: true,
        mode: { select: { name: true } },
      },
      orderBy: { startsAt: "asc" },
    });

    return NextResponse.json({
      entries: entries.map((entry) => ({
        startsAt: entry.startsAt.toISOString(),
        status: entry.status,
        totalAmount: entry.totalAmount ? Number(entry.totalAmount.toString()) : null,
        paidAmount: entry.paidAmount ? Number(entry.paidAmount.toString()) : null,
        modeName: entry.mode?.name ?? null,
      })),
    });
  } catch (error) {
    return apiError(error);
  }
}
