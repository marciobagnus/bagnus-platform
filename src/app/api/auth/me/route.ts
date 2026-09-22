import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  getCurrentInternalUser,
} from "../../../../modules/users/application/internal-auth.ts";

import {
  PrismaInternalAuthRepository,
} from "../../../../modules/users/infrastructure/prisma-internal-auth-repository.ts";

import {
  INTERNAL_SESSION_COOKIE,
} from "../../../../modules/users/infrastructure/session-cookie.ts";

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Endpoint no disponible." },
      { status: 403 },
    );
  }

  const cookieStore = await cookies();

  const token = cookieStore.get(
    INTERNAL_SESSION_COOKIE,
  )?.value;

  const repository =
    new PrismaInternalAuthRepository();

  const user = await getCurrentInternalUser(
    token,
    repository,
  );

  if (!user) {
    return NextResponse.json(
      { error: "No autenticado." },
      { status: 401 },
    );
  }

  return NextResponse.json(
    { user },
    { status: 200 },
  );
}