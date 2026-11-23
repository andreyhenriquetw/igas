import assert from "node:assert/strict";
import test from "node:test";
import {
  formatLocalDateKey,
  formatLocalDateTime,
  getReservationDateKeys,
  localDateTimeToUtc,
} from "./time";

test("interpreta e apresenta horários no fuso de São Paulo", () => {
  const instant = localDateTimeToUtc("2026-11-20T08:00");
  assert.equal(instant.toISOString(), "2026-11-20T11:00:00.000Z");
  assert.equal(formatLocalDateTime(instant, "yyyy-MM-dd'T'HH:mm"), "2026-11-20T08:00");
});

test("lists the nights before checkout for an overnight reservation", () => {
  const days = getReservationDateKeys(
    "2026-11-24T11:00:00.000Z",
    "2026-11-27T11:00:00.000Z",
    "OVERNIGHT",
  );
  assert.deepEqual(days, ["2026-11-24", "2026-11-25", "2026-11-26"]);
  assert.deepEqual(days.map(formatLocalDateKey), ["24/11/2026", "25/11/2026", "26/11/2026"]);
});
