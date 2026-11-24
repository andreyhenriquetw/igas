"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";

type Result = { count: number } | { error: true } | null;

let cachedCount: { count: number; expiresAt: number } | null = null;
let pendingCountRequest: Promise<number> | null = null;

export const PENDING_BOOKINGS_CHANGED_EVENT = "pending-bookings-changed";

export function notifyPendingBookingsChanged(delta = -1) {
  window.dispatchEvent(new CustomEvent(PENDING_BOOKINGS_CHANGED_EVENT, { detail: { delta } }));
}

function fetchPendingCount(force = false) {
  if (!force && cachedCount && cachedCount.expiresAt > Date.now()) {
    return Promise.resolve(cachedCount.count);
  }
  if (!force && pendingCountRequest) return pendingCountRequest;

  pendingCountRequest = (async () => {
    try {
      const response = await fetch("/api/entries/pending-count", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível consultar os agendamentos pendentes.");
      if (typeof data.count !== "number" || !Number.isInteger(data.count) || data.count < 0) {
        throw new Error("A resposta do contador de agendamentos é inválida.");
      }
      cachedCount = { count: data.count, expiresAt: Date.now() + 55_000 };
      return data.count;
    } catch (error) {
      cachedCount = null;
      throw error;
    }
  })().finally(() => {
    pendingCountRequest = null;
  });

  return pendingCountRequest;
}

export function PendingBookingBadge() {
  const [result, setResult] = useState<Result>(null);

  useEffect(() => {
    let active = true;
    const refresh = async (force = false) => {
      try {
        const count = await fetchPendingCount(force);
        if (active) setResult({ count });
      } catch {
        if (active) setResult({ error: true });
      }
    };

    void refresh();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 60_000);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void refresh(true);
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    const onPendingBookingsChanged = (event: Event) => {
      const delta = (event as CustomEvent<{ delta?: number }>).detail?.delta ?? -1;
      setResult((current) => {
        if (current === null || "error" in current) return current;
        const nextCount = Math.max(0, current.count + delta);
        cachedCount = { count: nextCount, expiresAt: Date.now() + 55_000 };
        return { count: nextCount };
      });
      void refresh(true);
    };
    window.addEventListener(PENDING_BOOKINGS_CHANGED_EVENT, onPendingBookingsChanged);
    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener(PENDING_BOOKINGS_CHANGED_EVENT, onPendingBookingsChanged);
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
