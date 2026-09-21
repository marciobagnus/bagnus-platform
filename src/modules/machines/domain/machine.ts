
export type Machine = {
  id: string;
  customerId: string;

  brand: string;
  type: string;
  model: string | null;
  serialNumber: string | null;

  createdAt: Date;
  updatedAt: Date;
};

type CreateMachineInput = {
  id: string;
  customerId: string;

  brand: string;
  type: string;
  model?: string | null;
  serialNumber?: string | null;

  now: Date;
};

export function createMachine(
  input: CreateMachineInput,
): Machine {
  const customerId = input.customerId.trim();
  const brand = input.brand.trim();
  const type = input.type.trim();

  const model = input.model?.trim() || null;
  const serialNumber = input.serialNumber?.trim() || null;

  // Comprobamos que recibimos un identificador
  // de cliente con formato UUID.
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(customerId)) {
    throw new Error(
      "El identificador del cliente no es válido.",
    );
  }

  if (brand.length === 0) {
    throw new Error(
      "La marca de la máquina es obligatoria.",
    );
  }

  if (type.length === 0) {
    throw new Error(
      "El tipo de máquina es obligatorio.",
    );
  }

  return {
    id: input.id,
    customerId,
    brand,
    type,
    model,
    serialNumber,
    createdAt: input.now,
    updatedAt: input.now,
  };
}