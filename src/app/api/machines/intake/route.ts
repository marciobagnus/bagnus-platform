import { NextResponse } from "next/server";

import { registerMachineIntake } from "../../../../modules/machines/application/register-machine-intake.ts";
import { PrismaMachineIntakeRepository } from "../../../../modules/machines/infrastructure/prisma-machine-intake-repository.ts";
import { getAuthenticatedInternalUser } from "../../../../lib/current-internal-user.ts";

export async function POST(request: Request) {
  const user = await getAuthenticatedInternalUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
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
      { error: "Los datos del ingreso no son válidos." },
      { status: 400 },
    );
  }

  const {
    customerId,
    brand,
    type,
    model,
    serialNumber,
    reportedIssue,
    receivedAccessories,
  } = body as Record<string, unknown>;

  if (
    typeof customerId !== "string" ||
    typeof brand !== "string" ||
    typeof type !== "string" ||
    typeof reportedIssue !== "string" ||
    (model != null && typeof model !== "string") ||
    (serialNumber != null && typeof serialNumber !== "string") ||
    (receivedAccessories != null && typeof receivedAccessories !== "string")
  ) {
    return NextResponse.json(
      { error: "Los datos del ingreso no son válidos." },
      { status: 400 },
    );
  }

  try {
    const result = await registerMachineIntake(
      {
        customerId,
        changedByUserId: user.id,
        brand,
        type,
        model,
        serialNumber,
        reportedIssue,
        receivedAccessories,
      },
      new PrismaMachineIntakeRepository(),
    );

    return NextResponse.json(
      { machine: result.machine, repair: result.repair },
      { status: 201 },
    );
  } catch (error) {
    if (
      error instanceof Error &&
      [
        "El identificador del cliente no es válido.",
        "La marca de la máquina es obligatoria.",
        "El tipo de máquina es obligatorio.",
        "El identificador de la máquina no es válido.",
        "La descripción del problema es obligatoria.",
      ].includes(error.message)
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

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

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "La máquina ya tiene una reparación abierta." },
        { status: 409 },
      );
    }

    console.error("Error al registrar el ingreso:", error);
    return NextResponse.json(
      { error: "No se pudo registrar el ingreso." },
      { status: 500 },
    );
  }
}