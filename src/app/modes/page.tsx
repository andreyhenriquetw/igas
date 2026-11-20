import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AppHeader } from "@/components/app-header";
import { ModeSettings } from "@/components/mode-settings";
import { getAuthenticatedUser } from "@/lib/auth-helpers";
import { getPrisma } from "@/lib/prisma";

export default async function ModesPage() {
  await connection();
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");
  const modes = await getPrisma().reservationMode.findMany({ orderBy: { name: "asc" } });

  return (
    <>
      <AppHeader user={user} current="modes" />
      <main className="app-main settings-main">
        <section className="page-intro">
          <div>
            <p className="eyebrow">CONFIGURAÇÃO</p>
            <h1>Modalidades</h1>
            <p className="muted">Ajuste os horários padrão e ative somente as opções que utiliza.</p>
          </div>
        </section>
        <ModeSettings initialModes={modes} />
      </main>
    </>
  );
}
