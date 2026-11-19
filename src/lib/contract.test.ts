import assert from "node:assert/strict";
import test from "node:test";
import { buildContractText } from "./contract";
import type { CalendarEntryDto } from "@/types/calendar";

const entry: CalendarEntryDto = {
  id: "booking-1",
  kind: "BOOKING",
  status: "CONFIRMED",
  guestName: "João da Silva",
  guestContact: "joao@example.com",
  guestCpf: "529.982.247-25",
  guestAddress: "Rua das Flores, 123, Centro",
  modeId: "mode-day-use",
  startsAt: "2026-11-20T11:00:00.000Z",
  endsAt: "2026-11-20T23:00:00.000Z",
  totalAmount: 800,
  paidAmount: 400,
  contractStatus: "PENDING",
  notes: null,
  createdById: "user-1",
  createdAt: "2026-11-18T12:00:00.000Z",
  updatedAt: "2026-11-18T12:00:00.000Z",
  mode: {
    id: "mode-day-use",
    code: "DAY_USE",
    name: "Day-use",
    defaultStart: "08:00",
    durationMinutes: 720,
    active: true,
  },
};

test("monta contrato com as informações e os valores da reserva", () => {
  const contract = buildContractText(entry);
  assert.match(contract, /João da Silva/);
  assert.match(contract, /Day-use/);
  assert.match(contract, /20\/11\/2026 às 08:00/);
  assert.match(contract, /R\$\u00a0800,00/);
  assert.match(contract, /R\$\u00a0400,00/);
  assert.match(contract, /CONTRATANTE/);
  assert.match(contract, /CPF: 529\.982\.247-25/);
  assert.match(contract, /Endereço: Rua das Flores, 123, Centro/);
});
