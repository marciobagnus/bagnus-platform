import type { Customer } from "../domain/customer.ts";

export interface CustomerRepository {
  add(customer: Customer): Promise<void>;
}