import { NextResponse } from "next/server";
import { ContractStatus, EntryKind } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth-helpers";
import { apiError, validationError } from "@/lib/api-error";
import { serializeEntry } from "@/lib/entries";
import { getPrisma } from "@/lib/prisma";
import { contractInputSchema } from "@/lib/validation";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireUser();
    const { id } = await context.params;
    const entry = await getPrisma().calendarEntry.findUnique({
      where: { id },
      select: { kind: true, contractText: true },
    });
    if (!entry) return NextResponse.json({ error: "Esta reserva não foi encontrada." }, { status: 404 });
    if (entry.kind !== EntryKind.BOOKING) return validationError("Bloqueios não possuem contrato.");
    return NextResponse.json({ contractText: entry.contractText });
  } catch (error) {
    return apiError(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    await requireUser();
    const { id } = await context.params;
    const body: unknown = await request.json();
    const parsed = contractInputSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error.issues[0]?.message ?? "Confira o texto do contrato.");

    const prisma = getPrisma();
    const existing = await prisma.calendarEntry.findUnique({
      where: { id },
      select: { kind: true },
    });
    if (!existing) return NextResponse.json({ error: "Esta reserva não foi encontrada." }, { status: 404 });
    if (existing.kind !== EntryKind.BOOKING) return validationError("Bloqueios não possuem contrato.");

    const entry = await prisma.$transaction(async (transaction) => {
      await transaction.contractAcceptance.updateMany({
        where: { entryId: id, acceptedAt: null, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return transaction.calendarEntry.update({
        where: { id },
        data: {
          contractText: parsed.data.contractText,
          contractStatus: ContractStatus.GENERATED,
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
