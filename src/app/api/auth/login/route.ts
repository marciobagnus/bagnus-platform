import { NextResponse } from "next/server";

import { isIP } from "node:net";

import {
  InvalidCredentialsError,
  LoginRateLimitExceededError,
  loginInternalUserWithRateLimit,
} from "../../../../modules/users/application/internal-auth.ts";

import {
  createLoginAttemptKeyHash,
  LOGIN_RATE_LIMIT_MESSAGE,
} from "../../../../modules/users/domain/login-rate-limit.ts";

import {
  PrismaInternalAuthRepository,
} from "../../../../modules/users/infrastructure/prisma-internal-auth-repository.ts";

import {
  INTERNAL_SESSION_COOKIE,
  sessionCookieOptions,
} from "../../../../modules/users/infrastructure/session-cookie.ts";

function getLoginOrigin(request: Request): string {
  const headerName = process.env.VERCEL === "1"
    ? "x-vercel-forwarded-for"
    : "x-forwarded-for";
  const forwardedFor = request.headers.get(headerName);
  const origin = forwardedFor
    ?.split(",", 1)[0]
    .trim();

  if (origin && isIP(origin)) {
    return origin;
  }

  return process.env.VERCEL === "1"
    ? "vercel-unknown-origin"
    : "local-origin";
}

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
  const normalizedUsername = username
    .trim()
    .toLowerCase();
  const keyHash = createLoginAttemptKeyHash(
    normalizedUsername,
    getLoginOrigin(request),
  );

  try {
    const result = await loginInternalUserWithRateLimit(
      { username, password },
      repository,
      repository,
      keyHash,
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
    if (error instanceof LoginRateLimitExceededError) {
      const response = NextResponse.json(
        { error: LOGIN_RATE_LIMIT_MESSAGE },
        { status: 429 },
      );

      response.headers.set(
        "Retry-After",
        String(
          Math.max(
            1,
            Math.ceil(
              (error.blockedUntil.getTime() - Date.now()) / 1000,
            ),
          ),
        ),
      );

      return response;
    }

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