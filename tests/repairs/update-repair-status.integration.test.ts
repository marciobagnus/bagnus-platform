import assert from "node:assert/strict";
import { after, test } from "node:test";
import { prisma } from "../../src/lib/prisma.ts";
import { repairFixture } from "../helpers/repair-fixture.ts";
import { PrismaRepairStatusRepository } from "../../src/modules/repairs/infrastructure/prisma-repair-status-repository.ts";
test("generic status persistence cannot bypass quote submission", async()=>{
  const f = await repairFixture("RECEIVED",null,"DRAFT");
  try {
    await assert.rejects(new PrismaRepairStatusRepository().saveStatusChange(f.repairId,"RECEIVED",{fromStatus:"RECEIVED",toStatus:"WAITING_APPROVAL",note:null,changedAt:new Date()}));
    assert.equal((await prisma.repairOrder.findUniqueOrThrow({where:{id:f.repairId}})).status,"RECEIVED");
    assert.equal(await prisma.repairStatusHistory.count({where:{repairOrderId:f.repairId}}),0);
  } finally {await f.cleanup();}
});
after(()=>prisma.$disconnect());
