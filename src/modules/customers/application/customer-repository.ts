import type { Customer } from "../domain/customer.ts";

export interface CustomerRepository {
  add(customer: Customer): Promise<void>;

  update(customer: Customer): Promise<void>;
}