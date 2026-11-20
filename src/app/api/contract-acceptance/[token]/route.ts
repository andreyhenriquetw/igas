import { NextResponse } from "next/server";
import { EntryKind, EntryStatus } from "@/generated/prisma/client";
import { apiError, validationError } from "@/lib/api-error";
import { hashContractAcceptanceToken, isContractAcceptanceToken, normalizeAcceptanceName, normalizeCpf } from "@/lib/contract-acceptance";
import { getPrisma } from "@/lib/prisma";
import { contractAcceptanceInputSchema } from "@/lib/validation";

type RouteContext = { params: Promise<{ token: string }> };

function unavailable() {
  return NextResponse.json(
    { error: "Este link não está mais ativo. Peça ao estabelecimento um novo link de aceite." },
    { status: 410, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } },
  );
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    if (!isContractAcceptanceToken(token)) return unavailable();

    const acceptance = await getPrisma().contractAcceptance.findUnique({
      where: { tokenHash: hashContractAcceptanceToken(token) },
      include: { entry: { select: { kind: true, status: true, contractRevision: true } } },
    });
    if (!acceptance || acceptance.entry.kind !== EntryKind.BOOKING) return unavailable();

    const isAccepted = Boolean(acceptance.acceptedAt);
    if (
      !isAccepted &&
      (acceptance.revokedAt ||
        acceptance.expiresAt <= new Date() ||
        acceptance.entry.contractRevision !== acceptance.contractRevision ||
        acceptance.entry.status === EntryStatus.CANCELLED)
    ) {
      return unavailable();
    }

    return NextResponse.json(
      {
        contractText: acceptance.contractText,
        guestName: acceptance.guestName,
        status: isAccepted ? "ACCEPTED" : "PENDING",
        acceptedAt: acceptance.acceptedAt?.toISOString() ?? null,
        acceptedName: acceptance.acceptedName,
      },
      { headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } },
    );
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    if (!isContractAcceptanceToken(token)) return unavailable();

    const body: unknown = await request.json();
    const parsed = contractAcceptanceInputSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error.issues[0]?.message ?? "Confira os dados informados.");

    const prisma = getPrisma();
    const tokenHash = hashContractAcceptanceToken(token);
    const now = new Date();
    const acceptedCpfDigits = normalizeCpf(parsed.data.cpf);
    const formattedCpf = `${acceptedCpfDigits.slice(0, 3)}.${acceptedCpfDigits.slice(3, 6)}.${acceptedCpfDigits.slice(6, 9)}-${acceptedCpfDigits.slice(9)}`;

    const result = await prisma.$transaction(async (transaction) => {
      const acceptance = await transaction.contractAcceptance.findUnique({
        where: { tokenHash },
        include: {
          entry: { select: { kind: true, status: true, contractRevision: true } },
        },
      });

      if (!acceptance || acceptance.entry.kind !== EntryKind.BOOKING) {
        return { ok: false as const, status: 410, error: "Este link não está mais ativo. Peça ao estabelecimento um novo link de aceite." };
      }
      if (acceptance.acceptedAt) {
        return {
          ok: true as const,
          acceptedAt: acceptance.acceptedAt,
          acceptedName: acceptance.acceptedName ?? acceptance.guestName,
        };
      }
      if (
        acceptance.revokedAt ||
        acceptance.expiresAt <= now ||
        acceptance.entry.contractRevision !== acceptance.contractRevision ||
        acceptance.entry.status === EntryStatus.CANCELLED
      ) {
        return { ok: false as const, status: 410, error: "Este link não está mais ativo. Peça ao estabelecimento um novo link de aceite." };
      }
      if (
        normalizeAcceptanceName(parsed.data.name) !== normalizeAcceptanceName(acceptance.guestName) ||
        acceptedCpfDigits !== normalizeCpf(acceptance.guestCpf)
      ) {
        return { ok: false as const, status: 400, error: "O nome e o CPF informados não correspondem aos dados do contrato." };
      }

      const accepted = await transaction.contractAcceptance.updateMany({
        where: {
          id: acceptance.id,
          acceptedAt: null,
          revokedAt: null,
          expiresAt: { gt: now },
          contractRevision: acceptance.entry.contractRevision,
        },
        data: {
          acceptedAt: now,
          acceptedName: parsed.data.name,
          acceptedCpf: formattedCpf,
        },
      });
      if (accepted.count !== 1) {
        return { ok: false as const, status: 409, error: "Este contrato já foi aceito ou o link deixou de estar ativo." };
      }

      const updatedEntry = await transaction.calendarEntry.updateMany({
        where: {
          id: acceptance.entryId,
          kind: EntryKind.BOOKING,
          status: { not: EntryStatus.CANCELLED },
          contractRevision: acceptance.contractRevision,
          contractAcceptanceExpiresAt: acceptance.expiresAt,
          contractAcceptedAt: null,
        },
        data: {
          contractAcceptedAt: now,
          contractAcceptedName: parsed.data.name,
        },
      });
      if (updatedEntry.count !== 1) throw new Error("CONTRACT_ACCEPTANCE_STALE");

      return { ok: true as const, acceptedAt: now, acceptedName: parsed.data.name };
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } },
      );
    }
    return NextResponse.json(
      { status: "ACCEPTED", acceptedAt: result.acceptedAt.toISOString(), acceptedName: result.acceptedName },
      { headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } },
    );
  } catch (error) {
    if (error instanceof Error && error.message === "CONTRACT_ACCEPTANCE_STALE") return unavailable();
    return apiError(error);
  }
}
