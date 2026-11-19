import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { requireOwner } from "@/lib/auth-helpers";
import { apiError } from "@/lib/api-error";
import { getPrisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const owner = await requireOwner();
    const { id } = await context.params;
    const prisma = getPrisma();

    const member = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, role: true },
    });
    if (!member) {
      return NextResponse.json({ error: "Este membro não foi encontrado." }, { status: 404 });
    }
    if (member.role === UserRole.OWNER || member.id === owner.id) {
      return NextResponse.json({ error: "A conta proprietária não pode ser removida." }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.calendarEntry.updateMany({
        where: { createdById: member.id },
        data: { createdById: owner.id },
      }),
      prisma.user.delete({ where: { id: member.id } }),
    ]);

    return NextResponse.json({ removed: true });
  } catch (error) {
    return apiError(error);
  }
}
