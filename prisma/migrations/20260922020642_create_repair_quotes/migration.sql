-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'WAITING_APPROVAL', 'APPROVED', 'REJECTED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "QuoteDecisionChannel" AS ENUM ('IN_PERSON', 'PHONE', 'WHATSAPP', 'EMAIL', 'CUSTOMER_PORTAL');

-- CreateTable
CREATE TABLE "repair_quotes" (
    "id" UUID NOT NULL,
    "repairOrderId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "repair_quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_decisions" (
    "id" UUID NOT NULL,
    "quoteId" UUID NOT NULL,
    "approved" BOOLEAN NOT NULL,
    "channel" "QuoteDecisionChannel" NOT NULL,
    "note" TEXT,
    "decidedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quote_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "repair_quotes_repairOrderId_idx" ON "repair_quotes"("repairOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "repair_quotes_repairOrderId_version_key" ON "repair_quotes"("repairOrderId", "version");

-- CreateIndex
CREATE INDEX "quote_decisions_quoteId_idx" ON "quote_decisions"("quoteId");

-- CreateIndex
CREATE UNIQUE INDEX "quote_decisions_quoteId_key" ON "quote_decisions"("quoteId");

-- AddForeignKey
ALTER TABLE "repair_quotes" ADD CONSTRAINT "repair_quotes_repairOrderId_fkey" FOREIGN KEY ("repairOrderId") REFERENCES "repair_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_decisions" ADD CONSTRAINT "quote_decisions_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "repair_quotes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Una reparación puede tener múltiples versiones
-- históricas del presupuesto, pero solamente una
-- versión vigente.

CREATE UNIQUE INDEX
  "repair_quotes_one_active_per_repair"
ON "repair_quotes" ("repairOrderId")
WHERE "status" IN (
  'DRAFT',
  'WAITING_APPROVAL',
  'APPROVED'
);