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
import {
  buildFinishedRepairWhatsAppMessage,
  buildRejectedQuoteWhatsAppMessage,
  buildDebtReminderWhatsAppMessage,
  buildQuoteWhatsAppMessage,
  buildWhatsAppLink,
} from "../../../../lib/whatsapp";

type PaymentMethod = "CASH" | "TRANSFER" | "CARD" | "OTHER";


type Repair = {
  id: string;
  status: RepairStatus;
  resolution: "REPAIRED" | "QUOTE_REJECTED" | null;
  deliveredAt: string | null;
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
      recordedBy: { displayName: string } | null;
    }[];
  }[];
  machine: {
    id: string;
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
  billing: {
    amountDue: string | null;
    totalPaid: string;
    outstandingBalance: string | null;
    currency: string;
    billingResolved: boolean;
    hasOutstandingBalance: boolean;
  };
  payments: {
    id: string;
    amount: string;
    currency: string;
    method: PaymentMethod;
    reference: string | null;
    note: string | null;
    receivedAt: string;
    recordedBy: {
      id: string;
      displayName: string;
    } | null;
  }[];
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

async function fetchRepair(repairId: string) {
  try {
    const response = await fetch(`/api/repairs/${repairId}`);
    const body = await response.json();

    if (!response.ok) {
      return {
        error: body.error ?? "No se pudo consultar la reparación.",
      };
    }

    return { repair: body as Repair };
  } catch {
    return { error: "No se pudo conectar con el servidor." };
  }
}

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

function formatCurrency(value: string) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(Number(value));
}

function getPaymentMethodLabel(method: string) {
  switch (method) {
    case "CASH":
      return "Efectivo";
    case "TRANSFER":
      return "Transferencia";
    case "CARD":
      return "Tarjeta";
    case "OTHER":
      return "Otro";
    default:
      return method;
  }
}

function canRegisterPayment(repair: Repair) {
  return repair.billing.billingResolved && repair.billing.hasOutstandingBalance;
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
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [showHandoverForm, setShowHandoverForm] = useState(false);

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
        setActionError(body.error ?? "No se pudo completar la operación.");
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

  async function submitPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const completed = await executeAction("payment", () =>
      fetch(`/api/repairs/${repairId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: paymentAmount,
          method: paymentMethod,
          reference: paymentReference.trim() || null,
          note: paymentNote.trim() || null,
        }),
      }),
    );

    if (completed) {
      setShowPaymentForm(false);
      setPaymentAmount("");
      setPaymentReference("");
      setPaymentNote("");
      setPaymentMethod("CASH");
    }
  }

  async function handOverMachine(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const completed = await executeAction("handover", () =>
      fetch(`/api/repairs/${repairId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "HAND_OVER_MACHINE", payment: {
          amount: paymentAmount, method: paymentMethod,
          reference: paymentReference.trim() || null, note: paymentNote.trim() || null,
        }}),
      }),
    );
    if (completed) setShowHandoverForm(false);
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
        <div className={styles.error}>{error || "La reparación indicada no existe."}</div>
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
  const customerName = [customer.name, customer.lastName].filter(Boolean).join(" ");
  const currentQuote = repair.quotes[0] ?? null;
  const whatsappData = {
    customerName,
    brand: repair.machine.brand,
    model: repair.machine.model,
  };
  const quoteWhatsAppLink = buildWhatsAppLink(
    customer.phone,
    buildQuoteWhatsAppMessage(whatsappData),
  );
  const finishedWhatsAppLink = buildWhatsAppLink(
    customer.phone,
    repair.resolution === "QUOTE_REJECTED" ? buildRejectedQuoteWhatsAppMessage(whatsappData) : buildFinishedRepairWhatsAppMessage(whatsappData),
  );

  const debtWhatsAppLink = buildWhatsAppLink(customer.phone,
    buildDebtReminderWhatsAppMessage({...whatsappData, balance: repair.billing.outstandingBalance ?? "0.00"}));

  return (
    <section className={styles.page}>
      <Link href="/reparaciones" className={styles.back}>
        ← Volver a reparaciones
      </Link>

      <header className={styles.header}>
        <div>
          <span className={`${styles.badge} ${styles[`status${repair.status}`]}`}>
            {getRepairStatusLabel(repair.status, repair.resolution)}
          </span>
          <h1>Reparación</h1>
          <p>Ingreso del {formatDate(repair.receivedAt)}</p>
          {repair.deliveredAt && <p>Entregada el {formatDateTime(repair.deliveredAt)}</p>}
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
          </div>
        </div>

        {actionError && <div className={styles.formError}>{actionError}</div>}

        {repair.status === "RECEIVED" && (
          <div className={styles.actionStack}>
            {currentQuote ? (
              <>
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
            {quoteWhatsAppLink ? (
              <a
                className={styles.whatsappButton}
                href={quoteWhatsAppLink}
                target="_blank"
                rel="noreferrer"
              >
                Enviar aviso por WhatsApp
              </a>
            ) : (
              <p className={styles.whatsappHint}>
                El teléfono no es un celular argentino válido para WhatsApp. Editá la ficha del cliente e ingresá código de área y número celular.
              </p>
            )}
            <button
              className={styles.primaryButton}
              type="button"
              onClick={() => {
                setActionError("");
                setDecision("APPROVED");
                setShowDecisionForm(true);
              }}
              disabled={actionLoading !== ""}
            >
              Aceptar presupuesto
            </button>
            <button className={styles.secondaryButton} type="button" disabled={actionLoading !== ""}
              onClick={() => {setActionError("");setDecision("REJECTED");setShowDecisionForm(true);}}>
              Rechazar presupuesto
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
          <div className={styles.actionStack}>
            <p className={styles.actionMessage}>
              {repair.resolution === "REPAIRED" ? "Lista para retirar — Reparada" : "Lista para retirar — Sin reparar. El diagnóstico no tiene costo."}
            </p>
            {finishedWhatsAppLink ? (
              <a
                className={styles.whatsappButton}
                href={finishedWhatsAppLink}
                target="_blank"
                rel="noreferrer"
              >
                Avisar por WhatsApp
              </a>
            ) : (
              <p className={styles.whatsappHint}>
                El teléfono no es un celular argentino válido para WhatsApp. Editá la ficha del cliente e ingresá código de área y número celular.
              </p>
            )}
          </div>
        )}

        {repair.status === "DELIVERED" && repair.billing.hasOutstandingBalance && debtWhatsAppLink && (
          <a className={styles.whatsappButton} href={debtWhatsAppLink} target="_blank" rel="noreferrer">Recordar saldo por WhatsApp</a>
        )}
        <p className={styles.whatsappHint}>Los avisos por WhatsApp se envían manualmente desde la aplicación.</p>
      </section>

      {currentQuote && (
        <section className={styles.card}>
          <h2>Presupuesto vigente</h2>
          <QuoteSummary quote={currentQuote} />
        </section>
      )}

      <section className={`${styles.card} ${styles.financialCard}`}>
        <div className={styles.sectionHeader}>
          <div>
            <h2>Cuenta de la reparación</h2>
            <p>Importe del trabajo y pagos registrados.</p>
          </div>
        </div>

        {!repair.billing.billingResolved ? (
          <p className={styles.actionMessage}>El importe a cobrar todavía no está determinado.</p>
        ) : (
          <>
            <div className={styles.billingRow}>
              <span>Importe total</span>
              <strong>{formatCurrency(repair.billing.amountDue ?? "0.00")}</strong>
            </div>
            <div className={styles.billingRow}>
              <span>Pagado</span>
              <strong>{formatCurrency(repair.billing.totalPaid)}</strong>
            </div>
            <div className={`${styles.billingRow} ${styles.outstandingRow}`}>
              <span>Saldo pendiente</span>
              <strong>{formatCurrency(repair.billing.outstandingBalance ?? "0.00")}</strong>
            </div>
          </>
        )}

        <div className={styles.paymentsSection}>
          <h3>Pagos registrados</h3>
          {repair.payments.length === 0 ? (
            <p className={styles.empty}>No hay pagos registrados.</p>
          ) : (
            <ul className={styles.paymentList}>
              {repair.payments.map((payment) => (
                <li key={payment.id} className={styles.paymentItem}>
                  <dl className={styles.paymentDetails}>
                    <div>
                      <dt>Importe</dt>
                      <dd>{formatCurrency(payment.amount)}</dd>
                    </div>
                    <div>
                      <dt>Medio de pago</dt>
                      <dd>{getPaymentMethodLabel(payment.method)}</dd>
                    </div>
                    <div>
                      <dt>Fecha</dt>
                      <dd>{formatDateTime(payment.receivedAt)}</dd>
                    </div>
                    <div>
                      <dt>Usuario</dt>
                      <dd>{payment.recordedBy?.displayName ?? "Sistema / histórico"}</dd>
                    </div>
                    {payment.reference && (
                      <div>
                        <dt>Referencia</dt>
                        <dd>{payment.reference}</dd>
                      </div>
                    )}
                    {payment.note && (
                      <div>
                        <dt>Nota</dt>
                        <dd>{payment.note}</dd>
                      </div>
                    )}
                  </dl>
                </li>
              ))}
            </ul>
          )}
        </div>

        {canRegisterPayment(repair) && (
          <div className={styles.sectionActions}>
            <button
              className={styles.primaryButton}
              type="button"
              onClick={() => {
                setActionError("");
                setPaymentAmount("");setPaymentReference("");setPaymentNote("");setPaymentMethod("CASH");
                setShowPaymentForm(true);
              }}
              disabled={actionLoading !== ""}
            >
              {actionLoading === "payment" ? "Registrando..." : "Registrar pago"}
            </button>
          </div>
        )}
      </section>

      {repair.status === "READY_FOR_PICKUP" && (
        <section className={styles.card}>
          <h2>Entrega</h2>
          <p>{repair.billing.hasOutstandingBalance
            ? "Podés entregar la máquina y registrar un pago ahora, o cobrar el saldo más adelante."
            : "La máquina está lista para retirar."}</p>
          <button className={styles.primaryButton} disabled={actionLoading !== ""} type="button"
            onClick={() => {setActionError("");setPaymentAmount("0");setPaymentMethod("CASH");setPaymentReference("");setPaymentNote("");setShowHandoverForm(true);}}>
            Entregar máquina
          </button>
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
                    {change.fromStatus ? getRepairStatusLabel(change.fromStatus) : "Inicio"}
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
                  {actionLoading === "quote" ? "Guardando..." : "Guardar y enviar presupuesto"}
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
                <h2 id="decision-title">{decision === "APPROVED" ? "Aceptar presupuesto" : "Rechazar presupuesto"}</h2>
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
                Canal
                <select
                  value={decisionChannel}
                  onChange={(event) => setDecisionChannel(event.target.value as keyof typeof DECISION_CHANNELS)}
                >
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
                  {actionLoading === "decision" ? "Guardando..." : decision === "APPROVED" ? "Aceptar presupuesto" : "Rechazar presupuesto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {(showPaymentForm || showHandoverForm) && (
        <div className={styles.overlay}>
          <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="payment-title">
            <div className={styles.modalHeader}>
              <div>
                <h2 id="payment-title">{showHandoverForm ? "Entregar máquina" : "Registrar pago"}</h2>
                {showHandoverForm && !repair.billing.hasOutstandingBalance ? (
                  <p>La máquina está lista para retirar.{repair.resolution === "QUOTE_REJECTED" ? " El diagnóstico no tiene costo." : ""}</p>
                ) : (
                  <p>Saldo actual: {formatCurrency(repair.billing.outstandingBalance ?? "0.00")}. {showHandoverForm ? "Ingresá 0 para entregar sin pago." : "Ingresá el importe y el medio de pago."}</p>
                )}
              </div>
              <button
                className={styles.close}
                type="button"
                onClick={() => {setShowPaymentForm(false);setShowHandoverForm(false);}}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
            {actionError && <div className={styles.formError}>{actionError}</div>}
            <form className={styles.form} onSubmit={showHandoverForm ? handOverMachine : submitPayment}>
              {(!showHandoverForm || repair.billing.hasOutstandingBalance) && (<>
              <label>
                Importe
                <input
                  value={paymentAmount}
                  onChange={(event) => setPaymentAmount(event.target.value)}
                  inputMode="decimal"
                  placeholder="0.00"
                  required
                />
              </label>
              <label>
                Método de pago
                <select
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
                >
                  {PAYMENT_METHOD_OPTIONS.map((method) => (
                    <option key={method} value={method}>{getPaymentMethodLabel(method)}</option>
                  ))}
                </select>
              </label>
              <label>
                Referencia (opcional)
                <input value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} />
              </label>
              <label>
                Nota (opcional)
                <textarea value={paymentNote} onChange={(event) => setPaymentNote(event.target.value)} rows={3} />
              </label>
              </>)}
              <div className={styles.modalActions}>
                <button className={styles.secondaryButton} type="button" onClick={() => {setShowPaymentForm(false);setShowHandoverForm(false);}}>
                  Cancelar
                </button>
                <button className={styles.primaryButton} type="submit" disabled={actionLoading !== ""}>
                  {actionLoading === "payment" || actionLoading === "handover" ? "Registrando..." : showHandoverForm ? "Confirmar entrega" : "Registrar pago"}
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
          <dd>{formatCurrency(String(quote.totalAmount))}</dd>
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
        <dl className={styles.decisionInfo}>
          <div><dt>Decisión</dt><dd>{quote.decisions[0].approved ? "Aprobado" : "Rechazado"}</dd></div>
          <div><dt>Canal</dt><dd>{DECISION_CHANNELS[quote.decisions[0].channel as keyof typeof DECISION_CHANNELS] ?? quote.decisions[0].channel}</dd></div>
          <div><dt>Fecha</dt><dd>{formatDateTime(quote.decisions[0].decidedAt)}</dd></div>
          <div><dt>Registrado por</dt><dd>{quote.decisions[0].recordedBy?.displayName ?? "Sistema / histórico"}</dd></div>
          {quote.decisions[0].note && <div className={styles.decisionNote}><dt>Nota</dt><dd>{quote.decisions[0].note}</dd></div>}
        </dl>
      )}
    </div>
  );
}

const DECISION_CHANNELS = {
  IN_PERSON: "En persona",
  PHONE: "Teléfono",
  WHATSAPP: "WhatsApp",
  EMAIL: "Email",
  CUSTOMER_PORTAL: "Portal del cliente",
} as const;

const PAYMENT_METHOD_OPTIONS = ["CASH", "TRANSFER", "CARD", "OTHER"] as const;

const QUOTE_STATUS_LABELS = {
  DRAFT: "Borrador",
  WAITING_APPROVAL: "Esperando aprobación",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
  SUPERSEDED: "Reemplazado",
} as const;