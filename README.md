# Bagnus Platform

Sistema de gestión de reparaciones para una empresa de maquinaria industrial: clientes, máquinas, órdenes de reparación, presupuestos y pagos, con trazabilidad completa de cada cambio de estado.

Desarrollado para **Máquinas Bagnus** como Práctica Profesional Supervisada (PPS) de la UTN. Actualmente en **piloto**.

**Demo del piloto:** [bagnus-platform-pilot.vercel.app](https://bagnus-platform-pilot.vercel.app)

## Tabla de contenidos

- [Qué resuelve](#qué-resuelve)
- [Stack](#stack)
- [Arquitectura](#arquitectura)
- [Módulos](#módulos)
- [Reglas de negocio](#reglas-de-negocio)
- [Estructura del repositorio](#estructura-del-repositorio)
- [Puesta en marcha local](#puesta-en-marcha-local)
- [Pruebas y CI/CD](#pruebas-y-cicd)
- [Despliegue](#despliegue)
- [Documentación adicional](#documentación-adicional)

## Qué resuelve

El taller necesitaba reemplazar el seguimiento manual de reparaciones por un sistema único que permita:

- Registrar clientes y las máquinas que les pertenecen.
- Abrir órdenes de reparación y seguir su avance a través de un flujo de **cinco estados**.
- Emitir presupuestos y registrar la decisión del cliente.
- Gestionar pagos, incluyendo **entrega con deuda y pagos posteriores**.
- Saber siempre **qué usuario interno** realizó cada cambio de estado.
- Permitir que el cliente consulte el estado de su reparación sin poder modificarlo.

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js (App Router) |
| UI | React |
| Lenguaje | TypeScript |
| Base de datos | PostgreSQL |
| ORM | Prisma |
| CI/CD | GitHub Actions |
| Hosting | Vercel |

## Arquitectura

**Monolito modular** con separación **Clean / Hexagonal**. Es una sola aplicación y no usa microservicios: para el alcance del MVP, la complejidad operativa de un sistema distribuido no se justifica.

La regla central es que **el dominio no depende de Next.js ni de Prisma**. Las dependencias apuntan siempre hacia adentro:

```
┌─────────────────────────────────────────────┐
│  src/app  (Next.js: páginas, rutas, UI)     │
│  ┌───────────────────────────────────────┐  │
│  │  infrastructure  (Prisma, integraciones) │
│  │  ┌─────────────────────────────────┐  │  │
│  │  │  application  (casos de uso)    │  │  │
│  │  │  ┌───────────────────────────┐  │  │  │
│  │  │  │  domain  (reglas de       │  │  │  │
│  │  │  │  negocio, sin framework)  │  │  │  │
│  │  │  └───────────────────────────┘  │  │  │
│  │  └─────────────────────────────────┘  │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

Gracias a esto, las reglas del negocio se pueden probar de forma aislada, sin base de datos ni servidor web, y es posible cambiar la persistencia o el framework sin reescribir el dominio. Las carpetas y abstracciones se crean cuando se necesitan, no por adelantado.

## Módulos

| Módulo | Responsabilidad |
|---|---|
| `customers` | Clientes |
| `machines` | Máquinas y su relación con el cliente |
| `repairs` | Órdenes, historial operativo y saldos pendientes |
| `quotes` | Presupuestos y decisiones del cliente |
| `payments` | Pagos y cuenta calculada; diagnóstico gratuito |
| `users` | Usuarios internos, sesiones, control de acceso por roles y auditoría |

## Reglas de negocio

Modeladas junto con los responsables del taller:

- Una máquina **no puede tener dos reparaciones abiertas** simultáneamente.
- Cada nuevo ingreso físico genera una **nueva `RepairOrder`**.
- La misma `Machine` se **reutiliza** entre reparaciones.
- Cada cambio de estado **registra el usuario interno responsable**.
- El cliente **consulta, pero no modifica**.
- La entrega puede realizarse **con deuda**, y los pagos posteriores quedan registrados.

Convenciones técnicas:

- Identificadores internos: **UUID**.
- Dinero representado con **`Decimal`** (nunca con punto flotante).
- Timestamps en **UTC**.

## Estructura del repositorio

```
src/
├── app/                      # Páginas y puntos de entrada de Next.js
└── modules/
    └── <modulo>/
        ├── domain/           # Reglas del negocio
        ├── application/      # Casos de uso
        └── infrastructure/   # Persistencia e integraciones
prisma/                       # Esquema y migraciones
tests/                        # Pruebas automatizadas
docs/                         # Documentación funcional y de operación
.github/                      # Workflows de CI/CD
brand/                        # Kit de marca
```

## Puesta en marcha local

**Requisitos:** Node.js (versión LTS) y una instancia de PostgreSQL.

```bash
# 1. Clonar e instalar dependencias
git clone https://github.com/marciobagnus/bagnus-platform.git
cd bagnus-platform
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env y completar DATABASE_URL con tu instancia de PostgreSQL

# 3. Aplicar el esquema de base de datos
npx prisma migrate dev

# 4. Levantar el servidor de desarrollo
npm run dev
```

La aplicación queda disponible en [http://localhost:3000](http://localhost:3000).

> **Antes de migrar o publicar**, leer [`docs/SIMPLIFIED_REPAIR_WORKFLOW.md`](docs/SIMPLIFIED_REPAIR_WORKFLOW.md), que describe la implementación del flujo de reparación y su verificación.

## Pruebas y CI/CD

```bash
npm test
```

Cada cambio dispara un pipeline en **GitHub Actions** que ejecuta las pruebas automatizadas antes de integrar el código.

## Despliegue

El piloto está desplegado en **Vercel**, conectado a una base de datos PostgreSQL gestionada. Las variables de entorno se configuran desde el panel del proyecto en Vercel.

## Documentación adicional

- [`docs/SIMPLIFIED_REPAIR_WORKFLOW.md`](docs/SIMPLIFIED_REPAIR_WORKFLOW.md): flujo de reparación, implementación y verificación.

## Autor

**Marcio Bagnus** — Ingeniero de Software
[LinkedIn](https://www.linkedin.com/in/marciobagnus/) · [Portfolio](https://marcio-bagnus.vercel.app)
