-- Development/test data only. Stop old writers before applying this contract migration.
-- Preserve raw history and diagnosis rows without keeping their old operational semantics.
BEGIN;
ALTER TYPE "RepairStatus" RENAME TO "RepairHistoryStatus";
CREATE TYPE "RepairStatus" AS ENUM ('RECEIVED','WAITING_APPROVAL','IN_REPAIR','READY_FOR_PICKUP','DELIVERED');
DROP INDEX "repair_orders_one_open_per_machine";
ALTER TABLE "repair_orders" ALTER COLUMN status DROP DEFAULT;
UPDATE "repair_orders" SET resolution = CASE
  WHEN status::text IN ('AWAITING_PICKUP_UNREPAIRED','CANCELLED') THEN 'QUOTE_REJECTED'::"RepairResolution"
  WHEN status::text IN ('READY_FOR_PICKUP','DELIVERED') THEN coalesce(resolution, 'REPAIRED'::"RepairResolution")
  ELSE NULL END;
UPDATE "repair_orders" r SET "deliveredAt" = coalesce("deliveredAt",
  (SELECT max(h."changedAt") FROM repair_status_history h WHERE h."repairOrderId" = r.id AND h."toStatus"::text IN ('DELIVERED','CANCELLED')),
  "updatedAt") WHERE status::text IN ('DELIVERED','CANCELLED');
ALTER TABLE "repair_orders" ALTER COLUMN status TYPE "RepairStatus" USING
  (CASE status::text WHEN 'DIAGNOSING' THEN 'RECEIVED'
    WHEN 'AWAITING_PICKUP_UNREPAIRED' THEN 'READY_FOR_PICKUP'
    WHEN 'CANCELLED' THEN 'DELIVERED' ELSE status::text END)::"RepairStatus";
ALTER TABLE "repair_orders" ALTER COLUMN status SET DEFAULT 'RECEIVED';
CREATE UNIQUE INDEX "repair_orders_one_open_per_machine" ON "repair_orders" ("machineId") WHERE status <> 'DELIVERED';
COMMIT;
