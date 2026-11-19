import assert from "node:assert/strict";
import test from "node:test";
import { getPaymentStatus, hasPaidAtLeastHalf } from "./payment";

test("distingue sem pagamento, pagamento parcial, metade e integral", () => {
  assert.equal(getPaymentStatus(1000, 0), "UNPAID");
  assert.equal(getPaymentStatus(1000, 300), "PARTIAL");
  assert.equal(getPaymentStatus(1000, 500), "HALF_PAID");
  assert.equal(getPaymentStatus(1000, 1000), "PAID");
});

test("considera exatamente 50% como mínimo pago", () => {
  assert.equal(hasPaidAtLeastHalf(799.9, 399.95), true);
  assert.equal(hasPaidAtLeastHalf(800, 399.99), false);
});
