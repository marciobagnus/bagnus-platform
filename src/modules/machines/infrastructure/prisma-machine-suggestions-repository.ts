import { prisma } from "../../../lib/prisma.ts";
import { normalizeMachineSuggestions, type MachineSuggestions } from "../application/machine-suggestions.ts";

export class PrismaMachineSuggestionsRepository {
  async getSuggestions(): Promise<MachineSuggestions> {
    const [brands, types, models] = await Promise.all([
      prisma.machine.groupBy({ by: ["brand"] }),
      prisma.machine.groupBy({ by: ["type"] }),
      prisma.machine.groupBy({ by: ["model"] }),
    ]);
    return {
      brands: normalizeMachineSuggestions(brands.map((row) => row.brand)),
      types: normalizeMachineSuggestions(types.map((row) => row.type)),
      models: normalizeMachineSuggestions(models.map((row) => row.model)),
    };
  }
}
