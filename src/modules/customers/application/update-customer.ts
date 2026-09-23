import { createCustomer } from "../domain/customer.ts";

import type { Customer } from "../domain/customer.ts";
import type { CustomerRepository } from "./customer-repository.ts";

export type UpdateCustomerInput = {
  id: string;
  name: string;
  lastName: string;
  dni: string;
  phone: string;
  email?: string | null;
  address?: string | null;
};

export async function updateCustomer(
  input: UpdateCustomerInput,
  repository: CustomerRepository,
): Promise<Customer> {
  const customer = createCustomer({
    id: input.id,
    name: input.name,
    lastName: input.lastName,
    dni: input.dni,
    phone: input.phone,
    email: input.email,
    address: input.address,
    now: new Date(),
  });

  await repository.update(customer);

  return customer;
}