# Bagnus Platform — Agent Instructions

## 1. Project overview

Bagnus Platform is a workshop management application for Máquinas Bagnus, a sewing machine repair business.

The project has a functional MVP deployed to a pilot environment. It supports the operational workflow from customer and machine intake through diagnosis, quotations, repair, payment, and equipment handover.

The application is currently being tested by internal users. Prioritize reliability, maintainability, security, and practical workshop usability over adding unnecessary features.

## 2. Read before making changes

Before implementing any task:

1. Read this AGENTS.md file.
2. Read `.github/copilot-instructions.md`.
3. Inspect the relevant existing source code and tests.
4. Inspect `prisma/schema.prisma` when the task involves persistence or business entities.
5. Use the existing implementation as the source of truth for actual behavior.

Do not assume that a feature exists or is missing without inspecting the code.

Do not rewrite working modules or introduce new architectural patterns without a concrete reason.

If instructions conflict, report the conflict before proceeding.

## 3. Technology stack

The application uses:

- Next.js App Router
- React
- TypeScript
- Node.js
- PostgreSQL
- Prisma ORM
- CSS Modules
- Git and GitHub
- GitHub Actions
- Vercel for application deployment
- Neon PostgreSQL for the cloud pilot database

Follow the versions, scripts, dependencies, and conventions defined in the repository.

Do not upgrade dependencies or introduce additional frameworks unless explicitly requested.

## 4. Architecture

Preserve the existing modular architecture and separation of responsibilities.

When implementing new functionality:

- Keep business rules in the domain or application layers.
- Keep persistence concerns in repository implementations.
- Keep HTTP concerns in API routes.
- Keep presentation concerns in UI components.
- Reuse existing types, validators, utilities, and use cases.
- Prefer explicit dependencies and testable application logic.
- Avoid duplicating business rules between frontend and backend.

Inspect existing modules before creating new abstractions.

The frontend must not become the authoritative source for financial calculations, authorization decisions, or repair workflow validation.

## 5. Workshop business rules

The system manages:

- Internal users.
- Customers.
- Machines.
- Repair orders.
- Diagnosis.
- Repair quotations and customer decisions.
- Payments and outstanding balances.
- Equipment handover.
- Operational and administrative audit records.

Preserve the existing business rules and state transitions.

In particular:

- Do not permit two simultaneous open repair orders for the same machine.
- Preserve the existing quotation approval and rejection workflows.
- Preserve the existing diagnosis charge and waiver rules.
- Preserve backend validation of payments and outstanding balances.
- Do not allow equipment handover when the current business rules prohibit it.
- Do not introduce administrative exceptions without explicit requirements.
- Do not alter historical financial or audit records to simplify a workflow.

Inspect the current domain models and tests for the authoritative details of each rule.

Do not invent missing workflow states or change their meaning.

## 6. Authentication and security

The application uses internal users with ADMIN and STAFF roles.

Preserve:

- Backend authentication and authorization.
- Role-based access control.
- Secure password hashing.
- Session validation and invalidation.
- Login rate limiting.
- Audit attribution for sensitive operations.

Never rely exclusively on hiding frontend controls to enforce permissions.

Never implement public account creation or password reset based solely on knowing a username.

Do not expose passwords, password hashes, session tokens, authentication cookies, or database connection strings in logs, responses, documentation, or commits.

Use the existing shared password policy instead of introducing contradictory validation rules.

Do not weaken authentication or bypass authorization to make a test pass.

## 7. Database safety

The project uses separate PostgreSQL databases:

- `bagnus_dev`: local development.
- `bagnus_e2e`: experimental E2E testing.
- `bagnus_pilot`: cloud pilot environment in Neon.

Never assume which database is currently selected.

Before running migrations, seed scripts, user-management scripts, or any operation that modifies database records:

1. Identify the intended environment.
2. Verify the actual database connection.
3. Explain the intended changes.
4. Obtain explicit authorization from the user.

Never use a development or testing script against `bagnus_pilot` without explicit authorization.

Do not automatically fall back to another database when a connection fails.

Never execute the following without explicit authorization:

- `prisma migrate reset`
- Destructive schema changes
- `DROP DATABASE`
- `TRUNCATE`
- Bulk deletion of existing records
- Database replacement or restoration

Do not create or apply migrations automatically when a task has not authorized database changes.

Keep Prisma migrations versioned and reviewable.

Never read, print, copy, commit, or expose secrets from `.env` files.

## 8. Environments and deployment

The project currently uses:

### Local development

- Application running locally.
- PostgreSQL database: `bagnus_dev`.
- Used for implementation and manual testing.

### Cloud pilot

- Application deployed on Vercel.
- PostgreSQL database: `bagnus_pilot` in Neon.
- Used by internal pilot users.

### Git workflow

- `main` is the branch connected to Vercel Production.
- New functionality and fixes must be developed in dedicated branches.
- Changes are reviewed through GitHub Pull Requests.
- Merging into `main` may automatically publish a new version of the pilot.
- Vercel Preview builds are currently configured to be skipped.

Do not commit, push, merge, deploy, or modify cloud configuration unless the user explicitly requests it.

Do not change the production branch or deployment workflow without authorization.

Do not connect Preview or development environments to the pilot database.

Do not run database migrations as an automatic side effect of the Next.js build.

When preparing a deployment involving schema changes, identify migration compatibility and the appropriate deployment order.

## 9. Testing and verification

Before implementing a change, inspect the tests relevant to the affected functionality.

Prefer adding or updating tests that verify observable behavior and business rules.

Use the scripts and tooling already configured in `package.json`.

Common verification commands include:

```powershell
npx next typegen
npx tsc --noEmit --incremental false
npm run lint -- --max-warnings 0
npm run build
```
