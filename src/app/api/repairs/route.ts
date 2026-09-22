
import { NextResponse } from "next/server";

import { registerRepairOrder } from "../../../modules/repairs/application/register-repair-order";
import { PrismaRepairOrderQueryRepository } from "../../../modules/repairs/infrastructure/prisma-repair-order-query-repository";

import { PrismaRepairOrderRepository } from "../../../modules/repairs/infrastructure/prisma-repair-order-repository";

import {
  getAuthenticatedInternalUser,
} from "../../../lib/current-internal-user.ts";

export async function GET() {
  const user = await getAuthenticatedInternalUser();

  if (!user) {
    return NextResponse.json(
      { error: "No autenticado." },
      { status: 401 },
    );
  }

  try {
    const repository = new PrismaRepairOrderQueryRepository();
    const repairs = await repository.findRecent(100);

    return NextResponse.json(repairs, { status: 200 });
  } catch (error) {
    console.error("Error al consultar reparaciones:", error);

    return NextResponse.json(
      { error: "No se pudieron consultar las reparaciones." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const user =
  await getAuthenticatedInternalUser();

if (!user) {
  return NextResponse.json(
    { error: "No autenticado." },
    { status: 401 },
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

  // 2. Validar la estructura.

  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body)
  ) {
    return NextResponse.json(
      { error: "Los datos de la reparación no son válidos." },
      { status: 400 },
    );
  }

  const {
    machineId,
    reportedIssue,
    receivedAccessories,
  } = body as Record<string, unknown>;

  if (
    typeof machineId !== "string" ||
    typeof reportedIssue !== "string" ||
    (
      receivedAccessories != null &&
      typeof receivedAccessories !== "string"
    )
  ) {
    return NextResponse.json(
      { error: "Los datos de la reparación no son válidos." },
      { status: 400 },
    );
  }

  // 3. Registrar la reparación.

  try {
    const repository = new PrismaRepairOrderRepository();

    const repair = await registerRepairOrder(
      {
        machineId,
        reportedIssue,
        receivedAccessories,
      },
      repository,
    );

    return NextResponse.json(repair, {
      status: 201,
    });

  } catch (error) {

    // 4. Errores de validación del dominio.

    if (
      error instanceof Error &&
      [
        "El identificador de la máquina no es válido.",
        "La descripción del problema es obligatoria.",
      ].includes(error.message)
    ) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 },
      );
    }

    // 5. Máquina inexistente.
    // Prisma P2003: violación de clave foránea.

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2003"
    ) {
      return NextResponse.json(
        { error: "La máquina indicada no existe." },
        { status: 404 },
      );
    }

    // 6. La máquina ya tiene una reparación abierta.
    // Prisma P2002: violación de restricción de unicidad.

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          error:
            "La máquina ya tiene una reparación abierta.",
        },
        { status: 409 },
      );
    }

    // 7. Error inesperado.

    console.error(
      "Error al registrar la reparación:",
      error,
    );

    return NextResponse.json(
      { error: "No se pudo registrar la reparación." },
      { status: 500 },
    );
  }
}