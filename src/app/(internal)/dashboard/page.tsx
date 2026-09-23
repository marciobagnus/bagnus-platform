"use client";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import styles from "./dashboard.module.css";

import {
  getRepairStatusLabel,
  type RepairStatus,
} from "../reparaciones/repair-status";

type DashboardRepair = {
  id: string;
  status: RepairStatus;
  reportedIssue: string;
  receivedAt: string;
  updatedAt: string;
  machine: {
    brand: string;
    type: string;
    model: string | null;
    customer: {
      id: string;
      name: string;
      lastName: string | null;
    };
  };
};

type DashboardData = {
  activeRepairs: number;
  waitingApproval: number;
  readyForPickup: number;
  awaitingPickupUnrepaired: number;
  recentRepairs: DashboardRepair[];
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
  }).format(new Date(value));
}

async function fetchDashboard() {
  try {
    const response = await fetch("/api/dashboard");
    const body = await response.json();

    if (!response.ok) {
      return {
        error:
          body.error ??
          "No se pudo consultar el dashboard.",
      };
    }

    return { dashboard: body as DashboardData };
  } catch {
    return {
      error: "No se pudo conectar con el servidor.",
    };
  }
}

export default function DashboardPage() {
  const [dashboard, setDashboard] =
    useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    void fetchDashboard().then((result) => {
      if (cancelled) {
        return;
      }

      if ("error" in result) {
        setError(result.error);
      } else {
        setError("");
        setDashboard(result.dashboard);
      }

      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Inicio</h1>

          <p>
            Estado general del taller.
          </p>
        </div>
      </header>

      <div className={styles.cards}>
        <article>
          <span>Reparaciones activas</span>
          <strong>{dashboard?.activeRepairs ?? "-"}</strong>
        </article>

        <article>
          <span>Esperando aprobación</span>
          <strong>{dashboard?.waitingApproval ?? "-"}</strong>
        </article>

        <article>
          <span>Listas para entregar</span>
          <strong>{dashboard?.readyForPickup ?? "-"}</strong>
        </article>

        <article>
          <span>Retiro sin reparar</span>
          <strong>
            {dashboard?.awaitingPickupUnrepaired ?? "-"}
          </strong>
        </article>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {loading ? (
        <p className={styles.message}>Cargando dashboard...</p>
      ) : error ? null : dashboard?.recentRepairs.length === 0 ? (
        <div className={styles.empty}>
          <h2>Trabajos recientes</h2>

          <p>No hay reparaciones activas en el taller.</p>
        </div>
      ) : (
        <section className={styles.recentSection}>
          <h2>Trabajos recientes</h2>

          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Máquina</th>
                  <th>Estado</th>
                  <th>Problema informado</th>
                  <th>Fecha</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {dashboard?.recentRepairs.map((repair) => {
                  const customer = repair.machine.customer;
                  const customerName = [
                    customer.name,
                    customer.lastName,
                  ]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <tr key={repair.id}>
                      <td>{customerName}</td>
                      <td>
                        <strong>
                          {repair.machine.brand} {repair.machine.type}
                        </strong>
                        <span>
                          {repair.machine.model ?? "Sin modelo"}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`${styles.badge} ${styles[`status${repair.status}`]}`}
                        >
                          {getRepairStatusLabel(repair.status)}
                        </span>
                      </td>
                      <td>{repair.reportedIssue}</td>
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
        </section>
      )}
    </section>
  );
}