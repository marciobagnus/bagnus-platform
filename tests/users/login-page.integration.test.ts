import assert from "node:assert/strict";
import { test } from "node:test";

const base = process.env.BASE_URL ?? "http://127.0.0.1:3000";

test("login starts with a masked password and an accessible non-submit visibility control", async () => {
  const response = await fetch(`${base}/login`);
  assert.equal(response.status, 200);
  const html = await response.text();
  const passwordInput = html.match(/<input\b[^>]*id="login-password"[^>]*>/)?.[0];
  assert.ok(passwordInput);
  assert.match(passwordInput, /type="password"/);
  assert.match(passwordInput, /autoComplete="current-password"/i);
  assert.match(passwordInput, /\srequired(?:=|\s|>)/);
  assert.match(html, /<label[^>]*for="login-password"[^>]*>Contraseña<\/label>/);

  const toggle = html.match(/<button\b[^>]*aria-controls="login-password"[^>]*>[\s\S]*?<\/button>/)?.[0];
  assert.ok(toggle);
  assert.match(toggle, /type="button"/);
  assert.match(toggle, /aria-label="Mostrar contraseña"/);
  assert.match(toggle, /<svg[^>]*aria-hidden="true"/);
});
