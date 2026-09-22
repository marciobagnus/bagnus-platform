-- AlterTable
ALTER TABLE "diagnosis_charges" ADD COLUMN     "decidedByUserId" UUID;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "recordedByUserId" UUID;

-- AlterTable
ALTER TABLE "repair_status_history" ADD COLUMN     "changedByUserId" UUID;

-- CreateIndex
CREATE INDEX "diagnosis_charges_decidedByUserId_idx" ON "diagnosis_charges"("decidedByUserId");

-- CreateIndex
CREATE INDEX "payments_recordedByUserId_idx" ON "payments"("recordedByUserId");

-- CreateIndex
CREATE INDEX "repair_status_history_changedByUserId_idx" ON "repair_status_history"("changedByUserId");

-- AddForeignKey
ALTER TABLE "repair_status_history" ADD CONSTRAINT "repair_status_history_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "internal_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "internal_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnosis_charges" ADD CONSTRAINT "diagnosis_charges_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "internal_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
