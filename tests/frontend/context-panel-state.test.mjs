import test from "node:test";
import assert from "node:assert/strict";

import { buildContextPanelModel } from "../../.tmp-frontend-tests/src/hooks/contextPanelState.js";

function buildBaseArgs() {
  const activeWorld = {
    id: "world-1",
    name: "Duskfen",
    color: "#123456",
    isOpen: true,
    editorCount: 2,
    loreCount: 3,
    loreCategories: [],
  };
  const lorePages = [
    { id: "lore-1", worldId: "world-1", title: "Mara Quill", type: "Character" },
    { id: "lore-2", worldId: "world-1", title: "Red Harbor", type: "Place" },
  ];
  const documents = [
    { id: "doc-1", worldId: "world-1", title: "Arrival" },
    { id: "doc-2", worldId: "world-1", title: "Harbor Notes" },
  ];
  const relationships = [
    {
      id: "rel-1",
      worldId: "world-1",
      sourcePageId: "lore-1",
      targetPageId: "lore-2",
      relationType: "investigates",
      notes: "Suspicious timing",
    },
  ];
  const timelineEvents = [
    {
      id: "event-1",
      worldId: "world-1",
      title: "Warehouse Fire",
      eventDate: "Three weeks ago",
      eventType: "disaster",
      linkedPageId: "lore-2",
      description: "Piers burned overnight",
    },
  ];
  const loreTypes = [{ id: "type-1", name: "Character", slug: "character", order: 0, isSystem: true }];

  return {
    activeNav: "workbench",
    activeWorld,
    projectTitle: "Iron Age Chronicles",
    activeLoreTypeId: "type-1",
    loreTypesById: new Map(loreTypes.map((item) => [item.id, item])),
    documentTitle: "Arrival at Red Harbor",
    documentContent: "The ferry reached the harbor at dusk.",
    loreTitle: "Mara Quill",
    loreTags: "hero, investigator ,  harbor",
    loreFields: "{\"details\":\"Courier from the coast\"}",
    lorePagesById: new Map(lorePages.map((item) => [item.id, item])),
    relationshipsById: new Map(relationships.map((item) => [item.id, item])),
    activeRelationshipId: "rel-1",
    timelineEventsById: new Map(timelineEvents.map((item) => [item.id, item])),
    activeTimelineEventId: "event-1",
    timelineTitle: "Warehouse Fire",
    timelineDate: "Three weeks ago",
    timelineDescription: "Piers burned overnight",
    totalWordCount: 4200,
    openTabsCount: 5,
    searchQuery: "harbor",
    searchResults: [{ id: "doc-1", kind: "Document", title: "Arrival", snippet: "harbor", score: 10 }],
    recentDocuments: documents,
    recentLorePages: lorePages,
  };
}

test("buildContextPanelModel returns workbench metadata and active-world summary", () => {
  const model = buildContextPanelModel(buildBaseArgs());

  assert.equal(model.activePageTitle, "Iron Age Chronicles");
  assert.equal(model.activePageType, "Workbench");
  assert.equal(model.summary, "Duskfen is currently active.");
  assert.equal(model.activeWorldName, "Duskfen");
  assert.equal(model.projectTotalWordCount, 4200);
});

test("buildContextPanelModel builds editor linked lore pages and word count", () => {
  const model = buildContextPanelModel({
    ...buildBaseArgs(),
    activeNav: "editor",
  });

  assert.equal(model.activePageTitle, "Arrival at Red Harbor");
  assert.equal(model.activePageType, "Document");
  assert.equal(model.activeWordCount, 7);
  assert.equal(model.linkedPages.length, 2);
  assert.equal(model.linkedPages[0]?.kind, "lore");
  assert.equal(model.linkedPages[0]?.label, "Mara Quill");
});

test("buildContextPanelModel builds lore tags and linked documents", () => {
  const model = buildContextPanelModel({
    ...buildBaseArgs(),
    activeNav: "lore",
  });

  assert.equal(model.activePageTitle, "Mara Quill");
  assert.equal(model.activePageType, "Character");
  assert.deepEqual(
    model.tags.map((item) => item.label),
    ["hero", "investigator", "harbor"],
  );
  assert.equal(model.linkedPages.length, 2);
  assert.equal(model.linkedPages[0]?.kind, "document");
  assert.equal(model.linkedPages[0]?.label, "Arrival");
});

test("buildContextPanelModel summarizes active relationships with lore titles", () => {
  const model = buildContextPanelModel({
    ...buildBaseArgs(),
    activeNav: "rels",
  });

  assert.equal(model.activePageTitle, "Mara Quill -> Red Harbor");
  assert.equal(model.activePageType, "Relationship");
  assert.equal(model.summary, "Mara Quill is marked as investigates with Red Harbor.");
  assert.equal(model.activeWordCount, 3);
});

test("buildContextPanelModel summarizes active timeline events", () => {
  const model = buildContextPanelModel({
    ...buildBaseArgs(),
    activeNav: "timeline",
  });

  assert.equal(model.activePageTitle, "Warehouse Fire");
  assert.equal(model.activePageType, "Timeline Event");
  assert.equal(model.summary, "Three weeks ago - Piers burned overnight");
  assert.equal(model.activeWordCount, 5);
});

test("buildContextPanelModel falls back for launcher without an active world", () => {
  const model = buildContextPanelModel({
    ...buildBaseArgs(),
    activeNav: "new",
    activeWorld: undefined,
  });

  assert.equal(model.activePageTitle, "Open Page");
  assert.equal(model.activePageType, "Launcher");
  assert.equal(model.summary, "No active world selected.");
  assert.equal(model.activeWorldName, "No world selected");
  assert.equal(model.activeWordCount, 0);
});
