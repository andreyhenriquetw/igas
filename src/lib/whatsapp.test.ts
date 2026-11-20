import assert from "node:assert/strict";
import test from "node:test";
import { toWhatsAppPhoneNumber } from "./whatsapp";

test("normaliza telefone brasileiro para o formato do WhatsApp", () => {
  assert.equal(toWhatsAppPhoneNumber("(93) 99160-6969"), "5593991606969");
  assert.equal(toWhatsAppPhoneNumber("+55 (93) 99160-6969"), "5593991606969");
});

test("preserva números internacionais e rejeita contatos sem telefone válido", () => {
  assert.equal(toWhatsAppPhoneNumber("+1 202 555 0134"), "12025550134");
  assert.equal(toWhatsAppPhoneNumber("email@example.com"), null);
});
