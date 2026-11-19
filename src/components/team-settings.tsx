"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, UserPlus, UsersRound } from "lucide-react";
import type { TeamMemberDto } from "@/types/calendar";

export function TeamSettings({ initialUsers }: { initialUsers: TeamMemberDto[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const payload = {
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? "").trim().toLowerCase(),
      password: String(form.get("password") ?? ""),
    };

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Não foi possível criar o acesso.");
      setUsers((current) => [...current, result.user as TeamMemberDto]);
      setSuccess(`Acesso de ${result.user.name} criado.`);
      formElement.reset();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Não foi possível criar o acesso.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="team-layout">
      <section className="settings-card">
        <div className="section-title"><UsersRound size={19} /><div><h2>Contas com acesso</h2><p>Uma conta individual para cada pessoa.</p></div></div>
        <div className="team-list">
          {users.map((user) => (
            <div className="team-member" key={user.id}>
              <span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span>
              <span><strong>{user.name}</strong><small>{user.email}</small></span>
              <span className={`role-pill ${user.role === "OWNER" ? "owner" : ""}`}>{user.role === "OWNER" ? "Proprietário" : "Equipe"}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="settings-card">
        <div className="section-title"><UserPlus size={19} /><div><h2>Cadastrar pessoa</h2><p>Crie um acesso individual para Dendes ou outra pessoa.</p></div></div>
        <form className="form-stack" onSubmit={submit}>
          <label className="field"><span>Nome</span><input name="name" autoComplete="name" maxLength={120} required /></label>
          <label className="field"><span>E-mail</span><input name="email" type="email" autoComplete="email" maxLength={254} required /></label>
          <label className="field"><span>Senha inicial</span><input name="password" type="password" autoComplete="new-password" minLength={6} maxLength={128} required /><small>Use pelo menos 6 caracteres e compartilhe por um canal seguro.</small></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          {success && <p className="success-message"><CheckCircle2 size={16} /> {success}</p>}
          <button className="button button-primary" type="submit" disabled={loading}>{loading ? "Criando acesso…" : "Criar acesso"}</button>
        </form>
      </section>
    </div>
  );
}
