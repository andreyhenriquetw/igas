import { NextResponse } from "next/server";
import { ContractStatus, EntryKind, EntryStatus } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth-helpers";
import { apiError } from "@/lib/api-error";
import { CONTRACT_ACCEPTANCE_TTL_MS, createContractAcceptanceToken, hashContractAcceptanceToken } from "@/lib/contract-acceptance";
import { buildContractText, personalizeContractText } from "@/lib/contract";
import { serializeEntry } from "@/lib/entries";
import { getPrisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  try {
    await requireUser();
    const { id } = await context.params;
    const token = createContractAcceptanceToken();
    const tokenHash = hashContractAcceptanceToken(token);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + CONTRACT_ACCEPTANCE_TTL_MS);
    const prisma = getPrisma();

    const result = await prisma.$transaction(async (transaction) => {
      const current = await transaction.calendarEntry.findUnique({
        where: { id },
        include: { mode: true },
      });

      if (!current) return { ok: false as const, status: 404, error: "Esta reserva não foi encontrada." };
      if (current.kind !== EntryKind.BOOKING) {
        return { ok: false as const, status: 400, error: "Bloqueios não possuem contrato para aceite." };
      }
      if (current.status === EntryStatus.CANCELLED) {
        return { ok: false as const, status: 409, error: "Não é possível enviar o contrato de uma reserva cancelada." };
      }
      const guestName = current.guestName?.trim();
      const guestCpf = current.guestCpf;
      if (!guestName || !guestCpf) {
        return { ok: false as const, status: 400, error: "Preencha o nome e o CPF do locatário antes de gerar o link." };
      }

      const currentDto = serializeEntry(current);
      const contractText = personalizeContractText(
        current.contractText ?? buildContractText(currentDto),
        currentDto,
      );

      await transaction.contractAcceptance.updateMany({
        where: { entryId: id, acceptedAt: null, revokedAt: null },
        data: { revokedAt: now },
      });

      const entry = await transaction.calendarEntry.update({
        where: { id },
        data: {
          contractText,
          contractStatus: ContractStatus.GENERATED,
          contractRevision: { increment: 1 },
          contractAcceptanceExpiresAt: expiresAt,
          contractAcceptedAt: null,
          contractAcceptedName: null,
        },
        include: { mode: true },
      });

      await transaction.contractAcceptance.create({
        data: {
          entryId: id,
          tokenHash,
          contractRevision: entry.contractRevision,
          contractText,
          guestName,
          guestCpf,
          expiresAt,
        },
      });

      return { ok: true as const, entry };
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status, headers: { "Cache-Control": "no-store" } });
    }

    return NextResponse.json(
      { token, expiresAt: expiresAt.toISOString(), entry: serializeEntry(result.entry) },
      { status: 201, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
