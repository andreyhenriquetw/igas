import assert from "node:assert/strict";
import test from "node:test";
import { getOvernightDurationMinutes, getOvernightPrice, OVERNIGHT_MAX_NIGHTS } from "./overnight";

test("reserves each night through 20:00 on the checkout date", () => {
  assert.equal(getOvernightDurationMinutes(1), 2160);
  assert.equal(getOvernightDurationMinutes(3), 5040);
});

test("calculates checkout duration from the configured check-in time", () => {
  assert.equal(getOvernightDurationMinutes(2, "10:00"), 3480);
});

test("returns the configured price for each available overnight stay", () => {
  assert.deepEqual(
    Array.from({ length: OVERNIGHT_MAX_NIGHTS }, (_, index) => getOvernightPrice(index + 1)),
    [1500, 1200, 3900, 5100, 6300],
  );
  assert.throws(() => getOvernightPrice(6), RangeError);
});
