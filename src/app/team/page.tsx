import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AppHeader } from "@/components/app-header";
import { TeamSettings } from "@/components/team-settings";
import { UserRole } from "@/generated/prisma/enums";
import { getAuthenticatedUser } from "@/lib/auth-helpers";
import { getPrisma } from "@/lib/prisma";

export default async function TeamPage() {
  await connection();
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");
  if (user.role !== UserRole.OWNER) redirect("/");

  const users = await getPrisma().user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  }).then((members) => members.map((member) => ({
    ...member,
    createdAt: member.createdAt.toISOString(),
  })));

  return (
    <>
      <AppHeader user={user} current="team" />
      <main className="app-main settings-main">
        <section className="page-intro">
          <div>
            <p className="eyebrow">ACESSO COMPARTILHADO</p>
            <h1>Equipe</h1>
            <p className="muted">Gerencie quem pode consultar e atualizar a agenda.</p>
          </div>
        </section>
        <TeamSettings initialUsers={users} />
      </main>
    </>
  );
}
