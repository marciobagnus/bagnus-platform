import assert from "node:assert/strict";
import { test } from "node:test";
import { elements } from "../helpers/react-elements.mjs";

const { QuoteWhatsAppEditor } = await import("../../src/app/(internal)/reparaciones/[repairId]/quote-whatsapp-editor.tsx");

test("editar el mensaje conserva exactamente espacios, saltos, acentos y símbolos en WhatsApp", () => {
  let message = "Mensaje inicial";
  let cancelled = false;
  const render = () => QuoteWhatsAppEditor({ phone: "5493515550101", message,
    onChange: (value) => { message = value; }, onCancel: () => { cancelled = true; } });
  const edited = "  Hola José & Ana.\nReparación $200.000 + ajuste? Sí.\n ";
  elements(render(), "textarea")[0].props.onChange({ target: { value: edited } });
  const editor = render();
  assert.equal(elements(editor, "textarea")[0].props.value, edited);
  assert.equal(elements(editor, "textarea")[0].props.readOnly, undefined);
  assert.equal(elements(editor, "textarea")[0].props.disabled, undefined);
  const link = elements(editor, "a")[0].props.href;
  assert.equal(new URL(link).searchParams.get("text"), edited);
  assert.ok(link.endsWith(encodeURIComponent(edited)));
  elements(editor, "button")[0].props.onClick();
  assert.equal(cancelled, true);
});

test("el editor no ofrece un enlace para un teléfono inválido", () => {
  const editor = QuoteWhatsAppEditor({ phone: "3515550101", message: "Hola", onChange() {}, onCancel() {} });
  assert.equal(elements(editor, "a").length, 0);
});
