import { randomUUID } from "node:crypto";

import type {
  InternalUserRole,
} from "../domain/internal-user-role.ts";

import {
  hashPassword,
  verifyPassword,
} from "../domain/password.ts";

import {
  generateSessionToken,
  hashSessionToken,
} from "../domain/session-token.ts";

export type PublicInternalUser = {
  id: string;
  username: string;
  displayName: string;
  role: InternalUserRole;
};

export type StoredInternalUser =
  PublicInternalUser & {
    passwordHash: string;
  };

export type NewInternalUser =
  StoredInternalUser & {
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
  };

export type NewInternalSession = {
  id: string;
  userId: string;
  tokenHash: string;
  createdAt: Date;
  expiresAt: Date;
};

export interface InternalAuthRepository {
  createUser(user: NewInternalUser): Promise<void>;

  findActiveUserByUsername(
    username: string,
  ): Promise<StoredInternalUser | null>;

  createSession(
    session: NewInternalSession,
  ): Promise<void>;

  findUserBySessionTokenHash(
    tokenHash: string,
    now: Date,
  ): Promise<PublicInternalUser | null>;

  deleteSessionByTokenHash(
    tokenHash: string,
  ): Promise<void>;
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Usuario o contraseña incorrectos.");

    this.name = "InvalidCredentialsError";
  }
}

export async function createInternalUser(
  input: {
    username: string;
    displayName: string;
    password: string;
    role: InternalUserRole;
  },
  repository: InternalAuthRepository,
): Promise<PublicInternalUser> {
  const username = input.username
    .trim()
    .toLowerCase();

  const displayName = input.displayName.trim();

  if (
    username.length < 3 ||
    username.length > 50 ||
    !/^[a-z0-9._-]+$/.test(username)
  ) {
    throw new Error(
      "El nombre de usuario no es válido.",
    );
  }

  if (
    displayName.length < 2 ||
    displayName.length > 100
  ) {
    throw new Error(
      "El nombre visible no es válido.",
    );
  }

  if (
    input.role !== "ADMIN" &&
    input.role !== "STAFF"
  ) {
    throw new Error("El rol no es válido.");
  }

  const passwordHash = await hashPassword(
    input.password,
  );

  const user: PublicInternalUser = {
    id: randomUUID(),
    username,
    displayName,
    role: input.role,
  };

  const now = new Date();

  await repository.createUser({
    ...user,
    passwordHash,
    active: true,
    createdAt: now,
    updatedAt: now,
  });

  return user;
}

export async function loginInternalUser(
  input: {
    username: string;
    password: string;
  },
  repository: InternalAuthRepository,
) {
  const username = input.username
    .trim()
    .toLowerCase();

  if (
    username.length === 0 ||
    username.length > 50 ||
    input.password.length === 0 ||
    input.password.length > 128
  ) {
    throw new InvalidCredentialsError();
  }

  const user =
    await repository.findActiveUserByUsername(
      username,
    );

  if (!user) {
    throw new InvalidCredentialsError();
  }

  const validPassword = await verifyPassword(
    input.password,
    user.passwordHash,
  );

  if (!validPassword) {
    throw new InvalidCredentialsError();
  }

  const token = generateSessionToken();

  const now = new Date();

  const expiresAt = new Date(
    now.getTime() + 12 * 60 * 60 * 1000,
  );

  await repository.createSession({
    id: randomUUID(),
    userId: user.id,
    tokenHash: hashSessionToken(token),
    createdAt: now,
    expiresAt,
  });

  return {
    token,
    expiresAt,
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
    },
  };
}

export async function getCurrentInternalUser(
  token: string | null | undefined,
  repository: InternalAuthRepository,
): Promise<PublicInternalUser | null> {
  if (!token) {
    return null;
  }

  return repository.findUserBySessionTokenHash(
    hashSessionToken(token),
    new Date(),
  );
}

export async function logoutInternalUser(
  token: string | null | undefined,
  repository: InternalAuthRepository,
): Promise<void> {
  if (!token) {
    return;
  }

  await repository.deleteSessionByTokenHash(
    hashSessionToken(token),
  );
}