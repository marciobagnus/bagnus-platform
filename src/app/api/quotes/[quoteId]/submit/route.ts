import { NextResponse } from "next/server";

import {
  submitRepairQuote,
  QuoteSubmissionNotFoundError,
  QuoteSubmissionConflictError,
} from "../../../../../modules/quotes/application/submit-repair-quote";

import {
  PrismaQuoteSubmissionRepository,
} from "../../../../../modules/quotes/infrastructure/prisma-quote-submission-repository";

import {
  getAuthenticatedInternalUser,
} from "../../../../../lib/current-internal-user";

type RouteContext = {
  params: Promise<{
    quoteId: string;
  }>;
};

export async function POST(
  request: Request,
  { params }: RouteContext,
) {
  // Restricción temporal.
  // Antes del uso real implementaremos autenticación
  // y autorización de los empleados.

  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Endpoint no disponible." },
      { status: 403 },
    );
  }

  const user = await getAuthenticatedInternalUser();

  if (!user) {
    return NextResponse.json(
      { error: "No autenticado." },
      { status: 401 },
    );
  }

  const { quoteId } = await params;

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

  const { note } = body as Record<string, unknown>;

  if (note != null && typeof note !== "string") {
    return NextResponse.json(
      { error: "La observación debe ser un texto." },
      { status: 400 },
    );
  }

  try {
    const repository =
      new PrismaQuoteSubmissionRepository();

    const result = await submitRepairQuote(
      {
        quoteId,
        note,
        changedByUserId: user.id,
      },
      repository,
    );

    return NextResponse.json(
      {
        message: "Presupuesto marcado como informado.",
        ...result,
      },
      { status: 200 },
    );

  } catch (error) {

    if (
      error instanceof Error &&
      error.message ===
        "El identificador del presupuesto no es válido."
    ) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 },
      );
    }

    if (error instanceof QuoteSubmissionNotFoundError) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 },
      );
    }

    if (error instanceof QuoteSubmissionConflictError) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 },
      );
    }

    console.error(
      "Error al informar el presupuesto:",
      error,
    );

    return NextResponse.json(
      { error: "No se pudo informar el presupuesto." },
      { status: 500 },
    );
  }
}