import type {
  RepairStatus,
} from "../../repairs/domain/repair-order";

import type {
  RepairStatusChange,
} from "../../repairs/domain/change-repair-status";

import type {
  RepairQuoteStatus,
} from "../domain/repair-quote";

export type QuoteSubmissionContext = {
  quoteId: string;
  repairOrderId: string;
  quoteStatus: RepairQuoteStatus;
  repairStatus: RepairStatus;
};

export type SaveQuoteSubmissionInput = {
  quoteId: string;
  repairOrderId: string;
  statusChange: RepairStatusChange;
  changedByUserId?: string | null;
};

export interface QuoteSubmissionRepository {
  findById(
    quoteId: string,
  ): Promise<QuoteSubmissionContext | null>;

  saveSubmission(
    input: SaveQuoteSubmissionInput,
  ): Promise<void>;
}