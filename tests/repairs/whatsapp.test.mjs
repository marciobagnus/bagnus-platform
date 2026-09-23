import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildFinishedRepairWhatsAppMessage,
  buildQuoteWhatsAppMessage,
  buildWhatsAppLink,
  normalizeWhatsAppPhone,
} from "../../src/lib/whatsapp.ts";
import {
  normalizeCustomerPhone,
  parseArgentineMobilePhone,
} from "../../src/modules/customers/domain/customer-phone.ts";

const data = {
  customerName: "Ana Pérez",
  brand: "Singer",
  model: "Heavy Duty 4423",
};

test("normaliza celulares argentinos internacionales sin duplicar prefijos", () => {
  assert.equal(
    normalizeWhatsAppPhone("+54 9 351 5550101"),
    "5493515550101",
  );
  assert.equal(normalizeWhatsAppPhone("+1 (212) 555-0101"), "12125550101");
  assert.equal(normalizeWhatsAppPhone("3515550101"), null);
  assert.equal(normalizeWhatsAppPhone("+54 351 5550101"), null);
});

test("normaliza formatos nacionales argentinos sin duplicar 0, 15, 54 ni 9", () => {
  assert.equal(
    normalizeCustomerPhone("0351 15 1234567"),
    "5493511234567",
  );
  assert.equal(normalizeCustomerPhone("011 15 12345678"), "5491112345678");
  assert.equal(normalizeCustomerPhone("3511234567"), "3511234567");
});

test("descompone celulares argentinos canónicos y rechaza teléfonos ambiguos", () => {
  assert.deepEqual(parseArgentineMobilePhone("5493511234567"), {
    areaCode: "351",
    mobileNumber: "1234567",
  });
  assert.deepEqual(parseArgentineMobilePhone("5491112345678"), {
    areaCode: "11",
    mobileNumber: "12345678",
  });
  assert.deepEqual(parseArgentineMobilePhone("5492901123456"), {
    areaCode: "2901",
    mobileNumber: "123456",
  });
  assert.equal(parseArgentineMobilePhone("+54 351 1234567"), null);
  assert.equal(parseArgentineMobilePhone("3511234567"), null);
});

test("construye enlaces con mensaje codificado", () => {
  const message = buildQuoteWhatsAppMessage(data);
  const link = buildWhatsAppLink("+54 9 351 5550101", message);

  assert.ok(link);
  assert.match(link, /^https:\/\/wa\.me\/5493515550101\?text=/);
  assert.ok(link.includes(encodeURIComponent("Hola, Ana Pérez.")));
  assert.equal(buildWhatsAppLink("3515550101", message), null);
});

test("mantiene mensajes separados para presupuesto y reparación finalizada", () => {
  const quoteMessage = buildQuoteWhatsAppMessage(data);
  const finishedMessage = buildFinishedRepairWhatsAppMessage(data);

  assert.match(quoteMessage, /presupuesto de reparación/);
  assert.match(finishedMessage, /lista para retirar/);
  assert.doesNotMatch(finishedMessage, /entregada/);
});