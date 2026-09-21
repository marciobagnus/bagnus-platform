export type CustomerSearchResult = {
  id: string;
  name: string;
  lastName: string | null;
  phone: string;
};

export interface CustomerSearchRepository {
  search(
    query: string,
    limit: number,
  ): Promise<CustomerSearchResult[]>;
}