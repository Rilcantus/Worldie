import test from "node:test";
import assert from "node:assert/strict";

import {
  getEditorTargetForWorld,
  getFirstLorePageByWorld,
  getFirstLorePageByWorldAndType,
  getLoreCategoryTargetForWorld,
  getLoreRootTargetForWorld,
} from "../../.tmp-frontend-tests/src/hooks/workspaceTargets.js";

test("getEditorTargetForWorld prefers the active document when it belongs to the world", () => {
  const documents = [
    { id: "doc-1", worldId: "world-1", title: "Alpha" },
    { id: "doc-2", worldId: "world-1", title: "Beta" },
  ];
  const documentsById = new Map(documents.map((doc) => [doc.id, doc]));

  const result = getEditorTargetForWorld("world-1", "doc-2", documents, documentsById);

  assert.deepEqual(result, documents[1]);
});

test("getEditorTargetForWorld falls back to the first document in the world", () => {
  const documents = [
    { id: "doc-1", worldId: "world-1", title: "Alpha" },
    { id: "doc-2", worldId: "world-2", title: "Beta" },
  ];
  const documentsById = new Map(documents.map((doc) => [doc.id, doc]));

  const result = getEditorTargetForWorld("world-1", "doc-2", documents, documentsById);

  assert.deepEqual(result, documents[0]);
});

test("getFirstLorePageByWorld and getFirstLorePageByWorldAndType keep the first matching page", () => {
  const lorePages = [
    { id: "lore-1", worldId: "world-1", title: "Hero", type: "Character" },
    { id: "lore-2", worldId: "world-1", title: "City", type: "Place" },
    { id: "lore-3", worldId: "world-1", title: "Villain", type: "Character" },
  ];

  const byWorld = getFirstLorePageByWorld(lorePages);
  const byWorldAndType = getFirstLorePageByWorldAndType(lorePages, (page) =>
    page.type === "Character" ? "character" : "place",
  );

  assert.deepEqual(byWorld.get("world-1"), lorePages[0]);
  assert.deepEqual(byWorldAndType.get("world-1:character"), lorePages[0]);
  assert.deepEqual(byWorldAndType.get("world-1:place"), lorePages[1]);
});

test("getLoreRootTargetForWorld prefers the active lore page in the same world", () => {
  const lorePages = [
    { id: "lore-1", worldId: "world-1", title: "Hero", type: "Character" },
    { id: "lore-2", worldId: "world-1", title: "City", type: "Place" },
  ];
  const lorePagesById = new Map(lorePages.map((page) => [page.id, page]));
  const firstLorePageByWorld = getFirstLorePageByWorld(lorePages);

  const result = getLoreRootTargetForWorld("world-1", "lore-2", lorePagesById, firstLorePageByWorld);

  assert.deepEqual(result, lorePages[1]);
});

test("getLoreCategoryTargetForWorld returns the first lore page for the world/type pair", () => {
  const lorePages = [
    { id: "lore-1", worldId: "world-1", title: "Hero", type: "Character" },
    { id: "lore-2", worldId: "world-1", title: "City", type: "Place" },
  ];
  const byWorldAndType = getFirstLorePageByWorldAndType(lorePages, (page) =>
    page.type === "Character" ? "character" : "place",
  );

  const result = getLoreCategoryTargetForWorld("world-1", "place", byWorldAndType);

  assert.deepEqual(result, lorePages[1]);
});
