import { connection } from "next/server";
import Link from "next/link";
import { AccountForm } from "@/components/account-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { getPrisma } from "@/lib/prisma";

type Props = { searchParams: Promise<{ created?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  await connection();
  const [params, hasAccount] = await Promise.all([
    searchParams,
    getPrisma().user.count().then((count) => count > 0),
  ]);
  return (
    <main className="auth-page">
      <div className="auth-theme-toggle"><ThemeToggle /></div>
      <section className="auth-card">
        <div className="brand-mark auth-mark"><span>R</span></div>
        <p className="eyebrow">AGENDA DO ESPAÇO</p>
        <h1>Bom ter você de volta.</h1>
        <p className="muted">Entre para acompanhar reservas e disponibilidade.</p>
        {params.created && <p className="success-message">Conta criada. Agora entre com seu e-mail e senha.</p>}
        <AccountForm mode="login" />
        {!hasAccount && (
          <Link className="button button-secondary button-wide" href="/setup">
            Criar conta
          </Link>
        )}
      </section>
    </main>
  );
}
