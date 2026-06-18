import test from "node:test";
import assert from "node:assert/strict";

import {
  buildLoreCreateDefaultCustomFields,
  buildLoreCreateDraftPayload,
  buildLoreEditorDraftPage,
  getLoreCreateDraftState,
  getLoreSelectionActionState,
  getLoreSelectionCreateState,
  getDocumentEditorModeState,
  buildDocumentModeSurfaceState,
  buildEditorToolbarDocumentState,
  resolveDocumentPreviewContent,
  buildInitialLoreFields,
  buildLoreTypeCounts,
  collectLoreStats,
  countNonEmptyWords,
  setLoreCreateCustomFieldValue,
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

test("new lore draft state requires a title and uses the selected lore type label", () => {
  const characterType = {
    id: "type-character",
    name: "Character",
    slug: "character",
    order: 0,
    isSystem: true,
    fieldDefinitions: [],
  };

  assert.deepEqual(getLoreCreateDraftState({ title: "   ", loreType: characterType }), {
    title: "",
    canCreate: false,
    buttonLabel: "Create Character",
    titlePlaceholder: "New Character title",
  });

  assert.deepEqual(getLoreCreateDraftState({ title: " Mara Quill ", loreType: characterType }), {
    title: "Mara Quill",
    canCreate: true,
    buttonLabel: "Create Character",
    titlePlaceholder: "New Character title",
  });
});

test("selected text lore state trims selection and blocks blank selection", () => {
  const factionType = {
    id: "type-faction",
    name: "Faction",
    slug: "faction",
    order: 0,
    isSystem: true,
    fieldDefinitions: [],
  };

  assert.deepEqual(getLoreSelectionCreateState({
    selectedText: "   ",
    title: "",
    loreType: factionType,
  }), {
    selectionTitle: "",
    title: "",
    canOpen: false,
    canCreate: false,
    buttonLabel: "Create Faction",
    titleWasTruncated: false,
  });

  assert.deepEqual(getLoreSelectionCreateState({
    selectedText: "  Blacktooth   clan ",
    title: "",
    loreType: factionType,
  }), {
    selectionTitle: "Blacktooth clan",
    title: "Blacktooth clan",
    canOpen: true,
    canCreate: false,
    buttonLabel: "Create Faction",
    titleWasTruncated: false,
  });
});

test("selected text lore state allows title edits before creation and blocks in-flight create", () => {
  const placeType = {
    id: "type-place",
    name: "Place",
    slug: "place",
    order: 0,
    isSystem: true,
    fieldDefinitions: [],
  };

  assert.deepEqual(getLoreSelectionCreateState({
    selectedText: "old name",
    title: "Blacktooth Hold",
    loreType: placeType,
    isCreating: true,
  }), {
    selectionTitle: "old name",
    title: "Blacktooth Hold",
    canOpen: true,
    canCreate: false,
    buttonLabel: "Create Place",
    titleWasTruncated: false,
  });
});

test("selected text lore floating action only shows for valid editor selection state", () => {
  const factionType = {
    id: "type-faction",
    name: "Faction",
    slug: "faction",
    order: 0,
    isSystem: true,
    fieldDefinitions: [],
  };

  assert.deepEqual(getLoreSelectionActionState({
    selectedText: "  Blacktooth clan ",
    loreType: factionType,
  }), {
    selectionTitle: "Blacktooth clan",
    canShow: true,
    label: "Create Lore",
  });

  assert.equal(getLoreSelectionActionState({
    selectedText: "   ",
    loreType: factionType,
  }).canShow, false);

  assert.equal(getLoreSelectionActionState({
    selectedText: "Blacktooth clan",
    loreType: null,
  }).canShow, false);

  assert.equal(getLoreSelectionActionState({
    selectedText: "Blacktooth clan",
    loreType: factionType,
    hasActiveDocument: false,
  }).canShow, false);

  assert.equal(getLoreSelectionActionState({
    selectedText: "Blacktooth clan",
    loreType: factionType,
    isDialogOpen: true,
  }).canShow, false);
});

test("document editor mode state scopes readable links to preview", () => {
  assert.deepEqual(getDocumentEditorModeState({
    isPreviewOpen: false,
    readableLoreLinks: true,
  }), {
    mode: "write",
    canUseReadableLinks: false,
    readableLoreLinksActive: false,
  });

  assert.deepEqual(getDocumentEditorModeState({
    isPreviewOpen: true,
    readableLoreLinks: false,
  }), {
    mode: "preview",
    canUseReadableLinks: true,
    readableLoreLinksActive: false,
  });

  assert.deepEqual(getDocumentEditorModeState({
    isPreviewOpen: true,
    readableLoreLinks: true,
  }), {
    mode: "preview",
    canUseReadableLinks: true,
    readableLoreLinksActive: true,
  });
});

test("document preview content uses live write snapshot without mutating active document source", () => {
  const savedContent = "Saved [[Urzoth]] source";
  const unsavedSnapshot = "Unsaved \u201cWhite Touch\u201d draft with [[Urzoth]]";

  assert.equal(resolveDocumentPreviewContent(savedContent, unsavedSnapshot), unsavedSnapshot);
  assert.equal(resolveDocumentPreviewContent(savedContent, null), savedContent);
  assert.equal(savedContent, "Saved [[Urzoth]] source");
});

test("document preview content preserves known-good unicode sample exactly", () => {
  const text = "\u201cSend Valral,\u201d he said. \u201cYou\u2019re not pale.\u201d\nI\u2019d rather keep this \u2014 even if it\u2019s strange.\n[[Urzoth]] watched.\n\n\ud83d\udd25";

  assert.equal(resolveDocumentPreviewContent("Saved text", text), text);
  assert.equal(resolveDocumentPreviewContent(text, null), text);
});

test("document mode surface state keeps active title and body across write and preview", () => {
  const documentA = {
    title: "White Touch",
    body: "White Touch body with [[Urzoth]]",
    draft: "Unsaved White Touch draft",
  };
  const documentB = {
    title: "New Document 1",
    body: "New Document 1 body",
  };

  assert.deepEqual(buildDocumentModeSurfaceState({
    documentTitle: documentA.title,
    documentContent: documentA.body,
    isPreviewOpen: false,
  }), {
    mode: "write",
    title: documentA.title,
    body: documentA.body,
  });

  assert.deepEqual(buildDocumentModeSurfaceState({
    documentTitle: documentA.title,
    documentContent: documentA.body,
    previewContentSnapshot: documentA.draft,
    isPreviewOpen: true,
  }), {
    mode: "preview",
    title: documentA.title,
    body: documentA.draft,
  });

  assert.deepEqual(buildDocumentModeSurfaceState({
    documentTitle: documentB.title,
    documentContent: documentB.body,
    previewContentSnapshot: null,
    isPreviewOpen: true,
  }), {
    mode: "preview",
    title: documentB.title,
    body: documentB.body,
  });
});

test("editor toolbar document state keeps the active document visible across modes", () => {
  const orderedDocuments = [
    { id: "doc-white-touch", title: "White Touch" },
    { id: "doc-new-2", title: "New Document 2" },
  ];

  assert.deepEqual(buildEditorToolbarDocumentState({
    activeDocumentId: "doc-white-touch",
    orderedDocuments,
  }), {
    selectedDocumentId: "doc-white-touch",
    selectedDocumentTitle: "White Touch",
    canSwitchDocuments: true,
  });

  assert.deepEqual(buildEditorToolbarDocumentState({
    activeDocumentId: "doc-new-2",
    orderedDocuments,
  }), {
    selectedDocumentId: "doc-new-2",
    selectedDocumentTitle: "New Document 2",
    canSwitchDocuments: true,
  });
});

test("new lore draft payload uses entered title selected type template and tags", () => {
  assert.equal(
    buildLoreCreateDraftPayload({
      title: " ",
      loreTypeId: "type-character",
      templateId: "template-character",
      tags: "lead",
    }),
    null,
  );

  assert.deepEqual(
    buildLoreCreateDraftPayload({
      title: " Mara Quill ",
      loreTypeId: "type-character",
      templateId: "template-character",
      tags: "lead, courier",
      details: "Courier with a sealed letter.",
      customFields: { status: "Active" },
    }),
    {
      title: "Mara Quill",
      loreTypeId: "type-character",
      templateId: "template-character",
      tags: "lead, courier",
      details: "Courier with a sealed letter.",
      customFields: { status: "Active" },
    },
  );
});

test("new lore draft payload keeps no template valid and includes details", () => {
  assert.deepEqual(
    buildLoreCreateDraftPayload({
      title: "Red Harbor",
      loreTypeId: "type-location",
      templateId: null,
      tags: "port, fog",
      details: "A declining harbor city.",
    }),
    {
      title: "Red Harbor",
      loreTypeId: "type-location",
      templateId: null,
      tags: "port, fog",
      details: "A declining harbor city.",
      customFields: {},
    },
  );
});

test("new lore custom field drafts seed defaults and normalize typed edits", () => {
  const loreType = {
    id: "type-character",
    name: "Character",
    slug: "character",
    order: 0,
    isSystem: true,
    fieldDefinitions: [
      { id: "field-status", name: "Status", key: "status", type: "select", options: ["Draft", "Active"], required: false, order: 0, defaultValue: "Draft" },
      { id: "field-active", name: "Active", key: "active", type: "checkbox", options: [], required: false, order: 1, defaultValue: false },
      { id: "field-age", name: "Age", key: "age", type: "number", options: [], required: false, order: 2 },
      { id: "field-species", name: "Species", key: "species", type: "text", options: [], required: false, order: 3 },
    ],
  };

  const seeded = buildLoreCreateDefaultCustomFields(loreType);
  const editedAge = setLoreCreateCustomFieldValue(seeded, loreType.fieldDefinitions[2], "31");
  const editedActive = setLoreCreateCustomFieldValue(editedAge, loreType.fieldDefinitions[1], true);
  const editedStatus = setLoreCreateCustomFieldValue(editedActive, loreType.fieldDefinitions[0], "Active");
  const editedSpecies = setLoreCreateCustomFieldValue(editedStatus, loreType.fieldDefinitions[3], "Human");

  assert.deepEqual(seeded, {
    status: "Draft",
    active: false,
  });
  assert.deepEqual(editedSpecies, {
    status: "Active",
    active: true,
    age: 31,
    species: "Human",
  });
});

test("initial lore fields include draft details and custom field overrides", () => {
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
        { id: "field-status", name: "Status", key: "status", type: "select", options: ["Draft", "Active"], required: false, order: 0, defaultValue: "Draft" },
        { id: "field-age", name: "Age", key: "age", type: "number", options: [], required: false, order: 1 },
      ],
    },
    {
      details: "Starts with useful notes.",
      customFields: { status: "Active", age: 31 },
    },
  );
  const fields = JSON.parse(fieldsJson);

  assert.equal(fields.details, "Starts with useful notes.");
  assert.deepEqual(fields.customFields, {
    status: "Active",
    age: 31,
  });
});

test("existing lore page title edits preserve fields custom fields and metadata", () => {
  const fieldsJson = JSON.stringify({
    loreTypeId: "type-character",
    templateId: "template-character",
    traits: [{ id: "trait-role", name: "Role", value: "Scout" }],
    details: "Carries sealed letters.",
    customFields: {
      species: "Human",
      active: true,
    },
  });
  const page = {
    id: "lore-mara",
    worldId: "world-1",
    title: "Mara",
    type: "Character",
    tagsJson: "lead",
    fieldsJson,
    coverImagePath: "covers/mara.png",
  };

  const updated = buildLoreEditorDraftPage(page, {
    title: "Mara Quill",
    type: "Character",
    tagsJson: "lead",
    fieldsJson,
  });

  assert.equal(updated.title, "Mara Quill");
  assert.equal(updated.fieldsJson, fieldsJson);
  assert.equal(updated.tagsJson, "lead");
  assert.equal(updated.coverImagePath, "covers/mara.png");
  assert.notEqual(updated, page);
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
