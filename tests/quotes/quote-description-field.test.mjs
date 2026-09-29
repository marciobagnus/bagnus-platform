import assert from "node:assert/strict";
import { test } from "node:test";
import { elements } from "../helpers/react-elements.mjs";

const { QuoteDescriptionField } = await import("../../src/app/(internal)/reparaciones/[repairId]/quote-description-field.tsx");

test("el preset completa la descripción sin enviar el formulario y permite editarla después", () => {
  let value = "";
  const render = () => QuoteDescriptionField({ value, onChange: (next) => { value = next; } });
  const preset = elements(render(), "button")[0];
  assert.equal(preset.props.type, "button");
  preset.props.onClick();
  assert.equal(elements(render(), "textarea")[0].props.value,
    "Limpieza y lubricación general, pulido de crochet y chapa aguja, desarme y acondicionamiento del mecanismo de corta hilos, regulación de cuchillas, mano de obra y puesta a punto.");
  elements(render(), "textarea")[0].props.onChange({ target: { value: "Sólo lubricación y ajuste." } });
  assert.equal(elements(render(), "textarea")[0].props.value, "Sólo lubricación y ajuste.");
});

test("permite escribir una descripción manual sin usar el preset", () => {
  let value = "";
  const render = () => QuoteDescriptionField({ value, onChange: (next) => { value = next; } });
  const field = elements(render(), "textarea")[0];
  assert.equal(field.props.readOnly, undefined);
  assert.equal(field.props.disabled, undefined);
  field.props.onChange({ target: { value: "Cambio de correa" } });
  assert.equal(elements(render(), "textarea")[0].props.value, "Cambio de correa");
});
