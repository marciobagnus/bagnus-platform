import { prisma } from "../../../lib/prisma.ts";

import { randomUUID } from "node:crypto";

import type {
  InternalAuthRepository,
  InternalLoginAttemptRepository,
  LoginAttemptState,
  NewInternalSession,
  NewInternalUser,
  PublicInternalUser,
  StoredInternalUser,
} from "../application/internal-auth.ts";

import {
  LOGIN_BLOCK_DURATION_MS,
  LOGIN_FAILURE_WINDOW_MS,
  LOGIN_MAX_FAILED_ATTEMPTS,
} from "../domain/login-rate-limit.ts";

export class PrismaInternalAuthRepository
  implements InternalAuthRepository, InternalLoginAttemptRepository
{
  async createUser(
    user: NewInternalUser,
  ): Promise<void> {
    await prisma.internalUser.create({
      data: user,
    });
  }

  async findActiveUserByUsername(
    username: string,
  ): Promise<StoredInternalUser | null> {
    return prisma.internalUser.findFirst({
      where: {
        username,
        active: true,
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        passwordHash: true,
        role: true,
      },
    });
  }

  async createSession(
    session: NewInternalSession,
  ): Promise<void> {
    await prisma.internalSession.create({
      data: session,
    });
  }

  async findUserBySessionTokenHash(
    tokenHash: string,
    now: Date,
  ): Promise<PublicInternalUser | null> {
    const session =
      await prisma.internalSession.findFirst({
        where: {
          tokenHash,
          expiresAt: {
            gt: now,
          },
          user: {
            is: {
              active: true,
            },
          },
        },
        select: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              role: true,
            },
          },
        },
      });

    return session?.user ?? null;
  }

  async deleteSessionByTokenHash(
    tokenHash: string,
  ): Promise<void> {
    await prisma.internalSession.deleteMany({
      where: {
        tokenHash,
      },
    });
  }

  async getLoginAttemptState(
    keyHash: string,
  ): Promise<LoginAttemptState | null> {
    const bucket =
      await prisma.internalLoginAttemptBucket.findUnique({
        where: { keyHash },
        select: {
          failedAttempts: true,
          blockedUntil: true,
        },
      });

    return bucket;
  }

  async registerLoginFailure(
    keyHash: string,
    now: Date,
  ): Promise<LoginAttemptState> {
    return prisma.$transaction(async (transaction) => {
      await transaction.$executeRaw`
        INSERT INTO "internal_login_attempt_buckets"
          ("id", "keyHash", "failedAttempts", "windowStartedAt", "blockedUntil", "updatedAt")
        VALUES
          (${randomUUID()}::uuid, ${keyHash}, 0, ${now}, NULL, ${now})
        ON CONFLICT ("keyHash") DO NOTHING
      `;

      const rows = await transaction.$queryRaw<{
        failedAttempts: number;
        windowStartedAt: Date;
        blockedUntil: Date | null;
      }[]>`
        SELECT "failedAttempts", "windowStartedAt", "blockedUntil"
        FROM "internal_login_attempt_buckets"
        WHERE "keyHash" = ${keyHash}
        FOR UPDATE
      `;

      const current = rows[0];

      if (!current) {
        throw new Error("No se pudo registrar el intento de login.");
      }

      if (
        current.blockedUntil &&
        current.blockedUntil > now
      ) {
        return {
          failedAttempts: current.failedAttempts,
          blockedUntil: current.blockedUntil,
        };
      }

      const windowExpired =
        now.getTime() - current.windowStartedAt.getTime() >=
        LOGIN_FAILURE_WINDOW_MS;
      const failedAttempts = windowExpired
        ? 1
        : current.failedAttempts + 1;
      const blockedUntil =
        failedAttempts >= LOGIN_MAX_FAILED_ATTEMPTS
          ? new Date(now.getTime() + LOGIN_BLOCK_DURATION_MS)
          : null;
      const windowStartedAt = windowExpired
        ? now
        : current.windowStartedAt;

      await transaction.$executeRaw`
        UPDATE "internal_login_attempt_buckets"
        SET "failedAttempts" = ${failedAttempts},
            "windowStartedAt" = ${windowStartedAt},
            "blockedUntil" = ${blockedUntil},
            "updatedAt" = ${now}
        WHERE "keyHash" = ${keyHash}
      `;

      return { failedAttempts, blockedUntil };
    });
  }

  async resetLoginFailures(keyHash: string): Promise<void> {
    await prisma.internalLoginAttemptBucket.deleteMany({
      where: { keyHash },
    });
  }

  async findUserByUsername(
    username: string,
  ) {
    return prisma.internalUser.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        displayName: true,
        role: true,
      },
    });
  }

  async findUsers() {
    return prisma.internalUser.findMany({
      orderBy: { username: "asc" },
      select: {
        id: true,
        username: true,
        displayName: true,
        role: true,
      },
    });
  }

  async createStaffUser(input: {
    user: NewInternalUser;
    performedByUserId: string;
  }): Promise<void> {
    const now = new Date();

    await prisma.$transaction(async (transaction) => {
      await transaction.internalUser.create({
        data: input.user,
      });

      await transaction.internalUserCreationAudit.create({
        data: {
          id: randomUUID(),
          performedByUserId: input.performedByUserId,
          createdUserId: input.user.id,
          createdUsername: input.user.username,
          createdAt: now,
        },
      });
    });
  }

  async resetUserPassword(input: {
    targetUserId: string;
    targetUsername: string;
    passwordHash: string;
    performedByUserId: string;
  }): Promise<void> {
    const now = new Date();

    await prisma.$transaction(async (transaction) => {
      await transaction.internalUser.update({
        where: { id: input.targetUserId },
        data: {
          passwordHash: input.passwordHash,
          updatedAt: now,
        },
      });

      await transaction.internalSession.deleteMany({
        where: { userId: input.targetUserId },
      });

      await transaction.internalPasswordResetAudit.create({
        data: {
          id: randomUUID(),
          performedByUserId: input.performedByUserId,
          targetUserId: input.targetUserId,
          targetUsername: input.targetUsername,
          performedAt: now,
        },
      });
    });
  }
}