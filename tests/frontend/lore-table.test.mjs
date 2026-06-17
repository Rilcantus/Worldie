import test from "node:test";
import assert from "node:assert/strict";

import {
  applyLoreTableCustomFieldEdit,
  applyLoreTableView,
  buildLoreTableCsv,
  buildLoreTableCsvFilename,
  buildLoreTableCsvWithOptions,
  buildLoreTableCsvImportDrafts,
  buildLoreTableCsvImportPreview,
  buildLoreTableCsvUpdateDrafts,
  buildLoreTableUpdateCsvFilename,
  buildLoreTableViewDraft,
  canApplyLoreTableCsvUpdate,
  buildLoreTableModel,
  canApplyLoreTableCsvImport,
  canExportLoreTableCsv,
  clearHiddenColumnSort,
  formatLoreTableValue,
  getLoreTableCreateState,
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

test("lore table create state disables creation without a selected type or title", () => {
  assert.deepEqual(getLoreTableCreateState({ title: "Mara Quill", loreType: null, isCreating: false }), {
    title: "Mara Quill",
    buttonLabel: "Add Lore Page",
    canCreate: false,
  });
  assert.deepEqual(getLoreTableCreateState({ title: "   ", loreType: characterType, isCreating: false }), {
    title: "",
    buttonLabel: "Add Character",
    canCreate: false,
  });
  assert.deepEqual(getLoreTableCreateState({ title: "Mara Quill", loreType: characterType, isCreating: true }), {
    title: "Mara Quill",
    buttonLabel: "Add Character",
    canCreate: false,
  });
});

test("lore table create state allows a titled page for the selected lore type", () => {
  assert.deepEqual(getLoreTableCreateState({ title: "  Mara Quill  ", loreType: characterType, isCreating: false }), {
    title: "Mara Quill",
    buttonLabel: "Add Character",
    canCreate: true,
  });
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

test("created lore table page appears in selected type rows while preserving filter and sort options", () => {
  const createdPage = {
    id: "lore-new",
    worldId: "world-1",
    title: "Mara Ash",
    type: "Character",
    fieldsJson: JSON.stringify({
      loreTypeId: "type-character",
      traits: [],
      details: "",
      customFields: { species: "Human", age: 19 },
    }),
  };
  const model = buildLoreTableModel([createdPage, ...sortablePages], [characterType, placeType], "type-character", {
    filterText: "mara",
    sort: { columnId: "field-age", direction: "asc" },
    visibleColumnIds: ["field-species", "field-age"],
  });

  assert.deepEqual(
    model.columns.map((column) => column.id),
    ["title", "type", "field-species", "field-age", "updated"],
  );
  assert.deepEqual(model.rows.map((row) => row.page.id), ["lore-new", "lore-mara"]);
  assert.equal(model.rows[0].cells["field-age"], "19");
});

test("lore table CSV exports core headers and visible custom columns in table order", () => {
  const model = buildLoreTableModel(sortablePages, [characterType, placeType], "type-character", {
    visibleColumnIds: ["field-species", "field-age"],
    sort: { columnId: "title", direction: "asc" },
  });

  const csv = buildLoreTableCsv(model);

  assert.equal(csv.split("\n")[0], "Name,Type,Species,Age,Updated");
  assert.equal(csv.includes("Active"), false);
  assert.equal(csv.includes("First Seen"), false);
});

test("lore table CSV can include Worldie ID for update-ready exports without changing normal export", () => {
  const model = buildLoreTableModel(sortablePages, [characterType, placeType], "type-character", {
    visibleColumnIds: ["field-species"],
    sort: { columnId: "title", direction: "asc" },
  });

  assert.equal(buildLoreTableCsv(model).split("\n")[0], "Name,Type,Species,Updated");
  assert.equal(
    buildLoreTableCsvWithOptions(model, { includeWorldieId: true }).split("\n")[0],
    "Worldie ID,Name,Type,Species,Updated",
  );
  assert.equal(buildLoreTableCsvWithOptions(model, { includeWorldieId: true }).split("\n")[1].startsWith("lore-asha,Asha Reed"), true);
  assert.equal(buildLoreTableUpdateCsvFilename("Dusk/Fen", "Character: Lead"), "Dusk-Fen - Character- Lead Table Update Ready.csv");
});

test("Worldie ID is recognized as matching metadata rather than a custom field", () => {
  const preview = buildLoreTableCsvImportPreview("Worldie ID,Name,Species\n,Mara Quill,Human\n", characterType);

  assert.deepEqual(
    preview.mappedColumns.map((column) => [column.header, column.target, column.fieldKey ?? ""]),
    [["Worldie ID", "worldie_id", ""], ["Name", "title", ""], ["Species", "custom_field", "species"]],
  );
  assert.deepEqual(preview.sampleRows[0].customFields, { species: "Human" });
  assert.equal(Object.prototype.hasOwnProperty.call(preview.sampleRows[0].customFields, "Worldie ID"), false);
});

test("lore table CSV excludes filtered-out rows and preserves sorted order", () => {
  const filtered = buildLoreTableModel(sortablePages, [characterType, placeType], "type-character", {
    filterText: "human",
    sort: { columnId: "title", direction: "desc" },
    visibleColumnIds: ["field-species"],
  });

  const csv = buildLoreTableCsv(filtered);
  const lines = csv.split("\n");

  assert.deepEqual(lines.slice(1).map((line) => line.split(",")[0]), ["Mara Quill", "Asha Reed"]);
  assert.equal(csv.includes("Bran Vale"), false);
  assert.equal(csv.includes("Red Harbor"), false);
});

test("lore table CSV escapes commas quotes and newlines", () => {
  const pages = [
    {
      id: "lore-quoted",
      worldId: "world-1",
      title: "Mara, \"Ash\"\nLine",
      type: "Character",
      fieldsJson: JSON.stringify({
        loreTypeId: "type-character",
        customFields: { species: "Human, \"North\"\nCoast" },
      }),
      updatedAt: "2026-06-01",
    },
  ];
  const model = buildLoreTableModel(pages, [characterType], "type-character", {
    visibleColumnIds: ["field-species"],
  });

  const csv = buildLoreTableCsv(model);

  assert.equal(csv, 'Name,Type,Species,Updated\n"Mara, ""Ash""\nLine",Character,"Human, ""North""\nCoast",2026-06-01');
});

test("lore table CSV exports missing values as blanks and checkbox values predictably", () => {
  const missing = buildLoreTableModel(sortablePages, [characterType, placeType], "type-character", {
    filterText: "asha",
    visibleColumnIds: ["field-age", "field-active"],
  });
  const checkbox = buildLoreTableModel(sortablePages, [characterType, placeType], "type-character", {
    filterText: "bran",
    visibleColumnIds: ["field-active"],
  });

  assert.equal(buildLoreTableCsv(missing), "Name,Type,Age,Active,Updated\nAsha Reed,Character,,Yes,");
  assert.equal(buildLoreTableCsv(checkbox), "Name,Type,Active,Updated\nBran Vale,Character,No,2026-05-01");
});

test("lore table CSV availability and filename stay safe without a selected lore type", () => {
  const emptyModel = buildLoreTableModel([], [], null);

  assert.equal(canExportLoreTableCsv(emptyModel), false);
  assert.equal(buildLoreTableCsv(emptyModel), "");
  assert.equal(buildLoreTableCsvFilename("Dusk/Fen", "Character: Lead"), "Dusk-Fen - Character- Lead Table.csv");
});

test("CSV import preview parses simple CSV and maps Name plus custom field display names", () => {
  const preview = buildLoreTableCsvImportPreview("Name,Species,Age\nMara Quill,Human,31\n", characterType);

  assert.deepEqual(preview.headers, ["Name", "Species", "Age"]);
  assert.equal(preview.rowCount, 1);
  assert.deepEqual(
    preview.mappedColumns.map((column) => [column.header, column.target, column.fieldKey ?? "title"]),
    [["Name", "title", "title"], ["Species", "custom_field", "species"], ["Age", "custom_field", "age"]],
  );
  assert.deepEqual(preview.sampleRows[0], {
    rowNumber: 2,
    title: "Mara Quill",
    customFields: { species: "Human", age: 31 },
    match: {
      status: "new",
      worldieId: null,
      matchedPageId: null,
      matchedPageTitle: null,
    },
    warnings: [],
    errors: [],
  });
});

test("CSV import preview parses quoted commas escaped quotes and newlines", () => {
  const preview = buildLoreTableCsvImportPreview(
    'Title,Species,Status\n"Mara, ""Ash""","Human\nNorth",Active\n',
    characterType,
  );

  assert.equal(preview.sampleRows[0].title, 'Mara, "Ash"');
  assert.equal(preview.sampleRows[0].customFields.species, "Human\nNorth");
  assert.equal(preview.sampleRows[0].customFields.status, "Active");
  assert.deepEqual(preview.errors, []);
});

test("CSV import preview maps title aliases and custom fields by key", () => {
  const preview = buildLoreTableCsvImportPreview("Lore Page,first_seen,active\nAsha Reed,2026-01-02,true\n", characterType);

  assert.equal(preview.mappedColumns[0].target, "title");
  assert.deepEqual(
    preview.mappedColumns.map((column) => column.fieldKey).filter(Boolean),
    ["first_seen", "active"],
  );
  assert.equal(preview.sampleRows[0].customFields.first_seen, "2026-01-02");
  assert.equal(preview.sampleRows[0].customFields.active, true);
});

test("CSV import preview ignores core export columns and reports unmapped columns", () => {
  const preview = buildLoreTableCsvImportPreview("Name,Type,Updated,Nickname\nMara Quill,Character,2026-06-01,Quill\n", characterType);

  assert.deepEqual(preview.ignoredColumns.map((column) => column.header), ["Type", "Updated"]);
  assert.deepEqual(preview.unmappedColumns.map((column) => column.header), ["Nickname"]);
  assert.equal(preview.sampleRows[0].title, "Mara Quill");
});

test("CSV import preview reports missing title column as a blocking error", () => {
  const preview = buildLoreTableCsvImportPreview("Species,Age\nHuman,31\n", characterType);

  assert.deepEqual(preview.errors, ["CSV needs a Name, Title, or Lore Page column before it can be imported."]);
  assert.equal(canApplyLoreTableCsvImport(preview, characterType), false);
  assert.equal(preview.rowCount, 1);
});

test("CSV import preview validates number and checkbox fields", () => {
  const preview = buildLoreTableCsvImportPreview("Name,Age,Active\nMara Quill,old,maybe\nBran Vale,7,0\n", characterType);

  assert.equal(preview.sampleRows[0].customFields.age, "old");
  assert.equal(preview.sampleRows[0].customFields.active, "maybe");
  assert.equal(preview.sampleRows[1].customFields.age, 7);
  assert.equal(preview.sampleRows[1].customFields.active, false);
  assert.deepEqual(preview.sampleRows[0].warnings, [
    "Row 2: Age is not a valid number.",
    "Row 2: Active is not a recognized checkbox value.",
  ]);
  assert.deepEqual(preview.sampleRows[0].errors, [
    "Row 2: Age is not a valid number.",
    "Row 2: Active is not a recognized checkbox value.",
  ]);
  assert.equal(canApplyLoreTableCsvImport(preview, characterType), false);
});

test("CSV import preview ignores empty rows with a warning", () => {
  const preview = buildLoreTableCsvImportPreview("Name,Species\n\nMara Quill,Human\n,\n", characterType);

  assert.equal(preview.rowCount, 1);
  assert.deepEqual(preview.warnings, ["Ignored 2 empty rows."]);
  assert.equal(preview.sampleRows[0].title, "Mara Quill");
});

test("CSV import preview matches known Worldie IDs against existing selected type pages", () => {
  const existingPages = [
    {
      id: "11111111-1111-4111-8111-111111111111",
      worldId: "world-1",
      title: "Mara Quill",
      type: "Character",
      fieldsJson: JSON.stringify({ loreTypeId: "type-character", customFields: {} }),
    },
  ];
  const preview = buildLoreTableCsvImportPreview(
    "Worldie ID,Name,Species\n11111111-1111-4111-8111-111111111111,Mara Quill,Human\n",
    characterType,
    { existingPages },
  );

  assert.equal(preview.sampleRows[0].match.status, "matched");
  assert.equal(preview.sampleRows[0].match.matchedPageTitle, "Mara Quill");
  assert.deepEqual(preview.matchSummary, { matched: 1, new: 0, blocked: 0, warnings: 1 });
  assert.equal(canApplyLoreTableCsvImport(preview, characterType), true);
});

test("CSV import preview reports unknown malformed duplicate and conflicting Worldie IDs safely", () => {
  const existingPages = [
    {
      id: "11111111-1111-4111-8111-111111111111",
      worldId: "world-1",
      title: "Mara Quill",
      type: "Character",
      fieldsJson: JSON.stringify({ loreTypeId: "type-character", customFields: {} }),
    },
  ];
  const preview = buildLoreTableCsvImportPreview(
    [
      "Worldie ID,Name,Species",
      "22222222-2222-4222-8222-222222222222,Unknown Hero,Human",
      "not-a-uuid,Bad Hero,Human",
      "11111111-1111-4111-8111-111111111111,Wrong Title,Human",
      "11111111-1111-4111-8111-111111111111,Mara Quill,Human",
    ].join("\n"),
    characterType,
    { existingPages },
  );

  assert.deepEqual(
    preview.rows.map((row) => row.match.status),
    ["unknown_id", "malformed_id", "title_conflict", "duplicate_id"],
  );
  assert.equal(preview.matchSummary.new, 1);
  assert.equal(preview.matchSummary.blocked, 3);
  assert.equal(canApplyLoreTableCsvImport(preview, characterType), false);
  assert.equal(preview.errors.some((message) => message.includes("Worldie ID is malformed")), true);
  assert.equal(preview.errors.some((message) => message.includes("matches \"Mara Quill\"")), true);
  assert.equal(preview.errors.some((message) => message.includes("duplicate Worldie ID")), true);
});

test("CSV import preview blocks Worldie IDs that match a page from another selected type", () => {
  const existingPages = [
    {
      id: "33333333-3333-4333-8333-333333333333",
      worldId: "world-1",
      title: "Red Harbor",
      type: "Place",
      fieldsJson: JSON.stringify({ loreTypeId: "type-place", customFields: {} }),
    },
  ];
  const preview = buildLoreTableCsvImportPreview(
    "Worldie ID,Name\n33333333-3333-4333-8333-333333333333,Red Harbor\n",
    characterType,
    { existingPages },
  );

  assert.equal(preview.sampleRows[0].match.status, "wrong_type");
  assert.equal(preview.matchSummary.blocked, 1);
  assert.equal(canApplyLoreTableCsvImport(preview, characterType), false);
});

test("CSV import drafts still create new pages and do not update matched Worldie IDs", () => {
  const existingPages = [
    {
      id: "11111111-1111-4111-8111-111111111111",
      worldId: "world-1",
      title: "Mara Quill",
      type: "Character",
      fieldsJson: JSON.stringify({ loreTypeId: "type-character", customFields: { species: "Original" } }),
    },
  ];
  const preview = buildLoreTableCsvImportPreview(
    "Worldie ID,Name,Species\n11111111-1111-4111-8111-111111111111,Mara Quill,Human\n",
    characterType,
    { existingPages },
  );
  const drafts = buildLoreTableCsvImportDrafts(preview, characterType);

  assert.equal(drafts.length, 1);
  assert.equal(drafts[0].title, "Mara Quill");
  assert.notEqual(drafts[0].loreTypeId, existingPages[0].id);
  assert.equal(JSON.parse(drafts[0].fieldsJson).customFields.species, "Human");
});

test("CSV update apply state requires a selected type clean preview and matched rows only", () => {
  const existingPages = [
    {
      id: "11111111-1111-4111-8111-111111111111",
      worldId: "world-1",
      title: "Mara Quill",
      type: "Character",
      fieldsJson: JSON.stringify({ loreTypeId: "type-character", customFields: {} }),
    },
  ];
  const matchedPreview = buildLoreTableCsvImportPreview(
    "Worldie ID,Name,Species\n11111111-1111-4111-8111-111111111111,Mara Quill,Human\n",
    characterType,
    { existingPages },
  );
  const noIdPreview = buildLoreTableCsvImportPreview("Name,Species\nMara Quill,Human\n", characterType, { existingPages });
  const invalidPreview = buildLoreTableCsvImportPreview(
    "Worldie ID,Name\nnot-a-uuid,Mara Quill\n",
    characterType,
    { existingPages },
  );

  assert.equal(canApplyLoreTableCsvUpdate(null, characterType), false);
  assert.equal(canApplyLoreTableCsvUpdate(matchedPreview, null), false);
  assert.equal(canApplyLoreTableCsvUpdate(invalidPreview, characterType), false);
  assert.equal(canApplyLoreTableCsvUpdate(noIdPreview, characterType), false);
  assert.equal(canApplyLoreTableCsvUpdate(matchedPreview, characterType, true), false);
  assert.equal(canApplyLoreTableCsvUpdate(matchedPreview, characterType), true);
});

test("CSV update apply state blocks unknown ID rows even when create-only import could proceed", () => {
  const existingPages = [
    {
      id: "11111111-1111-4111-8111-111111111111",
      worldId: "world-1",
      title: "Mara Quill",
      type: "Character",
      fieldsJson: JSON.stringify({ loreTypeId: "type-character", customFields: {} }),
    },
  ];
  const preview = buildLoreTableCsvImportPreview(
    [
      "Worldie ID,Name,Species",
      "11111111-1111-4111-8111-111111111111,Mara Quill,Human",
      "22222222-2222-4222-8222-222222222222,Unknown Hero,Elf",
    ].join("\n"),
    characterType,
    { existingPages },
  );

  assert.equal(preview.errors.length, 0);
  assert.equal(canApplyLoreTableCsvImport(preview, characterType), true);
  assert.equal(canApplyLoreTableCsvUpdate(preview, characterType), false);
  assert.deepEqual(buildLoreTableCsvUpdateDrafts(preview, characterType, existingPages), []);
});

test("CSV update drafts merge nonblank mapped custom fields and preserve lore metadata", () => {
  const existingPage = {
    id: "11111111-1111-4111-8111-111111111111",
    worldId: "world-1",
    title: "Mara Quill",
    type: "Character",
    tagsJson: "protagonist",
    fieldsJson: JSON.stringify({
      loreTypeId: "type-character",
      templateId: "template-character",
      traits: [{ id: "trait-1", name: "Role", value: "Courier" }],
      details: "Carries sealed letters.",
      customFields: {
        species: "Human",
        age: 31,
        active: true,
        status: "Active",
        manual_extra: "keep me",
        stale_field: "also keep me",
      },
    }),
  };
  const preview = buildLoreTableCsvImportPreview(
    "Worldie ID,Name,Species,Age,Active,Status,Type,Updated,Nickname\n11111111-1111-4111-8111-111111111111,Mara Quill,Half-elf,,no,,Character,2026-06-01,Quill\n",
    characterType,
    { existingPages: [existingPage] },
  );

  const drafts = buildLoreTableCsvUpdateDrafts(preview, characterType, [existingPage]);
  const fields = JSON.parse(drafts[0].fieldsJson);

  assert.equal(drafts.length, 1);
  assert.equal(drafts[0].loreId, existingPage.id);
  assert.equal(fields.loreTypeId, "type-character");
  assert.equal(fields.templateId, "template-character");
  assert.deepEqual(fields.traits, [{ id: "trait-1", name: "Role", value: "Courier" }]);
  assert.equal(fields.details, "Carries sealed letters.");
  assert.deepEqual(fields.customFields, {
    species: "Half-elf",
    age: 31,
    active: false,
    status: "Active",
    manual_extra: "keep me",
    stale_field: "also keep me",
  });
  assert.equal(Object.prototype.hasOwnProperty.call(fields.customFields, "Nickname"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(fields.customFields, "nickname"), false);
});

test("CSV update drafts do not change titles when applying matched rows", () => {
  const existingPage = {
    id: "11111111-1111-4111-8111-111111111111",
    worldId: "world-1",
    title: "Mara Quill",
    type: "Character",
    fieldsJson: JSON.stringify({ loreTypeId: "type-character", traits: [], details: "", customFields: { species: "Human" } }),
  };
  const preview = buildLoreTableCsvImportPreview(
    "Worldie ID,Name,Species\n11111111-1111-4111-8111-111111111111,Mara Renamed,Elf\n",
    characterType,
    { existingPages: [existingPage] },
  );

  assert.equal(preview.sampleRows[0].match.status, "title_conflict");
  assert.equal(canApplyLoreTableCsvUpdate(preview, characterType), false);
  assert.deepEqual(buildLoreTableCsvUpdateDrafts(preview, characterType, [existingPage]), []);
});

test("CSV import apply state requires a type no blocking errors valid rows and no in-flight import", () => {
  const preview = buildLoreTableCsvImportPreview("Name,Species\nMara Quill,Human\n", characterType);
  const emptyPreview = buildLoreTableCsvImportPreview("Name,Species\n\n", characterType);
  const invalidPreview = buildLoreTableCsvImportPreview("Species\nHuman\n", characterType);

  assert.equal(canApplyLoreTableCsvImport(preview, characterType), true);
  assert.equal(canApplyLoreTableCsvImport(preview, null), false);
  assert.equal(canApplyLoreTableCsvImport(preview, characterType, true), false);
  assert.equal(canApplyLoreTableCsvImport(emptyPreview, characterType), false);
  assert.equal(canApplyLoreTableCsvImport(invalidPreview, characterType), false);
});

test("CSV import drafts create new lore page payloads with titles mapped fields and defaults", () => {
  const typeWithDefaults = {
    ...characterType,
    fieldDefinitions: [
      ...characterType.fieldDefinitions,
      { id: "field-rank", name: "Rank", key: "rank", type: "text", options: [], required: false, order: 5, defaultValue: "Novice" },
      { id: "field-veteran", name: "Veteran", key: "veteran", type: "checkbox", options: [], required: false, order: 6, defaultValue: false },
    ],
  };
  const preview = buildLoreTableCsvImportPreview(
    "Title,Species,Age,Active,Nickname\nMara Quill,Human,31,yes,Quill\nBran Vale,Elf,,0,Branch\n",
    typeWithDefaults,
  );

  const drafts = buildLoreTableCsvImportDrafts(preview, typeWithDefaults);
  const firstFields = JSON.parse(drafts[0].fieldsJson);
  const secondFields = JSON.parse(drafts[1].fieldsJson);

  assert.equal(drafts.length, 2);
  assert.equal(drafts[0].title, "Mara Quill");
  assert.equal(drafts[0].loreTypeId, "type-character");
  assert.deepEqual(firstFields.customFields, {
    rank: "Novice",
    veteran: false,
    species: "Human",
    age: 31,
    active: true,
  });
  assert.deepEqual(secondFields.customFields, {
    rank: "Novice",
    veteran: false,
    species: "Elf",
    active: false,
  });
  assert.equal(Object.prototype.hasOwnProperty.call(firstFields.customFields, "Nickname"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(firstFields.customFields, "nickname"), false);
});

test("CSV import drafts are empty when preview cannot be applied", () => {
  const preview = buildLoreTableCsvImportPreview("Name,Age\nMara Quill,old\n", characterType);

  assert.deepEqual(buildLoreTableCsvImportDrafts(preview, characterType), []);
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
