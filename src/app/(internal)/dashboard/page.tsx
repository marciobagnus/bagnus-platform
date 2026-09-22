import styles from "./dashboard.module.css";

export default function DashboardPage() {
  return (
    <section>
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
          <strong>—</strong>
        </article>

        <article>
          <span>Pendientes de aprobación</span>
          <strong>—</strong>
        </article>

        <article>
          <span>Listas para entregar</span>
          <strong>—</strong>
        </article>

        <article>
          <span>Con saldo pendiente</span>
          <strong>—</strong>
        </article>
      </div>

      <section className={styles.empty}>
        <h2>Actividad del taller</h2>

        <p>
          En la próxima etapa conectamos estos
          indicadores con los datos reales.
        </p>
      </section>
    </section>
  );
}