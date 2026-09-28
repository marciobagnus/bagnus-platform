
import { randomUUID } from "node:crypto";

import {
  createRepairQuote,
} from "../domain/repair-quote.ts";

import type {
  RepairQuote,
} from "../domain/repair-quote.ts";

import type {
  RepairQuoteRepository,
} from "./repair-quote-repository.ts";

export type CreateInitialRepairQuoteInput = {
  repairOrderId: string;
  description: string;
  totalAmount: string;
  draft?: boolean;
  changedByUserId?: string | null;
};

export async function createInitialRepairQuote(
  input: CreateInitialRepairQuoteInput,
  repository: RepairQuoteRepository,
): Promise<RepairQuote> {

  const quote = createRepairQuote({
    id: randomUUID(),

    repairOrderId: input.repairOrderId,

    version: 1,

    description: input.description,
    totalAmount: input.totalAmount,

    now: new Date(),
  });

  if (!input.draft) quote.status = "WAITING_APPROVAL";
  await repository.addInitialDraft(quote, input.changedByUserId ?? null);

  return quote;
}