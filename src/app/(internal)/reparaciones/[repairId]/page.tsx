"use client";

import {
  use,
  useCallback,
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import styles from "./repair-detail.module.css";
import {
  getRepairStatusLabel,
  type RepairStatus,
} from "../repair-status";

type Repair = {
  id: string;
  status: RepairStatus;
  reportedIssue: string;
  receivedAccessories: string | null;
  receivedAt: string;
  machine: {
    brand: string;
    type: string;
    model: string | null;
    serialNumber: string | null;
    customer: {
      id: string;
      name: string;
      lastName: string | null;
      phone: string;
    };
  };
  statusHistory: {
    id: string;
    fromStatus: RepairStatus | null;
    toStatus: RepairStatus;
    note: string | null;
    changedAt: string;
    changedBy: {
      id: string;
      displayName: string;
    } | null;
  }[];
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

async function fetchRepair(repairId: string) {
  try {
    const response = await fetch(`/api/repairs/${repairId}`);
    const body = await response.json();

    if (!response.ok) {
      return {
        error:
          body.error ??
          "No se pudo consultar la reparación.",
      };
    }

    return { repair: body as Repair };
  } catch {
    return {
      error: "No se pudo conectar con el servidor.",
    };
  }
}

export default function RepairDetailPage({
  params,
}: {
  params: Promise<{ repairId: string }>;
}) {
  const { repairId } = use(params);
  const [repair, setRepair] = useState<Repair | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadRepair = useCallback(async () => {
    const result = await fetchRepair(repairId);

    if ("error" in result) {
      setError(result.error);
    } else {
      setError("");
      setRepair(result.repair);
    }

    setLoading(false);
  }, [repairId]);

  useEffect(() => {
    let cancelled = false;

    void fetchRepair(repairId).then((result) => {
      if (cancelled) {
        return;
      }

      if ("error" in result) {
        setError(result.error);
      } else {
        setError("");
        setRepair(result.repair);
      }

      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [repairId]);

  if (loading) {
    return <p className={styles.loading}>Cargando reparación...</p>;
  }

  if (error || !repair) {
    return (
      <section className={styles.page}>
        <Link href="/reparaciones" className={styles.back}>
          ← Volver a reparaciones
        </Link>
        <div className={styles.error}>
          {error || "La reparación indicada no existe."}
        </div>
        <button
          className={styles.secondaryButton}
          type="button"
          onClick={() => {
            setLoading(true);
            void loadRepair();
          }}
        >
          Reintentar
        </button>
      </section>
    );
  }

  const customer = repair.machine.customer;
  const customerName = [customer.name, customer.lastName]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={styles.page}>
      <Link href="/reparaciones" className={styles.back}>
        ← Volver a reparaciones
      </Link>

      <header className={styles.header}>
        <div>
          <span className={`${styles.badge} ${styles[`status${repair.status}`]}`}>
            {getRepairStatusLabel(repair.status)}
          </span>
          <h1>Reparación</h1>
          <p>Ingreso del {formatDate(repair.receivedAt)}</p>
        </div>
      </header>

      <div className={styles.grid}>
        <section className={styles.card}>
          <h2>Cliente</h2>
          <dl>
            <div>
              <dt>Nombre completo</dt>
              <dd>{customerName}</dd>
            </div>
            <div>
              <dt>Teléfono</dt>
              <dd>{customer.phone}</dd>
            </div>
          </dl>
          <Link href={`/clientes/${customer.id}`} className={styles.detailLink}>
            Ver ficha del cliente
          </Link>
        </section>

        <section className={styles.card}>
          <h2>Máquina</h2>
          <dl>
            <div>
              <dt>Marca</dt>
              <dd>{repair.machine.brand}</dd>
            </div>
            <div>
              <dt>Tipo</dt>
              <dd>{repair.machine.type}</dd>
            </div>
            <div>
              <dt>Modelo</dt>
              <dd>{repair.machine.model ?? "Sin modelo"}</dd>
            </div>
            <div>
              <dt>Número de serie</dt>
              <dd>{repair.machine.serialNumber ?? "Sin número de serie"}</dd>
            </div>
          </dl>
        </section>
      </div>

      <section className={styles.card}>
        <h2>Ingreso</h2>
        <dl className={styles.intake}>
          <div>
            <dt>Problema informado</dt>
            <dd>{repair.reportedIssue}</dd>
          </div>
          <div>
            <dt>Accesorios recibidos</dt>
            <dd>{repair.receivedAccessories ?? "No informado"}</dd>
          </div>
        </dl>
      </section>

      <section className={styles.historySection}>
        <div className={styles.sectionHeader}>
          <div>
            <h2>Historial</h2>
            <p>Cambios de estado de la reparación.</p>
          </div>
        </div>

        {repair.statusHistory.length === 0 ? (
          <div className={styles.empty}>No hay cambios de estado registrados.</div>
        ) : (
          <ol className={styles.history}>
            {repair.statusHistory.map((change) => (
              <li key={change.id}>
                <div className={styles.historyStatus}>
                  <strong>
                    {change.fromStatus
                      ? getRepairStatusLabel(change.fromStatus)
                      : "Inicio"}
                  </strong>
                  <span>→</span>
                  <strong>{getRepairStatusLabel(change.toStatus)}</strong>
                </div>
                <p>{formatDateTime(change.changedAt)}</p>
                {change.note && <p>Nota: {change.note}</p>}
                <p className={styles.changedBy}>
                  {change.changedBy?.displayName ?? "Sistema / histórico"}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </section>
  );
}