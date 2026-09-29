import type { OutstandingRepairsRepository } from "./outstanding-repairs.ts";
import type {
  RepairDashboard,
  RepairDashboardQueryRepository,
} from "./repair-dashboard-query-repository.ts";

export async function getRepairDashboard(
  repository: RepairDashboardQueryRepository,
  accounts: Pick<OutstandingRepairsRepository, "getOutstandingSummary">,
): Promise<RepairDashboard> {
  const [
    activeRepairs,
    waitingApproval,
    readyForPickup,
    recentRepairs,
    outstanding,
  ] = await Promise.all([
    repository.countActiveRepairs(),
    repository.countByStatus("WAITING_APPROVAL"),
    repository.countByStatus("READY_FOR_PICKUP"),
    repository.findRecentActive(10),
    accounts.getOutstandingSummary(),
  ]);

  return {
    activeRepairs,
    waitingApproval,
    readyForPickup,
    recentRepairs,
    outstanding,
  };
}
