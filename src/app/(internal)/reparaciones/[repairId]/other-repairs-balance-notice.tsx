import Link from "next/link";
import type { OutstandingRepairsSummary } from "../../../../modules/repairs/application/outstanding-repairs";
import styles from "./repair-detail.module.css";

export function OtherRepairsBalanceNotice({ summary }: { summary: OutstandingRepairsSummary }) {
  if (Number(summary.totalBalance) <= 0) return null;

  const amount = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(Number(summary.totalBalance));
  return (
    <aside className={styles.otherRepairsNotice} aria-label="Saldo de otras reparaciones">
      <p>Este cliente tiene {amount} pendientes en {summary.orderCount === 1
        ? "otra reparación" : `${summary.orderCount} otras reparaciones`}.</p>
      <Link href="/reparaciones/saldos">Ver saldos pendientes</Link>
    </aside>
  );
}
