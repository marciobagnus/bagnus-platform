import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";
import { prisma } from "../../src/lib/prisma.ts";
import { repairFixture } from "../helpers/repair-fixture.ts";
import { getOutstandingRepairs } from "../../src/modules/repairs/application/outstanding-repairs.ts";
import { PrismaOutstandingRepairsRepository } from "../../src/modules/repairs/infrastructure/prisma-outstanding-repairs-repository.ts";
import { calculateRepairAccount } from "../../src/modules/payments/domain/repair-account.ts";
test("finds old delivered debt beyond 100 recent repairs, paginates and agrees with account", async()=>{
  const f = await repairFixture("DELIVERED","REPAIRED");
  const now = new Date();
  try {
    await prisma.repairOrder.update({where:{id:f.repairId},data:{receivedAt:new Date("2000-01-01"),deliveredAt:now}});
    await prisma.payment.create({data:{id:randomUUID(),repairOrderId:f.repairId,amount:"30000",method:"CASH",receivedAt:now,createdAt:now}});
    const ids = Array.from({length:105},()=>randomUUID());
    await prisma.repairOrder.createMany({data:ids.map(id=>({id,machineId:f.machineId,reportedIssue:"Prueba paginación",status:"DELIVERED",resolution:"REPAIRED",deliveredAt:now,receivedAt:new Date("2000-01-02"),createdAt:now,updatedAt:now}))});
    await prisma.repairQuote.createMany({data:ids.map(repairOrderId=>({id:randomUUID(),repairOrderId,version:1,description:"Prueba",totalAmount:"10",status:"APPROVED",createdAt:now,updatedAt:now}))});
    const repository = new PrismaOutstandingRepairsRepository();
    let page = 1, hasMore = true;
    const all = [];
    while (hasMore) {const result = await getOutstandingRepairs(repository,page++); all.push(...result.items); hasMore=result.hasMore;}
    const owned = all.filter(item=>item.machineId === f.machineId);
    assert.equal(owned.length,106);
    assert.equal(new Set(owned.map(item=>item.id)).size,106);
    const old = owned.find(item=>item.id===f.repairId)!;
    assert.equal(old.balance,"120000.00"); assert.equal(old.status,"DELIVERED"); assert.ok(old.deliveredAt);
    const repair = await prisma.repairOrder.findUniqueOrThrow({where:{id:f.repairId},include:{quotes:true,payments:true}});
    assert.equal(old.balance,calculateRepairAccount(repair).outstandingBalance);
    await prisma.payment.create({data:{id:randomUUID(),repairOrderId:f.repairId,amount:"120000",method:"CASH",receivedAt:now,createdAt:now}});
    assert.ok(!(await repository.findOutstanding(1000,0)).some(item=>item.id===f.repairId));
  } finally {await f.cleanup();}
});
after(()=>prisma.$disconnect());
