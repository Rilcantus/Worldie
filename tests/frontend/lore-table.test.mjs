import test from "node:test";
import assert from "node:assert/strict";

import {
  applyLoreTableCustomFieldEdit,
  applyLoreTableView,
  buildLoreTableViewDraft,
  buildLoreTableModel,
  clearHiddenColumnSort,
  formatLoreTableValue,
  getLoreTableCustomFieldValue,
  isLoreTableColumnEditable,
  normalizeLoreTableEditValue,
  resolveVisibleColumnIds,
  toggleVisibleColumnId,
} from "../../.tmp-frontend-tests/src/lib/loreTable.js";
import {
  buildLoreTableViewPayload,
  buildLoreTableViewUpdatePayload,
} from "../../.tmp-frontend-tests/src/lib/loreTableViews.js";

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

test("custom field table edits update only the target field and preserve extras", () => {
  const page = {
    id: "lore-1",
    worldId: "world-1",
    title: "Mara Quill",
    type: "Character",
    fieldsJson: JSON.stringify({
      loreTypeId: "type-character",
      templateId: "template-character",
      traits: [{ id: "trait-1", name: "Role", value: "Courier" }],
      details: "Carries sealed letters.",
      customFields: {
        species: "Human",
        age: 31,
        active: true,
        manual_extra: "keep me",
      },
    }),
  };
  const updated = applyLoreTableCustomFieldEdit(page, characterType.fieldDefinitions[0], "Half-elf");
  const parsed = JSON.parse(updated.fieldsJson);
  const original = JSON.parse(page.fieldsJson);

  assert.equal(parsed.customFields.species, "Half-elf");
  assert.equal(parsed.customFields.age, 31);
  assert.equal(parsed.customFields.active, true);
  assert.equal(parsed.customFields.manual_extra, "keep me");
  assert.equal(parsed.details, "Carries sealed letters.");
  assert.equal(original.customFields.species, "Human");
  assert.notEqual(updated, page);
});

test("custom field table edits normalize number checkbox select date and clearing values", () => {
  const page = {
    id: "lore-1",
    worldId: "world-1",
    title: "Mara Quill",
    type: "Character",
    fieldsJson: JSON.stringify({
      loreTypeId: "type-character",
      traits: [],
      details: "",
      customFields: { age: 31, active: true, status: "Active", first_seen: "2026-01-02", species: "Human" },
    }),
  };
  const withNumber = applyLoreTableCustomFieldEdit(page, characterType.fieldDefinitions[1], "32");
  const withCheckbox = applyLoreTableCustomFieldEdit(withNumber, characterType.fieldDefinitions[2], false);
  const withSelect = applyLoreTableCustomFieldEdit(withCheckbox, characterType.fieldDefinitions[3], "Missing");
  const withDate = applyLoreTableCustomFieldEdit(withSelect, characterType.fieldDefinitions[4], "2026-04-05");
  const clearedText = applyLoreTableCustomFieldEdit(withDate, characterType.fieldDefinitions[0], "");
  const parsed = JSON.parse(clearedText.fieldsJson);

  assert.equal(parsed.customFields.age, 32);
  assert.equal(parsed.customFields.active, false);
  assert.equal(parsed.customFields.status, "Missing");
  assert.equal(parsed.customFields.first_seen, "2026-04-05");
  assert.equal(parsed.customFields.species, "");
  assert.equal(normalizeLoreTableEditValue(characterType.fieldDefinitions[1], ""), "");
});

test("custom field table edits can read definition-key and legacy-name values", () => {
  const page = {
    id: "lore-legacy-name",
    worldId: "world-1",
    title: "Legacy Name",
    type: "Character",
    fieldsJson: JSON.stringify({ loreTypeId: "type-character", customFields: { Species: "Human" } }),
  };

  assert.equal(getLoreTableCustomFieldValue(page, characterType.fieldDefinitions[0]), "Human");
});

test("only custom field lore table columns are editable", () => {
  const model = buildLoreTableModel(sortablePages, [characterType, placeType], "type-character");
  const editable = model.columns.filter(isLoreTableColumnEditable).map((column) => column.id);
  const readonly = model.columns.filter((column) => !isLoreTableColumnEditable(column)).map((column) => column.id);

  assert.deepEqual(editable, ["field-species", "field-age", "field-active", "field-status", "field-first-seen"]);
  assert.deepEqual(readonly, ["title", "type", "updated"]);
});

const sortablePages = [
  {
    id: "lore-mara",
    worldId: "world-1",
    title: "Mara Quill",
    type: "Character",
    fieldsJson: JSON.stringify({
      loreTypeId: "type-character",
      customFields: { species: "Human", age: 31, active: true, status: "Active", first_seen: "2026-01-02" },
    }),
    updatedAt: "2026-06-01",
  },
  {
    id: "lore-bran",
    worldId: "world-1",
    title: "Bran Vale",
    type: "Character",
    fieldsJson: JSON.stringify({
      loreTypeId: "type-character",
      customFields: { species: "Elf", age: 7, active: false, status: "Missing", first_seen: "2026-02-03" },
    }),
    updatedAt: "2026-05-01",
  },
  {
    id: "lore-asha",
    worldId: "world-1",
    title: "Asha Reed",
    type: "Character",
    fieldsJson: JSON.stringify({
      loreTypeId: "type-character",
      customFields: { species: "Human", active: true, status: "Retired" },
    }),
  },
  {
    id: "lore-harbor",
    worldId: "world-1",
    title: "Red Harbor",
    type: "Place",
    fieldsJson: JSON.stringify({ loreTypeId: "type-place", customFields: { region: "Coast" } }),
  },
];

test("quick filter matches titles case-insensitively and excludes non-matching rows", () => {
  const model = buildLoreTableModel(sortablePages, [characterType, placeType], "type-character", {
    filterText: "mara",
  });

  assert.deepEqual(model.rows.map((row) => row.page.id), ["lore-mara"]);
});

test("quick filter matches visible custom field values case-insensitively", () => {
  const model = buildLoreTableModel(sortablePages, [characterType, placeType], "type-character", {
    filterText: "ELF",
  });

  assert.deepEqual(model.rows.map((row) => row.page.id), ["lore-bran"]);
});

test("quick filter and sorting still exclude pages from other lore types", () => {
  const model = buildLoreTableModel(sortablePages, [characterType, placeType], "type-character", {
    filterText: "harbor",
    sort: { columnId: "title", direction: "asc" },
  });

  assert.deepEqual(model.rows.map((row) => row.page.id), []);
});

test("sorting by name toggles ascending and descending", () => {
  const ascending = buildLoreTableModel(sortablePages, [characterType, placeType], "type-character", {
    sort: { columnId: "title", direction: "asc" },
  });
  const descending = buildLoreTableModel(sortablePages, [characterType, placeType], "type-character", {
    sort: { columnId: "title", direction: "desc" },
  });

  assert.deepEqual(ascending.rows.map((row) => row.page.title), ["Asha Reed", "Bran Vale", "Mara Quill"]);
  assert.deepEqual(descending.rows.map((row) => row.page.title), ["Mara Quill", "Bran Vale", "Asha Reed"]);
});

test("sorting by number custom fields uses numeric order and keeps missing values safe", () => {
  const ascending = buildLoreTableModel(sortablePages, [characterType, placeType], "type-character", {
    sort: { columnId: "field-age", direction: "asc" },
  });

  assert.deepEqual(ascending.rows.map((row) => row.page.id), ["lore-bran", "lore-mara", "lore-asha"]);
});

test("sorting by checkbox custom fields is predictable", () => {
  const ascending = buildLoreTableModel(sortablePages, [characterType, placeType], "type-character", {
    sort: { columnId: "field-active", direction: "asc" },
  });
  const descending = buildLoreTableModel(sortablePages, [characterType, placeType], "type-character", {
    sort: { columnId: "field-active", direction: "desc" },
  });

  assert.deepEqual(ascending.rows.map((row) => row.page.id), ["lore-bran", "lore-asha", "lore-mara"]);
  assert.deepEqual(descending.rows.map((row) => row.page.id), ["lore-asha", "lore-mara", "lore-bran"]);
});

test("default lore table visibility shows all custom field columns", () => {
  const model = buildLoreTableModel(sortablePages, [characterType, placeType], "type-character");

  assert.deepEqual(
    model.columns.map((column) => column.id),
    ["title", "type", "field-species", "field-age", "field-active", "field-status", "field-first-seen", "updated"],
  );
});

test("hiding and restoring custom field columns changes rendered columns only", () => {
  const fullModel = buildLoreTableModel(sortablePages, [characterType, placeType], "type-character");
  const hiddenAge = toggleVisibleColumnId(fullModel.allColumns, null, "field-age");
  const hiddenModel = buildLoreTableModel(sortablePages, [characterType, placeType], "type-character", {
    visibleColumnIds: hiddenAge,
  });
  const restoredAge = toggleVisibleColumnId(hiddenModel.allColumns, hiddenAge, "field-age");
  const restoredModel = buildLoreTableModel(sortablePages, [characterType, placeType], "type-character", {
    visibleColumnIds: restoredAge,
  });

  assert.equal(hiddenModel.columns.some((column) => column.id === "field-age"), false);
  assert.equal(hiddenModel.rows[0].cells["field-age"], "31");
  assert.equal(restoredModel.columns.some((column) => column.id === "field-age"), true);
});

test("stale saved visible column keys are ignored safely", () => {
  const model = buildLoreTableModel(sortablePages, [characterType, placeType], "type-character", {
    visibleColumnIds: ["field-species", "field-missing"],
  });

  assert.deepEqual(resolveVisibleColumnIds(model.allColumns, ["field-species", "field-missing"]), ["field-species"]);
  assert.deepEqual(
    model.columns.map((column) => column.id),
    ["title", "type", "field-species", "updated"],
  );
});

test("hiding the active sort column clears the sort", () => {
  const model = buildLoreTableModel(sortablePages, [characterType, placeType], "type-character", {
    visibleColumnIds: ["field-species"],
    sort: { columnId: "field-age", direction: "asc" },
  });

  assert.equal(clearHiddenColumnSort({ columnId: "field-age", direction: "asc" }, model.columns), null);
  assert.deepEqual(clearHiddenColumnSort({ columnId: "field-species", direction: "desc" }, model.columns), {
    columnId: "field-species",
    direction: "desc",
  });
});

test("saved lore table views apply lore type, filter, and sort state", () => {
  const state = applyLoreTableView(
    {
      id: "view-1",
      worldId: "world-1",
      name: "Active Characters",
      loreTypeId: "type-character",
      quickFilter: "mara",
      sortKey: "field-age",
      sortDirection: "desc",
      visibleColumnsJson: JSON.stringify(["field-species", "field-age"]),
    },
    {
      loreTypeId: "type-place",
      filterText: "",
      sort: { columnId: "title", direction: "asc" },
      visibleColumnIds: null,
    },
  );
  const model = buildLoreTableModel(sortablePages, [characterType, placeType], state.loreTypeId, {
    filterText: state.filterText,
    sort: state.sort,
    visibleColumnIds: state.visibleColumnIds,
  });

  assert.deepEqual(state, {
    loreTypeId: "type-character",
    filterText: "mara",
    sort: { columnId: "field-age", direction: "desc" },
    visibleColumnIds: ["field-species", "field-age"],
  });
  assert.deepEqual(
    model.columns.map((column) => column.id),
    ["title", "type", "field-species", "field-age", "updated"],
  );
  assert.deepEqual(model.rows.map((row) => row.page.id), ["lore-mara"]);
});

test("saved lore table view drafts serialize current table state", () => {
  const draft = buildLoreTableViewDraft(" Characters ", {
    loreTypeId: "type-character",
    filterText: " Human ",
    sort: { columnId: "field-age", direction: "asc" },
    visibleColumnIds: ["field-species", "field-age"],
  });

  assert.deepEqual(draft, {
    name: "Characters",
    loreTypeId: "type-character",
    quickFilter: "Human",
    sortKey: "field-age",
    sortDirection: "asc",
    visibleColumnsJson: JSON.stringify(["field-species", "field-age"]),
  });
});

test("saved lore table view payloads preserve explicit nulls and omit undefined fields", () => {
  const createPayload = buildLoreTableViewPayload("project-1", "world-1", {
    name: "Characters",
    loreTypeId: "type-character",
    quickFilter: null,
    sortKey: undefined,
    sortDirection: null,
    visibleColumnsJson: null,
  });
  const updatePayload = buildLoreTableViewUpdatePayload("project-1", "view-1", {
    quickFilter: null,
    sortKey: undefined,
  });

  assert.deepEqual(createPayload, {
    projectId: "project-1",
    worldId: "world-1",
    name: "Characters",
    loreTypeId: "type-character",
    quickFilter: null,
    sortDirection: null,
    visibleColumnsJson: null,
  });
  assert.deepEqual(updatePayload, {
    projectId: "project-1",
    viewId: "view-1",
    quickFilter: null,
  });
});
