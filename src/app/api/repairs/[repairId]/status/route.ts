import { NextResponse } from "next/server";
import { getAuthenticatedInternalUser } from "../../../../../lib/current-internal-user";
export async function PATCH() {
  if (!await getAuthenticatedInternalUser()) return NextResponse.json({error:"No autenticado."},{status:401});
  return NextResponse.json({error:"Usá la operación correspondiente del taller. El diagnóstico no requiere un cambio de estado."},{status:409});
}
