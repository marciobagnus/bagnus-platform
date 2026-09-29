export type OutstandingRepair = {
  id: string; customerId: string; customerName: string; machineId: string; machine: string;
  status: string; resolution: string | null; total: string; paid: string; balance: string;
  deliveredAt: Date | null;
};
export type OutstandingRepairsSummary = { orderCount: number; totalBalance: string };
export type OutstandingRepairsCustomerFilter = { customerId: string; excludeRepairId: string };
export interface OutstandingRepairsRepository {
  getOutstandingSummary(customer?: OutstandingRepairsCustomerFilter): Promise<OutstandingRepairsSummary>;
  findOutstanding(limit: number, offset: number): Promise<OutstandingRepair[]>;
}
export async function getOutstandingRepairs(repository: OutstandingRepairsRepository, page = 1) {
  if (!Number.isSafeInteger(page) || page < 1 || page > 1000000) throw new Error("Página inválida.");
  const pageSize = 50;
  const rows = await repository.findOutstanding(pageSize + 1, (page - 1) * pageSize);
  return { items: rows.slice(0, pageSize), page, hasMore: rows.length > pageSize };
}
