# Bagnus Platform - Copilot Instructions

## Project

Bagnus Platform is an MVP for managing the Máquinas Bagnus repair workshop.

Stack:

- Next.js 16 App Router
- TypeScript strict
- PostgreSQL
- Prisma 7
- React 19
- Node.js
- Windows / PowerShell

The project uses a modular monolith architecture.

Modules normally follow:

- domain
- application
- infrastructure

Do not introduce a new architecture unless explicitly requested.

## Working style

Before modifying code:

1. Inspect the existing implementation.
2. Reuse existing domain rules and repositories.
3. Do not duplicate functionality that already exists.
4. Make the smallest coherent change required.
5. Preserve existing tests and behavior.

Do not refactor unrelated code.

Do not rename files, models, routes, or domain concepts unless required by the task.

## Business domain

Main entities:

- Customer
- Machine
- RepairOrder
- RepairQuote
- QuoteDecision
- DiagnosisCharge
- Payment
- InternalUser
- InternalSession

Repair statuses:

- RECEIVED
- WAITING_APPROVAL
- IN_REPAIR
- READY_FOR_PICKUP
- DELIVERED

Important business rules:

- Each physical machine intake creates a new RepairOrder.
- A machine cannot have two open repairs simultaneously.
- Diagnosis is free. New orders never create DiagnosisCharge records.
- RepairResolution is persisted separately: REPAIRED or QUOTE_REJECTED.
- Create and submit quotes atomically from RECEIVED.
- Multiple partial payments are allowed.
- Payments cannot exceed the outstanding balance.
- Both roles can hand over a machine with outstanding debt and optional atomic payment.
- Delivered orders can receive payments without changing status, resolution or deliveredAt.
- Financial status is calculated; it is never persisted as source of truth.
- Financial and repair operations must preserve auditability.

## Users

The MVP has two roles:

- ADMIN
- STAFF

The workshop currently has only a few internal users.

Do not build a complex permission/RBAC system.

Authentication uses database-backed sessions and HttpOnly cookies.

Never store passwords or raw session tokens in plain text.

## Audit

Important operations must keep user attribution where supported:

- payment registration
- quotation decisions
- repair status changes

Do not remove historical/audit records to correct mistakes.

## Database

Never run:

- prisma migrate reset
- destructive database resets
- commands that delete production/user data

Use explicit Prisma migrations.

After schema changes run:

npx prisma validate
npx prisma generate

Never edit an already applied migration unless explicitly instructed.

## Prisma

Relations using @relation should preferably remain on one line because multiline relation declarations caused schema validation problems previously.

Money uses Decimal in PostgreSQL.

Domain balance calculations use integer cents / bigint where already implemented.

## API

Use Next.js App Router route handlers.

Existing development-only API restrictions should not be removed unless explicitly requested.

Authenticated operations should use the existing session/authentication infrastructure.

Validate external input before passing it into application/domain code.

## Frontend

Keep the MVP UI simple, clean, responsive and practical for daily workshop use.

Prioritize workflow and usability over visual sophistication.

Current intended navigation:

- Dashboard
- Clientes
- Reparaciones

Typical workflow:

Cliente
→ Máquina
→ Reparación
→ Presupuesto
→ Aprobación/Rechazo
→ Reparación
→ Entrega (pago opcional)
→ Pagos posteriores si hay saldo

Avoid adding UI libraries unless explicitly requested.

Reuse CSS modules and existing visual conventions.

## Tests

Do not claim a test passed unless it was actually executed.

Standard checks:

npx next typegen
npx tsc --noEmit --incremental false
npm run lint -- --max-warnings 0
npm run build

Unit tests:

node --import tsx --test tests/*/*.test.mjs

Integration tests:

node --import tsx --test --test-concurrency=1 tests/*/*.integration.test.ts

Set DATABASE_URL explicitly to a verified disposable local/test database before integration tests; never load an unverified .env for this purpose.

Some API integration tests require `npm run dev` running on localhost:3000.

## Git

Do not commit, push, merge or change branches unless explicitly requested.

Before completing a task, summarize:

- files created
- files modified
- tests/commands executed
- any remaining issue