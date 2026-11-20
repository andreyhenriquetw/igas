import { createHash, randomBytes } from "node:crypto";

export const CONTRACT_ACCEPTANCE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function createContractAcceptanceToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashContractAcceptanceToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function isContractAcceptanceToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}

export function normalizeAcceptanceName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("pt-BR");
}

export function normalizeCpf(value: string): string {
  return value.replace(/\D/g, "");
}
