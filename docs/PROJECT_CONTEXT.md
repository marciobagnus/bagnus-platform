# Bagnus Platform: contexto del proyecto

Revisión: 24/09/2026. Repositorio local: `C:\Users\MARCIO\Documents\Projects\bagnus-platform`; remoto configurado: `marciobagnus/bagnus-platform`. Rama `main`, HEAD `92d7b19`, árbol de trabajo limpio al comenzar.

**Evidencia:** lectura de código, esquema, 14 migraciones, tests y configuración versionada; ejecución de pruebas unitarias. El piloto en Vercel y Neon fue informado por el responsable del proyecto: no se verificó externamente. Durante la revisión apareció una edición ajena en `AGENTS.md`, que se leyó y conservó; sus declaraciones se distinguen abajo de la configuración comprobada. No se leyeron archivos `.env` ni credenciales, ni se accedió a bases de datos. No se ejecutaron migraciones, integración, Playwright, commit, push o merge.

## Propósito y alcance del MVP

Sistema interno para gestionar el taller de reparación de máquinas de coser Máquinas Bagnus: clientes, máquinas, ingresos y reparaciones, presupuestos y decisiones del cliente, cargos de diagnóstico, pagos parciales y entrega. Incluye dashboard, historial operativo, usuarios ADMIN/STAFF y enlaces de WhatsApp con mensajes preparados; el envío es manual.

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
| `repairs` | `registerRepairOrder`, `getRepairOrder`, `getRepairDashboard`, `updateRepairStatus`, `processRepairAction` | `RepairOrderRepository`, `RepairOrderQueryRepository`, `RepairDashboardQueryRepository`, `RepairStatusRepository` |
| `quotes` | `createInitialRepairQuote`, `submitRepairQuote`, `decideRepairQuote` | `RepairQuoteRepository`, `QuoteSubmissionRepository`, `QuoteDecisionRepository` |
| `payments` | `registerDiagnosisDecision`, `registerPayment`, `getRepairBalance` | `DiagnosisChargeRepository`, `PaymentRepository`, `RepairBalanceRepository` |
| `users` | Alta interna, login con límite de intentos, sesión actual, logout, alta STAFF y reset por ADMIN | `InternalAuthRepository`; su implementación también cubre intentos y administración |

Relación central: `Customer → Machine → RepairOrder`. Cada orden tiene historial de estados, presupuestos con decisiones, pagos y un cargo/condonación de diagnóstico opcional. Usuarios y sesiones se relacionan con auditorías y atribución operativa.

Las 14 migraciones incorporan esas entidades, simplifican los roles a ADMIN/STAFF y agregan sesiones, atribución de operaciones, auditorías de alta/reset y límites de login. Dos restricciones importantes están en SQL como índices únicos parciales: una reparación abierta por máquina y un presupuesto vigente por reparación (`DRAFT`, `WAITING_APPROVAL` o `APPROVED`). No basta con reconstruir únicamente lo expresado en `schema.prisma`. No se comprobó cuáles están aplicadas en el piloto.

## Circuito y reglas de negocio

1. **Cliente:** alta, búsqueda y edición. Nombre, apellido y teléfono obligatorios en el dominio; DNI opcional. DNI y teléfono únicos en la base. Se normalizan DNI, email y ciertos formatos de celular argentino. Búsqueda de 2–100 caracteres, con hasta 20 resultados.
2. **Máquina e ingreso:** pertenece a un cliente; marca y tipo obligatorios. Puede registrarse sola o junto con una nueva orden e historial en una transacción. Cada reingreso reutiliza la máquina y crea otra orden. No puede haber dos órdenes abiertas para la misma máquina.
3. **Diagnóstico:** la orden nace en `RECEIVED`, con problema informado y accesorios opcionales. El cambio genérico de estado por API solo permite iniciar `DIAGNOSING`. El diagnóstico se refleja en el flujo, notas y presupuesto; no existe una entidad separada de informe técnico.
4. **Presupuesto:** durante diagnóstico se crea el borrador inicial, versión 1, con descripción e importe positivo de hasta dos decimales. Informarlo cambia presupuesto y orden a `WAITING_APPROVAL`. El personal registra aprobación/rechazo, canal, nota y fecha; una decisión por presupuesto.
5. **Aprobación:** pasa a `IN_REPAIR`; `FINISH_REPAIR` pasa a `READY_FOR_PICKUP`; `HAND_OVER_MACHINE` cierra en `DELIVERED`.
6. **Rechazo:** pasa a `AWAITING_PICKUP_UNREPAIRED`. Antes del retiro se registra una única decisión de diagnóstico: `CHARGED` con importe positivo o `WAIVED` con importe cero. La decisión determina la deuda, pero **no registra un pago**. La entrega sin reparar cierra en `CANCELLED`.
7. **Pagos y entrega:** el total proviene del presupuesto aprobado o del diagnóstico tras el rechazo. Mientras esté pendiente de determinar no se permite cobrar ni entregar. Se admiten pagos parciales positivos por efectivo, transferencia, tarjeta u otro medio, sin superar el saldo. La entrega exige saldo cero, también para ADMIN. Pagos y entrega bloquean la fila de la orden dentro de transacciones para verificar el saldo; cambios de estado verifican el estado anterior y guardan historial en la misma transacción.

`DELIVERED` y `CANCELLED` son terminales. `CANCELLED` representa aquí una máquina retirada sin reparar; no es una cancelación libre desde cualquier etapa.

Fuentes principales: `src/modules/repairs/domain/change-repair-status.ts`, casos de uso de `quotes`, repositorios de `payments` y `prisma-repair-status-repository.ts`.

## Interfaz y endpoints

`/` redirige a `/dashboard`. `/login` inicia sesión. El grupo `(internal)` comparte navegación y control de sesión: `/dashboard` (contadores y 10 trabajos activos recientes), `/clientes` (búsqueda/alta), `/clientes/[customerId]` (edición, máquinas e ingresos), `/reparaciones` (listado y filtros locales), `/reparaciones/[repairId]` (acciones, presupuesto, cuenta, diagnóstico e historial) y `/usuarios` (solo ADMIN).

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
| `/api/repairs/[repairId]/status` | PATCH inicio de diagnóstico |
| `/api/repairs/[repairId]/quotes` | POST presupuesto inicial |
| `/api/quotes/[quoteId]/submit`, `/api/quotes/[quoteId]/decision` | POST informar; POST registrar decisión |
| `/api/repairs/[repairId]/diagnosis`, `/api/repairs/[repairId]/payments` | POST decisión de diagnóstico; POST pago |
| `/api/repairs/[repairId]/actions` | POST finalizar reparación o entregar |
| `/api/users`, `/api/users/password-reset` | GET listado y POST alta STAFF; POST reset; solo ADMIN |

No se encontraron restricciones generales de API basadas en modo desarrollo, aunque las instrucciones de Copilot mencionan conservarlas si existen.

## Autenticación, autorización y auditoría

- Autenticación propia con usuarios activos en PostgreSQL. Contraseñas de 6–128 caracteres, hash `scrypt` con salt aleatorio y comparación de tiempo constante.
- Sesiones de 12 horas. Token aleatorio de 32 bytes; solo su hash SHA-256 se persiste. Cookie `bagnus_session`: HttpOnly, SameSite Strict, ruta `/`, Secure en producción. Cada consulta comprueba vencimiento y usuario activo; logout elimina la sesión y vence la cookie.
- ADMIN y STAFF operan el taller. Solo ADMIN accede a administración de usuarios, crea STAFF desde la UI/API y restablece contraseñas. El reset web invalida todas las sesiones del destinatario y guarda auditoría en la misma transacción.
- Login: cinco fallos dentro de 15 minutos bloquean durante 15 minutos la combinación de usuario normalizado y origen/IP. Contadores persistidos con clave hash y actualización transaccional; éxito limpia el contador. Respuestas genéricas para credenciales inválidas y HTTP 429 con `Retry-After` al bloquear. En Vercel toma `x-vercel-forwarded-for`; fuera de Vercel, `x-forwarded-for`, con valores de respaldo si no hay IP válida.
- Pagos, decisiones de diagnóstico y cambios posteriores de estado reciben el ID del usuario autenticado. Alta STAFF y reset web tienen tablas específicas de auditoría. Las relaciones de atribución operativa son opcionales; el ingreso inicial guarda historial sin usuario. `QuoteDecision` guarda canal/fecha/nota y la atribución del cambio asociado queda en el historial de la orden.

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
| Integración local según instrucciones | `node --env-file=.env --import tsx --test tests/*/*.integration.test.ts` |
| Integración en CI, con entorno ya definido | `node --import tsx --test tests/*/*.integration.test.ts` |

Las pruebas de integración crean y eliminan registros: requieren una base de pruebas preparada y, para las de API, el servidor local en puerto 3000. Algunas permiten `BASE_URL`, otras fijan `127.0.0.1:3000`. CI usa `npx prisma migrate deploy` contra su servicio efímero; ese comando modifica la base y no se ejecutó aquí. `npm test` solo invoca `node --test`: no equivale al comando explícito de unitarios ni configura por sí mismo la integración.

Existen scripts `scripts/create-internal-user.ts` y `scripts/reset-internal-user-password.ts`, ejecutables con Node y tsx. Consumen variables `BAGNUS_USER_*` y acceso a la base; no se ejecutaron ni se inspeccionaron sus valores.

**Resultado de esta revisión:** 22 archivos unitarios, **104 pruebas aprobadas**, cero fallos/omitidas, mediante el comando de unitarios anterior. Se inspeccionaron 22 archivos de integración; no se ejecutaron. Tampoco se ejecutaron lint, typegen, TypeScript, build o comandos Prisma; no se afirma que hayan pasado ni que la CI remota esté verde.

## Limitaciones y diferencias comprobables

- **Presupuestos:** el esquema admite versiones y `SUPERSEDED`, pero los casos de uso solo crean el presupuesto inicial y rechazan otro presupuesto para la misma orden; no hay flujo de revisión/reemplazo implementado.
- **Entregas con deuda:** `canAuthorizeDebtHandover` y sus unitarios reconocen ADMIN, pero ninguna ruta/caso operativo usa esa función. El repositorio bloquea toda entrega con saldo pendiente.
- **Auditoría parcial:** ingreso inicial sin actor; los scripts de alta/reset no crean las auditorías del flujo web. El reset por script actualiza contraseña e invalida sesiones en operaciones separadas. No hay flujo de anulación/reversión de pagos expuesto por la API.
- **Escala del listado:** reparaciones muestra solo las últimas 100 órdenes y filtra en cliente; clientes limita búsqueda a 20 resultados. No hay paginación para continuar esos listados.
- **Acceso de clientes y mensajería:** el valor `CUSTOMER_PORTAL` no implica un portal implementado; WhatsApp usa enlaces `wa.me`, sin envío automático ni confirmación de recepción.
- **Documentación anterior:** README aún describe usuarios internos como incorporación futura y una estructura inicial de tres módulos. Las instrucciones de Copilot deben contrastarse con el código. El `AGENTS.md` inicial exigía consultar las guías locales de Next.js; esta revisión consultó la guía de Route Handlers y luego leyó la actualización local de instrucciones.
- **Operación del piloto:** `AGENTS.md` ahora describe el flujo de ramas y publicación, pero no se encontró una configuración reproducible ni un procedimiento detallado de preparación Prisma y aplicación de migraciones en Vercel/Neon. No implica una falla comprobada del despliegue.

Referencias de trabajo: [AGENTS.md](../AGENTS.md), [instrucciones de Copilot](../.github/copilot-instructions.md), [package.json](../package.json), [CI](../.github/workflows/ci.yml), [esquema](../prisma/schema.prisma) y [migraciones](../prisma/migrations).
