# Bagnus Platform: contexto del proyecto

Actualización del flujo: 28/09/2026, rama `feat/simplify-repair-workflow`. La descripción de reparaciones refleja el modelo nuevo; las observaciones de infraestructura provienen de la revisión local del 24/09/2026 y no verifican el piloto.

La implementación y sus pruebas se detallan en [SIMPLIFIED_REPAIR_WORKFLOW.md](SIMPLIFIED_REPAIR_WORKFLOW.md). Se usó exclusivamente una base PostgreSQL local efímera. No se consultaron secretos ni se modificó infraestructura remota.

## Propósito y alcance del MVP

Sistema interno para gestionar el taller de reparación de máquinas de coser Máquinas Bagnus: clientes, máquinas, ingresos y reparaciones, presupuestos y decisiones del cliente, diagnóstico gratuito, pagos parciales y entrega con deuda. Incluye dashboard, historial operativo, usuarios ADMIN/STAFF y enlaces de WhatsApp con mensajes preparados; el envío es manual.

La interfaz implementada es para personal del taller. No hay portal público de clientes, aunque `CUSTOMER_PORTAL` existe como valor de canal de decisión.

## Arquitectura y stack verificados

- Monolito modular: una aplicación Next.js con interfaz y API en `src/app`, seis módulos en `src/modules` y persistencia PostgreSQL.
- Versiones resueltas en `package-lock.json`: Next.js **16.3.5**, React **19.2.8**, Prisma y adaptador PostgreSQL **7.9.1**, TypeScript **5.9.3**, tsx **4.23.15**. TypeScript estricto; alias `@/*` hacia `src/*`.
- App Router y Route Handlers `route.ts`. Layout interno en servidor; pantallas operativas mayormente componentes cliente que consumen la API con `fetch`. CSS Modules, estilos globales y recursos de marca; sin biblioteca adicional de UI. Fuentes Inter y Manrope mediante `next/font/google`.
- `next.config.ts` no agrega opciones. `src/lib/prisma.ts` construye Prisma con `@prisma/adapter-pg`, usa `DATABASE_URL` y reutiliza el cliente global fuera de producción. `prisma.config.ts` carga dotenv y define esquema y directorio de migraciones.
- Cliente Prisma generado en `src/generated/prisma`, excluido de Git. UUID para identificadores; importes ARS en PostgreSQL `Decimal(12,2)`, representados como strings en el dominio y calculados en centavos con `bigint`.

Las capas habituales son `domain` (entidades y reglas sin Next.js/Prisma), `application` (casos de uso y contratos de repositorios) e `infrastructure` (adaptadores Prisma). Los handlers validan entradas, obtienen la sesión, instancian repositorios y traducen resultados a HTTP. La separación es pragmática: algunas lecturas de clientes acceden directamente a Prisma desde el handler, y varias reglas transaccionales viven en los repositorios.

## Módulos y persistencia

Los nombres de repositorio siguientes omiten el prefijo `Prisma` de sus implementaciones en `infrastructure`.

| Módulo | Casos de uso principales | Repositorios |
| --- | --- | --- |
| `customers` | `registerCustomer`, `updateCustomer`, `searchCustomers` | `CustomerRepository`, `CustomerSearchRepository` |
| `machines` | `registerMachine`, `listCustomerMachines`, `registerMachineIntake` | `MachineRepository`, `MachineListRepository`, `MachineIntakeRepository` |
| `repairs` | `registerRepairOrder`, `getRepairOrder`, `getRepairDashboard`, `processRepairAction`, `getOutstandingRepairs` | `RepairOrderRepository`, `RepairOrderQueryRepository`, `RepairDashboardQueryRepository`, `RepairStatusRepository`, `OutstandingRepairsRepository` |
| `quotes` | `createInitialRepairQuote`, `submitRepairQuote`, `decideRepairQuote` | `RepairQuoteRepository`, `QuoteSubmissionRepository`, `QuoteDecisionRepository` |
| `payments` | `registerPayment`, `getRepairBalance` | `PaymentRepository`, `RepairBalanceRepository` |
| `users` | Alta interna, login con límite de intentos, sesión actual, logout, alta STAFF y reset por ADMIN | `InternalAuthRepository`; su implementación también cubre intentos y administración |

Relación central: `Customer → Machine → RepairOrder`. Cada orden tiene historial de estados, presupuestos con decisiones, pagos, resolución separada y fecha de entrega. DiagnosisCharge queda como estructura histórica inactiva. Usuarios y sesiones se relacionan con auditorías y atribución operativa.

Las 16 migraciones incorporan esas entidades, simplifican los roles a ADMIN/STAFF y agregan sesiones, atribución de operaciones, auditorías de alta/reset y límites de login. Dos restricciones importantes están en SQL como índices únicos parciales: una reparación abierta por máquina y un presupuesto vigente por reparación (`DRAFT`, `WAITING_APPROVAL` o `APPROVED`). No basta con reconstruir únicamente lo expresado en `schema.prisma`. No se comprobó cuáles están aplicadas en el piloto.

## Circuito y reglas de negocio

1. **Cliente:** alta, búsqueda y edición. Nombre, apellido y teléfono obligatorios en el dominio; DNI opcional. DNI y teléfono únicos en la base. Se normalizan DNI, email y ciertos formatos de celular argentino. Búsqueda de 2–100 caracteres, con hasta 20 resultados.
2. **Máquina e ingreso:** pertenece a un cliente; marca y tipo obligatorios. Puede registrarse sola o junto con una nueva orden e historial en una transacción. Cada reingreso reutiliza la máquina y crea otra orden. No puede haber dos órdenes abiertas para la misma máquina.
3. **Recepción:** la orden nace en `RECEIVED`, con problema y accesorios. El diagnóstico es gratuito, sin transición específica ni cargo/bonificación.
4. **Presupuesto:** guardar y enviar crea el presupuesto versión 1 en `WAITING_APPROVAL` y mueve la orden al mismo estado con historial, todo atómicamente. El caso de uso conserva borradores opcionales y envío posterior; la UI principal no requiere ese paso intermedio.
5. **Aprobación:** registra decisión, canal, nota, fecha y actor; pasa a `IN_REPAIR`, resolución nula. Finalizar exige presupuesto aprobado consistente y pasa a `READY_FOR_PICKUP` con `REPAIRED`.
6. **Rechazo:** pasa a `READY_FOR_PICKUP` con `QUOTE_REJECTED` y total cero. No crea cargos ni registros WAIVED.
7. **Pagos y entrega:** cuenta calculada desde presupuesto y pagos. Entrega permitida con deuda para ambos roles. El pago opcional positivo se registra en la misma transacción que la entrega; cero no crea Payment. La entrega fija `deliveredAt` y conserva resolución. Pagos posteriores no modifican esos datos ni generan historial de estados. Bloqueo de fila evita sobrepagos concurrentes.
8. **Reingreso y saldos:** solo `DELIVERED` cierra la orden; una deuda anterior no impide una nueva orden de la misma máquina. La consulta paginada de saldos filtra en PostgreSQL antes de paginar, incluyendo órdenes entregadas y antiguas.

Los cinco estados operativos son `RECEIVED`, `WAITING_APPROVAL`, `IN_REPAIR`, `READY_FOR_PICKUP`, `DELIVERED`. Los nombres anteriores permanecen solo en `RepairHistoryStatus` para leer auditoría. No hay reaperturas ni transiciones hacia el mismo estado.

Fuentes principales: `src/modules/repairs/domain/change-repair-status.ts`, casos de uso de `quotes`, repositorios de `payments` y `prisma-repair-status-repository.ts`.

## Interfaz y endpoints

`/` redirige a `/dashboard`. `/login` inicia sesión. El grupo `(internal)` comparte navegación y control de sesión: `/dashboard` (contadores y 10 trabajos activos recientes), `/clientes` (búsqueda/alta), `/clientes/[customerId]` (edición, máquinas e ingresos), `/reparaciones` (listado y filtros locales), `/reparaciones/[repairId]` (acciones, presupuesto, cuenta e historial), `/reparaciones/saldos` (deudas paginadas) y `/usuarios` (solo ADMIN).

API implementada bajo `src/app/api`; requiere sesión salvo login y logout, que tolera ausencia de sesión:

| Endpoint | Métodos y función |
| --- | --- |
| `/api/auth/login`, `/api/auth/logout`, `/api/auth/me` | POST login; POST logout; GET usuario actual |
| `/api/dashboard` | GET métricas y actividad |
| `/api/customers` | GET `?search=...`; POST alta |
| `/api/customers/[customerId]` | GET ficha; PATCH edición |
| `/api/customers/[customerId]/machines` | GET máquinas y reparación abierta |
| `/api/machines`, `/api/machines/intake` | POST máquina; POST máquina con ingreso |
| `/api/repairs` | GET últimas 100 órdenes; POST nuevo ingreso de máquina existente |
| `/api/repairs/[repairId]` | GET detalle, cuenta, pagos, diagnóstico e historial |
| `/api/repairs/[repairId]/status` | PATCH retirado: 409 autenticado |
| `/api/repairs/[repairId]/quotes` | POST crear y enviar presupuesto atómicamente |
| `/api/quotes/[quoteId]/submit`, `/api/quotes/[quoteId]/decision` | POST informar; POST registrar decisión |
| `/api/repairs/[repairId]/diagnosis`, `/api/repairs/[repairId]/payments` | POST diagnóstico retirado: 410; POST pago incluso después de entrega |
| `/api/repairs/[repairId]/actions` | POST finalizar o entregar con pago opcional atómico |
| `/api/repairs/outstanding` | GET saldos pendientes, `page` desde 1, 50 por página |
| `/api/users`, `/api/users/password-reset` | GET listado y POST alta STAFF; POST reset; solo ADMIN |

No se encontraron restricciones generales de API basadas en modo desarrollo, aunque las instrucciones de Copilot mencionan conservarlas si existen.

## Autenticación, autorización y auditoría

- Autenticación propia con usuarios activos en PostgreSQL. Contraseñas de 6–128 caracteres, hash `scrypt` con salt aleatorio y comparación de tiempo constante.
- Sesiones de 12 horas. Token aleatorio de 32 bytes; solo su hash SHA-256 se persiste. Cookie `bagnus_session`: HttpOnly, SameSite Strict, ruta `/`, Secure en producción. Cada consulta comprueba vencimiento y usuario activo; logout elimina la sesión y vence la cookie.
- ADMIN y STAFF operan el taller. Solo ADMIN accede a administración de usuarios, crea STAFF desde la UI/API y restablece contraseñas. El reset web invalida todas las sesiones del destinatario y guarda auditoría en la misma transacción.
- Login: cinco fallos dentro de 15 minutos bloquean durante 15 minutos la combinación de usuario normalizado y origen/IP. Contadores persistidos con clave hash y actualización transaccional; éxito limpia el contador. Respuestas genéricas para credenciales inválidas y HTTP 429 con `Retry-After` al bloquear. En Vercel toma `x-vercel-forwarded-for`; fuera de Vercel, `x-forwarded-for`, con valores de respaldo si no hay IP válida.
- Pagos, decisiones de presupuesto y cambios posteriores de estado reciben el ID del usuario autenticado. Alta STAFF y reset web tienen tablas específicas de auditoría. Las relaciones de atribución operativa son opcionales; los nuevos ingresos guardan el usuario autenticado en ambos caminos (máquina existente o alta coordinada), sin modificar históricos sin autor. `QuoteDecision` guarda canal/fecha/nota y recordedByUserId; también se atribuye el cambio asociado en el historial.

Fuentes: `src/modules/users`, `src/lib/current-internal-user.ts`, layout interno, handlers y `prisma/schema.prisma`.

## Entornos y publicación

**Verificado en el repositorio:** desarrollo local con Node/npm y Next.js; Node 24 en CI (local inspeccionado: Node 24.19.0, npm 11.17.0). `.github/workflows/ci.yml` se ejecuta para PR hacia `main` y push a `main`: instala con `npm ci`, valida/genera Prisma, aplica migraciones a un PostgreSQL 18 efímero de CI, genera tipos Next, verifica TypeScript/ESLint, ejecuta unitarios, compila, levanta `next dev` y ejecuta integración.

Ese workflow verifica calidad; no contiene un paso de publicación. No hay `vercel.json` ni configuración de infraestructura Neon versionada. El README incluye la indicación genérica de desplegar en Vercel. `package.json` no define `postinstall` ni incorpora generación Prisma o migraciones al script `build`; CI las hace explícitamente. `.env*` y `.vercel` están excluidos de Git.

**Declarado en el `AGENTS.md` local actualizado, sin verificar externamente:** bases separadas `bagnus_dev` (desarrollo), `bagnus_e2e` (E2E experimental) y `bagnus_pilot` (Neon); ramas de trabajo y PR; `main` conectado a Vercel Production, con publicación potencial al hacer merge y Preview omitido. Indica no conectar desarrollo/Preview al piloto ni ejecutar migraciones como efecto del build. No se inspeccionaron proyectos remotos, variables, dominios, logs, backups ni estado de migraciones: se documenta el flujo declarado, no su funcionamiento efectivo.

## Comandos reales de desarrollo y verificación

Comandos identificados en `package.json`, CI e instrucciones de Copilot; su presencia no implica que se hayan ejecutado en esta revisión.

| Objetivo | Comando |
| --- | --- |
| Instalar dependencias bloqueadas | `npm ci` |
| Desarrollo | `npm run dev` |
| Compilar / servir compilación | `npm run build` / `npm start` |
| Validar esquema / generar cliente | `npx prisma validate` / `npx prisma generate` |
| Generar tipos de rutas | `npx next typegen` |
| TypeScript sin salida ni caché incremental | `npx tsc --noEmit --incremental false` (CI usa `npx tsc --noEmit`) |
| ESLint | `npm run lint -- --max-warnings 0` |
| Unitarios sin base | `node --import tsx --test tests/*/*.test.mjs` |
| Integración local según instrucciones | `node --import tsx --test --test-concurrency=1 tests/*/*.integration.test.ts` |
| Integración en CI, con entorno ya definido | `node --import tsx --test tests/*/*.integration.test.ts` |

Las pruebas de integración crean y eliminan registros: requieren una base de pruebas preparada y, para las de API, el servidor local en puerto 3000. Algunas permiten `BASE_URL`, otras fijan `127.0.0.1:3000`. CI usa `npx prisma migrate deploy` contra su servicio efímero; ese comando modifica la base y solo se ejecutó sobre una base efímera local verificada. `npm test` solo invoca `node --test`: no equivale al comando explícito de unitarios ni configura por sí mismo la integración.

Existen scripts `scripts/create-internal-user.ts` y `scripts/reset-internal-user-password.ts`, ejecutables con Node y tsx. Consumen variables `BAGNUS_USER_*` y acceso a la base; no se ejecutaron ni se inspeccionaron sus valores.

**Verificación de la implementación:** consultar resultados y limitación de revisión visual en [SIMPLIFIED_REPAIR_WORKFLOW.md](SIMPLIFIED_REPAIR_WORKFLOW.md).

## Limitaciones y diferencias comprobables

- **Presupuestos:** el esquema admite versiones y `SUPERSEDED`, pero los casos de uso solo crean el presupuesto inicial y rechazan otro presupuesto para la misma orden; no hay flujo de revisión/reemplazo implementado.
- **Auditoría parcial:** ingreso inicial sin actor; los scripts de alta/reset no crean las auditorías del flujo web. El reset por script actualiza contraseña e invalida sesiones en operaciones separadas. No hay flujo de anulación/reversión de pagos expuesto por la API.
- **Escala del listado:** reparaciones muestra solo las últimas 100 órdenes y filtra en cliente; clientes limita búsqueda a 20 resultados. No hay paginación para continuar esos listados; la nueva consulta de saldos sí es independiente y paginada.
- **Acceso de clientes y mensajería:** el valor `CUSTOMER_PORTAL` no implica un portal implementado; WhatsApp usa enlaces `wa.me`, sin envío automático ni confirmación de recepción.
- **Operación del piloto:** `AGENTS.md` ahora describe el flujo de ramas y publicación, pero no se encontró una configuración reproducible ni un procedimiento detallado de preparación Prisma y aplicación de migraciones en Vercel/Neon. No implica una falla comprobada del despliegue.

Referencias de trabajo: [AGENTS.md](../AGENTS.md), [instrucciones de Copilot](../.github/copilot-instructions.md), [package.json](../package.json), [CI](../.github/workflows/ci.yml), [esquema](../prisma/schema.prisma) y [migraciones](../prisma/migrations).
