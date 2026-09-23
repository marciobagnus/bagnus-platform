import assert from "node:assert/strict";
import { test } from "node:test";

import {
  hashPassword,
  verifyPassword,
} from "../../src/modules/users/domain/password.ts";

const sixCharacters = "abcdef";
const fiveCharacters = "abcde";
const oneHundredTwentyEightCharacters = "a".repeat(128);
const oneHundredTwentyNineCharacters = "a".repeat(129);

test("rechaza contraseñas de 5 caracteres", async () => {
  await assert.rejects(hashPassword(fiveCharacters), /entre 6 y 128/);
});

test("acepta contraseñas de 6 caracteres", async () => {
  const hash = await hashPassword(sixCharacters);
  assert.equal(await verifyPassword(sixCharacters, hash), true);
});

test("acepta contraseñas de 128 caracteres", async () => {
  const hash = await hashPassword(oneHundredTwentyEightCharacters);
  assert.equal(await verifyPassword(oneHundredTwentyEightCharacters, hash), true);
});

test("rechaza contraseñas de 129 caracteres", async () => {
  await assert.rejects(hashPassword(oneHundredTwentyNineCharacters), /entre 6 y 128/);
});
