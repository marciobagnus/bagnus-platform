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
import { useRouter } from "next/navigation";

import {
  getRepairStatusLabel,
  type RepairStatus,
} from "../../reparaciones/repair-status";
import {
  buildArgentineMobilePhone,
  parseArgentineMobilePhone,
} from "../../../../modules/customers/domain/customer-phone";

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
  openRepair: {
    id: string;
    status: RepairStatus;
  } | null;
};

type MachineForm = {
  brand: string;
  type: string;
  model: string;
  serialNumber: string;
  reportedIssue: string;
  receivedAccessories: string;
};

const EMPTY_MACHINE: MachineForm = {
  brand: "",
  type: "",
  model: "",
  serialNumber: "",
  reportedIssue: "",
  receivedAccessories: "",
};

type CustomerForm = {
  name: string;
  lastName: string;
  dni: string;
  phoneMode: "argentine" | "manual";
  areaCode: string;
  mobileNumber: string;
  manualPhone: string;
  email: string;
  address: string;
};

export default function CustomerDetailPage({
  params,
}: {
  params: Promise<{
    customerId: string;
  }>;
}) {
  const { customerId } = use(params);
  const router = useRouter();

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

  const [showCustomerForm, setShowCustomerForm] =
    useState(false);

  const [customerForm, setCustomerForm] =
    useState<CustomerForm | null>(null);

  const [customerFormError, setCustomerFormError] =
    useState("");

  const [savingCustomer, setSavingCustomer] =
    useState(false);

  const [showMachineForm, setShowMachineForm] =
    useState(false);

  const [machineForm, setMachineForm] =
    useState<MachineForm>(EMPTY_MACHINE);

  const [savingMachine, setSavingMachine] =
    useState(false);

  const [machineAction, setMachineAction] =
    useState<"machine" | "intake">("machine");

  const [reportedIssue, setReportedIssue] = useState("");
  const [receivedAccessories, setReceivedAccessories] = useState("");
  const [repairError, setRepairError] = useState("");
  const [savingRepair, setSavingRepair] = useState(false);

  const [
    repairMachine,
    setRepairMachine,
  ] = useState<Machine | null>(null);

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

  function updateCustomerField(
    field: keyof CustomerForm,
    value: string,
  ) {
    setCustomerForm((current) =>
      current === null
        ? current
        : { ...current, [field]: value },
    );
  }

  function openCustomerForm() {
    if (!customer) {
      return;
    }

    setCustomerForm({
      name: customer.name,
      lastName: customer.lastName ?? "",
      dni: customer.dni ?? "",
      ...(parseArgentineMobilePhone(customer.phone)
        ? {
            phoneMode: "argentine" as const,
            areaCode: parseArgentineMobilePhone(customer.phone)!.areaCode,
            mobileNumber: parseArgentineMobilePhone(customer.phone)!.mobileNumber,
            manualPhone: "",
          }
        : {
            phoneMode: "manual" as const,
            areaCode: "",
            mobileNumber: "",
            manualPhone: customer.phone,
          }),
      email: customer.email ?? "",
      address: customer.address ?? "",
    });
    setCustomerFormError("");
    setShowCustomerForm(true);
  }

  async function saveCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!customerForm) {
      return;
    }

    setCustomerFormError("");
    setSavingCustomer(true);

    const phone = customerForm.phoneMode === "argentine"
      ? buildArgentineMobilePhone(
          customerForm.areaCode,
          customerForm.mobileNumber,
        )
      : customerForm.manualPhone.trim();

    if (!phone) {
      setCustomerFormError(
        customerForm.phoneMode === "argentine"
          ? "Ingresá un código de área de 2 a 4 dígitos y un número de celular válido."
          : "Ingresá un teléfono válido.",
      );
      setSavingCustomer(false);
      return;
    }

    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: customerForm.name,
          lastName: customerForm.lastName,
          dni: customerForm.dni,
          phone,
          email: customerForm.email,
          address: customerForm.address,
        }),
      });
      const body = await response.json();

      if (!response.ok) {
        setCustomerFormError(
          body.error ?? "No se pudieron actualizar los datos.",
        );
        return;
      }

      setCustomer(body as Customer);
      setShowCustomerForm(false);
      setCustomerForm(null);
      setSuccess("Datos del cliente actualizados correctamente");
    } catch {
      setCustomerFormError("No se pudo conectar con el servidor.");
    } finally {
      setSavingCustomer(false);
    }
  }

  async function createMachine(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setFormError("");
    setSavingMachine(true);

    const submitter = (event.nativeEvent as SubmitEvent)
      .submitter as HTMLButtonElement | null;
    const startRepair = submitter?.value === "intake";

    try {
      const response = await fetch(
        startRepair ? "/api/machines/intake" : "/api/machines",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify(
            startRepair
              ? {
                  customerId,
                  brand: machineForm.brand,
                  type: machineForm.type,
                  model: machineForm.model.trim() || null,
                  serialNumber: machineForm.serialNumber.trim() || null,
                  reportedIssue: machineForm.reportedIssue,
                  receivedAccessories:
                    machineForm.receivedAccessories.trim() || null,
                }
              : {
                  customerId,
                  brand: machineForm.brand,
                  type: machineForm.type,
                  model: machineForm.model.trim() || null,
                  serialNumber: machineForm.serialNumber.trim() || null,
                },
          ),
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

      if (startRepair) {
        router.push(`/reparaciones/${body.repair.id}`);
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

  async function createRepair(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!repairMachine) {
      return;
    }

    setRepairError("");
    setSavingRepair(true);

    try {
      const response = await fetch("/api/repairs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          machineId: repairMachine.id,
          reportedIssue,
          receivedAccessories: receivedAccessories.trim() || null,
        }),
      });
      const body = await response.json();

      if (!response.ok) {
        setRepairError(
          body.error ?? "No se pudo registrar la reparación.",
        );
        return;
      }

      setRepairMachine(null);
      setReportedIssue("");
      setReceivedAccessories("");
      setMachines((current) =>
        current.map((machine) =>
          machine.id === repairMachine.id
            ? {
                ...machine,
                openRepair: {
                  id: body.id as string,
                  status: body.status as RepairStatus,
                },
              }
            : machine,
        ),
      );
      setSuccess("Reparación ingresada correctamente.");
    } catch {
      setRepairError("No se pudo conectar con el servidor.");
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

        <button
          type="button"
          className={styles.primaryButton}
          onClick={openCustomerForm}
        >
          Editar cliente
        </button>
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

      {showCustomerForm && customerForm && (
        <div className={styles.overlay}>
          <section className={styles.modal}>
            <header className={styles.modalHeader}>
              <div>
                <h2>Editar cliente</h2>
                <p>Actualizá los datos del cliente.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomerForm(false)}
                aria-label="Cerrar"
              >
                ×
              </button>
            </header>

            {customerFormError && (
              <div className={styles.error}>{customerFormError}</div>
            )}

            <form className={styles.form} onSubmit={saveCustomer}>
              <div className={styles.twoColumns}>
                <label>
                  Nombre
                  <input
                    value={customerForm.name}
                    onChange={(event) =>
                      updateCustomerField("name", event.target.value)
                    }
                    required
                  />
                </label>
                <label>
                  Apellido
                  <input
                    value={customerForm.lastName}
                    onChange={(event) =>
                      updateCustomerField("lastName", event.target.value)
                    }
                    required
                  />
                </label>
              </div>

              <div className={styles.twoColumns}>
                <label>
                  DNI
                  <input
                    inputMode="numeric"
                    value={customerForm.dni}
                    onChange={(event) =>
                      updateCustomerField("dni", event.target.value)
                    }
                  />
                </label>
                <div className={styles.phoneField}>
                  Teléfono celular argentino
                  {customerForm.phoneMode === "argentine" ? (
                    <div className={styles.phoneFields}>
                      <label className={styles.phonePart}>
                        <span>Código de área</span>
                        <span className={styles.phoneInputGroup}>
                          <span className={styles.phonePrefix}>0</span>
                          <input
                            type="tel"
                            inputMode="numeric"
                            value={customerForm.areaCode}
                            onChange={(event) =>
                              updateCustomerField("areaCode", event.target.value.replace(/\D/g, ""))
                            }
                            required
                            aria-label="Código de área sin cero"
                          />
                        </span>
                      </label>
                      <label className={styles.phonePart}>
                        <span>Número de celular</span>
                        <span className={styles.phoneInputGroup}>
                          <span className={styles.phonePrefix}>15</span>
                          <input
                            type="tel"
                            inputMode="numeric"
                            value={customerForm.mobileNumber}
                            onChange={(event) =>
                              updateCustomerField("mobileNumber", event.target.value.replace(/\D/g, ""))
                            }
                            required
                            aria-label="Número de celular sin 15"
                          />
                        </span>
                      </label>
                    </div>
                  ) : (
                    <input
                      type="tel"
                      inputMode="tel"
                      value={customerForm.manualPhone}
                      onChange={(event) =>
                        updateCustomerField("manualPhone", event.target.value)
                      }
                      required
                    />
                  )}
                  <button
                    type="button"
                    className={styles.phoneModeButton}
                    onClick={() =>
                      updateCustomerField(
                        "phoneMode",
                        customerForm.phoneMode === "argentine" ? "manual" : "argentine",
                      )
                    }
                  >
                    {customerForm.phoneMode === "argentine"
                      ? "Ingresar otro formato"
                      : "Usar celular argentino"}
                  </button>
                </div>
              </div>

              <label>
                Email
                <input
                  type="email"
                  value={customerForm.email}
                  onChange={(event) =>
                    updateCustomerField("email", event.target.value)
                  }
                />
              </label>

              <label>
                Dirección
                <input
                  value={customerForm.address}
                  onChange={(event) =>
                    updateCustomerField("address", event.target.value)
                  }
                />
              </label>

              <footer className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => setShowCustomerForm(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={savingCustomer}
                >
                  {savingCustomer ? "Guardando..." : "Guardar cambios"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}

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
              setMachineAction("machine");
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

                {machine.openRepair ? (
                  <div className={styles.openRepair}>
                    <span className={styles.openRepairStatus}>
                      {getRepairStatusLabel(machine.openRepair.status)}
                    </span>
                    <Link href={`/reparaciones/${machine.openRepair.id}`}>
                      Ver reparación
                    </Link>
                  </div>
                ) : (
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
                )}
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

              <h3>Ingreso al taller</h3>

              <label>
                Problema informado por el cliente
                <textarea
                  rows={4}
                  value={machineForm.reportedIssue}
                  onChange={(event) =>
                    updateMachine("reportedIssue", event.target.value)
                  }
                  placeholder="Ej: corta el hilo, no arrastra..."
                  required={machineAction === "intake"}
                />
              </label>

              <label>
                Accesorios recibidos
                <textarea
                  rows={3}
                  value={machineForm.receivedAccessories}
                  onChange={(event) =>
                    updateMachine("receivedAccessories", event.target.value)
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
                  value="machine"
                  onClick={() => setMachineAction("machine")}
                >
                  Guardar solo máquina
                </button>

                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={savingMachine}
                  value="intake"
                  onClick={() => setMachineAction("intake")}
                >
                  {savingMachine ? "Guardando..." : "Guardar e iniciar reparación"}
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