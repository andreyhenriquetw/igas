import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/prisma";
import { accountInputSchema } from "@/lib/validation";
import { apiError, validationError } from "@/lib/api-error";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = accountInputSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error.issues[0]?.message ?? "Confira os dados.");

    const prisma = getPrisma();
    const account = await prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`SELECT pg_advisory_xact_lock(42831706)::text AS acquired`;
      if (await transaction.user.count() > 0) throw new Error("SETUP_COMPLETE");

      return transaction.user.create({
        data: {
          name: parsed.data.name,
          email: parsed.data.email.toLowerCase(),
          passwordHash: await bcrypt.hash(parsed.data.password, 12),
          role: UserRole.OWNER,
        },
        select: { id: true },
      });
    });

    return NextResponse.json({ id: account.id }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "SETUP_COMPLETE") {
      return NextResponse.json({ error: "A configuração inicial já foi concluída." }, { status: 409 });
    }
    return apiError(error);
  }
}
