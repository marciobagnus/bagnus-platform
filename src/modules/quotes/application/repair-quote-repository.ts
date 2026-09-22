
import type { RepairQuote } from "../domain/repair-quote.ts";

export interface RepairQuoteRepository {
  addInitialDraft(
    quote: RepairQuote,
  ): Promise<void>;
}