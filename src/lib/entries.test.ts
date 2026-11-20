import assert from "node:assert/strict";
import test from "node:test";
import { EntryKind } from "@/generated/prisma/enums";
import { getLandlordAcceptedAt } from "./entries";

test("registra o aceite automático do locador para qualquer reserva", () => {
  const createdAt = new Date("2026-11-20T04:18:00.000Z");
  assert.equal(
    getLandlordAcceptedAt(EntryKind.BOOKING, createdAt),
    createdAt.toISOString(),
  );
});

test("não registra aceite do locador em bloqueios", () => {
  const createdAt = new Date("2026-11-20T04:18:00.000Z");
  assert.equal(getLandlordAcceptedAt(EntryKind.BLOCK, createdAt), null);
});
