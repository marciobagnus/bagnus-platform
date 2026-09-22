import { NextResponse } from "next/server";

import {
  InvalidCredentialsError,
  loginInternalUser,
} from "../../../../modules/users/application/internal-auth.ts";

import {
  PrismaInternalAuthRepository,
} from "../../../../modules/users/infrastructure/prisma-internal-auth-repository.ts";

import {
  INTERNAL_SESSION_COOKIE,
  sessionCookieOptions,
} from "../../../../modules/users/infrastructure/session-cookie.ts";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "El cuerpo debe ser un JSON válido." },
      { status: 400 },
    );
  }

  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body)
  ) {
    return NextResponse.json(
      { error: "Datos de acceso inválidos." },
      { status: 400 },
    );
  }

  const {
    username,
    password,
  } = body as Record<string, unknown>;

  if (
    typeof username !== "string" ||
    typeof password !== "string"
  ) {
    return NextResponse.json(
      { error: "Datos de acceso inválidos." },
      { status: 400 },
    );
  }

  const repository =
    new PrismaInternalAuthRepository();

  try {
    const result = await loginInternalUser(
      { username, password },
      repository,
    );

    const response = NextResponse.json(
      { user: result.user },
      { status: 200 },
    );

    response.cookies.set(
      INTERNAL_SESSION_COOKIE,
      result.token,
      sessionCookieOptions(result.expiresAt),
    );

    return response;
  } catch (error) {
    if (error instanceof InvalidCredentialsError) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 },
      );
    }

    console.error(
      "Error al iniciar sesión:",
      error,
    );

    return NextResponse.json(
      { error: "No se pudo iniciar sesión." },
      { status: 500 },
    );
  }
}