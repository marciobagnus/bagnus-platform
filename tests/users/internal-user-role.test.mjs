import assert from "node:assert/strict";
import { test } from "node:test";

import {
  canAuthorizeDebtHandover,
} from "../../src/modules/users/domain/internal-user-role.ts";

test("un administrador puede autorizar una entrega con deuda", () => {
  assert.equal(
    canAuthorizeDebtHandover("ADMIN"),
    true,
  );
});

test("un empleado común no puede autorizar una entrega con deuda", () => {
  assert.equal(
    canAuthorizeDebtHandover("STAFF"),
    false,
  );
});