import type {
  RepairDashboard,
  RepairDashboardQueryRepository,
} from "./repair-dashboard-query-repository.ts";

export async function getRepairDashboard(
  repository: RepairDashboardQueryRepository,
): Promise<RepairDashboard> {
  const [
    activeRepairs,
    waitingApproval,
    readyForPickup,
    recentRepairs,
  ] = await Promise.all([
    repository.countActiveRepairs(),
    repository.countByStatus("WAITING_APPROVAL"),
    repository.countByStatus("READY_FOR_PICKUP"),
    repository.findRecentActive(10),
  ]);

  return {
    activeRepairs,
    waitingApproval,
    readyForPickup,
    recentRepairs,
  };
}
