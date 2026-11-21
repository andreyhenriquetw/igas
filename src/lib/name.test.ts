import assert from "node:assert/strict";
import test from "node:test";
import { capitalizeNameInitials } from "./name";

test("capitalizes each name initial, including accented and hyphenated names", () => {
  assert.equal(capitalizeNameInitials("andrey henrique lima da silva"), "Andrey Henrique Lima Da Silva");
  assert.equal(capitalizeNameInitials("ana-maria d'ávila"), "Ana-Maria D'Ávila");
});
