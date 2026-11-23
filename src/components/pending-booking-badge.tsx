"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";

type Result = { count: number } | { error: true } | null;

export function PendingBookingBadge() {
  const [result, setResult] = useState<Result>(null);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const response = await fetch("/api/entries/pending-count", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Não foi possível consultar os agendamentos pendentes.");
        if (typeof data.count !== "number" || !Number.isInteger(data.count) || data.count < 0) {
          throw new Error("A resposta do contador de agendamentos é inválida.");
        }
        if (active) setResult({ count: data.count });
      } catch {
        if (active) setResult({ error: true });
      }
    };

    void refresh();
    const interval = window.setInterval(() => void refresh(), 6000);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  if (result === null) return null;
  if ("error" in result) {
    return null;
  }
  if (result.count === 0) return null;

  return (
    <span
      className="pending-booking-notification"
      title={`${result.count} agendamento${result.count === 1 ? "" : "s"} pendente${result.count === 1 ? "" : "s"}`}
      aria-label={`${result.count} agendamentos pendentes`}
      role="status"
    >
      <span className="pending-booking-pulse" aria-hidden="true" />
      <Bell aria-hidden="true" size={17} strokeWidth={2.4} />
      <span className="pending-booking-count" aria-hidden="true">
        {result.count > 99 ? "99+" : result.count}
      </span>
    </span>
  );
}
