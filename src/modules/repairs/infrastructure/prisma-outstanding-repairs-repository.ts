import { prisma } from "../../../lib/prisma.ts";
import type { OutstandingRepair, OutstandingRepairsRepository } from "../application/outstanding-repairs.ts";

export class PrismaOutstandingRepairsRepository implements OutstandingRepairsRepository {
  async findOutstanding(limit: number, offset: number) {
    // Filter by debt BEFORE pagination. This projects the same obligation as repair-account;
    // aggregation is performed in PostgreSQL so old orders never fall out of the search.
    return prisma.$queryRaw<OutstandingRepair[]>`
      SELECT r.id, c.id AS "customerId", concat_ws(' ', c.name, c."lastName") AS "customerName",
             m.id AS "machineId", concat_ws(' ', m.brand, m.model) AS machine,
             r.status::text, r.resolution::text, q.total::text,
             coalesce(p.paid, 0)::numeric(12,2)::text AS paid,
             (q.total - coalesce(p.paid, 0))::numeric(12,2)::text AS balance, r."deliveredAt"
      FROM repair_orders r
      JOIN machines m ON m.id = r."machineId"
      JOIN customers c ON c.id = m."customerId"
      JOIN (SELECT "repairOrderId", sum("totalAmount") AS total FROM repair_quotes
            WHERE status = 'APPROVED' GROUP BY "repairOrderId" HAVING count(*) = 1) q ON q."repairOrderId" = r.id
      LEFT JOIN (SELECT "repairOrderId", sum(amount) AS paid FROM payments GROUP BY "repairOrderId") p ON p."repairOrderId" = r.id
      WHERE ((r.status = 'IN_REPAIR' AND r.resolution IS NULL)
          OR (r.status IN ('READY_FOR_PICKUP','DELIVERED') AND r.resolution = 'REPAIRED'))
        AND q.total > coalesce(p.paid, 0)
      ORDER BY r."receivedAt" ASC, r.id ASC
      LIMIT ${limit} OFFSET ${offset}
    `;
  }
}
