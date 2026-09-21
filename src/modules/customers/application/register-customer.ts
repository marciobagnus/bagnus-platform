import { randomUUID } from "node:crypto";

import {
  createCustomer,
} from "../domain/customer.ts";

import type {
  Customer,
} from "../domain/customer.ts";

import type {
  CustomerRepository,
} from "./customer-repository.ts";

type RegisterCustomerInput = {
  name: string;
  lastName: string;
  dni: string;
  phone: string;
  email?: string | null;
  address?: string | null;
};

export async function registerCustomer(
  input: RegisterCustomerInput,
  repository: CustomerRepository,
): Promise<Customer> {

  const customer = createCustomer({
    id: randomUUID(),
    name: input.name,
    lastName: input.lastName,
    dni: input.dni,
    phone: input.phone,
    email: input.email,
    address: input.address,
    now: new Date(),
  });

  await repository.add(customer);

  return customer;
}