import assert from "node:assert/strict";
import test from "node:test";
import {
  createContractAcceptanceToken,
  hashContractAcceptanceToken,
  isContractAcceptanceToken,
  normalizeAcceptanceName,
  normalizeCpf,
} from "./contract-acceptance";
import { contractAcceptanceInputSchema } from "./validation";

test("gera links de aceite aleatórios e armazena apenas hashes", () => {
  const first = createContractAcceptanceToken();
  const second = createContractAcceptanceToken();

  assert.equal(isContractAcceptanceToken(first), true);
  assert.equal(isContractAcceptanceToken(second), true);
  assert.notEqual(first, second);
  assert.notEqual(hashContractAcceptanceToken(first), first);
  assert.equal(hashContractAcceptanceToken(first), hashContractAcceptanceToken(first));
});

test("normaliza nome e CPF para comparar os dados informados pelo cliente", () => {
  assert.equal(normalizeAcceptanceName("  JOÃO   da Silva "), "joao da silva");
  assert.equal(normalizeCpf("529.982.247-25"), "52998224725");
});

test("exige confirmação explícita, nome e CPF antes de registrar o aceite", () => {
  const valid = { name: "João da Silva", cpf: "529.982.247-25", accepted: true };
  assert.equal(contractAcceptanceInputSchema.safeParse(valid).success, true);
  assert.equal(contractAcceptanceInputSchema.safeParse({ ...valid, accepted: false }).success, false);
  assert.equal(contractAcceptanceInputSchema.safeParse({ ...valid, cpf: "529.982.247" }).success, false);
});
