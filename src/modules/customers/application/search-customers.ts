import type {
  CustomerSearchRepository,
  CustomerSearchResult,
} from "./customer-search-repository.ts";

export async function searchCustomers(
  query: string,
  repository: CustomerSearchRepository,
): Promise<CustomerSearchResult[]> {
  const normalizedQuery = query.trim();

  if (
    normalizedQuery.length < 2 ||
    normalizedQuery.length > 100
  ) {
    throw new Error(
      "La búsqueda debe contener entre 2 y 100 caracteres.",
    );
  }

  return repository.search(normalizedQuery, 20);
}