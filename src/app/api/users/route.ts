import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { requireOwner } from "@/lib/auth-helpers";
import { apiError, validationError } from "@/lib/api-error";
import { getPrisma } from "@/lib/prisma";
import { accountInputSchema } from "@/lib/validation";

export async function GET() {
  try {
    await requireOwner();
    const users = await getPrisma().user.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ users });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireOwner();
    const body: unknown = await request.json();
    const parsed = accountInputSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error.issues[0]?.message ?? "Confira os dados.");

    const user = await getPrisma().user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        passwordHash: await bcrypt.hash(parsed.data.password, 12),
        role: UserRole.MANAGER,
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
