
import { NextResponse } from "next/server";

import type { RepairStatus } from "../../../../../modules/repairs/domain/repair-order";

import {
  updateRepairStatus,
  RepairNotFoundError,
  RepairStatusConflictError,
} from "../../../../../modules/repairs/application/update-repair-status";

import {
  PrismaRepairStatusRepository,
} from "../../../../../modules/repairs/infrastructure/prisma-repair-status-repository";

type RouteContext = {
  params: Promise<{
    repairId: string;
  }>;
};

const VALID_STATUSES: readonly string[] = [
  "RECEIVED",
  "DIAGNOSING",
  "WAITING_APPROVAL",
  "IN_REPAIR",
  "READY_FOR_PICKUP",
  "DELIVERED",
  "CANCELLED",
];

function isRepairStatus(
  value: unknown,
): value is RepairStatus {
  return (
    typeof value === "string" &&
    VALID_STATUSES.includes(value)
  );
}

export async function PATCH(
  request: Request,
  { params }: RouteContext,
) {
  // Temporal: solamente disponible en desarrollo.
  // Antes de habilitarlo para uso real,
  // implementar autenticación y autorización.

  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Endpoint no disponible." },
      { status: 403 },
    );
  }

  // 1. Obtener el identificador de la reparación.

  const { repairId } = await params;

  // 2. Leer el cuerpo de la petición.

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "El cuerpo debe ser un JSON válido." },
      { status: 400 },
    );
  }

  // 3. Validar la estructura.

  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body)
  ) {
    return NextResponse.json(
      { error: "Los datos recibidos no son válidos." },
      { status: 400 },
    );
  }

  const {
    status,
    note,
  } = body as Record<string, unknown>;

  // 4. Validar el estado y la observación.

  if (
    !isRepairStatus(status) ||
    (note != null && typeof note !== "string")
  ) {
    return NextResponse.json(
      { error: "El estado o la observación no son válidos." },
      { status: 400 },
    );
  }

  // 5. Ejecutar el caso de uso.

  try {
    const repository =
      new PrismaRepairStatusRepository();

    await updateRepairStatus(
      {
        repairId,
        newStatus: status,
        note,
      },
      repository,
    );

    return NextResponse.json(
      {
        message: "Estado actualizado correctamente.",
        repairId,
        status,
      },
      { status: 200 },
    );

  } catch (error) {

    // Identificador inválido.

    if (
      error instanceof Error &&
      error.message ===
        "El identificador de la reparación no es válido."
    ) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 },
      );
    }

    // Reparación inexistente.

    if (error instanceof RepairNotFoundError) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 },
      );
    }

    // Conflicto por actualización simultánea.

    if (error instanceof RepairStatusConflictError) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 },
      );
    }

    // Transición no permitida por el dominio.

    if (
      error instanceof Error &&
      error.message.startsWith(
        "No se permite cambiar de ",
      )
    ) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 },
      );
    }

    // Error inesperado.

    console.error(
      "Error al actualizar el estado:",
      error,
    );

    return NextResponse.json(
      {
        error: "No se pudo actualizar el estado de la reparación.",
      },
      { status: 500 },
    );
  }
}