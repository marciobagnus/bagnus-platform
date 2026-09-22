import { NextResponse } from "next/server";

import {
  registerDiagnosisDecision,
} from "../../../../../modules/payments/application/register-diagnosis-decision.ts";

import {
  DiagnosisDecisionConflictError,
  DiagnosisRepairNotFoundError,
  PrismaDiagnosisChargeRepository,
} from "../../../../../modules/payments/infrastructure/prisma-diagnosis-charge-repository.ts";

import type {
  DiagnosisDecision,
} from "../../../../../modules/payments/domain/diagnosis-charge.ts";

import {
  getAuthenticatedInternalUser,
} from "../../../../../lib/current-internal-user.ts";

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
      {
        error:
          "Los datos del diagnóstico no son válidos.",
      },
      { status: 400 },
    );
  }

  const {
    decision,
    amount,
    note,
  } = body as Record<string, unknown>;

  if (
    (decision !== "CHARGED" &&
      decision !== "WAIVED") ||
    (amount != null &&
      typeof amount !== "string") ||
    (note != null &&
      typeof note !== "string")
  ) {
    return NextResponse.json(
      {
        error:
          "Los datos del diagnóstico no son válidos.",
      },
      { status: 400 },
    );
  }

  try {
    const repository =
      new PrismaDiagnosisChargeRepository();

    const diagnosis =
  await registerDiagnosisDecision(
    {
      repairOrderId: repairId,

      decision:
        decision as DiagnosisDecision,

      amount:
        typeof amount === "string"
          ? amount
          : null,

      note:
        typeof note === "string"
          ? note
          : null,

      decidedByUserId: user.id,
    },
    repository,
  );

    return NextResponse.json(
      diagnosis,
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof DiagnosisRepairNotFoundError) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 },
      );
    }

    if (
      error instanceof DiagnosisDecisionConflictError
    ) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 },
      );
    }

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error:
          "No se pudo registrar la decisión de diagnóstico.",
      },
      { status: 500 },
    );
  }
}