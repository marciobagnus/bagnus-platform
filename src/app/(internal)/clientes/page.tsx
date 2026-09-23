"use client";

import {
  type FormEvent,
  useState,
} from "react";

import styles from "./clientes.module.css";

import Link from "next/link";

import { buildArgentineMobilePhone } from "../../../modules/customers/domain/customer-phone";

type CustomerResult = {
  id: string;
  name: string;
  lastName: string | null;
  phone: string;
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

const EMPTY_FORM: CustomerForm = {
  name: "",
  lastName: "",
  dni: "",
  phoneMode: "argentine",
  areaCode: "",
  mobileNumber: "",
  manualPhone: "",
  email: "",
  address: "",
};

export default function CustomersPage() {
  const [query, setQuery] = useState("");
  const [customers, setCustomers] =
    useState<CustomerResult[]>([]);

  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] =
    useState<CustomerForm>(EMPTY_FORM);

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");

  async function searchCustomers(
    searchValue = query,
  ) {
    const normalized = searchValue.trim();

    setError("");

    if (normalized.length < 2) {
      setError(
        "Ingresá al menos 2 caracteres para buscar.",
      );

      return;
    }

    setSearching(true);

    try {
      const response = await fetch(
        `/api/customers?search=${encodeURIComponent(
          normalized,
        )}`,
      );

      const body = await response.json();

      if (!response.ok) {
        setError(
          body.error ??
            "No se pudo realizar la búsqueda.",
        );

        return;
      }

      setCustomers(body);
      setSearched(true);
    } catch {
      setError(
        "No se pudo conectar con el servidor.",
      );
    } finally {
      setSearching(false);
    }
  }

  async function handleSearch(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setSuccess("");
    await searchCustomers();
  }

  async function createCustomer(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setFormError("");

    const phone = form.phoneMode === "argentine"
      ? buildArgentineMobilePhone(
          form.areaCode,
          form.mobileNumber,
        )
      : form.manualPhone.trim();

    if (!phone) {
      setFormError(
        form.phoneMode === "argentine"
          ? "Ingresá un código de área de 2 a 4 dígitos y un número de celular válido."
          : "Ingresá un teléfono válido.",
      );

      return;
    }

    setCreating(true);

    try {
      const response = await fetch(
        "/api/customers",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            name: form.name,
            lastName: form.lastName,
            dni: form.dni,
            phone,

            email:
              form.email.trim() || null,

            address:
              form.address.trim() || null,
          }),
        },
      );

      const body = await response.json();

      if (!response.ok) {
        setFormError(
          body.error ??
            "No se pudo registrar el cliente.",
        );

        return;
      }

      setSuccess("Cliente registrado correctamente.");
      setShowForm(false);
      setForm(EMPTY_FORM);

      setQuery(body.phone);

      await searchCustomers(body.phone);
    } catch {
      setError(
        "No se pudo conectar con el servidor.",
      );
    } finally {
      setCreating(false);
    }
  }

  function updateField(
    field: keyof CustomerForm,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Clientes</h1>

          <p>
            Buscá clientes existentes o registrá
            uno nuevo.
          </p>
        </div>

        <button
          className={styles.primaryButton}
          type="button"
          onClick={() => {
            setError("");
            setSuccess("");
            setFormError("");
            setShowForm(true);
          }}
        >
          + Nuevo cliente
        </button>
      </header>

      <section className={styles.panel}>
        <form
          className={styles.search}
          onSubmit={handleSearch}
        >
          <input
            value={query}
            onChange={(event) =>
              setQuery(event.target.value)
            }
            placeholder="Nombre, apellido, DNI, teléfono o email"
            aria-label="Buscar cliente"
          />

          <button
            type="submit"
            disabled={searching}
          >
            {searching
              ? "Buscando..."
              : "Buscar"}
          </button>
        </form>
      </section>

      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}

      {success && (
        <div className={styles.success}>
          {success}
        </div>
      )}

      <section className={styles.results}>
        {!searched ? (
          <div className={styles.empty}>
            <strong>Buscá un cliente</strong>

            <p>
              Podés buscar por nombre, apellido,
              DNI, teléfono o correo electrónico.
            </p>
          </div>
        ) : customers.length === 0 ? (
          <div className={styles.empty}>
            <strong>
              No encontramos clientes
            </strong>

            <p>
              Revisá la búsqueda o registrá un
              cliente nuevo.
            </p>
          </div>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Teléfono</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id}>
                    <td>
                      <strong>
                        {customer.name}
                        {customer.lastName
                          ? ` ${customer.lastName}`
                          : ""}
                      </strong>
                    </td>

                    <td>
                      {customer.phone}
                    </td>

                    <td
                      className={
                        styles.actions
                      }
                    >
                      <Link
  className={styles.detailLink}
  href={`/clientes/${customer.id}`}
>
  Ver ficha
</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showForm && (
        <div
          className={styles.overlay}
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setShowForm(false);
            }
          }}
        >
          <section
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-customer-title"
          >
            <header className={styles.modalHeader}>
              <div>
                <h2 id="new-customer-title">
                  Nuevo cliente
                </h2>

                <p>
                  Registrá los datos principales
                  del cliente.
                </p>
              </div>

              <button
                type="button"
                className={styles.close}
                onClick={() =>
                  setShowForm(false)
                }
                aria-label="Cerrar"
              >
                ×
              </button>
            </header>

            <form
              className={styles.customerForm}
              onSubmit={createCustomer}
            >
              {formError && (
                <div className={styles.error}>
                  {formError}
                </div>
              )}

              <div className={styles.twoColumns}>
                <label>
                  Nombre
                  <input
                    value={form.name}
                    onChange={(event) =>
                      updateField(
                        "name",
                        event.target.value,
                      )
                    }
                    required
                  />
                </label>

                <label>
                  Apellido
                  <input
                    value={form.lastName}
                    onChange={(event) =>
                      updateField(
                        "lastName",
                        event.target.value,
                      )
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
                    value={form.dni}
                    onChange={(event) =>
                      updateField(
                        "dni",
                        event.target.value,
                      )
                    }
                  />
                </label>

                <div className={styles.phoneField}>
                  Teléfono celular argentino
                  {form.phoneMode === "argentine" ? (
                    <div className={styles.phoneFields}>
                      <label className={styles.phonePart}>
                        <span>Código de área</span>
                        <span className={styles.phoneInputGroup}>
                          <span className={styles.phonePrefix}>0</span>
                          <input
                            type="tel"
                            inputMode="numeric"
                            value={form.areaCode}
                            onChange={(event) =>
                              updateField("areaCode", event.target.value.replace(/\D/g, ""))
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
                            value={form.mobileNumber}
                            onChange={(event) =>
                              updateField("mobileNumber", event.target.value.replace(/\D/g, ""))
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
                      value={form.manualPhone}
                      onChange={(event) =>
                        updateField("manualPhone", event.target.value)
                      }
                      required
                    />
                  )}
                  <button
                    type="button"
                    className={styles.phoneModeButton}
                    onClick={() =>
                      updateField(
                        "phoneMode",
                        form.phoneMode === "argentine" ? "manual" : "argentine",
                      )
                    }
                  >
                    {form.phoneMode === "argentine"
                      ? "Ingresar otro formato"
                      : "Usar celular argentino"}
                  </button>
                </div>
              </div>

              <label>
                Email
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    updateField(
                      "email",
                      event.target.value,
                    )
                  }
                />
              </label>

              <label>
                Dirección
                <input
                  value={form.address}
                  onChange={(event) =>
                    updateField(
                      "address",
                      event.target.value,
                    )
                  }
                />
              </label>

              <footer
                className={styles.modalActions}
              >
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() =>
                    setShowForm(false)
                  }
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={creating}
                >
                  {creating
                    ? "Guardando..."
                    : "Guardar cliente"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}