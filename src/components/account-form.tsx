"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

type Props = { mode: "setup" | "login" };

export function AccountForm({ mode }: Props) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const data = {
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? "").trim().toLowerCase(),
      password: String(form.get("password") ?? ""),
    };

    try {
      if (mode === "setup") {
        const response = await fetch("/api/setup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Não foi possível criar a conta.");
        router.replace("/login?created=1");
        return;
      }

      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });
      if (result?.error) throw new Error("E-mail ou senha incorretos.");
      router.replace("/");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Não foi possível concluir.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="form-stack" onSubmit={submit}>
      {mode === "setup" && (
        <label className="field">
          <span>Seu nome</span>
          <input name="name" autoComplete="name" maxLength={120} required />
        </label>
      )}
      <label className="field">
        <span>E-mail</span>
        <input name="email" type="email" autoComplete="email" maxLength={254} required />
      </label>
      <label className="field">
        <span>Senha</span>
        <input
          name="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          minLength={mode === "setup" ? 6 : 1}
          maxLength={128}
          required
        />
        {mode === "setup" && <small>Use pelo menos 6 caracteres.</small>}
      </label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button button-primary button-wide" type="submit" disabled={loading}>
        {loading ? "Aguarde…" : mode === "setup" ? "Criar conta proprietária" : "Entrar"}
      </button>
    </form>
  );
}
