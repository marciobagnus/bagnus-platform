/*
  Warnings:

  - A unique constraint covering the columns `[dni]` on the table `customers` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[phone]` on the table `customers` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "address" TEXT,
ADD COLUMN     "dni" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "lastName" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "customers_dni_key" ON "customers"("dni");

-- CreateIndex
CREATE UNIQUE INDEX "customers_phone_key" ON "customers"("phone");
