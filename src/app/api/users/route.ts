import { NextResponse } from "next/server";

import {
  createStaffInternalUser,
  UnauthorizedUserAdministrationError,
} from "../../../modules/users/application/internal-auth.ts";
import { PrismaInternalAuthRepository } from "../../../modules/users/infrastructure/prisma-internal-auth-repository.ts";
import { getAuthenticatedInternalUser } from "../../../lib/current-internal-user.ts";

async function getAdmin() {
  const user = await getAuthenticatedInternalUser();

  if (!user) {
    return { response: NextResponse.json({ error: "No autenticado." }, { status: 401 }) };
  }

  if (user.role !== "ADMIN") {
    return { response: NextResponse.json({ error: "No autorizado." }, { status: 403 }) };
  }

  return { user };
}

export async function GET() {
  const authentication = await getAdmin();

  if (authentication.response) {
    return authentication.response;
  }

  const users = await new PrismaInternalAuthRepository().findUsers();

  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const authentication = await getAdmin();

  if (authentication.response) {
    return authentication.response;
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

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json(
      { error: "Los datos del usuario no son válidos." },
      { status: 400 },
    );
  }

  const {
    displayName,
    username,
    password,
    passwordConfirmation,
    role,
  } = body as Record<string, unknown>;

  if (
    typeof displayName !== "string" ||
    typeof username !== "string" ||
    typeof password !== "string" ||
    typeof passwordConfirmation !== "string"
  ) {
    return NextResponse.json(
      { error: "Completá nombre, usuario, contraseña y confirmación." },
      { status: 400 },
    );
  }

  if (role !== undefined && role !== "STAFF") {
    return NextResponse.json(
      { error: "Este formulario solo permite crear usuarios STAFF." },
      { status: 400 },
    );
  }

  try {
    const user = await createStaffInternalUser(
      {
        actor: authentication.user,
        displayName,
        username,
        password,
        passwordConfirmation,
      },
      new PrismaInternalAuthRepository(),
    );

    return NextResponse.json(
      { user, message: "El usuario STAFF se creó correctamente." },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof UnauthorizedUserAdministrationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Ya existe un usuario con ese nombre de usuario." },
        { status: 409 },
      );
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("Error al crear usuario STAFF:", error);

    return NextResponse.json(
      { error: "No se pudo crear el usuario STAFF." },
      { status: 500 },
    );
  }
}
