
import { NextResponse } from "next/server";

import { listCustomerMachines } from "../../../../../modules/machines/application/list-customer-machines";

import { PrismaMachineListRepository } from "../../../../../modules/machines/infrastructure/prisma-machine-list-repository";

import {
  getAuthenticatedInternalUser,
} from "../../../../../lib/current-internal-user.ts";

type RouteContext = {
  params: Promise<{
    customerId: string;
  }>;
};

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

  try {
    const repository = new PrismaMachineListRepository();

    const machines = await listCustomerMachines(
      customerId,
      repository,
    );

    if (machines === null) {
      return NextResponse.json(
        { error: "El cliente indicado no existe." },
        { status: 404 },
      );
    }

    return NextResponse.json(machines, {
      status: 200,
    });

  } catch (error) {

    if (
      error instanceof Error &&
      error.message ===
        "El identificador del cliente no es válido."
    ) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 },
      );
    }

    console.error(
      "Error al consultar las máquinas del cliente:",
      error,
    );

    return NextResponse.json(
      {
        error: "No se pudieron consultar las máquinas.",
      },
      { status: 500 },
    );
  }
}