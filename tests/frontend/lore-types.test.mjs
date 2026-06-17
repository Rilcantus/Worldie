import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeCustomFieldDefinitions,
  slugifyCustomFieldKey,
} from "../../.tmp-frontend-tests/src/lib/customFieldDefinitions.js";

test("slugifyCustomFieldKey creates stable machine keys", () => {
  assert.equal(slugifyCustomFieldKey("Power level"), "power_level");
  assert.equal(slugifyCustomFieldKey(" First appearance! "), "first_appearance");
  assert.equal(slugifyCustomFieldKey(""), "custom_field");
});

test("normalizeCustomFieldDefinitions keeps supported field metadata and order", () => {
  const definitions = normalizeCustomFieldDefinitions([
    {
      id: "field-status",
      name: "Status",
      key: "Status",
      type: "select",
      options: ["Active", " Missing ", ""],
      required: true,
      order: 1,
      defaultValue: "Active",
    },
    {
      id: "field-age",
      name: "Age",
      key: "age",
      type: "number",
      options: [],
      required: false,
      order: 0,
      defaultValue: 31,
    },
  ]);

  assert.deepEqual(
    definitions.map((definition) => definition.id),
    ["field-age", "field-status"],
  );
  assert.equal(definitions[1].key, "status");
  assert.deepEqual(definitions[1].options, ["Active", "Missing"]);
  assert.equal(definitions[1].required, true);
  assert.equal(definitions[1].defaultValue, "Active");
});

test("normalizeCustomFieldDefinitions treats missing definitions as empty", () => {
  assert.deepEqual(normalizeCustomFieldDefinitions(undefined), []);
  assert.deepEqual(normalizeCustomFieldDefinitions(null), []);
});
