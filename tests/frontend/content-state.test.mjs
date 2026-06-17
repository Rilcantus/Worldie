import test from "node:test";
import assert from "node:assert/strict";

import {
  buildInitialLoreFields,
  buildLoreTypeCounts,
  collectLoreStats,
  countNonEmptyWords,
} from "../../.tmp-frontend-tests/src/hooks/contentState.js";

test("countNonEmptyWords ignores blank input and compresses whitespace", () => {
  assert.equal(countNonEmptyWords(""), 0);
  assert.equal(countNonEmptyWords("  alpha   beta  gamma "), 3);
});

test("buildInitialLoreFields creates empty details and uses template metadata", () => {
  const fieldsJson = buildInitialLoreFields("type-1", {
    id: "template-1",
    name: "Character Sheet",
    loreTypeId: "type-1",
    traitDefinitions: [],
  });
  const fields = JSON.parse(fieldsJson);

  assert.equal(fields.loreTypeId, "type-1");
  assert.equal(fields.templateId, "template-1");
  assert.deepEqual(fields.traits, []);
  assert.equal(fields.details, "");
  assert.deepEqual(fields.customFields, {});
});

test("buildInitialLoreFields seeds custom fields from lore type defaults only", () => {
  const fieldsJson = buildInitialLoreFields(
    "type-character",
    null,
    {
      id: "type-character",
      name: "Character",
      slug: "character",
      order: 0,
      isSystem: true,
      fieldDefinitions: [
        { id: "field-status", name: "Status", key: "status", type: "select", options: ["Draft"], required: false, order: 0, defaultValue: "Draft" },
        { id: "field-active", name: "Active", key: "active", type: "checkbox", options: [], required: false, order: 1, defaultValue: false },
        { id: "field-age", name: "Age", key: "age", type: "number", options: [], required: false, order: 2, defaultValue: null },
        { id: "field-species", name: "Species", key: "species", type: "text", options: [], required: false, order: 3 },
      ],
    },
  );
  const fields = JSON.parse(fieldsJson);

  assert.equal(fields.loreTypeId, "type-character");
  assert.deepEqual(fields.customFields, {
    status: "Draft",
    active: false,
  });
});

test("buildLoreTypeCounts totals pages by resolved lore type", () => {
  const pages = [
    { id: "lore-1", worldId: "world-1", title: "Hero", type: "Character" },
    { id: "lore-2", worldId: "world-1", title: "City", type: "Place" },
    { id: "lore-3", worldId: "world-1", title: "Villain", type: "Character" },
  ];
  const loreTypes = [
    { id: "character", name: "Character", slug: "character", order: 0, isSystem: true },
    { id: "place", name: "Place", slug: "place", order: 1, isSystem: true },
  ];

  const counts = buildLoreTypeCounts(pages, loreTypes, (page) =>
    page.type === "Character" ? "character" : "place",
  );

  assert.deepEqual(counts, { character: 2, place: 1 });
});

test("collectLoreStats returns counts and pages for the active lore type", () => {
  const pages = [
    { id: "lore-1", worldId: "world-1", title: "Hero", type: "Character" },
    { id: "lore-2", worldId: "world-1", title: "City", type: "Place" },
    { id: "lore-3", worldId: "world-1", title: "Villain", type: "Character" },
  ];
  const loreTypes = [
    { id: "character", name: "Character", slug: "character", order: 0, isSystem: true },
    { id: "place", name: "Place", slug: "place", order: 1, isSystem: true },
  ];

  const result = collectLoreStats(pages, "character", loreTypes, (page) =>
    page.type === "Character" ? "character" : "place",
  );

  assert.deepEqual(result.counts, { character: 2, place: 1 });
  assert.deepEqual(
    result.pagesForActiveType.map((page) => page.id),
    ["lore-1", "lore-3"],
  );
});
