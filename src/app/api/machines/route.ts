
import { NextResponse } from "next/server";

import { registerMachine } from "../../../modules/machines/application/register-machine";

import { PrismaMachineRepository } from "../../../modules/machines/infrastructure/prisma-machine-repository";

export async function POST(request: Request) {
  // Temporal: solamente disponible en desarrollo.
  // Antes de utilizarlo con datos reales,
  // implementaremos autenticación y autorización.

  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Endpoint no disponible." },
      { status: 403 },
    );
  }

  // 1. Leer el cuerpo de la petición.

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "El cuerpo debe ser un JSON válido." },
      { status: 400 },
    );
  }

  // 2. Comprobar que recibimos un objeto.

  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body)
  ) {
    return NextResponse.json(
      { error: "Los datos de la máquina no son válidos." },
      { status: 400 },
    );
  }

  const {
    customerId,
    brand,
    type,
    model,
    serialNumber,
  } = body as Record<string, unknown>;

  // 3. Validar los tipos de los datos recibidos.
  // La validación de las reglas de negocio
  // sigue siendo responsabilidad del dominio.

  if (
    typeof customerId !== "string" ||
    typeof brand !== "string" ||
    typeof type !== "string" ||
    (model != null && typeof model !== "string") ||
    (serialNumber != null && typeof serialNumber !== "string")
  ) {
    return NextResponse.json(
      { error: "Los datos de la máquina no son válidos." },
      { status: 400 },
    );
  }

  // 4. Ejecutar el caso de uso.

  try {
    const repository = new PrismaMachineRepository();

    const machine = await registerMachine(
      {
        customerId,
        brand,
        type,
        model,
        serialNumber,
      },
      repository,
    );

    return NextResponse.json(machine, {
      status: 201,
    });

  } catch (error) {

    // Errores conocidos de validación del dominio.

    if (
      error instanceof Error &&
      [
        "El identificador del cliente no es válido.",
        "La marca de la máquina es obligatoria.",
        "El tipo de máquina es obligatorio.",
      ].includes(error.message)
    ) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 },
      );
    }

    // Prisma P2003: error de clave foránea.
    // En este caso, la máquina referencia
    // a un cliente que no existe en PostgreSQL.

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2003"
    ) {
      return NextResponse.json(
        { error: "El cliente indicado no existe." },
        { status: 404 },
      );
    }

    // Error inesperado.

    console.error(
      "Error al registrar la máquina:",
      error,
    );

    return NextResponse.json(
      { error: "No se pudo registrar la máquina." },
      { status: 500 },
    );
  }
}