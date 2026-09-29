
import type { RepairQuote } from "../domain/repair-quote.ts";

export interface RepairQuoteRepository {
  addInitialQuote(
    quote: RepairQuote,
    changedByUserId?: string | null,
  ): Promise<void>;
}