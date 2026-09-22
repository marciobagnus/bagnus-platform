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
  quotes: {
    id: string;
    version: number;
    description: string;
    totalAmount: string;
    currency: string;
    status: "DRAFT" | "WAITING_APPROVAL" | "APPROVED" | "REJECTED" | "SUPERSEDED";
    createdAt: string;
    decisions: {
      approved: boolean;
      channel: string;
      note: string | null;
      decidedAt: string;
    }[];
  }[];
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
  const [actionError, setActionError] = useState("");
  const [actionLoading, setActionLoading] = useState("");
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [quoteDescription, setQuoteDescription] = useState("");
  const [quoteAmount, setQuoteAmount] = useState("");
  const [showDecisionForm, setShowDecisionForm] = useState(false);
  const [decision, setDecision] = useState<"APPROVED" | "REJECTED">("APPROVED");
  const [decisionChannel, setDecisionChannel] = useState<keyof typeof DECISION_CHANNELS>("IN_PERSON");
  const [decisionNote, setDecisionNote] = useState("");

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

  async function executeAction(
    action: string,
    request: () => Promise<Response>,
  ) {
    setActionError("");
    setActionLoading(action);

    try {
      const response = await request();
      const body = await response.json();

      if (!response.ok) {
        setActionError(
          body.error ?? "No se pudo completar la operación.",
        );
        return false;
      }

      await loadRepair();
      return true;
    } catch {
      setActionError("No se pudo conectar con el servidor.");
      return false;
    } finally {
      setActionLoading("");
    }
  }

  async function startDiagnosis() {
    await executeAction("diagnosis", () =>
      fetch(`/api/repairs/${repairId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DIAGNOSING" }),
      }),
    );
  }

  async function createQuote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const completed = await executeAction("quote", () =>
      fetch(`/api/repairs/${repairId}/quotes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: quoteDescription,
          totalAmount: quoteAmount,
        }),
      }),
    );

    if (completed) {
      setShowQuoteForm(false);
      setQuoteDescription("");
      setQuoteAmount("");
    }
  }

  async function submitQuote(quoteId: string) {
    await executeAction("submit-quote", () =>
      fetch(`/api/quotes/${quoteId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
    );
  }

  async function saveDecision(
    event: React.FormEvent<HTMLFormElement>,
    quoteId: string,
  ) {
    event.preventDefault();

    const completed = await executeAction("decision", () =>
      fetch(`/api/quotes/${quoteId}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          channel: decisionChannel,
          note: decisionNote.trim() || null,
        }),
      }),
    );

    if (completed) {
      setShowDecisionForm(false);
      setDecisionNote("");
    }
  }

  async function finishRepair() {
    await executeAction("finish", () =>
      fetch(`/api/repairs/${repairId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "FINISH_REPAIR" }),
      }),
    );
  }

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
  const currentQuote = repair.quotes[0] ?? null;

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

      <section className={styles.actionsCard}>
        <div className={styles.sectionHeader}>
          <div>
            <h2>Acciones</h2>
            <p>Operaciones disponibles para el estado actual.</p>
          </div>
        </div>

        {actionError && <div className={styles.formError}>{actionError}</div>}

        {repair.status === "RECEIVED" && (
          <button
            className={styles.primaryButton}
            type="button"
            onClick={startDiagnosis}
            disabled={actionLoading !== ""}
          >
            {actionLoading === "diagnosis" ? "Comenzando..." : "Comenzar diagnóstico"}
          </button>
        )}

        {repair.status === "DIAGNOSING" && (
          <div className={styles.actionStack}>
            {currentQuote ? (
              <>
                <QuoteSummary quote={currentQuote} />
                <button
                  className={styles.primaryButton}
                  type="button"
                  onClick={() => submitQuote(currentQuote.id)}
                  disabled={actionLoading !== ""}
                >
                  {actionLoading === "submit-quote"
                    ? "Enviando..."
                    : "Enviar presupuesto a aprobación"}
                </button>
              </>
            ) : (
              <button
                className={styles.primaryButton}
                type="button"
                onClick={() => {
                  setActionError("");
                  setShowQuoteForm(true);
                }}
                disabled={actionLoading !== ""}
              >
                Crear presupuesto
              </button>
            )}
          </div>
        )}

        {repair.status === "WAITING_APPROVAL" && currentQuote && (
          <div className={styles.actionStack}>
            <QuoteSummary quote={currentQuote} />
            <button
              className={styles.primaryButton}
              type="button"
              onClick={() => {
                setActionError("");
                setShowDecisionForm(true);
              }}
              disabled={actionLoading !== ""}
            >
              Registrar decisión del cliente
            </button>
          </div>
        )}

        {repair.status === "IN_REPAIR" && (
          <button
            className={styles.primaryButton}
            type="button"
            onClick={finishRepair}
            disabled={actionLoading !== ""}
          >
            {actionLoading === "finish" ? "Finalizando..." : "Finalizar reparación"}
          </button>
        )}

        {repair.status === "READY_FOR_PICKUP" && (
          <p className={styles.actionMessage}>
            Reparación finalizada. Pendiente de cobro y entrega.
          </p>
        )}

        {repair.status === "AWAITING_PICKUP_UNREPAIRED" && (
          <p className={styles.actionMessage}>
            El cliente rechazó el presupuesto. Pendiente de resolver diagnóstico y entrega.
          </p>
        )}

        {![
          "RECEIVED",
          "DIAGNOSING",
          "WAITING_APPROVAL",
          "IN_REPAIR",
          "READY_FOR_PICKUP",
          "AWAITING_PICKUP_UNREPAIRED",
        ].includes(repair.status) && (
          <p className={styles.actionMessage}>No hay acciones disponibles.</p>
        )}
      </section>

      {currentQuote && repair.status !== "DIAGNOSING" && (
        <section className={styles.card}>
          <h2>Presupuesto vigente</h2>
          <QuoteSummary quote={currentQuote} />
        </section>
      )}

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

      {showQuoteForm && (
        <div className={styles.overlay}>
          <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="quote-title">
            <div className={styles.modalHeader}>
              <div>
                <h2 id="quote-title">Crear presupuesto</h2>
                <p>Ingresá el detalle y el importe total en ARS.</p>
              </div>
              <button
                className={styles.close}
                type="button"
                onClick={() => setShowQuoteForm(false)}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
            {actionError && <div className={styles.formError}>{actionError}</div>}
            <form className={styles.form} onSubmit={createQuote}>
              <label>
                Descripción
                <textarea
                  value={quoteDescription}
                  onChange={(event) => setQuoteDescription(event.target.value)}
                  rows={4}
                  required
                />
              </label>
              <label>
                Importe total (ARS)
                <input
                  value={quoteAmount}
                  onChange={(event) => setQuoteAmount(event.target.value)}
                  inputMode="decimal"
                  placeholder="0.00"
                  required
                />
              </label>
              <div className={styles.modalActions}>
                <button className={styles.secondaryButton} type="button" onClick={() => setShowQuoteForm(false)}>
                  Cancelar
                </button>
                <button className={styles.primaryButton} type="submit" disabled={actionLoading !== ""}>
                  {actionLoading === "quote" ? "Guardando..." : "Crear presupuesto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDecisionForm && currentQuote && (
        <div className={styles.overlay}>
          <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="decision-title">
            <div className={styles.modalHeader}>
              <div>
                <h2 id="decision-title">Registrar decisión</h2>
                <p>Guardá la respuesta del cliente sobre el presupuesto.</p>
              </div>
              <button
                className={styles.close}
                type="button"
                onClick={() => setShowDecisionForm(false)}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
            {actionError && <div className={styles.formError}>{actionError}</div>}
            <form className={styles.form} onSubmit={(event) => saveDecision(event, currentQuote.id)}>
              <label>
                Decisión
                <select value={decision} onChange={(event) => setDecision(event.target.value as "APPROVED" | "REJECTED")}>
                  <option value="APPROVED">Aprobar</option>
                  <option value="REJECTED">Rechazar</option>
                </select>
              </label>
              <label>
                Canal
                <select value={decisionChannel} onChange={(event) => setDecisionChannel(event.target.value as keyof typeof DECISION_CHANNELS)}>
                  {Object.entries(DECISION_CHANNELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              <label>
                Nota (opcional)
                <textarea value={decisionNote} onChange={(event) => setDecisionNote(event.target.value)} rows={3} />
              </label>
              <div className={styles.modalActions}>
                <button className={styles.secondaryButton} type="button" onClick={() => setShowDecisionForm(false)}>
                  Cancelar
                </button>
                <button className={styles.primaryButton} type="submit" disabled={actionLoading !== ""}>
                  {actionLoading === "decision" ? "Guardando..." : "Registrar decisión"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

function QuoteSummary({
  quote,
}: {
  quote: Repair["quotes"][number];
}) {
  return (
    <div className={styles.quoteSummary}>
      <dl>
        <div>
          <dt>Versión</dt>
          <dd>{quote.version}</dd>
        </div>
        <div>
          <dt>Importe</dt>
          <dd>{quote.currency} {formatAmount(quote.totalAmount)}</dd>
        </div>
        <div>
          <dt>Estado</dt>
          <dd>{QUOTE_STATUS_LABELS[quote.status]}</dd>
        </div>
        <div>
          <dt>Creado</dt>
          <dd>{formatDate(quote.createdAt)}</dd>
        </div>
      </dl>
      <p>{quote.description}</p>
      {quote.decisions[0] && (
        <p className={styles.decisionInfo}>
          Decisión: {quote.decisions[0].approved ? "Aprobado" : "Rechazado"}
          {` - ${DECISION_CHANNELS[quote.decisions[0].channel as keyof typeof DECISION_CHANNELS] ?? quote.decisions[0].channel}`}
          {` - ${formatDateTime(quote.decisions[0].decidedAt)}`}
          {quote.decisions[0].note ? ` - ${quote.decisions[0].note}` : ""}
        </p>
      )}
    </div>
  );
}

function formatAmount(value: string) {
  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

const DECISION_CHANNELS = {
  IN_PERSON: "En persona",
  PHONE: "Teléfono",
  WHATSAPP: "WhatsApp",
  EMAIL: "Email",
  CUSTOMER_PORTAL: "Portal del cliente",
} as const;

const QUOTE_STATUS_LABELS = {
  DRAFT: "Borrador",
  WAITING_APPROVAL: "Esperando aprobación",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
  SUPERSEDED: "Reemplazado",
} as const;