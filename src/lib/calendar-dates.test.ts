import assert from "node:assert/strict";
import test from "node:test";
import { getWeekStart, monthBounds } from "./calendar-dates";

test("calendar weeks start on Sunday", () => {
  assert.equal(getWeekStart("2026-11-22"), "2026-11-22");
  assert.equal(getWeekStart("2026-11-23"), "2026-11-22");
  assert.equal(getWeekStart("2026-11-28"), "2026-11-22");
});

test("month grid begins on the Sunday before or on the first", () => {
  assert.equal(monthBounds("2026-11-18").gridStart, "2026-11-01");
  assert.equal(monthBounds("2026-04-18").gridStart, "2026-03-29");
});
