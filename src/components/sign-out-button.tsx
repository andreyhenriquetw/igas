"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      className="icon-button sign-out-button"
      type="button"
      aria-label="Sair da conta"
      onClick={() => signOut({ redirectTo: "/login" })}
    >
      <LogOut size={18} />
      <span>Sair</span>
    </button>
  );
}
