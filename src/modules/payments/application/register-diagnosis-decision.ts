import { randomUUID } from "node:crypto";

import {
  createDiagnosisCharge,
  type DiagnosisCharge,
  type DiagnosisDecision,
} from "../domain/diagnosis-charge.ts";

import type {
  DiagnosisChargeRepository,
} from "./diagnosis-charge-repository.ts";

export type RegisterDiagnosisDecisionInput = {
  repairOrderId: string;
  decision: DiagnosisDecision;
  amount?: string | null;
  note?: string | null;
  decidedByUserId?: string | null;
};

export async function registerDiagnosisDecision(
  input: RegisterDiagnosisDecisionInput,
  repository: DiagnosisChargeRepository,
): Promise<DiagnosisCharge> {
  const charge = createDiagnosisCharge({
    id: randomUUID(),
    repairOrderId: input.repairOrderId,
    decision: input.decision,
    amount: input.amount,
    note: input.note,
    now: new Date(),
  });

  await repository.saveDecision(
  charge,
  input.decidedByUserId ?? null,
);

  return charge;
}