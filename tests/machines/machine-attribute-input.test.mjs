import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { elements } from "../helpers/react-elements.mjs";
import { MachineAttributeInput } from "../../src/app/(internal)/clientes/[customerId]/machine-attribute-input.tsx";
import { registerMachine } from "../../src/modules/machines/application/register-machine.ts";

test("cada atributo ofrece sugerencias y conserva entrada libre incluso sin sugerencias", async () => {
  const fields = { brand: "", type: "", model: "" };
  for (const key of Object.keys(fields)) {
    for (const suggestions of [["Existente"], []]) {
      const render = () => MachineAttributeInput({ label: key, listId: key, value: fields[key], suggestions,
        onChange: (value) => { fields[key] = value; }, required: key !== "model" });
      const input = elements(render(), "input")[0];
      assert.equal(input.props.list, elements(render(), "datalist")[0].props.id);
      assert.deepEqual(elements(render(), "option").map((option) => option.props.value), suggestions);
      assert.equal(input.props.readOnly, undefined);
      assert.equal(input.props.disabled, undefined);
      input.props.onChange({ target: { value: `Nuevo ${key}` } });
      assert.equal(elements(render(), "input")[0].props.value, `Nuevo ${key}`);
    }
  }
  const saved = [];
  await registerMachine({ customerId: randomUUID(), ...fields }, { async add(machine) { saved.push(machine); } });
  assert.equal(saved[0].brand, "Nuevo brand");
  assert.equal(saved[0].type, "Nuevo type");
  assert.equal(saved[0].model, "Nuevo model");
});
