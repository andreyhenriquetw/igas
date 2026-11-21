import Link from "next/link";
import Image from "next/image";
import { CalendarDays, ChartNoAxesColumnIncreasing, Settings2, UsersRound } from "lucide-react";
import { UserRole } from "@/generated/prisma/enums";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";

type Props = {
  user: { name?: string | null; role: UserRole };
  current: "calendar" | "modes" | "reports" | "team";
};

export function AppHeader({ user, current }: Props) {
  return (
    <>
      <header className="app-header">
        <Link className="brand" href="/" aria-label="Agenda do espaço">
          <span className="brand-mark">
            <Image className="brand-logo-light" src="/igaspreto.png" width={44} height={44} alt="" />
            <Image className="brand-logo-dark" src="/igas-logo-transparent.png" width={44} height={44} alt="" />
          </span>
          <span className="brand-name">Balneário Ígas</span>
        </Link>
        <nav className="desktop-nav" aria-label="Navegação principal">
          <Link className={current === "calendar" ? "nav-link active" : "nav-link"} href="/">
            Agenda
          </Link>
          <Link className={current === "modes" ? "nav-link active" : "nav-link"} href="/modes">
            Modalidades
          </Link>
          <Link className={current === "reports" ? "nav-link active" : "nav-link"} href="/reports">
            Relatórios
          </Link>
          {user.role === UserRole.OWNER && (
            <Link className={current === "team" ? "nav-link active" : "nav-link"} href="/team">
              Equipe
            </Link>
          )}
        </nav>
        <div className="account-area">
          <ThemeToggle />
          <span className="account-name">{user.name}</span>
          <SignOutButton />
        </div>
      </header>
      <nav className="mobile-nav" aria-label="Navegação principal">
        <Link className={current === "calendar" ? "mobile-nav-link active" : "mobile-nav-link"} href="/">
          <CalendarDays size={18} /><span>Agenda</span>
        </Link>
        <Link className={current === "modes" ? "mobile-nav-link active" : "mobile-nav-link"} href="/modes">
          <Settings2 size={18} /><span>Modalidades</span>
        </Link>
        <Link className={current === "reports" ? "mobile-nav-link active" : "mobile-nav-link"} href="/reports">
          <ChartNoAxesColumnIncreasing size={18} /><span>Relatórios</span>
        </Link>
        {user.role === UserRole.OWNER && (
          <Link className={current === "team" ? "mobile-nav-link active" : "mobile-nav-link"} href="/team">
            <UsersRound size={18} /><span>Equipe</span>
          </Link>
        )}
      </nav>
    </>
  );
}
