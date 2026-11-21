import { NextResponse } from "next/server";
import { EntryKind, EntryStatus, Prisma } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth-helpers";
import { apiError, validationError } from "@/lib/api-error";
import { activeStatuses, serializeEntry } from "@/lib/entries";
import { getPrisma } from "@/lib/prisma";
import { localDateTimeToUtc } from "@/lib/time";
import { entryInputSchema, entryPatchSchema } from "@/lib/validation";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireUser();
    const { id } = await context.params;
    const entry = await getPrisma().calendarEntry.findUnique({
      where: { id },
      include: { mode: true },
    });
    if (!entry) return NextResponse.json({ error: "Esta entrada não foi encontrada." }, { status: 404 });
    return NextResponse.json({ entry: serializeEntry(entry) });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireUser();
    const { id } = await context.params;
    const body: unknown = await request.json();
    const parsed = entryPatchSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error.issues[0]?.message ?? "Confira os dados.");

    const prisma = getPrisma();
    const existing = await prisma.calendarEntry.findUnique({
      where: { id },
      select: { kind: true, totalAmount: true },
    });
    if (!existing) return NextResponse.json({ error: "Esta entrada não foi encontrada." }, { status: 404 });
    if (existing.kind === EntryKind.BLOCK && parsed.data.status !== undefined && parsed.data.status !== "CANCELLED") {
      return validationError("Um bloqueio só pode ser liberado.");
    }
    if (parsed.data.paidAmount !== undefined) {
      if (existing.kind !== EntryKind.BOOKING || existing.totalAmount === null) {
        return validationError("Só é possível registrar pagamento em uma reserva.");
      }
      if (parsed.data.paidAmount > Number(existing.totalAmount.toString())) {
        return validationError("O valor pago não pode ser maior que o valor total.");
      }
    }

    const entry = await prisma.$transaction(async (transaction) => {
      if (parsed.data.status === "CANCELLED" && existing.kind === EntryKind.BOOKING) {
        await transaction.contractAcceptance.updateMany({
          where: { entryId: id, acceptedAt: null, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      return transaction.calendarEntry.update({
        where: { id },
        data: {
          ...(parsed.data.status !== undefined && { status: parsed.data.status as EntryStatus }),
          ...(parsed.data.paidAmount !== undefined && { paidAmount: new Prisma.Decimal(parsed.data.paidAmount) }),
          ...(parsed.data.status === "CANCELLED" && { contractAcceptanceExpiresAt: null }),
        },
        include: { mode: true },
      });
    });
    return NextResponse.json({ entry: serializeEntry(entry) });
  } catch (error) {
    return apiError(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    await requireUser();
    const { id } = await context.params;
    const body: unknown = await request.json();
    const parsed = entryInputSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error.issues[0]?.message ?? "Confira os dados.");

    const startsAt = localDateTimeToUtc(parsed.data.startsAt);
    const endsAt = localDateTimeToUtc(parsed.data.endsAt);
    if (!Number.isFinite(startsAt.getTime()) || !Number.isFinite(endsAt.getTime()) || startsAt >= endsAt) {
      return validationError("A saída deve ser posterior à entrada.");
    }

    const prisma = getPrisma();
    const existing = await prisma.calendarEntry.findUnique({ where: { id }, select: { kind: true, modeId: true } });
    if (!existing) return NextResponse.json({ error: "Esta entrada não foi encontrada." }, { status: 404 });
    if ((parsed.data.kind === "BOOKING") !== (existing.kind === EntryKind.BOOKING)) {
      return validationError("Não é possível alterar o tipo desta entrada.");
    }

    if (parsed.data.kind === "BOOKING") {
      const mode = await prisma.reservationMode.findFirst({
        where: {
          id: parsed.data.modeId,
          OR: existing.modeId
            ? [{ active: true }, { id: existing.modeId }]
            : [{ active: true }],
        },
        select: { id: true },
      });
      if (!mode) return validationError("A modalidade selecionada não está disponível.");
    }

    const conflict = await prisma.calendarEntry.findFirst({
      where: {
        id: { not: id },
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
          }
        : {
            status: EntryStatus.BLOCKED,
            startsAt,
            endsAt,
            notes: parsed.data.notes,
          };

    const entry = await prisma.$transaction(async (transaction) => {
      await transaction.contractAcceptance.updateMany({
        where: { entryId: id, acceptedAt: null, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return transaction.calendarEntry.update({
        where: { id },
        data: {
          ...data,
          contractRevision: { increment: 1 },
          contractAcceptanceExpiresAt: null,
          contractAcceptedAt: null,
          contractAcceptedName: null,
        },
        include: { mode: true },
      });
    });
    return NextResponse.json({ entry: serializeEntry(entry) });
  } catch (error) {
    return apiError(error);
  }
}
