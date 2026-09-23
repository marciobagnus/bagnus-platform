-- CreateTable
CREATE TABLE "internal_login_attempt_buckets" (
    "id" UUID NOT NULL,
    "keyHash" VARCHAR(64) NOT NULL,
    "failedAttempts" INTEGER NOT NULL,
    "windowStartedAt" TIMESTAMP(3) NOT NULL,
    "blockedUntil" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" UUID,

    CONSTRAINT "internal_login_attempt_buckets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "internal_login_attempt_buckets_keyHash_key" ON "internal_login_attempt_buckets"("keyHash");

-- CreateIndex
CREATE INDEX "internal_login_attempt_buckets_updatedAt_idx" ON "internal_login_attempt_buckets"("updatedAt");

-- CreateIndex
CREATE INDEX "internal_login_attempt_buckets_userId_idx" ON "internal_login_attempt_buckets"("userId");

-- AddForeignKey
ALTER TABLE "internal_login_attempt_buckets" ADD CONSTRAINT "internal_login_attempt_buckets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "internal_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
