import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { test } from "node:test";

// Substitute only authentication and database I/O; execute the actual route and repository.
globalThis.suggestionsTestUser = null;
registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith("/lib/current-internal-user.ts")) {
      return { format: "module", shortCircuit: true,
        source: "export async function getAuthenticatedInternalUser() { return globalThis.suggestionsTestUser; }" };
    }
    return nextLoad(url, context);
  },
});
let calls = [];
let failure = false;
const attributes = { brand: ["Singer", "Brother", "Singer", ""], type: ["Recta", "Overlock", "  "], model: [null, "4423", " GS2700 ", "4423"] };
globalThis.prisma = { machine: { async groupBy({ by }) {
  calls.push(by);
  if (failure) throw new Error("Database unavailable");
  return attributes[by[0]].map((value) => ({ [by[0]]: value }));
} } };
const { GET } = await import("../../src/app/api/machines/suggestions/route.ts");

test("sin autenticación devuelve 401 y no consulta atributos", async () => {
  calls = [];
  globalThis.suggestionsTestUser = null;
  const response = await GET();
  assert.equal(response.status, 401);
  assert.deepEqual(calls, []);
});

test("ADMIN y STAFF reciben sugerencias únicas, ordenadas y sin datos del cliente", async () => {
  for (const role of ["ADMIN", "STAFF"]) {
    globalThis.suggestionsTestUser = { role };
    calls = [];
    const response = await GET();
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.deepEqual(await response.json(), { brands: ["Brother", "Singer"], types: ["Overlock", "Recta"], models: ["4423", "GS2700"] });
    assert.deepEqual(calls, [["brand"], ["type"], ["model"]]);
  }
});

test("un fallo de consulta devuelve un error genérico", async () => {
  globalThis.suggestionsTestUser = { role: "STAFF" };
  failure = true;
  const response = await GET();
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "No se pudieron consultar las sugerencias." });
});
