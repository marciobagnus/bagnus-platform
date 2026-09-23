-- CreateTable
CREATE TABLE "internal_user_creation_audits" (
    "id" UUID NOT NULL,
    "performedByUserId" UUID NOT NULL,
    "createdUserId" UUID NOT NULL,
    "createdUsername" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "internal_user_creation_audits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "internal_user_creation_audits_createdUserId_key" ON "internal_user_creation_audits"("createdUserId");

-- CreateIndex
CREATE INDEX "internal_user_creation_audits_performedByUserId_createdAt_idx" ON "internal_user_creation_audits"("performedByUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "internal_user_creation_audits" ADD CONSTRAINT "internal_user_creation_audits_performedByUserId_fkey" FOREIGN KEY ("performedByUserId") REFERENCES "internal_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_user_creation_audits" ADD CONSTRAINT "internal_user_creation_audits_createdUserId_fkey" FOREIGN KEY ("createdUserId") REFERENCES "internal_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
