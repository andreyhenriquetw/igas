"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";
const THEME_CHANGE_EVENT = "agenda-theme-change";

function subscribe(onChange: () => void) {
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  return () => window.removeEventListener(THEME_CHANGE_EVENT, onChange);
}

function getThemeSnapshot(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function getServerThemeSnapshot(): Theme {
  return "light";
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getThemeSnapshot, getServerThemeSnapshot);

  function toggleTheme() {
    const nextTheme = theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = nextTheme;
    try {
      window.localStorage.setItem("agenda-theme", nextTheme);
    } catch (error) {
      if (!(error instanceof DOMException)) throw error;
    }
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }

  const isDark = theme === "dark";
  return (
    <button
      className="icon-button theme-toggle"
      type="button"
      aria-label={isDark ? "Ativar tema claro" : "Ativar tema noturno"}
      title={isDark ? "Ativar tema claro" : "Ativar tema noturno"}
      aria-pressed={isDark}
      onClick={toggleTheme}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
