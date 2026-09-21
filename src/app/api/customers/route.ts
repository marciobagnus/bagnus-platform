import { NextResponse } from "next/server";

import { registerCustomer } from "../../../modules/customers/application/register-customer";

import { PrismaCustomerRepository } from "../../../modules/customers/infrastructure/prisma-customer-repository";

export async function POST(request: Request) {

  // Temporal: bloquear este endpoint fuera de desarrollo.
  // Antes de habilitarlo en producción, implementar
  // autenticación y autorización de usuarios internos.

  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Endpoint no disponible." },
      { status: 403 },
    );
  }

  // 1. Leer los datos recibidos.

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "El cuerpo de la petición debe ser un JSON válido." },
      { status: 400 },
    );
  }

  // 2. Validar la estructura y los tipos de datos.

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

  const { name, phone } = body as Record<string, unknown>;

  if (
    typeof name !== "string" ||
    name.trim().length === 0 ||
    typeof phone !== "string" ||
    phone.trim().length === 0
  ) {
    return NextResponse.json(
      { error: "El nombre y el teléfono son obligatorios." },
      { status: 400 },
    );
  }

  // 3. Ejecutar nuestro caso de uso.

  try {
    const repository = new PrismaCustomerRepository();

    const customer = await registerCustomer(
      {
        name,
        phone,
      },
      repository,
    );

    // 4. Devolver el cliente registrado.

    return NextResponse.json(customer, {
      status: 201,
    });

  } catch (error) {

    console.error("Error al registrar el cliente:", error);

    return NextResponse.json(
      { error: "No se pudo registrar el cliente." },
      { status: 500 },
    );
  }
}