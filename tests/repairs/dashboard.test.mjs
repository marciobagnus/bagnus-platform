import assert from "node:assert/strict";
import { test } from "node:test";

import { getRepairDashboard } from "../../src/modules/repairs/application/get-repair-dashboard.ts";
import { FINAL_REPAIR_STATUSES } from "../../src/modules/repairs/application/repair-dashboard-query-repository.ts";

test("calcula las métricas y limita los trabajos recientes", async () => {
  assert.deepEqual(FINAL_REPAIR_STATUSES, [
    "DELIVERED",
  ]);

  const calls = [];
  const repository = {
    countActiveRepairs: async () => 4,
    countByStatus: async (status) => {
      calls.push(status);

      return {
        WAITING_APPROVAL: 1,
        READY_FOR_PICKUP: 1,
      }[status];
    },
    findRecentActive: async (limit) => {
      assert.equal(limit, 10);
      return [{ id: "recent-repair" }];
    },
  };

  const dashboard = await getRepairDashboard(repository, { async getOutstandingSummary() { return {orderCount:3,totalBalance:"80000.50"}; } });

  assert.deepEqual(dashboard, {
    activeRepairs: 4,
    outstanding: {orderCount:3,totalBalance:"80000.50"},
    waitingApproval: 1,
    readyForPickup: 1,
    recentRepairs: [{ id: "recent-repair" }],
  });

  assert.deepEqual(calls, [
    "WAITING_APPROVAL",
    "READY_FOR_PICKUP",
  ]);
});

test("la cobranza permanece visible aunque no haya trabajos activos", async () => {
  const dashboard = await getRepairDashboard({
    async countActiveRepairs(){return 0;}, async countByStatus(){return 0;}, async findRecentActive(){return [];},
  }, {async getOutstandingSummary(){return {orderCount:2,totalBalance:"15000.25"};}});
  assert.equal(dashboard.activeRepairs,0);
  assert.deepEqual(dashboard.outstanding,{orderCount:2,totalBalance:"15000.25"});
});
