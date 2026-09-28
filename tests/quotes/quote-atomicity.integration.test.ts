import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";
import { prisma } from "../../src/lib/prisma.ts";
import { repairFixture } from "../helpers/repair-fixture.ts";
import { createInitialRepairQuote } from "../../src/modules/quotes/application/create-initial-repair-quote.ts";
import { PrismaRepairQuoteRepository } from "../../src/modules/quotes/infrastructure/prisma-repair-quote-repository.ts";
import { submitRepairQuote } from "../../src/modules/quotes/application/submit-repair-quote.ts";
import { PrismaQuoteSubmissionRepository } from "../../src/modules/quotes/infrastructure/prisma-quote-submission-repository.ts";
import { decideRepairQuote } from "../../src/modules/quotes/application/decide-repair-quote.ts";
import { PrismaQuoteDecisionRepository } from "../../src/modules/quotes/infrastructure/prisma-quote-decision-repository.ts";
test("failed attribution rolls back quote, order and history; draft creates no transition",async()=>{
  const f = await repairFixture("RECEIVED",null,"DRAFT");
  try {
    await prisma.repairQuote.delete({where:{id:f.quoteId}});
    const input = {repairOrderId:f.repairId,description:"Prueba",totalAmount:"100"};
    const repository = new PrismaRepairQuoteRepository();
    await assert.rejects(createInitialRepairQuote({...input,changedByUserId:randomUUID()},repository));
    assert.equal(await prisma.repairQuote.count({where:{repairOrderId:f.repairId}}),0);
    assert.equal((await prisma.repairOrder.findUniqueOrThrow({where:{id:f.repairId}})).status,"RECEIVED");
    const draft = await createInitialRepairQuote({...input,draft:true},repository);
    assert.equal(draft.status,"DRAFT");
    assert.equal(await prisma.repairStatusHistory.count({where:{repairOrderId:f.repairId}}),0);
    await submitRepairQuote({quoteId:draft.id},new PrismaQuoteSubmissionRepository());
    assert.equal(await prisma.repairStatusHistory.count({where:{repairOrderId:f.repairId}}),1);
    await assert.rejects(decideRepairQuote({quoteId:draft.id,decision:"REJECTED",channel:"IN_PERSON",changedByUserId:randomUUID()},new PrismaQuoteDecisionRepository()));
    assert.equal((await prisma.repairQuote.findUniqueOrThrow({where:{id:draft.id}})).status,"WAITING_APPROVAL");
    const order = await prisma.repairOrder.findUniqueOrThrow({where:{id:f.repairId}});
    assert.equal(order.status,"WAITING_APPROVAL");assert.equal(order.resolution,null);
    assert.equal(await prisma.quoteDecision.count({where:{quoteId:draft.id}}),0);
  } finally {await f.cleanup();}
});
after(()=>prisma.$disconnect());
