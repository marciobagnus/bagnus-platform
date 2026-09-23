# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: workshop-flow.spec.ts >> completa el flujo de reparación hasta la entrega
- Location: tests\e2e\workshop-flow.spec.ts:17:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('link', { name: /E2E 1790202238311-19264-0-51611/ })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('link', { name: /E2E 1790202238311-19264-0-51611/ }) with timeout 5000ms
  - waiting for getByRole('link', { name: /E2E 1790202238311-19264-0-51611/ })

```

```yaml
- alert: Clientes
- complementary:
  - img "Símbolo Bagnus"
  - strong: Bagnus
  - text: Smart Tech
  - navigation "Navegación principal":
    - link "Inicio":
      - /url: /dashboard
    - link "Clientes":
      - /url: /clientes
    - link "Reparaciones":
      - /url: /reparaciones
  - strong: Admin E2E
  - text: Administrador
  - button "Cerrar sesión"
- main:
  - heading "Clientes" [level=1]
  - paragraph: Buscá clientes existentes o registrá uno nuevo.
  - button "+ Nuevo cliente"
  - textbox "Buscar cliente":
    - /placeholder: Nombre, apellido, DNI, teléfono o email
    - text: "5491199268243"
  - button "Buscar"
  - text: Cliente registrado correctamente.
  - table:
    - rowgroup:
      - row "Cliente Teléfono":
        - columnheader "Cliente"
        - columnheader "Teléfono"
        - columnheader
    - rowgroup:
      - row "E2E 1790202238311-19264-0-51611 Bagnus 5491199268243 Ver ficha":
        - cell "E2E 1790202238311-19264-0-51611 Bagnus":
          - strong: E2E 1790202238311-19264-0-51611 Bagnus
        - cell "5491199268243"
        - cell "Ver ficha":
          - link "Ver ficha":
            - /url: /clientes/7aa6ee41-3592-4b82-bfd0-80f254fe031c
```

# Test source

```ts
  1   | import { expect, test } from "@playwright/test";
  2   | import { randomInt } from "node:crypto";
  3   | 
  4   | const username = process.env.BAGNUS_USER_USERNAME;
  5   | const password = process.env.BAGNUS_USER_PASSWORD;
  6   | 
  7   | if (!username || !password) {
  8   |   throw new Error(
  9   |     "Definí BAGNUS_USER_USERNAME y BAGNUS_USER_PASSWORD en el entorno local antes de ejecutar E2E.",
  10  |   );
  11  | }
  12  | 
  13  | function uniqueEightDigitValue() {
  14  |   return randomInt(10_000_000, 100_000_000).toString();
  15  | }
  16  | 
  17  | test("completa el flujo de reparación hasta la entrega", async ({ page }, testInfo) => {
  18  |   const executionToken = `${Date.now()}-${process.pid}-${testInfo.retry}-${randomInt(10_000, 100_000)}`;
  19  |   const customerDni = uniqueEightDigitValue();
  20  |   const mobileNumber = uniqueEightDigitValue();
  21  |   const customerName = `E2E ${executionToken}`;
  22  |   const customerLastName = "Bagnus";
  23  | 
  24  |   await test.step("iniciar sesión", async () => {
  25  |     await page.goto("/login");
  26  |     await page.getByLabel("Usuario").fill(username);
  27  |     await page.getByLabel("Contraseña").fill(password);
  28  |     await page.getByRole("button", { name: "Ingresar" }).click();
  29  |     await expect(page).toHaveURL(/\/dashboard$/);
  30  |   });
  31  | 
  32  |   await test.step("registrar cliente ficticio", async () => {
  33  |     await page.getByRole("link", { name: "Clientes" }).click();
  34  |     await expect(page.getByRole("heading", { name: "Clientes" })).toBeVisible();
  35  |     await page.getByRole("button", { name: "+ Nuevo cliente" }).click();
  36  |     const dialog = page.getByRole("dialog");
  37  |     await dialog.getByLabel("Nombre").fill(customerName);
  38  |     await dialog.getByLabel("Apellido").fill(customerLastName);
  39  |     await dialog.getByLabel("DNI").fill(customerDni);
  40  |     await dialog.getByLabel("Código de área sin cero").fill("11");
  41  |     await dialog.getByLabel("Número de celular sin 15").fill(mobileNumber);
  42  |     await dialog.getByRole("button", { name: "Guardar cliente" }).click();
  43  |     await expect(page.getByText("Cliente registrado correctamente.")).toBeVisible();
> 44  |     await expect(page.getByRole("link", { name: new RegExp(customerName) })).toBeVisible();
      |                                                                              ^ Error: expect(locator).toBeVisible() failed
  45  |     await page.getByRole("link", { name: new RegExp(customerName) }).click();
  46  |   });
  47  | 
  48  |   await test.step("registrar máquina e iniciar reparación", async () => {
  49  |     await expect(page.getByRole("heading", { name: /Máquinas/ })).toBeVisible();
  50  |     await page.getByRole("button", { name: /Nueva máquina/ }).click();
  51  |     const dialog = page.getByRole("dialog");
  52  |     await dialog.getByLabel("Marca").fill("E2E Bagnus");
  53  |     await dialog.getByLabel("Tipo").fill("Recta");
  54  |     await dialog.getByLabel("Modelo").fill("E2E-120");
  55  |     await dialog.getByLabel("N° de serie").fill(`SERIE-${executionToken}`);
  56  |     await dialog.getByLabel("Problema informado por el cliente").fill("No enciende");
  57  |     await dialog.getByRole("button", { name: "Guardar e iniciar reparación" }).click();
  58  |     await expect(page).toHaveURL(/\/reparaciones\/[0-9a-f-]+$/);
  59  |     await expect(page.getByRole("heading", { name: "Acciones" })).toBeVisible();
  60  |   });
  61  | 
  62  |   await test.step("comenzar diagnóstico", async () => {
  63  |     await page.getByRole("button", { name: "Comenzar diagnóstico" }).click();
  64  |     await expect(page.getByText("En diagnóstico")).toBeVisible();
  65  |   });
  66  | 
  67  |   await test.step("crear y enviar presupuesto de 120000", async () => {
  68  |     await page.getByRole("button", { name: "Crear presupuesto" }).click();
  69  |     const dialog = page.getByRole("dialog");
  70  |     await dialog.getByLabel("Descripción").fill("Reparación integral E2E");
  71  |     await dialog.getByLabel("Importe total (ARS)").fill("120000");
  72  |     await dialog.getByRole("button", { name: "Crear presupuesto" }).click();
  73  |     await expect(page.getByRole("button", { name: "Enviar presupuesto a aprobación" })).toBeVisible();
  74  |     await page.getByRole("button", { name: "Enviar presupuesto a aprobación" }).click();
  75  |     await expect(page.getByText("Esperando aprobación")).toBeVisible();
  76  |   });
  77  | 
  78  |   await test.step("aprobar presupuesto", async () => {
  79  |     await page.getByRole("button", { name: "Registrar decisión del cliente" }).click();
  80  |     const dialog = page.getByRole("dialog");
  81  |     await dialog.getByLabel("Decisión").selectOption("APPROVED");
  82  |     await dialog.getByRole("button", { name: "Registrar decisión" }).click();
  83  |     await expect(page.getByText("En reparación")).toBeVisible();
  84  |   });
  85  | 
  86  |   await test.step("finalizar reparación", async () => {
  87  |     await page.getByRole("button", { name: "Finalizar reparación" }).click();
  88  |     await expect(page.getByText("Lista para entregar")).toBeVisible();
  89  |   });
  90  | 
  91  |   async function registerPayment(amount: string) {
  92  |     await page.getByRole("button", { name: "Registrar pago" }).click();
  93  |     const dialog = page.getByRole("dialog");
  94  |     await dialog.getByLabel("Importe").fill(amount);
  95  |     await dialog.getByRole("button", { name: "Registrar pago" }).click();
  96  |   }
  97  | 
  98  |   await test.step("registrar pagos parciales y validar saldo", async () => {
  99  |     await registerPayment("50000");
  100 |     await expect(page.getByText("$ 70.000,00")).toBeVisible();
  101 |     await registerPayment("70000");
  102 |     const outstanding = page.locator("div").filter({ hasText: /^Saldo pendiente/ }).getByText("$ 0,00");
  103 |     await expect(outstanding).toBeVisible();
  104 |   });
  105 | 
  106 |   await test.step("entregar máquina", async () => {
  107 |     await page.getByRole("button", { name: "Entregar máquina" }).click();
  108 |     await expect(page.getByText("Entregada")).toBeVisible();
  109 |   });
  110 | });
```