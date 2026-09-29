import { Prisma } from "../../../generated/prisma/client.ts";
import { prisma } from "../../../lib/prisma.ts";
import type { OutstandingRepair, OutstandingRepairsCustomerFilter, OutstandingRepairsRepository, OutstandingRepairsSummary } from "../application/outstanding-repairs.ts";

// One definition of debt for the paginated list and dashboard aggregate.
// Rejected quotes are free; only a consistent approved obligation can have debt.
const outstandingAccounts = Prisma.sql`
  SELECT r.id, r."machineId", r.status, r.resolution, r."deliveredAt", r."receivedAt",
         q.total, coalesce(p.paid, 0)::numeric(12,2) AS paid,
         (q.total - coalesce(p.paid, 0))::numeric(12,2) AS balance
  FROM repair_orders r
  JOIN (SELECT "repairOrderId", sum("totalAmount") AS total FROM repair_quotes
        WHERE status = 'APPROVED' GROUP BY "repairOrderId" HAVING count(*) = 1) q ON q."repairOrderId" = r.id
  LEFT JOIN (SELECT "repairOrderId", sum(amount) AS paid FROM payments GROUP BY "repairOrderId") p ON p."repairOrderId" = r.id
  WHERE ((r.status = 'IN_REPAIR' AND r.resolution IS NULL)
      OR (r.status IN ('READY_FOR_PICKUP','DELIVERED') AND r.resolution = 'REPAIRED'))
    AND q.total > coalesce(p.paid, 0)
`;

export class PrismaOutstandingRepairsRepository implements OutstandingRepairsRepository {
  async findOutstanding(limit: number, offset: number) {
    // Filter before pagination so old and delivered orders remain discoverable.
    return prisma.$queryRaw<OutstandingRepair[]>`
      WITH outstanding AS (${outstandingAccounts})
      SELECT r.id, c.id AS "customerId", concat_ws(' ', c.name, c."lastName") AS "customerName",
             m.id AS "machineId", concat_ws(' ', m.brand, m.model) AS machine,
             r.status::text, r.resolution::text, r.total::text, r.paid::text, r.balance::text, r."deliveredAt"
      FROM outstanding r
      JOIN machines m ON m.id = r."machineId"
      JOIN customers c ON c.id = m."customerId"
      ORDER BY r."receivedAt" ASC, r.id ASC
      LIMIT ${limit} OFFSET ${offset}
    `;
  }

  async getOutstandingSummary(customer?: OutstandingRepairsCustomerFilter): Promise<OutstandingRepairsSummary> {
    const filter = customer ? Prisma.sql`
      WHERE r.id <> ${customer.excludeRepairId}::uuid
        AND r."machineId" IN (SELECT id FROM machines WHERE "customerId" = ${customer.customerId}::uuid)
    ` : Prisma.empty;
    const [summary] = await prisma.$queryRaw<OutstandingRepairsSummary[]>`
      WITH outstanding AS (${outstandingAccounts})
      SELECT count(*)::integer AS "orderCount",
             round(coalesce(sum(balance), 0), 2)::text AS "totalBalance"
      FROM outstanding r
      ${filter}
    `;
    return summary;
  }
}
