import test from "node:test";
import assert from "node:assert/strict";

import {
  WORKBENCH_TAB,
  isWorkbenchOnlyTabState,
  pruneTabsForWorlds,
  removeTabWithFallback,
  resolveDocumentForTabOpen,
  upsertTab,
} from "../../.tmp-frontend-tests/src/hooks/tabState.js";

test("isWorkbenchOnlyTabState only accepts the single default workbench tab", () => {
  assert.equal(isWorkbenchOnlyTabState([WORKBENCH_TAB]), true);
  assert.equal(isWorkbenchOnlyTabState([]), false);
  assert.equal(
    isWorkbenchOnlyTabState([
      WORKBENCH_TAB,
      { id: "doc:1", kind: "editor", label: "Doc", icon: "D", refId: "1", worldId: "world-1" },
    ]),
    false,
  );
});

test("removeTabWithFallback restores the workbench when the last tab closes", () => {
  const result = removeTabWithFallback(
    [{ id: "doc:1", kind: "editor", label: "Doc", icon: "D", refId: "1", worldId: "world-1" }],
    "doc:1",
  );

  assert.equal(result.removed, true);
  assert.deepEqual(result.normalizedNextTabs, [WORKBENCH_TAB]);
  assert.equal(result.closingIndex, 0);
});

test("upsertTab replaces the active temporary new tab when requested", () => {
  const nextTab = { id: "doc:2", kind: "editor", label: "Scene", icon: "D", refId: "2", worldId: "world-1" };
  const tabs = [
    WORKBENCH_TAB,
    { id: "new:abc", kind: "new", label: "New Tab", icon: "+", worldId: "world-1" },
  ];

  const result = upsertTab(tabs, nextTab, "new:abc", true);

  assert.deepEqual(result, [WORKBENCH_TAB, nextTab]);
});

test("resolveDocumentForTabOpen can use a freshly created document before state maps refresh", () => {
  const created = {
    id: "doc-created",
    worldId: "world-1",
    title: "New Document 3",
    contentJson: "",
    folderPath: "",
  };
  const existing = {
    id: "doc-existing",
    worldId: "world-1",
    title: "Existing",
    contentJson: "Draft",
    folderPath: "Scenes",
  };
  const documentsById = new Map([[existing.id, existing]]);

  assert.deepEqual(resolveDocumentForTabOpen(created, documentsById), created);
  assert.deepEqual(resolveDocumentForTabOpen(existing, documentsById), existing);
});

test("resolveDocumentForTabOpen keeps failed document creation from navigating", () => {
  assert.equal(resolveDocumentForTabOpen(null, new Map()), null);
  assert.equal(resolveDocumentForTabOpen(undefined, new Map()), null);
});

test("pruneTabsForWorlds removes tabs for deleted worlds and tracks active tab presence", () => {
  const tabs = [
    WORKBENCH_TAB,
    { id: "doc:1", kind: "editor", label: "Doc", icon: "D", refId: "1", worldId: "world-1" },
    { id: "lore:1", kind: "lore", label: "Lore", icon: "L", refId: "1", worldId: "world-2" },
  ];

  const result = pruneTabsForWorlds(tabs, "lore:1", new Set(["world-1"]));

  assert.equal(result.changed, true);
  assert.equal(result.activeTabStillPresent, false);
  assert.deepEqual(result.nextTabs, [
    WORKBENCH_TAB,
    { id: "doc:1", kind: "editor", label: "Doc", icon: "D", refId: "1", worldId: "world-1" },
  ]);
});
