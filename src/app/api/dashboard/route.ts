import { PrismaOutstandingRepairsRepository } from "../../../modules/repairs/infrastructure/prisma-outstanding-repairs-repository.ts";
import { NextResponse } from "next/server";

import {
  getAuthenticatedInternalUser,
} from "../../../lib/current-internal-user.ts";

import {
  getRepairDashboard,
} from "../../../modules/repairs/application/get-repair-dashboard.ts";

import {
  PrismaRepairDashboardQueryRepository,
} from "../../../modules/repairs/infrastructure/prisma-repair-dashboard-query-repository.ts";

export async function GET() {
  const user = await getAuthenticatedInternalUser();

  if (!user) {
    return NextResponse.json(
      { error: "No autenticado." },
      { status: 401 },
    );
  }

  try {
    const repository =
      new PrismaRepairDashboardQueryRepository();

    const dashboard = await getRepairDashboard(repository, new PrismaOutstandingRepairsRepository());

    return NextResponse.json(dashboard, { status: 200 });
  } catch (error) {
    console.error("Error al consultar el dashboard:", error);

    return NextResponse.json(
      { error: "No se pudo consultar el dashboard." },
      { status: 500 },
    );
  }
}
