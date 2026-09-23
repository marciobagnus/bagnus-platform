export type Customer = {
  id: string;
  name: string;
  lastName: string;
  dni: string | null;
  phone: string;
  email: string | null;
  address: string | null;
  createdAt: Date;
  updatedAt: Date;
};

import { normalizeCustomerPhone } from "./customer-phone.ts";

type CreateCustomerInput = {
  id: string;
  name: string;
  lastName: string;
  dni: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  now: Date;
};

export function createCustomer(
  input: CreateCustomerInput,
): Customer {
  const name = input.name.trim();
  const lastName = input.lastName.trim();

  // Normalizamos el DNI eliminando espacios y puntos.
  const dni = input.dni.replace(/[\s.]/g, "");

  const phone = normalizeCustomerPhone(input.phone);

  const email =
    input.email?.trim().toLowerCase() || null;

  const address =
    input.address?.trim() || null;

  if (name.length === 0) {
    throw new Error(
      "El nombre del cliente es obligatorio.",
    );
  }

  if (lastName.length === 0) {
    throw new Error(
      "El apellido del cliente es obligatorio.",
    );
  }

  if (dni.length > 0 && !/^\d+$/.test(dni)) {
    throw new Error(
      "El DNI debe contener únicamente números.",
    );
  }

  if (phone.length === 0) {
    throw new Error(
      "El teléfono del cliente es obligatorio.",
    );
  }

  if (
    !/^[0-9+()\s-]+$/.test(phone) ||
    phone.replace(/\D/g, "").length < 7
  ) {
    throw new Error(
      "El teléfono debe contener al menos 7 dígitos y sólo números, espacios, +, guiones o paréntesis.",
    );
  }

  if (
    email !== null &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new Error(
      "El correo electrónico no es válido.",
    );
  }

  return {
    id: input.id,
    name,
    lastName,
    dni: dni || null,
    phone,
    email,
    address,
    createdAt: input.now,
    updatedAt: input.now,
  };
}