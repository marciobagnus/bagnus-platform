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
    const summary = await repository.getOutstandingSummary();
    assert.equal(summary.orderCount, all.length);
    const cents = (amount: string) => BigInt(amount.replace(".", ""));
    assert.equal(cents(summary.totalBalance), all.reduce((sum, item) => sum + cents(item.balance), 0n));
    const owned = all.filter(item=>item.machineId === f.machineId);
    assert.equal(owned.length,106);
    assert.equal(new Set(owned.map(item=>item.id)).size,106);
    const old = owned.find(item=>item.id===f.repairId)!;
    assert.equal(old.balance,"120000.00"); assert.equal(old.status,"DELIVERED"); assert.ok(old.deliveredAt);
    const repair = await prisma.repairOrder.findUniqueOrThrow({where:{id:f.repairId},include:{quotes:true,payments:true}});
    assert.equal(old.balance,calculateRepairAccount(repair).outstandingBalance);
    await prisma.payment.create({data:{id:randomUUID(),repairOrderId:f.repairId,amount:"120000",method:"CASH",receivedAt:now,createdAt:now}});
    assert.ok(!(await repository.findOutstanding(1000,0)).some(item=>item.id===f.repairId));
    const collected = await repository.getOutstandingSummary();
    assert.equal(collected.orderCount, summary.orderCount - 1);
    assert.equal(cents(collected.totalBalance), cents(summary.totalBalance) - 12000000n);
  } finally {await f.cleanup();}
});
test("summary excludes free, unknown and settled accounts and updates after partial payment", async () => {
  const repository = new PrismaOutstandingRepairsRepository();
  const baseline = await repository.getOutstandingSummary();
  const fixtures: Awaited<ReturnType<typeof repairFixture>>[] = [];
  const cents = (amount: string) => BigInt(amount.replace(".", ""));
  const now = new Date();
  try {
    for (const [status, resolution, quoteStatus] of [
      ["READY_FOR_PICKUP", "QUOTE_REJECTED", "REJECTED"],
      ["RECEIVED", null, "DRAFT"],
      ["DELIVERED", "REPAIRED", "APPROVED"],
      ["IN_REPAIR", null, "APPROVED"],
    ] as const) fixtures.push(await repairFixture(status, resolution, quoteStatus, "100.25"));
    await prisma.payment.create({data:{id:randomUUID(),repairOrderId:fixtures[2].repairId,amount:"100.25",method:"CASH",receivedAt:now,createdAt:now}});
    const before = await repository.getOutstandingSummary();
    assert.equal(before.orderCount, baseline.orderCount + 1);
    assert.equal(cents(before.totalBalance), cents(baseline.totalBalance) + 10025n);
    await prisma.payment.create({data:{id:randomUUID(),repairOrderId:fixtures[3].repairId,amount:"40.10",method:"CASH",receivedAt:now,createdAt:now}});
    const afterPayment = await repository.getOutstandingSummary();
    assert.equal(afterPayment.orderCount, before.orderCount);
    assert.equal(cents(afterPayment.totalBalance), cents(before.totalBalance) - 4010n);
  } finally {
    for (const fixture of fixtures) await fixture.cleanup();
  }
});
after(()=>prisma.$disconnect());
