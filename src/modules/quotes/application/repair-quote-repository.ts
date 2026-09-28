
import type { RepairQuote } from "../domain/repair-quote.ts";

export interface RepairQuoteRepository {
  addInitialDraft(
    quote: RepairQuote,
    changedByUserId?: string | null,
  ): Promise<void>;
}