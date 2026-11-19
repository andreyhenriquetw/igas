"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, Clock3 } from "lucide-react";
import type { ReservationModeDto } from "@/types/calendar";

export function ModeSettings({ initialModes }: { initialModes: ReservationModeDto[] }) {
  const [modes, setModes] = useState(initialModes);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  function updateMode(id: string, key: "name" | "defaultStart" | "durationMinutes" | "active", value: string | boolean) {
    setModes((current) => current.map((mode) => mode.id === id ? { ...mode, [key]: value } : mode));
    setSaved(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaved(false);
    setLoading(true);
    try {
      const response = await fetch("/api/modes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modes }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Não foi possível salvar as modalidades.");
      setModes(result.modes);
      setSaved(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Não foi possível salvar as modalidades.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="settings-form" onSubmit={submit}>
      <div className="settings-intro">
        <Clock3 size={20} />
        <p>Esses horários são sugestões para novas reservas. Você pode ajustar a entrada e saída individualmente em cada reserva.</p>
      </div>
      <div className="mode-cards">
        {modes.map((mode) => (
          <section className={`mode-card ${mode.active ? "" : "mode-inactive"}`} key={mode.id}>
            <label className="field">
              <span>Nome da modalidade</span>
              <input value={mode.name} onChange={(event) => updateMode(mode.id, "name", event.target.value)} maxLength={80} required />
            </label>
            <div className="field-row">
              <label className="field">
                <span>Horário de entrada</span>
                <input type="time" value={mode.defaultStart} onChange={(event) => updateMode(mode.id, "defaultStart", event.target.value)} required />
              </label>
              <label className="field">
                <span>Duração padrão</span>
                <div className="duration-input">
                  <input type="number" min={0.25} max={168} step={0.25} value={Number((mode.durationMinutes / 60).toFixed(2))} onChange={(event) => updateMode(mode.id, "durationMinutes", String(Math.round(Number(event.target.value || 0) * 60)))} required />
                  <span>horas</span>
                </div>
              </label>
            </div>
            <label className="toggle-field">
              <input type="checkbox" checked={mode.active} onChange={(event) => updateMode(mode.id, "active", event.target.checked)} />
              <span>Disponível para novas reservas</span>
            </label>
          </section>
        ))}
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {saved && <p className="success-message"><CheckCircle2 size={16} /> Modalidades atualizadas.</p>}
      <button className="button button-primary" type="submit" disabled={loading}>
        {loading ? "Salvando…" : "Salvar modalidades"}
      </button>
    </form>
  );
}
