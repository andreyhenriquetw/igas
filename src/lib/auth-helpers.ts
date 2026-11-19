import { auth } from "@/auth";
import { UserRole } from "@/generated/prisma/enums";

export async function getAuthenticatedUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session.user;
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
