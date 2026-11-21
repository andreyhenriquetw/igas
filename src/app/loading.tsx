import { CalendarDays } from "lucide-react";

export default function Loading() {
  return (
    <main className="loading-page" aria-live="polite" aria-busy="true">
      <section className="loading-card">
        <span className="loading-icon-wrap" aria-hidden="true">
          <span className="loading-spinner" />
          <span className="loading-icon">
            <CalendarDays size={30} strokeWidth={1.8} />
          </span>
        </span>
        <p className="loading-title">Carregando sua agenda…</p>
        <span className="loading-description">Preparando seus horários e reservas</span>
      </section>
    </main>
  );
}
