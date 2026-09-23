-- CreateTable
CREATE TABLE "internal_password_reset_audits" (
    "id" UUID NOT NULL,
    "performedByUserId" UUID NOT NULL,
    "targetUserId" UUID NOT NULL,
    "targetUsername" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "internal_password_reset_audits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "internal_password_reset_audits_performedByUserId_performedAt_idx" ON "internal_password_reset_audits"("performedByUserId", "performedAt");

-- CreateIndex
CREATE INDEX "internal_password_reset_audits_targetUserId_performedAt_idx" ON "internal_password_reset_audits"("targetUserId", "performedAt");

-- AddForeignKey
ALTER TABLE "internal_password_reset_audits" ADD CONSTRAINT "internal_password_reset_audits_performedByUserId_fkey" FOREIGN KEY ("performedByUserId") REFERENCES "internal_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_password_reset_audits" ADD CONSTRAINT "internal_password_reset_audits_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "internal_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
