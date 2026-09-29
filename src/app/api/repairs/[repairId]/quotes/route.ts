
import { NextResponse } from "next/server";

import {
  createInitialRepairQuote,
} from "../../../../../modules/quotes/application/create-initial-repair-quote";

import {
  PrismaRepairQuoteRepository,
  RepairQuoteConflictError,
  RepairQuoteNotFoundError,
} from "../../../../../modules/quotes/infrastructure/prisma-repair-quote-repository";

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
  const user = await getAuthenticatedInternalUser();

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

  const { description, totalAmount } =
    body as Record<string, unknown>;

  if (
    typeof description !== "string" ||
    typeof totalAmount !== "string"
  ) {
    return NextResponse.json(
      {
        error:
          "La descripción y el importe total deben ser textos.",
      },
      { status: 400 },
    );
  }

  try {
    const repository =
      new PrismaRepairQuoteRepository();

    const quote = await createInitialRepairQuote(
      {
        repairOrderId: repairId,
        changedByUserId: user.id,
        description,
        totalAmount,
      },
      repository,
    );

    return NextResponse.json(
      quote,
      { status: 201 },
    );

  } catch (error) {
    if (error instanceof RepairQuoteNotFoundError) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 },
      );
    }

    if (error instanceof RepairQuoteConflictError) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 },
      );
    }

    // Esta restricción única de PostgreSQL también
    // protege contra solicitudes simultáneas.

    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          error:
            "La reparación ya tiene un presupuesto inicial o vigente.",
        },
        { status: 409 },
      );
    }

    // Errores de validación del dominio.

    if (
      error instanceof Error &&
      (
        error.message ===
          "El identificador de la reparación no es válido." ||
        error.message ===
          "La descripción del presupuesto es obligatoria." ||
        error.message ===
          "El importe debe ser un valor positivo con hasta dos decimales."
      )
    ) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 },
      );
    }

    console.error(
      "Error al crear el presupuesto:",
      error,
    );

    return NextResponse.json(
      {
        error: "No se pudo crear el presupuesto.",
      },
      { status: 500 },
    );
  }
}