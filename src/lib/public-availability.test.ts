import assert from "node:assert/strict";
import test from "node:test";
import { isDateAvailableForMode } from "./public-availability";

const dayUse = { defaultStart: "08:00", durationMinutes: 720 };

test("marks a day unavailable when an active entry overlaps the requested mode", () => {
  assert.equal(
    isDateAvailableForMode("2026-11-24", dayUse, [
      { startsAt: "2026-11-24T15:00:00.000Z", endsAt: "2026-11-24T18:00:00.000Z" },
    ]),
    false,
  );
});

test("keeps a day available when an existing entry does not overlap", () => {
  assert.equal(
    isDateAvailableForMode("2026-11-24", dayUse, [
      { startsAt: "2026-11-24T23:30:00.000Z", endsAt: "2026-11-25T01:00:00.000Z" },
    ]),
    true,
  );
});

test("includes overnight duration when checking availability", () => {
  const mode = { code: "OVERNIGHT", defaultStart: "08:00", durationMinutes: 2160 };
  const occupied = [
    { startsAt: "2026-11-26T14:00:00.000Z", endsAt: "2026-11-26T18:00:00.000Z" },
  ];
  assert.equal(isDateAvailableForMode("2026-11-24", mode, occupied, 1), true);
  assert.equal(isDateAvailableForMode("2026-11-24", mode, occupied, 2), false);
});

test("extends overnight availability for additional selected days", () => {
  assert.equal(
    isDateAvailableForMode("2026-11-13", { code: "OVERNIGHT", defaultStart: "08:00", durationMinutes: 2160 }, [
      { startsAt: "2026-11-15T21:30:00.000Z", endsAt: "2026-11-15T22:30:00.000Z" },
    ], 3),
    false,
  );
});

test("keeps a three-night stay available when all selected nights are free", () => {
  assert.equal(
    isDateAvailableForMode(
      "2026-11-24",
      { code: "OVERNIGHT", defaultStart: "08:00", durationMinutes: 2160 },
      [],
      3,
    ),
    true,
  );
});

test("keeps the checkout date unavailable for a new overnight booking", () => {
  const overnightMode = { code: "OVERNIGHT", defaultStart: "08:00", durationMinutes: 2160 };
  const occupied = [
    { startsAt: "2026-11-24T11:00:00.000Z", endsAt: "2026-11-25T23:00:00.000Z" },
  ];
  assert.equal(isDateAvailableForMode("2026-11-25", overnightMode, occupied, 1), false);
});

test("keeps an overnight reservation unavailable through checkout at 20:00", () => {
  assert.equal(
    isDateAvailableForMode(
      "2026-11-24",
      { code: "OVERNIGHT", defaultStart: "08:00", durationMinutes: 2160 },
      [{ startsAt: "2026-11-27T11:30:00.000Z", endsAt: "2026-11-27T13:00:00.000Z" }],
      3,
    ),
    false,
  );
  assert.equal(
    isDateAvailableForMode(
      "2026-11-24",
      { code: "OVERNIGHT", defaultStart: "08:00", durationMinutes: 2160 },
      [{ startsAt: "2026-11-27T23:01:00.000Z", endsAt: "2026-11-28T00:00:00.000Z" }],
      3,
    ),
    true,
  );
});
