import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";
import { prisma } from "../../src/lib/prisma.ts";
import { repairFixture } from "../helpers/repair-fixture.ts";
import { processRepairAction } from "../../src/modules/repairs/application/process-repair-action.ts";
import { PrismaRepairStatusRepository } from "../../src/modules/repairs/infrastructure/prisma-repair-status-repository.ts";
import { PrismaPaymentRepository } from "../../src/modules/payments/infrastructure/prisma-payment-repository.ts";
import { createPayment } from "../../src/modules/payments/domain/payment.ts";
import { calculateRepairAccount } from "../../src/modules/payments/domain/repair-account.ts";
const repository = new PrismaRepairStatusRepository();
const paymentRepo = new PrismaPaymentRepository();
const read = (id: string) => prisma.repairOrder.findUniqueOrThrow({where:{id},include:{quotes:true,payments:true,statusHistory:true}});
const pay = (id: string, amount: string) => paymentRepo.add(createPayment({id:randomUUID(),repairOrderId:id,amount,method:"CASH",now:new Date()}));
for (const amount of ["0", "50000", "120000"]) {
  test(`handover with ${amount} payment is atomic and permits remaining debt`, async () => {
    const f = await repairFixture();
    try {
      await pay(f.repairId,"30000");
      await processRepairAction({repairId:f.repairId,action:"HAND_OVER_MACHINE",payment:{amount,method:"TRANSFER"}},repository);
      const repair = await read(f.repairId);
      assert.equal(repair.status,"DELIVERED"); assert.equal(repair.resolution,"REPAIRED"); assert.ok(repair.deliveredAt);
      assert.equal(repair.payments.length,amount === "0" ? 1 : 2);
      assert.equal(calculateRepairAccount(repair).outstandingBalance,`${120000 - Number(amount)}.00`);
      assert.equal(repair.statusHistory.length,1);
      if (amount !== "120000") {
        await pay(f.repairId,String(120000 - Number(amount)));
        const paid = await read(f.repairId);
        assert.equal(paid.deliveredAt?.getTime(),repair.deliveredAt.getTime());
        assert.equal(paid.status,"DELIVERED"); assert.equal(paid.resolution,"REPAIRED");
        assert.equal(paid.statusHistory.length,1);
        assert.equal(calculateRepairAccount(paid).outstandingBalance,"0.00");
      }
    } finally { await f.cleanup(); }
  });
}
test("rejection can be handed over without diagnosis record", async () => {
  const f = await repairFixture("READY_FOR_PICKUP","QUOTE_REJECTED","REJECTED");
  try {
    await processRepairAction({repairId:f.repairId,action:"HAND_OVER_MACHINE"},repository);
    const repair = await read(f.repairId);
    assert.equal(repair.status,"DELIVERED"); assert.equal(repair.resolution,"QUOTE_REJECTED");
    assert.equal(calculateRepairAccount(repair).amountDue,"0.00");
    assert.equal(await prisma.diagnosisCharge.count({where:{repairOrderId:f.repairId}}),0);
    await assert.rejects(pay(f.repairId,"1"));
  } finally { await f.cleanup(); }
});
test("failure writing handover history rolls back payment and delivery", async () => {
  const f = await repairFixture();
  try {
    await assert.rejects(processRepairAction({repairId:f.repairId,action:"HAND_OVER_MACHINE",changedByUserId:randomUUID(),payment:{amount:"100",method:"CASH"}},repository));
    const repair = await read(f.repairId);
    assert.equal(repair.status,"READY_FOR_PICKUP"); assert.equal(repair.deliveredAt,null);
    assert.equal(repair.payments.length,0); assert.equal(repair.statusHistory.length,0);
  } finally { await f.cleanup(); }
});
test("concurrent payment and handover cannot overpay", async () => {
  const f = await repairFixture();
  try {
    const result = await Promise.allSettled([
      processRepairAction({repairId:f.repairId,action:"HAND_OVER_MACHINE",payment:{amount:"100000",method:"CASH"}},repository),
      pay(f.repairId,"100000"),
    ]);
    assert.equal(result.filter(r=>r.status === "fulfilled").length,1);
    assert.equal(calculateRepairAccount(await read(f.repairId)).totalPaid,"100000.00");
  } finally { await f.cleanup(); }
});
test("concurrent handovers produce one payment and one transition", async () => {
  const f = await repairFixture();
  try {
    const result = await Promise.allSettled([1,2].map(()=>processRepairAction({repairId:f.repairId,action:"HAND_OVER_MACHINE",payment:{amount:"100",method:"CASH"}},repository)));
    assert.equal(result.filter(r=>r.status === "fulfilled").length,1);
    const repair = await read(f.repairId);
    assert.equal(repair.payments.length,1); assert.equal(repair.statusHistory.length,1);
  } finally { await f.cleanup(); }
});
test("finish requires an approved consistent quote", async () => {
  const f = await repairFixture("IN_REPAIR",null,"DRAFT");
  try {
    await assert.rejects(processRepairAction({repairId:f.repairId,action:"FINISH_REPAIR"},repository));
    assert.equal((await read(f.repairId)).status,"IN_REPAIR");
    await prisma.repairQuote.update({where:{id:f.quoteId},data:{status:"APPROVED"}});
    await processRepairAction({repairId:f.repairId,action:"FINISH_REPAIR"},repository);
    assert.equal((await read(f.repairId)).resolution,"REPAIRED");
  } finally { await f.cleanup(); }
});
after(()=>prisma.$disconnect());
