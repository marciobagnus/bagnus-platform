"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import styles from "./reparaciones.module.css";
import {
  getRepairStatusLabel,
  REPAIR_STATUS_LABELS,
  type RepairStatus,
} from "./repair-status";

type Repair = {
  id: string;
  status: RepairStatus;
  reportedIssue: string;
  receivedAt: string;
  machine: {
    brand: string;
    type: string;
    model: string | null;
    customer: {
      id: string;
      name: string;
      lastName: string | null;
      phone: string;
    };
  };
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
  }).format(new Date(value));
}

async function fetchRepairs() {
  try {
    const response = await fetch("/api/repairs");
    const body = await response.json();

    if (!response.ok) {
      return {
        error:
          body.error ??
          "No se pudieron consultar las reparaciones.",
      };
    }

    return { repairs: body as Repair[] };
  } catch {
    return {
      error: "No se pudo conectar con el servidor.",
    };
  }
}

export default function RepairsPage() {
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"" | RepairStatus>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadRepairs = useCallback(async () => {
    const result = await fetchRepairs();

    if ("error" in result) {
      setError(result.error);
    } else {
      setError("");
      setRepairs(result.repairs);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    void fetchRepairs().then((result) => {
      if (cancelled) {
        return;
      }

      if ("error" in result) {
        setError(result.error);
      } else {
        setError("");
        setRepairs(result.repairs);
      }

      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredRepairs = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();

    return repairs.filter((repair) => {
      if (status && repair.status !== status) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const customer = repair.machine.customer;
      const searchable = [
        customer.name,
        customer.lastName,
        customer.phone,
        repair.machine.brand,
        repair.machine.model,
        repair.machine.type,
        repair.reportedIssue,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase();

      return searchable.includes(normalizedQuery);
    });
  }, [query, repairs, status]);

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Reparaciones</h1>
          <Link href="/reparaciones/saldos">Ver saldos pendientes</Link>
          <p>
            Seguimiento de los trabajos ingresados al taller.
          </p>
        </div>
      </header>

      <section className={styles.panel}>
        <div className={styles.filters}>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cliente, teléfono, máquina o problema"
            aria-label="Buscar reparaciones"
          />

          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as "" | RepairStatus)
            }
            aria-label="Filtrar por estado"
          >
            <option value="">Todos los estados</option>
            {Object.entries(REPAIR_STATUS_LABELS).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ),
            )}
          </select>
        </div>
      </section>

      {error && <div className={styles.error}>{error}</div>}

      {loading ? (
        <p className={styles.message}>Cargando reparaciones...</p>
      ) : filteredRepairs.length === 0 ? (
        <div className={styles.empty}>
          <strong>
            {repairs.length === 0
              ? "No hay reparaciones ingresadas"
              : "No encontramos reparaciones"}
          </strong>
          <p>
            {repairs.length === 0
              ? "Las nuevas reparaciones aparecerán en este listado."
              : "Probá con otra búsqueda o cambiá el filtro de estado."}
          </p>
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Máquina</th>
                <th>Problema</th>
                <th>Estado</th>
                <th>Fecha de ingreso</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredRepairs.map((repair) => {
                const customer = repair.machine.customer;
                const customerName = [
                  customer.name,
                  customer.lastName,
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <tr key={repair.id}>
                    <td>
                      <strong>{customerName}</strong>
                      <span>{customer.phone}</span>
                    </td>
                    <td>
                      <strong>
                        {repair.machine.brand} {repair.machine.type}
                      </strong>
                      <span>{repair.machine.model ?? "Sin modelo"}</span>
                    </td>
                    <td>{repair.reportedIssue}</td>
                    <td>
                      <span
                        className={`${styles.badge} ${styles[`status${repair.status}`]}`}
                      >
                        {getRepairStatusLabel(repair.status)}
                      </span>
                    </td>
                    <td>{formatDate(repair.receivedAt)}</td>
                    <td className={styles.actions}>
                      <Link href={`/reparaciones/${repair.id}`}>
                        Ver
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <button
        className={styles.refresh}
        type="button"
        onClick={() => {
          setLoading(true);
          void loadRepairs();
        }}
        disabled={loading}
      >
        Actualizar listado
      </button>
    </section>
  );
}