
import { NextResponse } from "next/server";

import { getRepairOrder } from "../../../../modules/repairs/application/get-repair-order";

import { PrismaRepairOrderQueryRepository } from "../../../../modules/repairs/infrastructure/prisma-repair-order-query-repository";

type RouteContext = {
  params: Promise<{
    repairId: string;
  }>;
};

export async function GET(
  _request: Request,
  { params }: RouteContext,
) {
  // Temporal: restringido al entorno de desarrollo.
  // Antes de utilizar datos reales, implementar
  // autenticación y autorización de usuarios internos.

  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Endpoint no disponible." },
      { status: 403 },
    );
  }

  const { repairId } = await params;

  try {
    const repository =
      new PrismaRepairOrderQueryRepository();

    const repair = await getRepairOrder(
      repairId,
      repository,
    );

    if (repair === null) {
      return NextResponse.json(
        { error: "La reparación indicada no existe." },
        { status: 404 },
      );
    }

    return NextResponse.json(repair, {
      status: 200,
    });

  } catch (error) {

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

    console.error(
      "Error al consultar la reparación:",
      error,
    );

    return NextResponse.json(
      {
        error: "No se pudo consultar la reparación.",
      },
      { status: 500 },
    );
  }
}