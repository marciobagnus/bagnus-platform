import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import "../helpers/react-elements.mjs";

const { OtherRepairsBalanceNotice } = await import("../../src/app/(internal)/reparaciones/[repairId]/other-repairs-balance-notice.tsx");

test("no muestra aviso cuando no hay deuda en otras reparaciones", () => {
  assert.equal(OtherRepairsBalanceNotice({ summary: { orderCount: 0, totalBalance: "0.00" } }), null);
});

test("muestra el importe de otras reparaciones, cantidad y acceso a saldos", () => {
  const html = renderToStaticMarkup(OtherRepairsBalanceNotice({ summary: { orderCount: 2, totalBalance: "150000.00" } }));
  assert.match(html, /150\.000,00/);
  assert.match(html, /2 otras reparaciones/);
  assert.match(html, /href="\/reparaciones\/saldos"/);
  assert.match(html, /Ver saldos pendientes/);
});
