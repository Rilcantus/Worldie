import test from "node:test";
import assert from "node:assert/strict";

import {
  areProjectsEqual,
  areWorldsEqual,
  buildLoreCategories,
  hydrateWorldUi,
  WORLD_COLORS,
} from "../../.tmp-frontend-tests/src/hooks/projectWorldState.js";

test("buildLoreCategories mirrors lore types with zeroed counts", () => {
  const result = buildLoreCategories([
    { id: "type-1", name: "Character", slug: "character", order: 0, isSystem: true },
    { id: "type-2", name: "Place", slug: "place", order: 1, isSystem: false },
  ]);

  assert.deepEqual(result, [
    { id: "type-1", label: "Character", count: 0, isSystem: true },
    { id: "type-2", label: "Place", count: 0, isSystem: false },
  ]);
});

test("hydrateWorldUi builds world UI state with rotating colors and first world open", () => {
  const worlds = [
    { id: "world-1", projectId: "project-1", title: "Alpha" },
    { id: "world-2", projectId: "project-1", title: "Beta" },
  ];
  const loreTypes = [{ id: "type-1", name: "Character", slug: "character", order: 0, isSystem: true }];

  const result = hydrateWorldUi(worlds, loreTypes);

  assert.deepEqual(result, [
    {
      id: "world-1",
      name: "Alpha",
      color: WORLD_COLORS[0],
      isOpen: true,
      editorCount: 0,
      loreCount: 0,
      loreCategories: [{ id: "type-1", label: "Character", count: 0, isSystem: true }],
    },
    {
      id: "world-2",
      name: "Beta",
      color: WORLD_COLORS[1],
      isOpen: false,
      editorCount: 0,
      loreCount: 0,
      loreCategories: [{ id: "type-1", label: "Character", count: 0, isSystem: true }],
    },
  ]);
});

test("areProjectsEqual compares ordered project snapshots", () => {
  const left = [{ id: "1", title: "Alpha", filepath: "a.worldie", createdAt: "1", lastEdited: "2" }];
  const right = [{ id: "1", title: "Alpha", filepath: "a.worldie", createdAt: "1", lastEdited: "2" }];
  const different = [{ id: "1", title: "Beta", filepath: "a.worldie", createdAt: "1", lastEdited: "2" }];

  assert.equal(areProjectsEqual(left, right), true);
  assert.equal(areProjectsEqual(left, different), false);
});

test("areWorldsEqual compares nested lore category state", () => {
  const left = [{
    id: "world-1",
    name: "Alpha",
    color: WORLD_COLORS[0],
    isOpen: true,
    editorCount: 1,
    loreCount: 2,
    loreCategories: [{ id: "type-1", label: "Character", count: 2, isSystem: true }],
  }];
  const right = [{
    id: "world-1",
    name: "Alpha",
    color: WORLD_COLORS[0],
    isOpen: true,
    editorCount: 1,
    loreCount: 2,
    loreCategories: [{ id: "type-1", label: "Character", count: 2, isSystem: true }],
  }];
  const different = [{
    id: "world-1",
    name: "Alpha",
    color: WORLD_COLORS[0],
    isOpen: true,
    editorCount: 1,
    loreCount: 2,
    loreCategories: [{ id: "type-1", label: "Character", count: 3, isSystem: true }],
  }];

  assert.equal(areWorldsEqual(left, right), true);
  assert.equal(areWorldsEqual(left, different), false);
});
