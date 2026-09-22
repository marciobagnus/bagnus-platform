import { NextResponse } from "next/server";

import { registerCustomer } from "../../../modules/customers/application/register-customer";

import { PrismaCustomerRepository } from "../../../modules/customers/infrastructure/prisma-customer-repository";

import { searchCustomers } from "../../../modules/customers/application/search-customers";

import { PrismaCustomerSearchRepository } from "../../../modules/customers/infrastructure/prisma-customer-search-repository";

import {
  getAuthenticatedInternalUser,
} from "../../../lib/current-internal-user.ts";

export async function POST(request: Request) {
  const user =
  await getAuthenticatedInternalUser();

if (!user) {
  return NextResponse.json(
    { error: "No autenticado." },
    { status: 401 },
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
      { error: "Los datos del cliente no son válidos." },
      { status: 400 },
    );
  }

  const {
    name,
    lastName,
    dni,
    phone,
    email,
    address,
  } = body as Record<string, unknown>;

  // Validar los tipos recibidos.

  if (
    typeof name !== "string" ||
    typeof lastName !== "string" ||
    typeof dni !== "string" ||
    typeof phone !== "string" ||
    (email != null && typeof email !== "string") ||
    (address != null && typeof address !== "string")
  ) {
    return NextResponse.json(
      { error: "Los datos del cliente no son válidos." },
      { status: 400 },
    );
  }

  const repository = new PrismaCustomerRepository();

  try {

    const customer = await registerCustomer(
      {
        name,
        lastName,
        dni,
        phone,
        email,
        address,
      },
      repository,
    );

    return NextResponse.json(customer, {
      status: 201,
    });

  } catch (error) {

    // Errores conocidos de validación del dominio.

    if (
      error instanceof Error &&
      (
        error.message.includes("obligatorio") ||
        error.message.includes("únicamente números") ||
        error.message.includes("no es válido")
      )
    ) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 },
      );
    }

    // Prisma P2002: DNI o teléfono duplicado.

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          error:
            "Ya existe un cliente con ese DNI o teléfono.",
        },
        { status: 409 },
      );
    }

    console.error(
      "Error al registrar el cliente:",
      error,
    );

    return NextResponse.json(
      { error: "No se pudo registrar el cliente." },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  const user =
  await getAuthenticatedInternalUser();

if (!user) {
  return NextResponse.json(
    { error: "No autenticado." },
    { status: 401 },
  );
}

  const url = new URL(request.url);

  const query = url.searchParams.get("search") ?? "";

  const normalizedQuery = query.trim();

  if (
    normalizedQuery.length < 2 ||
    normalizedQuery.length > 100
  ) {
    return NextResponse.json(
      {
        error:
          "La búsqueda debe contener entre 2 y 100 caracteres.",
      },
      { status: 400 },
    );
  }

  try {

    const repository =
      new PrismaCustomerSearchRepository();

    const customers = await searchCustomers(
      normalizedQuery,
      repository,
    );

    return NextResponse.json(customers, {
      status: 200,
    });

  } catch (error) {

    console.error(
      "Error al buscar clientes:",
      error,
    );

    return NextResponse.json(
      {
        error: "No se pudo realizar la búsqueda.",
      },
      { status: 500 },
    );

  }
}