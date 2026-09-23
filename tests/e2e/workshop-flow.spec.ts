import { expect, test } from "@playwright/test";
import { randomInt } from "node:crypto";

const username = process.env.BAGNUS_USER_USERNAME;
const password = process.env.BAGNUS_USER_PASSWORD;

if (!username || !password) {
  throw new Error(
    "Definí BAGNUS_USER_USERNAME y BAGNUS_USER_PASSWORD en el entorno local antes de ejecutar E2E.",
  );
}

function uniqueEightDigitValue() {
  return randomInt(10_000_000, 100_000_000).toString();
}

test("completa el flujo de reparación hasta la entrega", async ({ page }, testInfo) => {
  const executionToken = `${Date.now()}-${process.pid}-${testInfo.retry}-${randomInt(10_000, 100_000)}`;
  const customerDni = uniqueEightDigitValue();
  const mobileNumber = uniqueEightDigitValue();
  const customerName = `E2E ${executionToken}`;
  const customerLastName = "Bagnus";

  await test.step("iniciar sesión", async () => {
    await page.goto("/login");
    await page.getByLabel("Usuario").fill(username);
    await page.getByLabel("Contraseña").fill(password);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  await test.step("registrar cliente ficticio", async () => {
    await page.getByRole("link", { name: "Clientes" }).click();
    await expect(page.getByRole("heading", { name: "Clientes" })).toBeVisible();
    await page.getByRole("button", { name: "+ Nuevo cliente" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Nombre").fill(customerName);
    await dialog.getByLabel("Apellido").fill(customerLastName);
    await dialog.getByLabel("DNI").fill(customerDni);
    await dialog.getByLabel("Código de área sin cero").fill("11");
    await dialog.getByLabel("Número de celular sin 15").fill(mobileNumber);
    await dialog.getByRole("button", { name: "Guardar cliente" }).click();
    await expect(page.getByText("Cliente registrado correctamente.")).toBeVisible();
    await expect(page.getByRole("link", { name: new RegExp(customerName) })).toBeVisible();
    await page.getByRole("link", { name: new RegExp(customerName) }).click();
  });

  await test.step("registrar máquina e iniciar reparación", async () => {
    await expect(page.getByRole("heading", { name: /Máquinas/ })).toBeVisible();
    await page.getByRole("button", { name: /Nueva máquina/ }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Marca").fill("E2E Bagnus");
    await dialog.getByLabel("Tipo").fill("Recta");
    await dialog.getByLabel("Modelo").fill("E2E-120");
    await dialog.getByLabel("N° de serie").fill(`SERIE-${executionToken}`);
    await dialog.getByLabel("Problema informado por el cliente").fill("No enciende");
    await dialog.getByRole("button", { name: "Guardar e iniciar reparación" }).click();
    await expect(page).toHaveURL(/\/reparaciones\/[0-9a-f-]+$/);
    await expect(page.getByRole("heading", { name: "Acciones" })).toBeVisible();
  });

  await test.step("comenzar diagnóstico", async () => {
    await page.getByRole("button", { name: "Comenzar diagnóstico" }).click();
    await expect(page.getByText("En diagnóstico")).toBeVisible();
  });

  await test.step("crear y enviar presupuesto de 120000", async () => {
    await page.getByRole("button", { name: "Crear presupuesto" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Descripción").fill("Reparación integral E2E");
    await dialog.getByLabel("Importe total (ARS)").fill("120000");
    await dialog.getByRole("button", { name: "Crear presupuesto" }).click();
    await expect(page.getByRole("button", { name: "Enviar presupuesto a aprobación" })).toBeVisible();
    await page.getByRole("button", { name: "Enviar presupuesto a aprobación" }).click();
    await expect(page.getByText("Esperando aprobación")).toBeVisible();
  });

  await test.step("aprobar presupuesto", async () => {
    await page.getByRole("button", { name: "Registrar decisión del cliente" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Decisión").selectOption("APPROVED");
    await dialog.getByRole("button", { name: "Registrar decisión" }).click();
    await expect(page.getByText("En reparación")).toBeVisible();
  });

  await test.step("finalizar reparación", async () => {
    await page.getByRole("button", { name: "Finalizar reparación" }).click();
    await expect(page.getByText("Lista para entregar")).toBeVisible();
  });

  async function registerPayment(amount: string) {
    await page.getByRole("button", { name: "Registrar pago" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Importe").fill(amount);
    await dialog.getByRole("button", { name: "Registrar pago" }).click();
  }

  await test.step("registrar pagos parciales y validar saldo", async () => {
    await registerPayment("50000");
    await expect(page.getByText("$ 70.000,00")).toBeVisible();
    await registerPayment("70000");
    const outstanding = page.locator("div").filter({ hasText: /^Saldo pendiente/ }).getByText("$ 0,00");
    await expect(outstanding).toBeVisible();
  });

  await test.step("entregar máquina", async () => {
    await page.getByRole("button", { name: "Entregar máquina" }).click();
    await expect(page.getByText("Entregada")).toBeVisible();
  });
});