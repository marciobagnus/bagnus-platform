CREATE TYPE "RepairResolution" AS ENUM ('REPAIRED', 'QUOTE_REJECTED');
ALTER TABLE "repair_orders" ADD COLUMN "resolution" "RepairResolution",
    ADD COLUMN "deliveredAt" TIMESTAMP(3);
ALTER TABLE "quote_decisions" ADD COLUMN "recordedByUserId" UUID;
CREATE INDEX "quote_decisions_recordedByUserId_idx" ON "quote_decisions"("recordedByUserId");
ALTER TABLE "quote_decisions" ADD CONSTRAINT "quote_decisions_recordedByUserId_fkey"
    FOREIGN KEY ("recordedByUserId") REFERENCES "internal_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
