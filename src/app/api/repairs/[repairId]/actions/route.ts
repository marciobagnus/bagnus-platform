
import { NextResponse } from "next/server";

import {
  processRepairAction,
  RepairActionInputError,
  RepairActionNotFoundError,
  RepairActionConflictError,
} from "../../../../../modules/repairs/application/process-repair-action";

import {
  RepairStatusConflictError,
} from "../../../../../modules/repairs/application/repair-status-repository";

import {
  PrismaRepairStatusRepository,
} from "../../../../../modules/repairs/infrastructure/prisma-repair-status-repository";

import {
  getAuthenticatedInternalUser,
} from "../../../../../lib/current-internal-user";

type RouteContext = {
  params: Promise<{
    repairId: string;
  }>;
};

export async function POST(
  request: Request,
  { params }: RouteContext,
) {
  const user =
  await getAuthenticatedInternalUser();

if (!user) {
  return NextResponse.json(
    { error: "No autenticado." },
    { status: 401 },
  );
}

  const { repairId } = await params;

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
      { error: "Los datos recibidos no son válidos." },
      { status: 400 },
    );
  }

  const { action, note, payment } =
    body as Record<string, unknown>;

  if (
    (
      action !== "FINISH_REPAIR" &&
      action !== "HAND_OVER_MACHINE"
    ) ||
    (note != null && typeof note !== "string")
  ) {
    return NextResponse.json(
      { error: "La operación o la observación no son válidas." },
      { status: 400 },
    );
  }

  if (payment != null && (typeof payment !== "object" || Array.isArray(payment)
    || typeof (payment as Record<string, unknown>).amount !== "string"
    || !["CASH", "TRANSFER", "CARD", "OTHER"].includes(String((payment as Record<string, unknown>).method))
    || ["reference", "note"].some(key => (payment as Record<string, unknown>)[key] != null && typeof (payment as Record<string, unknown>)[key] !== "string"))) {
    return NextResponse.json({ error: "El pago no es válido." }, { status: 400 });
  }

  try {
    const repository =
      new PrismaRepairStatusRepository();

    const result = await processRepairAction(
      {
        repairId,
        action,
        note,
        changedByUserId: user.id,
        payment: payment as import("../../../../../modules/repairs/application/process-repair-action").ProcessRepairActionInput["payment"],
      },
      repository,
    );

    return NextResponse.json(
      {
        message: "Operación registrada correctamente.",
        ...result,
      },
      { status: 200 },
    );

  } catch (error) {
    if (error instanceof RepairActionInputError) return NextResponse.json({ error: error.message }, { status: 400 });
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

    if (error instanceof RepairActionNotFoundError) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 },
      );
    }

    if (
      error instanceof RepairActionConflictError ||
      error instanceof RepairStatusConflictError
    ) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 },
      );
    }

    console.error(
      "Error al procesar la operación de reparación:",
      error,
    );

    return NextResponse.json(
      { error: "No se pudo registrar la operación." },
      { status: 500 },
    );
  }
}