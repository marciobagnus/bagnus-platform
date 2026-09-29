"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { OutstandingRepair } from "../../../../modules/repairs/application/outstanding-repairs";
import { getRepairStatusLabel } from "../repair-status";
import styles from "../reparaciones.module.css";
const money = (value: string) => new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS"}).format(Number(value));
export default function OutstandingRepairsPage() {
  const [page,setPage] = useState(1);
  const [data,setData] = useState<{items:OutstandingRepair[];hasMore:boolean} | null>(null);
  const [error,setError] = useState("");
  const [retry,setRetry] = useState(0);
  useEffect(()=>{
    const controller = new AbortController();
    fetch(`/api/repairs/outstanding?page=${page}`,{signal:controller.signal})
      .then(async response=>{ const body = await response.json(); if (!response.ok) throw new Error(body.error); return body; })
      .then(body=>{setData(body);setError("");})
      .catch(error=>{if (!controller.signal.aborted) setError(error.message || "No se pudieron consultar los saldos.");});
    return ()=>controller.abort();
  },[page,retry]);
  return <section className={styles.page}>
    <Link href="/reparaciones">← Reparaciones</Link>
    <header className={styles.header}><div><h1>Saldos pendientes</h1><p>Órdenes con deuda, incluidas las máquinas entregadas. Las más antiguas aparecen primero.</p></div></header>
    {error ? <div role="alert" className={styles.error}>{error} <button onClick={()=>setRetry(retry+1)}>Reintentar</button></div> : !data ? <p>Cargando saldos...</p> : <>
      {data.items.length === 0 ? <p>No hay saldos pendientes en esta página.</p> : <div style={{overflowX:"auto"}}><table className={styles.table}>
        <thead><tr>{["Cliente","Máquina / reparación","Estado","Resultado","Total","Pagado","Saldo","Entrega"].map(title=><th key={title}>{title}</th>)}</tr></thead>
        <tbody>{data.items.map(item=><tr key={item.id}>
          <td><Link href={`/clientes/${item.customerId}`}>{item.customerName}</Link></td>
          <td><Link href={`/reparaciones/${item.id}`}>{item.machine} · {item.id.slice(0,8)}</Link></td>
          <td>{getRepairStatusLabel(item.status)}</td><td>{item.resolution === "REPAIRED" ? "Reparada" : "En curso"}</td>
          <td>{money(item.total)}</td><td>{money(item.paid)}</td><td>{money(item.balance)}</td>
          <td>{item.deliveredAt ? new Date(item.deliveredAt).toLocaleDateString("es-AR") : "Pendiente"}</td>
        </tr>)}</tbody>
      </table></div>}
      <nav aria-label="Páginas de saldos"><button disabled={page===1} onClick={()=>{setData(null);setPage(page-1);}}>Anterior</button> Página {page} <button disabled={!data.hasMore} onClick={()=>{setData(null);setPage(page+1);}}>Siguiente</button></nav>
    </>}
  </section>;
}
