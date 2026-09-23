import { NextResponse } from "next/server";

import {
  InternalUserNotFoundError,
  PasswordConfirmationMismatchError,
  resetInternalUserPassword,
  UnauthorizedPasswordResetError,
} from "../../../../modules/users/application/internal-auth.ts";

import {
  PrismaInternalAuthRepository,
} from "../../../../modules/users/infrastructure/prisma-internal-auth-repository.ts";

import {
  getAuthenticatedInternalUser,
} from "../../../../lib/current-internal-user.ts";

export async function POST(request: Request) {
  const actor = await getAuthenticatedInternalUser();

  if (!actor) {
    return NextResponse.json(
      { error: "No autenticado." },
      { status: 401 },
    );
  }

  if (actor.role !== "ADMIN") {
    return NextResponse.json(
      { error: "No autorizado." },
      { status: 403 },
    );
  }

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
      { error: "Los datos del restablecimiento no son válidos." },
      { status: 400 },
    );
  }

  const {
    username,
    password,
    passwordConfirmation,
  } = body as Record<string, unknown>;

  if (
    typeof username !== "string" ||
    typeof password !== "string" ||
    typeof passwordConfirmation !== "string"
  ) {
    return NextResponse.json(
      { error: "Completá usuario, contraseña y confirmación." },
      { status: 400 },
    );
  }

  try {
    await resetInternalUserPassword(
      {
        actor,
        username,
        password,
        passwordConfirmation,
      },
      new PrismaInternalAuthRepository(),
    );

    return NextResponse.json({
      message: "La contraseña se restableció correctamente.",
    });
  } catch (error) {
    if (error instanceof UnauthorizedPasswordResetError) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 },
      );
    }

    if (error instanceof InternalUserNotFoundError) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 },
      );
    }

    if (error instanceof PasswordConfirmationMismatchError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message.startsWith("La contraseña")) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 },
      );
    }

    console.error("Error al restablecer la contraseña:", error);

    return NextResponse.json(
      { error: "No se pudo restablecer la contraseña." },
      { status: 500 },
    );
  }
}
