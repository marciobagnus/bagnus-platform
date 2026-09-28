import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { getRepairBalance } from "../../src/modules/payments/application/get-repair-balance.ts";
const query = (data) => getRepairBalance(randomUUID(), { async findBillingData() { return data; } });
test("balance uses approved quote and payments after delivery", async () => {
  const result = await query({status:"DELIVERED",resolution:"REPAIRED",quotes:[{status:"APPROVED",totalAmount:"50000"}],payments:[{amount:"17500"}]});
  assert.equal(result.outstandingAmount,"32500.00");
});
test("rejection is free without a diagnosis decision", async () => {
  const result = await query({status:"READY_FOR_PICKUP",resolution:"QUOTE_REJECTED",quotes:[{status:"REJECTED",totalAmount:"50000"}],payments:[]});
  assert.equal(result.totalAmount,"0.00");
});
test("unknown obligation preserves recorded payments without inventing debt", async () => {
  const result = await query({status:"RECEIVED",resolution:null,quotes:[],payments:[{amount:"5000"}]});
  assert.equal(result.status,"PENDING");
  assert.equal(result.paidAmount,"5000.00");
  assert.equal(result.outstandingAmount,null);
});
