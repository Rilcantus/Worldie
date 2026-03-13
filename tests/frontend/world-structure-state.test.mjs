import test from "node:test";
import assert from "node:assert/strict";

import {
  hasUnsavedRelationshipChanges,
  hasUnsavedTimelineChanges,
  removeItemWithFallback,
  resolveRelationshipSeedPages,
  validateRelationshipDraft,
  validateTimelineDraft,
} from "../../.tmp-frontend-tests/src/hooks/worldStructureState.js";

test("hasUnsavedRelationshipChanges detects edits against the active relationship", () => {
  const activeRelationship = {
    id: "rel-1",
    worldId: "world-1",
    sourcePageId: "lore-1",
    targetPageId: "lore-2",
    relationType: "ally",
    notes: "old",
  };

  assert.equal(
    hasUnsavedRelationshipChanges(activeRelationship, "lore-1", "lore-2", "ally", "old"),
    false,
  );
  assert.equal(
    hasUnsavedRelationshipChanges(activeRelationship, "lore-1", "lore-2", "rival", "old"),
    true,
  );
});

test("hasUnsavedTimelineChanges detects edits against the active event", () => {
  const activeTimelineEvent = {
    id: "event-1",
    worldId: "world-1",
    title: "Founding",
    eventDate: "1000 AR",
    eventType: "event",
    linkedPageId: "lore-1",
    description: "old",
  };

  assert.equal(
    hasUnsavedTimelineChanges(activeTimelineEvent, "Founding", "1000 AR", "event", "lore-1", "old"),
    false,
  );
  assert.equal(
    hasUnsavedTimelineChanges(activeTimelineEvent, "Founding", "1001 AR", "event", "lore-1", "old"),
    true,
  );
});

test("resolveRelationshipSeedPages falls back to the first and alternate lore pages", () => {
  const pages = [
    { id: "lore-1", worldId: "world-1", title: "Hero", type: "Character" },
    { id: "lore-2", worldId: "world-1", title: "City", type: "Place" },
  ];
  const pagesById = new Map(pages.map((page) => [page.id, page]));

  const result = resolveRelationshipSeedPages(pages, pagesById, pages[0]);

  assert.deepEqual(result.sourcePage, pages[0]);
  assert.deepEqual(result.targetPage, pages[1]);
});

test("validateRelationshipDraft and validateTimelineDraft return user-facing errors", () => {
  assert.equal(validateRelationshipDraft("", "", "ally"), "Select both a source page and a target page");
  assert.equal(validateRelationshipDraft("lore-1", "lore-1", "ally"), "Choose two different lore pages for a relationship");
  assert.equal(validateRelationshipDraft("lore-1", "lore-2", "   "), "Enter a relationship type");
  assert.equal(validateRelationshipDraft("lore-1", "lore-2", "ally"), null);

  assert.equal(validateTimelineDraft("", "1000 AR"), "Enter a timeline event title");
  assert.equal(validateTimelineDraft("Founding", "   "), "Enter a timeline date or marker");
  assert.equal(validateTimelineDraft("Founding", "1000 AR"), null);
});

test("removeItemWithFallback returns the next first item after removal", () => {
  const result = removeItemWithFallback(
    [
      { id: "event-1", title: "One" },
      { id: "event-2", title: "Two" },
    ],
    "event-1",
  );

  assert.equal(result.removed, true);
  assert.deepEqual(result.first, { id: "event-2", title: "Two" });
});
