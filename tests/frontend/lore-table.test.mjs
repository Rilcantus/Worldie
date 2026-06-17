import test from "node:test";
import assert from "node:assert/strict";

import {
  buildLoreTableModel,
  formatLoreTableValue,
} from "../../.tmp-frontend-tests/src/lib/loreTable.js";

const characterType = {
  id: "type-character",
  name: "Character",
  slug: "character",
  order: 0,
  isSystem: true,
  fieldDefinitions: [
    { id: "field-species", name: "Species", key: "species", type: "text", options: [], required: false, order: 0 },
    { id: "field-age", name: "Age", key: "age", type: "number", options: [], required: false, order: 1 },
    { id: "field-active", name: "Active", key: "active", type: "checkbox", options: [], required: false, order: 2 },
    { id: "field-status", name: "Status", key: "status", type: "select", options: ["Active", "Missing"], required: false, order: 3 },
    { id: "field-first-seen", name: "First Seen", key: "first_seen", type: "date", options: [], required: false, order: 4 },
  ],
};

const placeType = {
  id: "type-place",
  name: "Place",
  slug: "place",
  order: 1,
  isSystem: true,
  fieldDefinitions: [],
};

test("buildLoreTableModel filters rows by selected lore type and orders definition columns", () => {
  const pages = [
    {
      id: "lore-1",
      worldId: "world-1",
      title: "Mara Quill",
      type: "Character",
      fieldsJson: JSON.stringify({
        loreTypeId: "type-character",
        traits: [],
        details: "",
        customFields: {
          species: "Human",
          age: 31,
          active: true,
          status: "Active",
          first_seen: "2026-01-02",
        },
      }),
      updatedAt: "2026-06-01",
    },
    {
      id: "lore-2",
      worldId: "world-1",
      title: "Red Harbor",
      type: "Place",
      fieldsJson: JSON.stringify({ loreTypeId: "type-place", traits: [], details: "", customFields: {} }),
    },
  ];

  const model = buildLoreTableModel(pages, [characterType, placeType], "type-character");

  assert.deepEqual(
    model.columns.map((column) => column.label),
    ["Name", "Type", "Species", "Age", "Active", "Status", "First Seen", "Updated"],
  );
  assert.deepEqual(model.rows.map((row) => row.page.id), ["lore-1"]);
  assert.equal(model.rows[0].cells["field-species"], "Human");
  assert.equal(model.rows[0].cells["field-age"], "31");
  assert.equal(model.rows[0].cells["field-active"], "Yes");
  assert.equal(model.rows[0].cells["field-status"], "Active");
  assert.equal(model.rows[0].cells["field-first-seen"], "2026-01-02");
});

test("buildLoreTableModel renders missing values blank and tolerates legacy lore fields", () => {
  const pages = [
    {
      id: "lore-legacy",
      worldId: "world-1",
      title: "Legacy Hero",
      type: "Character",
      fieldsJson: JSON.stringify({ status: "active", _details: "Old shape." }),
      createdAt: "2026-01-01",
    },
  ];

  const model = buildLoreTableModel(pages, [characterType], "type-character");

  assert.equal(model.rows.length, 1);
  assert.equal(model.rows[0].cells.title, "Legacy Hero");
  assert.equal(model.rows[0].cells["field-species"], "");
  assert.equal(model.rows[0].cells["field-active"], "");
  assert.equal(model.rows[0].cells.updated, "2026-01-01");
});

test("formatLoreTableValue renders checkbox, select, number, date, and empty values predictably", () => {
  assert.equal(formatLoreTableValue(true, "checkbox"), "Yes");
  assert.equal(formatLoreTableValue(false, "checkbox"), "No");
  assert.equal(formatLoreTableValue(12, "number"), "12");
  assert.equal(formatLoreTableValue("Active", "select"), "Active");
  assert.equal(formatLoreTableValue("2026-03-04", "date"), "2026-03-04");
  assert.equal(formatLoreTableValue(null, "text"), "");
  assert.equal(formatLoreTableValue(undefined, "text"), "");
});
