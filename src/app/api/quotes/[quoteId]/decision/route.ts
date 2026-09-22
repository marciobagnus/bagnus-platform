import { NextResponse } from "next/server";

import {
  decideRepairQuote,
  QuoteDecisionNotFoundError,
  QuoteDecisionConflictError,
} from "../../../../../modules/quotes/application/decide-repair-quote";

import {
  PrismaQuoteDecisionRepository,
} from "../../../../../modules/quotes/infrastructure/prisma-quote-decision-repository";

import type {
  QuoteDecision,
  InternalDecisionChannel,
} from "../../../../../modules/quotes/application/quote-decision-repository";

type RouteContext = {
  params: Promise<{
    quoteId: string;
  }>;
};

const VALID_DECISIONS = [
  "APPROVED",
  "REJECTED",
] as const;

const VALID_CHANNELS = [
  "IN_PERSON",
  "PHONE",
  "WHATSAPP",
  "EMAIL",
] as const;

function isDecision(
  value: unknown,
): value is QuoteDecision {
  return (
    typeof value === "string" &&
    VALID_DECISIONS.some(
      (decision) => decision === value,
    )
  );
}

function isChannel(
  value: unknown,
): value is InternalDecisionChannel {
  return (
    typeof value === "string" &&
    VALID_CHANNELS.some(
      (channel) => channel === value,
    )
  );
}

export async function POST(
  request: Request,
  { params }: RouteContext,
) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Endpoint no disponible." },
      { status: 403 },
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

  const {
    decision,
    channel,
    note,
  } = body as Record<string, unknown>;

  if (
    !isDecision(decision) ||
    !isChannel(channel) ||
    (note != null && typeof note !== "string")
  ) {
    return NextResponse.json(
      {
        error:
          "La decisión, el canal o la observación no son válidos.",
      },
      { status: 400 },
    );
  }

  try {
    const repository =
      new PrismaQuoteDecisionRepository();

    const result = await decideRepairQuote(
      {
        quoteId,
        decision,
        channel,
        note,
      },
      repository,
    );

    return NextResponse.json(
      {
        message: "Decisión registrada correctamente.",
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

    if (error instanceof QuoteDecisionNotFoundError) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 },
      );
    }

    if (error instanceof QuoteDecisionConflictError) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 },
      );
    }

    console.error(
      "Error al registrar la decisión:",
      error,
    );

    return NextResponse.json(
      { error: "No se pudo registrar la decisión." },
      { status: 500 },
    );
  }
}