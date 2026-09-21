
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  changeRepairStatus,
} from "../../src/modules/repairs/domain/change-repair-status.ts";

test("permite pasar de RECEIVED a DIAGNOSING", () => {

  const now = new Date();

  const result = changeRepairStatus({
    currentStatus: "RECEIVED",
    newStatus: "DIAGNOSING",
    note: "  El técnico comenzó el diagnóstico.  ",
    now,
  });

  assert.equal(
    result.fromStatus,
    "RECEIVED",
  );

  assert.equal(
    result.toStatus,
    "DIAGNOSING",
  );

  assert.equal(
    result.note,
    "El técnico comenzó el diagnóstico.",
  );

  assert.deepEqual(
    result.changedAt,
    now,
  );
});

test("rechaza cambiar al mismo estado", () => {

  assert.throws(
    () => changeRepairStatus({
      currentStatus: "RECEIVED",
      newStatus: "RECEIVED",
      now: new Date(),
    }),
    /No se permite cambiar/,
  );
});

test("rechaza una transición no permitida", () => {

  assert.throws(
    () => changeRepairStatus({
      currentStatus: "RECEIVED",
      newStatus: "DELIVERED",
      now: new Date(),
    }),
    /No se permite cambiar/,
  );
});

test("rechaza un estado desconocido", () => {

  assert.throws(
    () => changeRepairStatus({
      currentStatus: "RECEIVED",
      newStatus: "UNKNOWN",
      now: new Date(),
    }),
    /estado de destino no es válido/,
  );
});

test("permite realizar el cambio sin observación", () => {

  const result = changeRepairStatus({
    currentStatus: "RECEIVED",
    newStatus: "DIAGNOSING",
    now: new Date(),
  });

  assert.equal(result.note, null);
});

test("impide cambiar una reparación entregada", () => {

  assert.throws(
    () => changeRepairStatus({
      currentStatus: "DELIVERED",
      newStatus: "DIAGNOSING",
      now: new Date(),
    }),
    /No se permite cambiar/,
  );
});