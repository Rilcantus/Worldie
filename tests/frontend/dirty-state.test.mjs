import test from "node:test";
import assert from "node:assert/strict";

import {
  getDirtyNavigationDecision,
  hasUnsavedDocumentDraft,
  isBlockingSaveState,
  resolveEditorSaveState,
  resolveSaveCompletionState,
  shouldContinueAfterGuard,
  shouldGuardActiveTabRemoval,
} from "../../.tmp-frontend-tests/src/hooks/dirtyState.js";
import { WORKBENCH_TAB, pruneTabsForWorlds, removeTabWithFallback } from "../../.tmp-frontend-tests/src/hooks/tabState.js";
import { getEditorTargetForWorld } from "../../.tmp-frontend-tests/src/hooks/workspaceTargets.js";

test("hasUnsavedDocumentDraft detects dirty editor title, body, and folder changes", () => {
  const activeDocument = {
    id: "doc-1",
    worldId: "world-1",
    title: "Arrival",
    contentJson: "Original draft",
    folderPath: "Scenes",
  };

  assert.equal(
    hasUnsavedDocumentDraft(activeDocument, {
      title: "Arrival",
      contentJson: "Original draft",
      folderPath: "Scenes",
    }),
    false,
  );
  assert.equal(
    hasUnsavedDocumentDraft(activeDocument, {
      title: "Arrival revised",
      contentJson: "Original draft",
      folderPath: "Scenes",
    }),
    true,
  );
  assert.equal(
    hasUnsavedDocumentDraft(activeDocument, {
      title: "Arrival",
      contentJson: "Changed draft",
      folderPath: "Scenes",
    }),
    true,
  );
  assert.equal(
    hasUnsavedDocumentDraft(activeDocument, {
      title: "Arrival",
      contentJson: "Original draft",
      folderPath: "Notes",
    }),
    true,
  );
});

test("dirty navigation decisions block guarded actions until the user confirms", () => {
  assert.deepEqual(getDirtyNavigationDecision(false), {
    needsConfirmation: false,
    allowedWithoutConfirmation: true,
  });
  assert.deepEqual(getDirtyNavigationDecision(true), {
    needsConfirmation: true,
    allowedWithoutConfirmation: false,
  });
});

test("project and world navigation stop if context changes after dirty confirmation", () => {
  assert.equal(shouldContinueAfterGuard("project-1", "project-1"), true);
  assert.equal(shouldContinueAfterGuard("project-1", "project-2"), false);
  assert.equal(shouldContinueAfterGuard("world-1", "world-1"), true);
  assert.equal(shouldContinueAfterGuard("world-1", "world-2"), false);
});

test("switching worlds chooses a document in the target world after dirty guard passes", () => {
  const documents = [
    { id: "doc-1", worldId: "world-1", title: "Old world draft" },
    { id: "doc-2", worldId: "world-2", title: "Target world draft" },
  ];
  const documentsById = new Map(documents.map((doc) => [doc.id, doc]));

  assert.deepEqual(
    getEditorTargetForWorld("world-2", "doc-1", documents, documentsById),
    documents[1],
  );
});

test("active dirty document tabs are guarded on close but inactive tabs can close without prompting", () => {
  assert.equal(shouldGuardActiveTabRemoval("doc:1", "doc:1"), true);
  assert.equal(shouldGuardActiveTabRemoval("doc:1", "doc:1", true), false);
  assert.equal(shouldGuardActiveTabRemoval("doc:1", "doc:2"), false);

  const tabs = [
    WORKBENCH_TAB,
    { id: "doc:1", kind: "editor", label: "Active", icon: "D", refId: "1", worldId: "world-1" },
    { id: "doc:2", kind: "editor", label: "Inactive", icon: "D", refId: "2", worldId: "world-1" },
  ];
  const result = removeTabWithFallback(tabs, "doc:1");

  assert.equal(result.removed, true);
  assert.deepEqual(result.normalizedNextTabs.map((tab) => tab.id), ["workbench", "doc:2"]);
  assert.equal(result.closingIndex, 1);
});

test("restored tabs are pruned when their world is gone and dirty active tab no longer exists", () => {
  const restoredTabs = [
    WORKBENCH_TAB,
    { id: "doc:1", kind: "editor", label: "Kept", icon: "D", refId: "1", worldId: "world-1" },
    { id: "doc:2", kind: "editor", label: "Removed", icon: "D", refId: "2", worldId: "world-2" },
  ];

  const result = pruneTabsForWorlds(restoredTabs, "doc:2", new Set(["world-1"]));

  assert.equal(result.changed, true);
  assert.equal(result.activeTabStillPresent, false);
  assert.deepEqual(result.nextTabs.map((tab) => tab.id), ["workbench", "doc:1"]);
});

test("editor save-state feedback reflects pending drafts, saves, errors, and stale completions", () => {
  assert.equal(resolveEditorSaveState(true, "saved"), "dirty");
  assert.equal(resolveEditorSaveState(true, "error"), "dirty");
  assert.equal(resolveEditorSaveState(true, "saving"), "saving");
  assert.equal(resolveEditorSaveState(false, "saved"), "saved");

  const matchingSave = {
    requestId: 4,
    currentRequestId: 4,
    version: 7,
    currentVersion: 7,
    projectId: "project-1",
    currentProjectId: "project-1",
    itemId: "doc-1",
    currentItemId: "doc-1",
  };

  assert.equal(resolveSaveCompletionState({ ...matchingSave, succeeded: true }), "saved");
  assert.equal(resolveSaveCompletionState({ ...matchingSave, succeeded: false }), "error");
  assert.equal(resolveSaveCompletionState({ ...matchingSave, currentVersion: 8, succeeded: true }), null);
  assert.equal(resolveSaveCompletionState({ ...matchingSave, currentItemId: "doc-2", succeeded: false }), null);
});

test("dirty guard remains active while saves are dirty, saving, or failed", () => {
  assert.equal(isBlockingSaveState("idle"), false);
  assert.equal(isBlockingSaveState("saved"), false);
  assert.equal(isBlockingSaveState("dirty"), true);
  assert.equal(isBlockingSaveState("saving"), true);
  assert.equal(isBlockingSaveState("error"), true);
});
