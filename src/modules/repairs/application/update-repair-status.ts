export class RepairStatusConflictError extends Error {
  constructor() {
    super(
      "La reparación fue modificada por otra operación. Consultá su estado actual e intentá nuevamente.",
    );

    this.name = "RepairStatusConflictError";
  }
}

