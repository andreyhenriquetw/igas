import assert from "node:assert/strict";
import test from "node:test";
import {
  buildContractText,
  createContractPdf,
  personalizeContractText,
} from "./contract";
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
  contractAcceptanceStatus: "NONE",
  contractAcceptanceExpiresAt: null,
  landlordAcceptedAt: null,
  contractAcceptedAt: null,
  contractAcceptedName: null,
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

test("monta contrato com as condições do modelo e os dados da reserva", () => {
  const contract = buildContractText(entry);
  assert.match(contract, /CONTRATO DE LOCAÇÃO — ÍGAS/);
  assert.match(contract, /LOCADOR: Holdernes Carvalho Serrão, CPF: 020\.894\.192-45/);
  assert.match(contract, /LOCATÁRIO: João da Silva, CPF: 529\.982\.247-25/);
  assert.match(contract, /MODALIDADE: DAY-USE/);
  assert.match(contract, /Data da locação: 20\/11\/2026 \(sexta-feira\)/);
  assert.match(contract, /Check-in: a partir das 08h/);
  assert.match(contract, /Check-out: até as 20h do dia 20\/11\/2026 \(sexta-feira\)/);
  assert.match(contract, /R\$\u00a0800,00 \(oitocentos reais\)/);
  assert.match(contract, /sinal de 50%, equivalente a R\$\u00a0400,00/);
  assert.match(contract, /Valor já pago: R\$\u00a0400,00/);
  assert.match(contract, /Holdernes Carvalho Serrão\tJoão da Silva/);
  assert.match(contract, /CPF: 020\.894\.192-45\tCPF: 529\.982\.247-25/);
  assert.match(contract, /PRESERVAÇÃO DO IGARAPÉ E DAS COMPORTAS/);
  assert.equal(createContractPdf(contract, "João da Silva").getNumberOfPages(), 1);
});

test("atualiza os dados variáveis em um contrato salvo e preserva as condições editadas", () => {
  const savedText = buildContractText(entry).replace(
    "Não será permitida a prática de atividades ilícitas",
    "É vedada a prática de atividades ilícitas",
  );
  const updatedEntry: CalendarEntryDto = {
    ...entry,
    guestName: "Maria Oliveira",
    guestCpf: "123.456.789-09",
    startsAt: "2026-12-25T11:00:00.000Z",
    endsAt: "2026-12-26T23:00:00.000Z",
    totalAmount: 1500,
    paidAmount: 750,
    createdAt: "2026-12-01T12:00:00.000Z",
    mode: entry.mode ? { ...entry.mode, name: "Pernoite" } : null,
  };

  const personalized = personalizeContractText(savedText, updatedEntry);
  assert.match(personalized, /LOCATÁRIO: Maria Oliveira, CPF: 123\.456\.789-09/);
  assert.match(personalized, /MODALIDADE: PERNOITE/);
  assert.match(personalized, /Data da locação: 25\/12\/2026 \(sexta-feira\)/);
  assert.match(personalized, /Check-in: a partir das 08h/);
  assert.match(personalized, /Check-out: até as 20h do dia 26\/12\/2026 \(sábado\)/);
  assert.match(personalized, /R\$\u00a01\.500,00 \(mil e quinhentos reais\)/);
  assert.match(personalized, /Holdernes Carvalho Serrão\tMaria Oliveira/);
  assert.match(personalized, /É vedada a prática de atividades ilícitas/);
  assert.doesNotMatch(personalized, /João da Silva/);
});

test("substitui o modelo antigo salvo pelo novo contrato personalizado", () => {
  const oldContract = "CONTRATO DE RESERVA\nCONTRATANTE: João da Silva";
  const contract = personalizeContractText(oldContract, entry);
  assert.match(contract, /CONTRATO DE LOCAÇÃO — ÍGAS/);
  assert.match(contract, /LOCATÁRIO: João da Silva/);
  assert.doesNotMatch(contract, /CONTRATANTE:/);
});

test("posiciona os registros do locador e do locatário acima de suas assinaturas", () => {
  const pdf = createContractPdf(
    buildContractText(entry),
    "João da Silva",
    {
      landlordAcceptedAt: "2026-11-18T12:00:00.000Z",
      tenantAcceptedName: "João da Silva",
      tenantAcceptedAt: "2026-11-20T04:18:00.000Z",
    },
  );
  const output = pdf.output();

  assert.equal((output.match(/Documento aceito eletronicamente/g) ?? []).length, 2);
  assert.match(output, /Holdernes Carvalho Serrão/);
  assert.match(output, /João da Silva/);
  assert.match(output, /20\/11\/2026/);
  assert.match(output, /18\/11\/2026/);
  assert.doesNotMatch(output, /gov\.br|validar\.iti\.gov\.br/);
  assert.equal(pdf.getNumberOfPages(), 1);
});

test("mostra apenas o registro do locador antes do aceite do locatário", () => {
  const pdf = createContractPdf(
    buildContractText(entry),
    "João da Silva",
    {
      landlordAcceptedAt: "2026-11-18T12:00:00.000Z",
      tenantAcceptedName: null,
      tenantAcceptedAt: null,
    },
  );
  const output = pdf.output();

  assert.equal((output.match(/Documento aceito eletronicamente/g) ?? []).length, 1);
  assert.equal(pdf.getNumberOfPages(), 1);
});
