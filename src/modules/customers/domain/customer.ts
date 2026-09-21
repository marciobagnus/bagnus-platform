export type Customer = {
  id: string;
  name: string;
  phone: string;
  createdAt: Date;
  updatedAt: Date;
};

type CreateCustomerInput = {
  id: string;
  name: string;
  phone: string;
  now: Date;
};

export function createCustomer(input: CreateCustomerInput): Customer {
  const name = input.name.trim();
  const phone = input.phone.trim();

  if (name.length === 0) {
    throw new Error("El nombre del cliente es obligatorio.");
  }

  if (phone.length === 0) {
    throw new Error("El teléfono del cliente es obligatorio.");
  }

  return {
    id: input.id,
    name,
    phone,
    createdAt: input.now,
    updatedAt: input.now,
  };
}