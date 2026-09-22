import { NextResponse } from "next/server";

import {
  registerPayment,
} from "../../../../../modules/payments/application/register-payment.ts";

import {
  PrismaPaymentRepository,
  PaymentConflictError,
} from "../../../../../modules/payments/infrastructure/prisma-payment-repository.ts";

import type {
  PaymentMethod,
} from "../../../../../modules/payments/domain/payment.ts";

import {
  getAuthenticatedInternalUser,
} from "../../../../../lib/current-internal-user.ts";

type RouteContext = {
  params: Promise<{
    repairId: string;
  }>;
};

const METHODS: PaymentMethod[] = [
  "CASH",
  "TRANSFER",
  "CARD",
  "OTHER",
];

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
      { error: "Los datos del pago no son válidos." },
      { status: 400 },
    );
  }

  const {
    amount,
    method,
    reference,
    note,
  } = body as Record<string, unknown>;

  if (
    typeof amount !== "string" ||
    typeof method !== "string" ||
    !METHODS.includes(method as PaymentMethod) ||
    (reference != null &&
      typeof reference !== "string") ||
    (note != null && typeof note !== "string")
  ) {
    return NextResponse.json(
      { error: "Los datos del pago no son válidos." },
      { status: 400 },
    );
  }

  try {
    const repository =
      new PrismaPaymentRepository();

    const payment = await registerPayment(
  {
    repairOrderId: repairId,
    amount,
    method: method as PaymentMethod,

    reference:
      typeof reference === "string"
        ? reference
        : null,

    note:
      typeof note === "string"
        ? note
        : null,

    recordedByUserId: user.id,
  },
  repository,
);

    return NextResponse.json(
      payment,
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof PaymentConflictError) {
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
      { error: "No se pudo registrar el pago." },
      { status: 500 },
    );
  }
}