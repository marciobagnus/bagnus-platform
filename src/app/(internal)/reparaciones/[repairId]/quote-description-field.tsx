"use client";

import styles from "./repair-detail.module.css";

const generalRepairDescription = "Limpieza y lubricación general, pulido de crochet y chapa aguja, desarme y acondicionamiento del mecanismo de corta hilos, regulación de cuchillas, mano de obra y puesta a punto.";

export function QuoteDescriptionField({ value, onChange }: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <>
      <div>
        <button className={styles.secondaryButton} type="button" onClick={() => onChange(generalRepairDescription)}>
          Reparación general
        </button>
        <p className={styles.actionMessage}>Completa la descripción con un texto estándar que podés editar.</p>
      </div>
      <label>
        Descripción
        <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={4} required />
      </label>
    </>
  );
}
