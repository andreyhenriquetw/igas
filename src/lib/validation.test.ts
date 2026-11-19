import assert from "node:assert/strict";
import test from "node:test";
import { accountInputSchema, entryInputSchema } from "./validation";

const validBooking = {
  kind: "BOOKING",
  guestName: "Dendes",
  guestContact: "11999999999",
  modeId: "mode-day-use",
  startsAt: "2026-11-20T08:00",
  endsAt: "2026-11-20T20:00",
  totalAmount: 800,
  paidAmount: 400,
};

test("aceita reserva com exatamente metade paga", () => {
  assert.equal(entryInputSchema.safeParse(validBooking).success, true);
});

test("rejeita data impossível e valor pago acima do total", () => {
  assert.equal(
    entryInputSchema.safeParse({ ...validBooking, startsAt: "2026-02-30T08:00" }).success,
    false,
  );
  assert.equal(
    entryInputSchema.safeParse({ ...validBooking, paidAmount: 801 }).success,
    false,
  );
});

test("aceita senhas de 6 caracteres e rejeita as menores", () => {
  const account = { name: "Dendes", email: "dendes@example.com", password: "abc123" };
  assert.equal(accountInputSchema.safeParse(account).success, true);
  assert.equal(accountInputSchema.safeParse({ ...account, password: "abc12" }).success, false);
});
