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
  assert.equal(
    isDateAvailableForMode("2026-11-24", { defaultStart: "08:00", durationMinutes: 2160 }, [
      { startsAt: "2026-11-25T14:00:00.000Z", endsAt: "2026-11-25T18:00:00.000Z" },
    ]),
    false,
  );
});
