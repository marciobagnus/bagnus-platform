-- CreateEnum
CREATE TYPE "RepairStatus" AS ENUM ('RECEIVED', 'DIAGNOSING', 'WAITING_APPROVAL', 'IN_REPAIR', 'READY_FOR_PICKUP', 'DELIVERED', 'CANCELLED');

-- CreateTable
CREATE TABLE "repair_orders" (
    "id" UUID NOT NULL,
    "machineId" UUID NOT NULL,
    "reportedIssue" TEXT NOT NULL,
    "receivedAccessories" TEXT,
    "status" "RepairStatus" NOT NULL DEFAULT 'RECEIVED',
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "repair_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repair_status_history" (
    "id" UUID NOT NULL,
    "repairOrderId" UUID NOT NULL,
    "fromStatus" "RepairStatus",
    "toStatus" "RepairStatus" NOT NULL,
    "note" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "repair_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "repair_orders_machineId_idx" ON "repair_orders"("machineId");

-- CreateIndex
CREATE INDEX "repair_orders_status_idx" ON "repair_orders"("status");

-- CreateIndex
CREATE INDEX "repair_status_history_repairOrderId_changedAt_idx" ON "repair_status_history"("repairOrderId", "changedAt");

-- AddForeignKey
ALTER TABLE "repair_orders" ADD CONSTRAINT "repair_orders_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "machines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_status_history" ADD CONSTRAINT "repair_status_history_repairOrderId_fkey" FOREIGN KEY ("repairOrderId") REFERENCES "repair_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Impedir que una máquina tenga dos reparaciones abiertas
-- al mismo tiempo.

CREATE UNIQUE INDEX
  "repair_orders_one_open_per_machine"
ON "repair_orders" ("machineId")
WHERE "status" NOT IN ('DELIVERED', 'CANCELLED');