"use client";

import {
  type FormEvent,
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import Link from "next/link";

import styles from "./customer-detail.module.css";

type Customer = {
  id: string;
  name: string;
  lastName: string | null;
  dni: string | null;
  phone: string;
  email: string | null;
  address: string | null;
};

type Machine = {
  id: string;
  customerId: string;
  brand: string;
  type: string;
  model: string | null;
  serialNumber: string | null;
};

type MachineForm = {
  brand: string;
  type: string;
  model: string;
  serialNumber: string;
};

const EMPTY_MACHINE: MachineForm = {
  brand: "",
  type: "",
  model: "",
  serialNumber: "",
};

export default function CustomerDetailPage({
  params,
}: {
  params: Promise<{
    customerId: string;
  }>;
}) {
  const { customerId } = use(params);

  const [customer, setCustomer] =
    useState<Customer | null>(null);

  const [machines, setMachines] =
    useState<Machine[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [formError, setFormError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [showMachineForm, setShowMachineForm] =
    useState(false);

  const [machineForm, setMachineForm] =
    useState<MachineForm>(EMPTY_MACHINE);

  const [savingMachine, setSavingMachine] =
    useState(false);

  const [
    repairMachine,
    setRepairMachine,
  ] = useState<Machine | null>(null);

  const [reportedIssue, setReportedIssue] =
    useState("");

  const [
    receivedAccessories,
    setReceivedAccessories,
  ] = useState("");

  const [repairError, setRepairError] =
    useState("");

  const [savingRepair, setSavingRepair] =
    useState(false);

  const isMountedRef = useRef(false);

  const fetchData = useCallback(async () => {
    try {
      const [
        customerResponse,
        machinesResponse,
      ] = await Promise.all([
        fetch(
          `/api/customers/${customerId}`,
        ),

        fetch(
          `/api/customers/${customerId}/machines`,
        ),
      ]);

      const customerBody =
        await customerResponse.json();

      const machinesBody =
        await machinesResponse.json();

      if (!customerResponse.ok) {
        return {
          error:
            customerBody.error ??
            "No se pudo consultar el cliente.",
        };
      }

      if (!machinesResponse.ok) {
        return {
          error:
            machinesBody.error ??
            "No se pudieron consultar las máquinas.",
        };
      }

      return {
        customer: customerBody as Customer,
        machines: machinesBody as Machine[],
      };
    } catch {
      return {
        error:
          "No se pudo conectar con el servidor.",
      };
    }
  }, [customerId]);

  const refreshData = useCallback(async () => {
    const data = await fetchData();

    if (!isMountedRef.current) {
      return;
    }

    if ("error" in data) {
      setError(data.error);
    } else {
      setError("");
      setCustomer(data.customer);
      setMachines(data.machines);
    }

    setLoading(false);
  }, [fetchData]);

  useEffect(() => {
    let cancelled = false;

    isMountedRef.current = true;

    void fetchData().then((data) => {
      if (cancelled) {
        return;
      }

      if ("error" in data) {
        setError(data.error);
      } else {
        setError("");
        setCustomer(data.customer);
        setMachines(data.machines);
      }

      setLoading(false);
    });

    return () => {
      cancelled = true;
      isMountedRef.current = false;
    };
  }, [fetchData]);

  function updateMachine(
    field: keyof MachineForm,
    value: string,
  ) {
    setMachineForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function createMachine(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setFormError("");
    setSavingMachine(true);

    try {
      const response = await fetch(
        "/api/machines",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            customerId,

            brand:
              machineForm.brand,

            type:
              machineForm.type,

            model:
              machineForm.model.trim() ||
              null,

            serialNumber:
              machineForm.serialNumber.trim() ||
              null,
          }),
        },
      );

      const body =
        await response.json();

      if (!response.ok) {
        setFormError(
          body.error ??
            "No se pudo registrar la máquina.",
        );

        return;
      }

      setMachineForm(EMPTY_MACHINE);
      setShowMachineForm(false);

      setSuccess(
        "Máquina registrada correctamente.",
      );

      await refreshData();
    } catch {
      setFormError(
        "No se pudo conectar con el servidor.",
      );
    } finally {
      setSavingMachine(false);
    }
  }

  async function createRepair(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!repairMachine) {
      return;
    }

    setRepairError("");
    setSavingRepair(true);

    try {
      const response = await fetch(
        "/api/repairs",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            machineId:
              repairMachine.id,

            reportedIssue,

            receivedAccessories:
              receivedAccessories.trim() ||
              null,
          }),
        },
      );

      const body =
        await response.json();

      if (!response.ok) {
        setRepairError(
          body.error ??
            "No se pudo registrar la reparación.",
        );

        return;
      }

      setRepairMachine(null);
      setReportedIssue("");
      setReceivedAccessories("");

      setSuccess(
        "Reparación ingresada correctamente.",
      );
    } catch {
      setRepairError(
        "No se pudo conectar con el servidor.",
      );
    } finally {
      setSavingRepair(false);
    }
  }

  if (loading) {
    return (
      <p className={styles.loading}>
        Cargando cliente...
      </p>
    );
  }

  if (error || !customer) {
    return (
      <section className={styles.page}>
        <Link
          href="/clientes"
          className={styles.back}
        >
          ← Volver a clientes
        </Link>

        <div className={styles.error}>
          {error ||
            "No se pudo consultar el cliente."}
        </div>
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <Link
        href="/clientes"
        className={styles.back}
      >
        ← Clientes
      </Link>

      <header className={styles.header}>
        <div>
          <h1>
            {customer.name}
            {customer.lastName
              ? ` ${customer.lastName}`
              : ""}
          </h1>

          <p>
            Ficha del cliente y sus máquinas.
          </p>
        </div>
      </header>

      {success && (
        <div className={styles.success}>
          {success}
        </div>
      )}

      <section className={styles.customerCard}>
        <dl>
          <div>
            <dt>DNI</dt>
            <dd>
              {customer.dni || "—"}
            </dd>
          </div>

          <div>
            <dt>Teléfono</dt>
            <dd>
              {customer.phone}
            </dd>
          </div>

          <div>
            <dt>Email</dt>
            <dd>
              {customer.email || "—"}
            </dd>
          </div>

          <div>
            <dt>Dirección</dt>
            <dd>
              {customer.address || "—"}
            </dd>
          </div>
        </dl>
      </section>

      <section className={styles.machineSection}>
        <header className={styles.sectionHeader}>
          <div>
            <h2>Máquinas</h2>

            <p>
              Máquinas registradas para este
              cliente.
            </p>
          </div>

          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => {
              setMachineForm(EMPTY_MACHINE);
              setFormError("");
              setShowMachineForm(true);
            }}
          >
            + Nueva máquina
          </button>
        </header>

        {machines.length === 0 ? (
          <div className={styles.empty}>
            <strong>
              Todavía no hay máquinas
            </strong>

            <p>
              Registrá la primera máquina del
              cliente.
            </p>
          </div>
        ) : (
          <div className={styles.machineGrid}>
            {machines.map((machine) => (
              <article
                key={machine.id}
                className={styles.machineCard}
              >
                <div>
                  <span
                    className={
                      styles.machineType
                    }
                  >
                    {machine.type}
                  </span>

                  <h3>
                    {machine.brand}
                    {machine.model
                      ? ` ${machine.model}`
                      : ""}
                  </h3>

                  <p>
                    N° de serie:{" "}
                    {machine.serialNumber ||
                      "Sin registrar"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setRepairError("");
                    setReportedIssue("");
                    setReceivedAccessories("");
                    setRepairMachine(machine);
                  }}
                >
                  Iniciar reparación
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      {showMachineForm && (
        <div className={styles.overlay}>
          <section className={styles.modal}>
            <header
              className={styles.modalHeader}
            >
              <div>
                <h2>Nueva máquina</h2>
                <p>
                  Asociada a{" "}
                  {customer.name}.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowMachineForm(false)
                }
              >
                ×
              </button>
            </header>

            {formError && (
              <div className={styles.error}>
                {formError}
              </div>
            )}

            <form
              className={styles.form}
              onSubmit={createMachine}
            >
              <div
                className={styles.twoColumns}
              >
                <label>
                  Marca
                  <input
                    value={
                      machineForm.brand
                    }
                    onChange={(event) =>
                      updateMachine(
                        "brand",
                        event.target.value,
                      )
                    }
                    required
                  />
                </label>

                <label>
                  Tipo
                  <input
                    value={
                      machineForm.type
                    }
                    placeholder="Recta, Overlock..."
                    onChange={(event) =>
                      updateMachine(
                        "type",
                        event.target.value,
                      )
                    }
                    required
                  />
                </label>
              </div>

              <div
                className={styles.twoColumns}
              >
                <label>
                  Modelo
                  <input
                    value={
                      machineForm.model
                    }
                    onChange={(event) =>
                      updateMachine(
                        "model",
                        event.target.value,
                      )
                    }
                  />
                </label>

                <label>
                  N° de serie
                  <input
                    value={
                      machineForm.serialNumber
                    }
                    onChange={(event) =>
                      updateMachine(
                        "serialNumber",
                        event.target.value,
                      )
                    }
                  />
                </label>
              </div>

              <footer
                className={
                  styles.modalActions
                }
              >
                <button
                  type="button"
                  className={
                    styles.secondaryButton
                  }
                  onClick={() =>
                    setShowMachineForm(false)
                  }
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className={
                    styles.primaryButton
                  }
                  disabled={savingMachine}
                >
                  {savingMachine
                    ? "Guardando..."
                    : "Guardar máquina"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}

      {repairMachine && (
        <div className={styles.overlay}>
          <section className={styles.modal}>
            <header
              className={styles.modalHeader}
            >
              <div>
                <h2>
                  Iniciar reparación
                </h2>

                <p>
                  {repairMachine.brand}{" "}
                  {repairMachine.model ??
                    repairMachine.type}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setRepairMachine(null)
                }
              >
                ×
              </button>
            </header>

            {repairError && (
              <div className={styles.error}>
                {repairError}
              </div>
            )}

            <form
              className={styles.form}
              onSubmit={createRepair}
            >
              <label>
                Problema informado

                <textarea
                  rows={5}
                  value={reportedIssue}
                  onChange={(event) =>
                    setReportedIssue(
                      event.target.value,
                    )
                  }
                  placeholder="Ej: corta el hilo, no arrastra..."
                  required
                />
              </label>

              <label>
                Accesorios recibidos

                <textarea
                  rows={3}
                  value={receivedAccessories}
                  onChange={(event) =>
                    setReceivedAccessories(
                      event.target.value,
                    )
                  }
                  placeholder="Ej: pedal, cable, funda..."
                />
              </label>

              <footer
                className={
                  styles.modalActions
                }
              >
                <button
                  type="button"
                  className={
                    styles.secondaryButton
                  }
                  onClick={() =>
                    setRepairMachine(null)
                  }
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className={
                    styles.primaryButton
                  }
                  disabled={savingRepair}
                >
                  {savingRepair
                    ? "Registrando..."
                    : "Ingresar reparación"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}