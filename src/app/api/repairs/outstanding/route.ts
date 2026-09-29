import { NextResponse } from "next/server";
import { getAuthenticatedInternalUser } from "../../../../lib/current-internal-user";
import { getOutstandingRepairs } from "../../../../modules/repairs/application/outstanding-repairs";
import { PrismaOutstandingRepairsRepository } from "../../../../modules/repairs/infrastructure/prisma-outstanding-repairs-repository";
export async function GET(request: Request) {
  if (!await getAuthenticatedInternalUser()) return NextResponse.json({error:"No autenticado."},{status:401});
  const page = Number(new URL(request.url).searchParams.get("page") ?? "1");
  if (!Number.isSafeInteger(page) || page < 1 || page > 1000000) return NextResponse.json({error:"Página inválida."},{status:400});
  try { return NextResponse.json(await getOutstandingRepairs(new PrismaOutstandingRepairsRepository(),page)); }
  catch (error) {
    console.error("Error al consultar saldos pendientes:",error);
    return NextResponse.json({error:"No se pudieron consultar los saldos."},{status:500});
  }
}
