import { NextResponse } from "next/server";
import { EntryKind, EntryStatus, Prisma } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth-helpers";
import { apiError, validationError } from "@/lib/api-error";
import { activeStatuses, findEntriesForPeriod, serializeEntry } from "@/lib/entries";
import { getPrisma } from "@/lib/prisma";
import { localDateTimeToUtc } from "@/lib/time";
import { entryInputSchema } from "@/lib/validation";

export async function GET(request: Request) {
  try {
    await requireUser();
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      return validationError("Informe um período de consulta válido.");
    }
    return NextResponse.json({ entries: await findEntriesForPeriod(from, to) });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body: unknown = await request.json();
    const parsed = entryInputSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error.issues[0]?.message ?? "Confira os dados.");

    const startsAt = localDateTimeToUtc(parsed.data.startsAt);
    const endsAt = localDateTimeToUtc(parsed.data.endsAt);
    if (!Number.isFinite(startsAt.getTime()) || !Number.isFinite(endsAt.getTime()) || startsAt >= endsAt) {
      return validationError("A saída deve ser posterior à entrada.");
    }

    const prisma = getPrisma();
    const kind = parsed.data.kind === "BOOKING" ? EntryKind.BOOKING : EntryKind.BLOCK;
    if (parsed.data.kind === "BOOKING") {
      const mode = await prisma.reservationMode.findFirst({
        where: { id: parsed.data.modeId, active: true },
        select: { id: true },
      });
      if (!mode) return validationError("A modalidade selecionada não está disponível.");
    }

    const conflict = await prisma.calendarEntry.findFirst({
      where: {
        status: { in: activeStatuses },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
      select: { id: true },
    });
    if (conflict) return NextResponse.json({ error: "Esse horário já está ocupado." }, { status: 409 });

    const data =
      parsed.data.kind === "BOOKING"
        ? {
            kind,
            status: parsed.data.status as EntryStatus,
            guestName: parsed.data.guestName,
            guestContact: parsed.data.guestContact,
            guestCpf: parsed.data.guestCpf || null,
            guestAddress: parsed.data.guestAddress || null,
            modeId: parsed.data.modeId,
            startsAt,
            endsAt,
            totalAmount: new Prisma.Decimal(parsed.data.totalAmount),
            paidAmount: new Prisma.Decimal(parsed.data.paidAmount),
            notes: parsed.data.notes,
            createdById: user.id,
          }
        : {
            kind,
            status: EntryStatus.BLOCKED,
            startsAt,
            endsAt,
            notes: parsed.data.notes,
            createdById: user.id,
          };

    const entry = await prisma.calendarEntry.create({
      data,
      include: { mode: true },
    });
    return NextResponse.json({ entry: serializeEntry(entry) }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
