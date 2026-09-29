import { randomUUID } from "node:crypto";
import { prisma } from "../../src/lib/prisma.ts";
import type { RepairStatus, RepairResolution, QuoteStatus } from "../../src/generated/prisma/enums.ts";

export async function repairFixture(status: RepairStatus = "READY_FOR_PICKUP", resolution: RepairResolution | null = "REPAIRED", quoteStatus: QuoteStatus = "APPROVED", amount = "150000.00") {
  const customerId = randomUUID(), machineId = randomUUID(), repairId = randomUUID(), now = new Date();
  await prisma.customer.create({data:{id:customerId,name:"Prueba",phone:`test-${customerId}`,createdAt:now,updatedAt:now}});
  await prisma.machine.create({data:{id:machineId,customerId,brand:"Singer",type:"Recta",createdAt:now,updatedAt:now}});
  await prisma.repairOrder.create({data:{id:repairId,machineId,reportedIssue:"Prueba",status,resolution,receivedAt:now,createdAt:now,updatedAt:now}});
  const quoteId = randomUUID();
  await prisma.repairQuote.create({data:{id:quoteId,repairOrderId:repairId,version:1,description:"Prueba",totalAmount:amount,status:quoteStatus,createdAt:now,updatedAt:now}});
  return {customerId,machineId,repairId,quoteId, async cleanup() {
    const orders = await prisma.repairOrder.findMany({where:{machineId},select:{id:true}});
    const ids = orders.map(order=>order.id);
    await prisma.quoteDecision.deleteMany({where:{quote:{repairOrderId:{in:ids}}}});
    await prisma.payment.deleteMany({where:{repairOrderId:{in:ids}}});
    await prisma.diagnosisCharge.deleteMany({where:{repairOrderId:{in:ids}}});
    await prisma.repairQuote.deleteMany({where:{repairOrderId:{in:ids}}});
    await prisma.repairStatusHistory.deleteMany({where:{repairOrderId:{in:ids}}});
    await prisma.repairOrder.deleteMany({where:{machineId}});
    await prisma.machine.delete({where:{id:machineId}});
    await prisma.customer.delete({where:{id:customerId}});
  }};
}
