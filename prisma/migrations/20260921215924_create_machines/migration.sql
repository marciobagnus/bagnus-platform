-- CreateTable
CREATE TABLE "machines" (
    "id" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "brand" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "model" TEXT,
    "serialNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "machines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "machines_customerId_idx" ON "machines"("customerId");

-- AddForeignKey
ALTER TABLE "machines" ADD CONSTRAINT "machines_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
