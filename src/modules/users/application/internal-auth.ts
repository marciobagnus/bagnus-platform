import { randomUUID } from "node:crypto";

import type {
  InternalUserRole,
} from "../domain/internal-user-role.ts";

import {
  hashPassword,
  verifyPassword,
} from "../domain/password.ts";

import {
  isPasswordLengthValid,
} from "../domain/password-policy.ts";

import {
  LOGIN_RATE_LIMIT_MESSAGE,
} from "../domain/login-rate-limit.ts";

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

export type LoginAttemptState = {
  failedAttempts: number;
  blockedUntil: Date | null;
};

export interface InternalLoginAttemptRepository {
  getLoginAttemptState(
    keyHash: string,
    now: Date,
  ): Promise<LoginAttemptState | null>;

  registerLoginFailure(
    keyHash: string,
    now: Date,
  ): Promise<LoginAttemptState>;

  resetLoginFailures(keyHash: string): Promise<void>;
}

export interface InternalUserAdministrationRepository {
  findUsers(): Promise<PublicInternalUser[]>;

  findUserByUsername(
    username: string,
  ): Promise<PublicInternalUser | null>;

  createStaffUser(
    input: {
      user: NewInternalUser;
      performedByUserId: string;
    },
  ): Promise<void>;

  resetUserPassword(
    input: {
      targetUserId: string;
      targetUsername: string;
      passwordHash: string;
      performedByUserId: string;
    },
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
  const user = await buildInternalUser(input);

  await repository.createUser(user);

  return user;
}

async function buildInternalUser(
  input: {
    username: string;
    displayName: string;
    password: string;
    role: InternalUserRole;
  },
): Promise<NewInternalUser> {
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

  return {
    ...user,
    passwordHash,
    active: true,
    createdAt: now,
    updatedAt: now,
  };
}

export async function loginInternalUser(
  input: {
    username: string;
    password: string;
  },
  repository: InternalAuthRepository,
  beforeCreateSession?: () => Promise<void>,
) {
  const username = input.username
    .trim()
    .toLowerCase();

  if (
    username.length === 0 ||
    username.length > 50 ||
    !isPasswordLengthValid(input.password)
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

  await beforeCreateSession?.();

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

export async function loginInternalUserWithRateLimit(
  input: {
    username: string;
    password: string;
  },
  repository: InternalAuthRepository,
  attemptRepository: InternalLoginAttemptRepository,
  keyHash: string,
  clock: () => Date = () => new Date(),
) {
  const now = clock();

  const currentState =
    await attemptRepository.getLoginAttemptState(
      keyHash,
      now,
    );

  if (
    currentState?.blockedUntil &&
    currentState.blockedUntil > now
  ) {
    throw new LoginRateLimitExceededError(
      currentState.blockedUntil,
    );
  }

  try {
    const result = await loginInternalUser(
      input,
      repository,
      async () => {
        const state =
          await attemptRepository.getLoginAttemptState(
            keyHash,
            clock(),
          );
        const currentTime = clock();

        if (
          state?.blockedUntil &&
          state.blockedUntil > currentTime
        ) {
          throw new LoginRateLimitExceededError(
            state.blockedUntil,
          );
        }
      },
    );

    await attemptRepository.resetLoginFailures(keyHash);

    return result;
  } catch (error) {
    if (!(error instanceof InvalidCredentialsError)) {
      throw error;
    }

    const state =
      await attemptRepository.registerLoginFailure(
        keyHash,
        clock(),
      );

    if (state.blockedUntil) {
      throw new LoginRateLimitExceededError(
        state.blockedUntil,
      );
    }

    throw error;
  }
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

export class UnauthorizedPasswordResetError extends Error {
  constructor() {
    super("Solo un administrador puede restablecer contraseñas.");

    this.name = "UnauthorizedPasswordResetError";
  }
}

export class InternalUserNotFoundError extends Error {
  constructor() {
    super("No existe un usuario interno con ese nombre de usuario.");

    this.name = "InternalUserNotFoundError";
  }
}

export class PasswordConfirmationMismatchError extends Error {
  constructor() {
    super("La confirmación de contraseña no coincide.");

    this.name = "PasswordConfirmationMismatchError";
  }
}

export async function resetInternalUserPassword(
  input: {
    actor: PublicInternalUser;
    username: string;
    password: string;
    passwordConfirmation: string;
  },
  repository: InternalUserAdministrationRepository,
): Promise<void> {
  if (input.actor.role !== "ADMIN") {
    throw new UnauthorizedPasswordResetError();
  }

  const username = input.username.trim().toLowerCase();

  if (
    username.length < 3 ||
    username.length > 50 ||
    !/^[a-z0-9._-]+$/.test(username)
  ) {
    throw new InternalUserNotFoundError();
  }

  if (input.password !== input.passwordConfirmation) {
    throw new PasswordConfirmationMismatchError();
  }

  const user = await repository.findUserByUsername(username);

  if (!user) {
    throw new InternalUserNotFoundError();
  }

  const passwordHash = await hashPassword(input.password);

  await repository.resetUserPassword({
    targetUserId: user.id,
    targetUsername: user.username,
    passwordHash,
    performedByUserId: input.actor.id,
  });
}

export async function createStaffInternalUser(
  input: {
    actor: PublicInternalUser;
    username: string;
    displayName: string;
    password: string;
    passwordConfirmation: string;
  },
  repository: InternalUserAdministrationRepository,
): Promise<PublicInternalUser> {
  if (input.actor.role !== "ADMIN") {
    throw new UnauthorizedUserAdministrationError();
  }

  if (input.password !== input.passwordConfirmation) {
    throw new PasswordConfirmationMismatchError();
  }

  const user = await buildInternalUser({
    username: input.username,
    displayName: input.displayName,
    password: input.password,
    role: "STAFF",
  });

  await repository.createStaffUser({
    user,
    performedByUserId: input.actor.id,
  });

  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
  };
}

export class UnauthorizedUserAdministrationError extends Error {
  constructor() {
    super("Solo un administrador puede administrar usuarios.");

    this.name = "UnauthorizedUserAdministrationError";
  }
}

export class LoginRateLimitExceededError extends Error {
  readonly blockedUntil: Date;

  constructor(blockedUntil: Date) {
    super(LOGIN_RATE_LIMIT_MESSAGE);

    this.name = "LoginRateLimitExceededError";
    this.blockedUntil = blockedUntil;
  }
}