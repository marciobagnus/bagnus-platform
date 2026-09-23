import { NextResponse } from "next/server";

import { prisma } from "../../../../lib/prisma.ts";

import { updateCustomer } from "../../../../modules/customers/application/update-customer.ts";
import { PrismaCustomerRepository } from "../../../../modules/customers/infrastructure/prisma-customer-repository.ts";

import {
  getAuthenticatedInternalUser,
} from "../../../../lib/current-internal-user.ts";

type RouteContext = {
  params: Promise<{
    customerId: string;
  }>;
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _request: Request,
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

  const { customerId } = await params;

  if (!UUID_REGEX.test(customerId)) {
    return NextResponse.json(
      {
        error:
          "El identificador del cliente no es válido.",
      },
      { status: 400 },
    );
  }

  const customer =
    await prisma.customer.findUnique({
      where: {
        id: customerId,
      },

      select: {
        id: true,
        name: true,
        lastName: true,
        dni: true,
        phone: true,
        email: true,
        address: true,
      },
    });

  if (!customer) {
    return NextResponse.json(
      { error: "El cliente indicado no existe." },
      { status: 404 },
    );
  }

  return NextResponse.json(customer);
}

export async function PATCH(
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

  const { customerId } = await params;

  if (!UUID_REGEX.test(customerId)) {
    return NextResponse.json(
      { error: "El identificador del cliente no es válido." },
      { status: 400 },
    );
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

  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body)
  ) {
    return NextResponse.json(
      { error: "Los datos del cliente no son válidos." },
      { status: 400 },
    );
  }

  const {
    name,
    lastName,
    dni,
    phone,
    email,
    address,
  } = body as Record<string, unknown>;

  if (
    (name !== undefined && typeof name !== "string") ||
    (lastName !== undefined && typeof lastName !== "string") ||
    (dni !== undefined && typeof dni !== "string") ||
    (phone !== undefined && typeof phone !== "string") ||
    (email != null && typeof email !== "string") ||
    (address != null && typeof address !== "string")
  ) {
    return NextResponse.json(
      { error: "Los datos del cliente no son válidos." },
      { status: 400 },
    );
  }

  try {
    const existingCustomer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        name: true,
        lastName: true,
        dni: true,
        phone: true,
        email: true,
        address: true,
      },
    });

    if (!existingCustomer) {
      return NextResponse.json(
        { error: "El cliente indicado no existe." },
        { status: 404 },
      );
    }

    const customer = await updateCustomer(
      {
        id: customerId,
        name: name === undefined ? existingCustomer.name : name,
        lastName: lastName === undefined
          ? existingCustomer.lastName ?? ""
          : lastName,
        dni: dni === undefined ? existingCustomer.dni ?? "" : dni,
        phone: phone === undefined ? existingCustomer.phone : phone,
        email: email === undefined ? existingCustomer.email : email,
        address: address === undefined ? existingCustomer.address : address,
      },
      new PrismaCustomerRepository(),
    );

    return NextResponse.json(customer, { status: 200 });
  } catch (error) {
    if (
      error instanceof Error &&
      (
        error.message.includes("obligatorio") ||
        error.message.includes("únicamente números") ||
        error.message.includes("al menos 7 dígitos") ||
        error.message.includes("no es válido")
      )
    ) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 },
      );
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Ya existe otro cliente con ese DNI o teléfono." },
        { status: 409 },
      );
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "El cliente indicado no existe." },
        { status: 404 },
      );
    }

    console.error("Error al actualizar el cliente:", error);

    return NextResponse.json(
      { error: "No se pudo actualizar el cliente." },
      { status: 500 },
    );
  }
}