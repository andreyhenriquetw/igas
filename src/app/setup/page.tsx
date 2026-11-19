import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AccountForm } from "@/components/account-form";
import { getPrisma } from "@/lib/prisma";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function SetupPage() {
  await connection();
  if (await getPrisma().user.count() > 0) redirect("/login");

  return (
    <main className="auth-page">
      <div className="auth-theme-toggle"><ThemeToggle /></div>
      <section className="auth-card">
        <div className="brand-mark auth-mark"><span>R</span></div>
        <p className="eyebrow">PRIMEIRO ACESSO</p>
        <h1>Vamos organizar seu espaço.</h1>
        <p className="muted">Crie sua conta proprietária. Depois você poderá cadastrar a conta de Dendes.</p>
        <AccountForm mode="setup" />
      </section>
    </main>
  );
}
