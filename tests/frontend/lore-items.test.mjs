import test from "node:test";
import assert from "node:assert/strict";

import {
  parseLoreItemFields,
  renameLoreCustomField,
  stringifyLoreItemFields,
} from "../../.tmp-frontend-tests/src/lib/loreItems.js";

test("parseLoreItemFields preserves JSON-friendly custom field values", () => {
  const fields = parseLoreItemFields(JSON.stringify({
    loreTypeId: "character",
    templateId: "character-template",
    traits: [{ id: "trait-1", name: "Role", value: "Scout" }],
    details: "Seen near [[Red Harbor]].",
    customFields: {
      Age: 31,
      Species: "Human",
      Active: true,
      Faction: null,
    },
  }));

  assert.equal(fields.loreTypeId, "character");
  assert.equal(fields.templateId, "character-template");
  assert.equal(fields.traits[0].value, "Scout");
  assert.equal(fields.details, "Seen near [[Red Harbor]].");
  assert.deepEqual(fields.customFields, {
    Age: 31,
    Species: "Human",
    Active: true,
    Faction: null,
  });
});

test("stringifyLoreItemFields keeps custom fields separate from traits and details", () => {
  const serialized = stringifyLoreItemFields({
    loreTypeId: "place",
    templateId: null,
    traits: [{ id: "trait-1", name: "Mood", value: "Foggy" }],
    details: "Harbor district.",
    customFields: {
      Region: "Western coast",
      "Power level": 4,
      "Currently visible": false,
      "Former name": null,
    },
  });
  const parsed = JSON.parse(serialized);

  assert.deepEqual(parsed.customFields, {
    Region: "Western coast",
    "Power level": 4,
    "Currently visible": false,
    "Former name": null,
  });
  assert.equal(parsed.traits[0].name, "Mood");
  assert.equal(parsed.details, "Harbor district.");
});

test("parseLoreItemFields keeps legacy key-value lore fields as traits", () => {
  const fields = parseLoreItemFields(JSON.stringify({
    status: "active",
    role: "courier",
    _details: "Legacy details.",
  }));

  assert.deepEqual(
    fields.traits.map((trait) => [trait.name, trait.value]),
    [["status", "active"], ["role", "courier"]],
  );
  assert.equal(fields.details, "Legacy details.");
  assert.deepEqual(fields.customFields, {});
});

test("renameLoreCustomField preserves definition-backed values while renaming manual fields", () => {
  const renamed = renameLoreCustomField(
    {
      species: "Human",
      age: 31,
      "Custom field": "Courier guild",
      Notes: "Carries sealed letters.",
    },
    "Custom field",
    "Faction",
  );

  assert.deepEqual(renamed, {
    species: "Human",
    age: 31,
    Faction: "Courier guild",
    Notes: "Carries sealed letters.",
  });
});
