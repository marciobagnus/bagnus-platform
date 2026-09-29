import assert from "node:assert/strict";
import { test } from "node:test";
import { Prisma } from "../../src/generated/prisma/client.ts";

// A database double prevents any connection or write in these unit tests.
let query;
let summary = { orderCount: 0, totalBalance: "0.00" };
let repair = null;
globalThis.prisma = {
  async $queryRaw(strings, ...values) { query = Prisma.sql(strings, ...values); return [summary]; },
  repairOrder: { async findUnique() { return repair; } },
};
const { PrismaOutstandingRepairsRepository } = await import("../../src/modules/repairs/infrastructure/prisma-outstanding-repairs-repository.ts");
const { PrismaRepairOrderQueryRepository } = await import("../../src/modules/repairs/infrastructure/prisma-repair-order-query-repository.ts");

test("el resumen por cliente reutiliza la definición de deuda y parametriza la exclusión de la reparación actual", async () => {
  const repository = new PrismaOutstandingRepairsRepository();
  await repository.getOutstandingSummary();
  const globalQuery = query.text;
  const result = await repository.getOutstandingSummary({ customerId: "customer", excludeRepairId: "current-repair" });
  assert.deepEqual(result, { orderCount: 0, totalBalance: "0.00" });
  assert.ok(query.text.startsWith(globalQuery.trimEnd()));
  assert.match(query.text, /r\.id <> \$1::uuid/);
  assert.match(query.text, /"customerId" = \$2::uuid/);
  assert.deepEqual(query.values, ["current-repair", "customer"]);
});

test("el detalle mantiene separada la deuda ajena y la cuenta actual", async () => {
  repair = { id: "current", status: "IN_REPAIR", resolution: null,
    machine: { customer: { id: "customer" } },
    quotes: [{ status: "APPROVED", totalAmount: "200000.00" }], payments: [], diagnosisCharge: null };
  summary = { orderCount: 2, totalBalance: "150000.00" };
  const detail = await new PrismaRepairOrderQueryRepository().findById("current");
  assert.deepEqual(detail.otherRepairsOutstanding, summary);
  assert.equal(detail.billing.outstandingBalance, "200000.00");
  assert.deepEqual(query.values, ["current", "customer"]);
});
