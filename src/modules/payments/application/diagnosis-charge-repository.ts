import type {
  DiagnosisCharge,
} from "../domain/diagnosis-charge.ts";

export interface DiagnosisChargeRepository {
  saveDecision(
    charge: DiagnosisCharge,
    decidedByUserId?: string | null,
  ): Promise<void>;
}