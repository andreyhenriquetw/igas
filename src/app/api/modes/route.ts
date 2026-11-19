import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import { apiError, validationError } from "@/lib/api-error";
import { getPrisma } from "@/lib/prisma";
import { modesInputSchema } from "@/lib/validation";

export async function GET() {
  try {
    await requireUser();
    const modes = await getPrisma().reservationMode.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json({ modes });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    await requireUser();
    const body: unknown = await request.json();
    const parsed = modesInputSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error.issues[0]?.message ?? "Confira os dados.");

    const prisma = getPrisma();
    const existing = await prisma.reservationMode.count({
      where: { id: { in: parsed.data.modes.map((mode) => mode.id) } },
    });
    if (existing !== parsed.data.modes.length) {
      return validationError("Uma das modalidades não foi encontrada.");
    }
    const modes = await prisma.$transaction(
      parsed.data.modes.map(({ id, name, defaultStart, durationMinutes, active }) =>
        prisma.reservationMode.update({
          where: { id },
          data: { name, defaultStart, durationMinutes, active },
        }),
      ),
    );
    return NextResponse.json({ modes });
  } catch (error) {
    return apiError(error);
  }
}
