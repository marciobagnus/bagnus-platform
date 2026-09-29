import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeMachineSuggestions } from "../../src/modules/machines/application/machine-suggestions.ts";

test("las sugerencias eliminan vacíos, null y duplicados y se ordenan alfabéticamente", () => {
  assert.deepEqual(normalizeMachineSuggestions(["Singer", "", null, " Brother ", "Singer", "  ", "Alfa"]), ["Alfa", "Brother", "Singer"]);
  assert.equal(normalizeMachineSuggestions([" SINGER ", "singer", "Singer"]).length, 1);
  assert.deepEqual(normalizeMachineSuggestions([]), []);
});

test("limita cada lista después de ordenar y deduplicar", () => {
  const values = Array.from({ length: 250 }, (_, i) => `Modelo ${String(i).padStart(3, "0")}`);
  assert.deepEqual(normalizeMachineSuggestions([...values, ...values].reverse()), values.slice(0, 200));
});
