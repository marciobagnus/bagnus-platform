
import type {
  RepairOrder,
} from "../domain/repair-order.ts";

export interface RepairOrderRepository {
  add(repairOrder: RepairOrder): Promise<void>;
}