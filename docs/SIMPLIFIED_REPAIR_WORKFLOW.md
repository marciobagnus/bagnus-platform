# Flujo de reparaciones: implementación oficial

Decisión del 28/09/2026, rama `feat/simplify-repair-workflow`. Reemplaza las recomendaciones anteriores de conservar ocho estados, cobrar diagnóstico o exigir saldo cero al entregar. No utiliza la rama congelada de presupuestos.

## Alcance

- Estados: RECEIVED → WAITING_APPROVAL → IN_REPAIR → READY_FOR_PICKUP → DELIVERED. El rechazo pasa de WAITING_APPROVAL a READY_FOR_PICKUP.
- Resolución persistida: REPAIRED al finalizar; QUOTE_REJECTED al rechazar; nula antes del resultado. Entregar la conserva.
- Diagnóstico gratuito, sin cargo ni WAIVED ficticio. Presupuesto creado/enviado atómicamente; sin edición avanzada.
- Entrega con pago opcional, cero sin Payment, pago positivo y entrega en una transacción. Saldo permitido después de entrega; pagos posteriores no alteran estado, resolución o deliveredAt.
- Cuenta calculada, pagos positivos hasta el saldo, control concurrente. Una orden abierta por machineId; deudas previas no impiden reingreso.
- Consulta completa de saldos y WhatsApp manual por resolución/deuda.

## Estrategia simplificada

Todos los datos existentes son de desarrollo/prueba según autorización explícita. Se conserva el historial de migraciones técnicas y se agrega una nueva migración; no se construye una herramienta de backfill ni un régimen económico heredado. La migración debe indicar sus precondiciones y fallar ante datos incompatibles en lugar de descartarlos silenciosamente. Cualquier recreación de datos se permite solamente en una base local/efímera verificada. Aplicarla en bases compartidas, piloto o producción sigue requiriendo autorización explícita.

Bloques previstos: documentación; política financiera; esquema compatible; grafo/presupuestos/resolución; pagos/entrega atómica; consulta de saldos; UI/WhatsApp; integración/limpieza. Las pruebas acompañan cada bloque. Los commits intermedios no constituyen versiones autorizadas para publicación.

Los documentos de análisis/propuesta se revisaron en esta conversación, pero no están en el checkout al comenzar la implementación. Este registro refleja el requerimiento definitivo y conserva esa limitación sin recuperar archivos de otra rama.

Fuera de alcance: irreparable/desistimiento, reapertura, retrocesos, cuotas/intereses, reintegros, infraestructura de eventos y cambios generales de autenticación. No merge, push ni deploy.
