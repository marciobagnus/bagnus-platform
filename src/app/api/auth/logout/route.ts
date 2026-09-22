import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  logoutInternalUser,
} from "../../../../modules/users/application/internal-auth.ts";

import {
  PrismaInternalAuthRepository,
} from "../../../../modules/users/infrastructure/prisma-internal-auth-repository.ts";

import {
  INTERNAL_SESSION_COOKIE,
} from "../../../../modules/users/infrastructure/session-cookie.ts";

export async function POST() {
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

  await logoutInternalUser(
    token,
    repository,
  );

  const response = NextResponse.json(
    { success: true },
  );

  response.cookies.set(
    INTERNAL_SESSION_COOKIE,
    "",
    {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      path: "/",
      expires: new Date(0),
    },
  );

  return response;
}