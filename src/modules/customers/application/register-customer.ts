import { randomUUID } from "node:crypto";
import { createCustomer } from "../domain/customer.ts";
import type { Customer } from "../domain/customer.ts";
import type { CustomerRepository } from "./customer-repository.ts";

type RegisterCustomerInput = {
  name: string;
  phone: string;
};

export async function registerCustomer(
  input: RegisterCustomerInput,
  repository: CustomerRepository,
): Promise<Customer> {
  const customer = createCustomer({
    id: randomUUID(),
    name: input.name,
    phone: input.phone,
    now: new Date(),
  });

  await repository.add(customer);

  return customer;
}