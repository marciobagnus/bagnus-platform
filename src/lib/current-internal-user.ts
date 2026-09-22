import { cookies } from "next/headers";

import {
  getCurrentInternalUser,
} from "../modules/users/application/internal-auth.ts";

import {
  PrismaInternalAuthRepository,
} from "../modules/users/infrastructure/prisma-internal-auth-repository.ts";

import {
  INTERNAL_SESSION_COOKIE,
} from "../modules/users/infrastructure/session-cookie.ts";

export async function getAuthenticatedInternalUser() {
  const cookieStore = await cookies();

  const token = cookieStore.get(
    INTERNAL_SESSION_COOKIE,
  )?.value;

  if (!token) {
    return null;
  }

  const repository =
    new PrismaInternalAuthRepository();

  return getCurrentInternalUser(
    token,
    repository,
  );
}