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

Todos los datos existentes son de desarrollo/prueba según autorización explícita. Se conserva el historial de migraciones técnicas y se agregan dos migraciones; no se construye una herramienta de backfill ni un régimen económico heredado. La contracción aplica un mapeo directo sobre fixtures anteriores y conserva el historial sin reescribirlo. No intenta reconstruir presupuestos faltantes ni obligaciones históricas de diagnóstico: los fixtures inconsistentes deben recrearse en un entorno descartable antes de utilizarlos. Cualquier recreación de datos se permite solamente en una base local/efímera verificada. Aplicarla en bases compartidas, piloto o producción sigue requiriendo autorización explícita.

Bloques previstos: documentación; política financiera; esquema compatible; grafo/presupuestos/resolución; pagos/entrega atómica; consulta de saldos; UI/WhatsApp; integración/limpieza. Las pruebas acompañan cada bloque. Los commits intermedios no constituyen versiones autorizadas para publicación.

Los documentos de análisis/propuesta se revisaron en esta conversación, pero no están en el checkout al comenzar la implementación. Este registro refleja el requerimiento definitivo y conserva esa limitación sin recuperar archivos de otra rama.

Fuera de alcance: irreparable/desistimiento, reapertura, retrocesos, cuotas/intereses, reintegros, infraestructura de eventos y cambios generales de autenticación. No merge, push ni deploy.


## Implementación y decisiones técnicas

- `RepairStatus` contiene exactamente cinco valores. `RepairHistoryStatus` conserva los ocho anteriores exclusivamente para leer auditoría; las operaciones nuevas no generan esos estados retirados.
- `RepairResolution` y `deliveredAt` se persisten en la orden. La cuenta se calcula en `repair-account.ts`, reutilizando centavos enteros (`bigint`); detalle, consulta de cuenta y cobros utilizan esa política. `UNDETERMINED` distingue importe desconocido de deuda cero.
- La consulta de saldos usa agregación SQL equivalente a la cuenta, con prueba de concordancia. Filtra por saldo **antes** de paginar, 50 filas por página, ordenadas por recepción/ID; incluye entregadas. No depende del listado de 100 órdenes.
- Presupuesto principal de un solo paso. El caso de uso conserva `draft: true` y el endpoint de envío admite borradores existentes; no se agregó una segunda acción de borrador a la UI ni edición/versionado avanzado.
- Decisiones, entrega y pagos bloquean primero la misma fila de orden. Crear/enviar utiliza actualización condicional en esa fila. Toda operación que cambia estado guarda historial dentro de su transacción.
- El pago cero al retirar se interpreta como ausencia de pago. Un importe negativo, inválido o superior al saldo se rechaza; cualquier fallo revierte pago y entrega juntos. Pago posterior no actualiza siquiera la fila de la orden.
- `DiagnosisCharge` queda como estructura histórica sin nuevas escrituras ni participación financiera. La ruta anterior responde 410 tras autenticar; el cambio genérico de estado responde 409. Sin sesión ambas responden 401.
- UI: aceptar/rechazar directamente, resultado visible en detalle/listados, entrega con pago opcional, cobros posteriores, consulta de saldos y mensajes WhatsApp manuales de rechazo gratuito y deuda tras entrega. Abrir un enlace no guarda un evento ni afirma que se envió el mensaje.
- Se mantuvieron arquitectura, dependencias y autenticación. Se retiraron casos de uso y pruebas que exigían cobro/bonificación de diagnóstico o prohibían entrega con deuda, porque esas reglas fueron reemplazadas explícitamente. Se sustituyeron por pruebas del nuevo contrato, concurrencia y reversión.

## Migraciones

1. `20260928090000_add_repair_resolution`: crea RepairResolution, campos resolution/deliveredAt y atribución directa de QuoteDecision con relación e índice.
2. `20260928100000_contract_repair_workflow`: conserva el enum anterior como RepairHistoryStatus, crea RepairStatus de cinco valores y convierte órdenes; reconstruye el índice parcial de una orden abierta por máquina. Todo el cambio de contracción está dentro de una transacción.

Mapeo de datos de prueba: DIAGNOSING → RECEIVED; AWAITING_PICKUP_UNREPAIRED → READY_FOR_PICKUP + QUOTE_REJECTED; CANCELLED → DELIVERED + QUOTE_REJECTED; READY_FOR_PICKUP/DELIVERED anteriores → REPAIRED cuando no tenían resolución. Para cierres anteriores, deliveredAt se obtiene del último evento de cierre disponible o de updatedAt. Es una aproximación para fixtures, no una reconstrucción comercial certificada.

No se eliminaron/reformularon migraciones anteriores, pagos ni historial. Los cargos anteriores quedan inactivos: el modelo nuevo no conserva deuda de diagnóstico. No existe herramienta de backfill ni proceso automático de reseteo.

## Verificación realizada

Entorno: PostgreSQL 18 **nuevo y efímero**, en loopback `127.0.0.1:55439`, base `bagnus_workflow_test`. Se verificó servidor/puerto/base antes de aplicar cambios. No se usó bagnus_dev, bagnus_e2e ni bagnus_pilot. No se leyeron secretos de `.env`; DATABASE_URL de prueba se proporcionó explícitamente a procesos de aplicación y tests. Prisma recibió además un DOTENV_CONFIG_PATH vacío/inexistente.

- `prisma validate`, `prisma generate`, `prisma migrate deploy`: correctos, 16 migraciones aplicadas en la base descartable.
- `next typegen`, `tsc --noEmit --incremental false`, `npm run lint -- --max-warnings 0`: correctos.
- `npm run build`: compilación de producción correcta, sin ejecutar migraciones como efecto del build.
- Suite conjunta: **120 pruebas aprobadas, 0 fallos y 0 omitidas** (85 unitarias + 35 integraciones), con `node --import tsx --test tests/*/*.test.mjs tests/*/*.integration.test.ts`.
- Cobertura nueva: grafo completo sin autortransiciones; creación/envío y decisión atómicos; atribución y reversión; finalizar con presupuesto consistente; retiro con 0/parcial/total; concurrencia entre cobro/entrega y doble entrega; pagos posteriores sin alterar entrega; reingreso con deuda y unicidad; saldos más allá de 100 órdenes; rechazo gratis; autenticación y ambos roles por HTTP; mensajes manuales.
- La prueba de migración aplica los SQL versionados en un esquema aislado, carga fixtures de los ocho estados y comprueba conversión, conservación de historial y el índice de unicidad. Solo reubica en memoria un calificador `public` explícito de una migración antigua hacia el esquema de prueba; no modifica archivos versionados.
- Se encontraron y corrigieron errores durante el trabajo, incluido un archivo de ruta con codificación no UTF-8 detectado por las pruebas HTTP. La suite completa final los vuelve a cubrir.
- **Pendiente de verificación manual:** revisión visual/interactiva en navegador, escritorio y móvil. El navegador de la sesión no estaba disponible (sin instancias conectadas). Las páginas sí respondieron por HTTP autenticado y compilaron; esto no sustituye la prueba visual de formularios.

## Antes de merge/publicación

1. Revisar el diff y probar manualmente recepción → presupuesto → aceptación/rechazo → retiro con deuda → pago posterior; verificar textos, formularios, enlaces manuales y saldos en ambos roles.
2. Identificar explícitamente la base destino y obtener autorización si es compartida/piloto. Estas pruebas no autorizan migrarla. Confirmar que continúa siendo descartable o definir otro tratamiento antes de usar este mapeo de fixtures con información real.
3. Coordinar una ventana sin escritores antiguos para la contracción del enum. La primera migración es aditiva; la segunda es incompatible con la versión anterior. Aplicar migraciones revisadas y arrancar la aplicación nueva con Prisma generado; no permitir versiones mezcladas.
4. En el entorno autorizado, ejecutar `prisma migrate deploy` explícitamente y verificar el estado de migraciones. Nunca agregarlo al build. No arrancar la versión nueva antes del schema correspondiente.
5. Si falla la preparación, mantener el servicio fuera de escritura y resolver la migración. No hacer rollback automático del binario antiguo contra el enum reducido, ni resets de bases compartidas.

No se hizo push, merge, deploy ni cambios en Vercel/Neon. No se utilizó la rama congelada. No quedan decisiones de negocio bloqueantes para este MVP; irreparable, cancelaciones especiales, retrocesos, reaperturas y devoluciones siguen fuera del alcance aprobado.


## Commits de implementación

| Commit | Alcance |
| --- | --- |
| `809b987` | Alcance funcional aprobado |
| `a29f90a` | Política financiera compartida |
| `99b4f2c` | Resolución, entrega y actor de decisión en schema |
| `4cd04aa` | Presupuesto atómico y resolución del trabajo |
| `0a107a6` | Entrega con pago opcional y cobros posteriores |
| `06b6d54` | Consulta y pantalla paginada de saldos |
| `79b3d9d` | Cinco estados en schema/UI, WhatsApp y retiro del diagnóstico cobrado |
| `c1d35ee` | Pruebas completas de API, concurrencia, migración y limpieza final |

El commit documental que contiene este registro actualiza también README, contexto e instrucciones del repositorio, y conserva el bloque de instrucciones generado por Next.js al iniciar desarrollo.

## Ajustes posteriores a la validación manual — 28/09/2026

El usuario confirmó que los tres recorridos principales funcionan. Se corrigieron los hallazgos de esa revisión sin cambiar reglas de negocio ni schema:

- Los nuevos ingresos, por máquina existente o alta coordinada, guardan el usuario autenticado en el primer evento. Se ignora cualquier actor suministrado por el cliente HTTP. Los eventos históricos sin autor se conservan.
- La entrega sin deuda muestra contenido contextual y confirmación sin campos de cobro; el rechazo recuerda que el diagnóstico es gratuito.
- El presupuesto aparece una sola vez, en «Presupuesto vigente». Las acciones conservan WhatsApp y aceptación/rechazo. La decisión muestra canal, fecha, usuario y nota separados; se retiró el texto redundante de acciones.
- Inicio muestra cantidad e importe de saldos pendientes con enlace al listado. El resumen y la consulta paginada comparten la misma definición SQL; las entregadas con deuda no cuentan como trabajos activos.
- Hidratación: el código inicia `loading = true` sin consultar valores del navegador. Tres respuestas HTTP autenticadas sin caché incluyeron `disabled=""` en «Actualizar listado». Se agregó una aserción de SSR a la integración HTTP. El usuario confirmó que no aparece el aviso al recargar en una ventana privada sin extensiones. No se identificó la causa exacta del perfil habitual; extensión, caché u otro estado son hipótesis, no diagnósticos confirmados. No se modificó el renderizado ni se ocultó el warning.

Verificaciones de esta revisión: base efímera `bagnus_manual_workflow_20260928` en `127.0.0.1:55439`, identificada mediante consulta al servidor. Suite completa con `--test-concurrency=1`: **123 aprobadas, 0 fallos, 0 omitidas**. Incluye atribución en ambos ingresos, resumen sobre más de 100 órdenes, exclusión de cuentas gratuitas/desconocidas/saldadas, actualización por pagos y ambos recorridos por API para ADMIN y STAFF. Next typegen, TypeScript, lint con cero advertencias y build correctos. No fue necesario ejecutar Prisma validate/generate porque no cambió el schema.

Limitación: el navegador automatizable sigue sin instancias disponibles. Las comprobaciones HTTP y las pruebas de integración no sustituyen la revisión visual de los últimos ajustes en escritorio. La aplicación permanece disponible en `http://127.0.0.1:3000`; no se hizo push, merge ni deploy.
