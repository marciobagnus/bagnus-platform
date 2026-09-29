import { NextResponse } from "next/server";
import { getAuthenticatedInternalUser } from "../../../../lib/current-internal-user.ts";
import { PrismaMachineSuggestionsRepository } from "../../../../modules/machines/infrastructure/prisma-machine-suggestions-repository.ts";

export async function GET() {
  const user = await getAuthenticatedInternalUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  try {
    const suggestions = await new PrismaMachineSuggestionsRepository().getSuggestions();
    return NextResponse.json(suggestions, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "No se pudieron consultar las sugerencias." }, { status: 500 });
  }
}
