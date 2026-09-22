import type {
  RepairStatus,
} from "../../repairs/domain/repair-order";

import type {
  RepairStatusChange,
} from "../../repairs/domain/change-repair-status";

import type {
  RepairQuoteStatus,
} from "../domain/repair-quote";

export type QuoteDecision =
  | "APPROVED"
  | "REJECTED";

export type InternalDecisionChannel =
  | "IN_PERSON"
  | "PHONE"
  | "WHATSAPP"
  | "EMAIL";

export type QuoteDecisionContext = {
  quoteId: string;
  repairOrderId: string;
  quoteStatus: RepairQuoteStatus;
  repairStatus: RepairStatus;
};

export type SaveQuoteDecisionInput = {
  quoteId: string;
  repairOrderId: string;
  decision: QuoteDecision;
  channel: InternalDecisionChannel;
  note: string | null;
  statusChange: RepairStatusChange;
};

export interface QuoteDecisionRepository {
  findById(
    quoteId: string,
  ): Promise<QuoteDecisionContext | null>;

  saveDecision(
    input: SaveQuoteDecisionInput,
  ): Promise<void>;
}