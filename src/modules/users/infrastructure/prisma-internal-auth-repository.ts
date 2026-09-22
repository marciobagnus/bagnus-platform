import { prisma } from "../../../lib/prisma.ts";

import type {
  InternalAuthRepository,
  NewInternalSession,
  NewInternalUser,
  PublicInternalUser,
  StoredInternalUser,
} from "../application/internal-auth.ts";

export class PrismaInternalAuthRepository
  implements InternalAuthRepository
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
}