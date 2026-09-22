/*
  Warnings:

  - The values [MANAGER] on the enum `InternalUserRole` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "InternalUserRole_new" AS ENUM ('ADMIN', 'STAFF');
ALTER TABLE "internal_users" ALTER COLUMN "role" TYPE "InternalUserRole_new" USING ("role"::text::"InternalUserRole_new");
ALTER TYPE "InternalUserRole" RENAME TO "InternalUserRole_old";
ALTER TYPE "InternalUserRole_new" RENAME TO "InternalUserRole";
DROP TYPE "public"."InternalUserRole_old";
COMMIT;

-- CreateTable
CREATE TABLE "internal_sessions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" VARCHAR(64) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "internal_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "internal_sessions_tokenHash_key" ON "internal_sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "internal_sessions_userId_idx" ON "internal_sessions"("userId");

-- CreateIndex
CREATE INDEX "internal_sessions_expiresAt_idx" ON "internal_sessions"("expiresAt");

-- AddForeignKey
ALTER TABLE "internal_sessions" ADD CONSTRAINT "internal_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "internal_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
