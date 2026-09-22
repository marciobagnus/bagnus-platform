-- CreateEnum
CREATE TYPE "DiagnosisDecision" AS ENUM ('CHARGED', 'WAIVED');

-- CreateTable
CREATE TABLE "diagnosis_charges" (
    "id" UUID NOT NULL,
    "repairOrderId" UUID NOT NULL,
    "decision" "DiagnosisDecision" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "note" TEXT,
    "decidedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "diagnosis_charges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "diagnosis_charges_repairOrderId_key" ON "diagnosis_charges"("repairOrderId");

-- AddForeignKey
ALTER TABLE "diagnosis_charges" ADD CONSTRAINT "diagnosis_charges_repairOrderId_fkey" FOREIGN KEY ("repairOrderId") REFERENCES "repair_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
