import assert from "node:assert/strict";
import test from "node:test";
import { getOvernightDurationMinutes } from "./overnight";

test("reserves one full night for each selected overnight night", () => {
  assert.equal(getOvernightDurationMinutes(1), 1440);
  assert.equal(getOvernightDurationMinutes(3), 4320);
});

test("checks out at the same time after the selected nights", () => {
  assert.equal(getOvernightDurationMinutes(2), 2880);
});
