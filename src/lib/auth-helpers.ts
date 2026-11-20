import { auth } from "@/auth";
import { UserRole } from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/prisma";

export async function getAuthenticatedUser() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await getPrisma().user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, role: true },
  });
  if (!user) return null;

  return { ...session.user, ...user };
}

export async function requireUser() {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export async function requireOwner() {
  const user = await requireUser();
  if (user.role !== UserRole.OWNER) throw new Error("FORBIDDEN");
  return user;
}
