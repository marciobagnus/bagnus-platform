"use client";

import { buildWhatsAppLink } from "../../../../lib/whatsapp";
import styles from "./repair-detail.module.css";

export function QuoteWhatsAppEditor({ phone, message, onChange, onCancel }: {
  phone: string;
  message: string;
  onChange: (message: string) => void;
  onCancel: () => void;
}) {
  const link = buildWhatsAppLink(phone, message);

  return (
    <section className={styles.form} aria-label="Presupuesto por WhatsApp">
      <label>
        Mensaje del presupuesto
        <textarea value={message} onChange={(event) => onChange(event.target.value)} rows={8} />
      </label>
      <div className={styles.modalActions}>
        <button className={styles.secondaryButton} type="button" onClick={onCancel}>Cancelar</button>
        {link && <a className={styles.whatsappButton} href={link} target="_blank" rel="noreferrer">Abrir WhatsApp</a>}
      </div>
    </section>
  );
}
