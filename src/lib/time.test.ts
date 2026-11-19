import assert from "node:assert/strict";
import test from "node:test";
import { formatLocalDateTime, localDateTimeToUtc } from "./time";

test("interpreta e apresenta horários no fuso de São Paulo", () => {
  const instant = localDateTimeToUtc("2026-11-20T08:00");
  assert.equal(instant.toISOString(), "2026-11-20T11:00:00.000Z");
  assert.equal(formatLocalDateTime(instant, "yyyy-MM-dd'T'HH:mm"), "2026-11-20T08:00");
});
