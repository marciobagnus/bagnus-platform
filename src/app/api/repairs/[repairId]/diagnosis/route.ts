import { NextResponse } from "next/server";
import { getAuthenticatedInternalUser } from "../../../../../lib/current-internal-user";
export async function POST() {
  if (!await getAuthenticatedInternalUser()) return NextResponse.json({error:"No autenticado."},{status:401});
  return NextResponse.json({error:"El diagnóstico es gratuito. Esta operación ya no está disponible."},{status:410});
}
