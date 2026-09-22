import { NextResponse } from "next/server";

import { prisma } from "../../../../lib/prisma.ts";

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