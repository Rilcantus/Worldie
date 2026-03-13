import test from "node:test";
import assert from "node:assert/strict";

import { buildStatusBarModel } from "../../.tmp-frontend-tests/src/hooks/statusBarState.js";

function buildBaseArgs() {
  return {
    hasActiveProject: true,
    activeNav: "workbench",
    projectTitle: "Iron Age Chronicles",
    activeWorld: {
      id: "world-1",
      name: "Duskfen",
      color: "#123456",
      isOpen: true,
      editorCount: 2,
      loreCount: 3,
      loreCategories: [],
    },
    documentTitle: "Arrival at Red Harbor",
    loreTitle: "Mara Quill",
    saveState: "dirty",
    saveTimestamp: 123456789,
  };
}

test("buildStatusBarModel returns launcher defaults without an active project", () => {
  const model = buildStatusBarModel({
    ...buildBaseArgs(),
    hasActiveProject: false,
  });

  assert.deepEqual(model, {
    projectTitle: "No Project Open",
    worldName: "No world selected",
    sectionLabel: "Launcher",
    detailLabel: "Open Project",
    saveState: "saved",
    saveTimestamp: null,
  });
});

test("buildStatusBarModel returns workbench labels", () => {
  const model = buildStatusBarModel(buildBaseArgs());

  assert.equal(model.sectionLabel, "Workbench");
  assert.equal(model.detailLabel, "Iron Age Chronicles");
  assert.equal(model.worldName, "Duskfen");
  assert.equal(model.saveState, "dirty");
});

test("buildStatusBarModel returns editor labels and untitled fallback", () => {
  const model = buildStatusBarModel({
    ...buildBaseArgs(),
    activeNav: "editor",
    documentTitle: "",
  });

  assert.equal(model.sectionLabel, "Editor");
  assert.equal(model.detailLabel, "Untitled");
});

test("buildStatusBarModel returns lore labels and untitled fallback", () => {
  const model = buildStatusBarModel({
    ...buildBaseArgs(),
    activeNav: "lore",
    loreTitle: "",
  });

  assert.equal(model.sectionLabel, "Lore");
  assert.equal(model.detailLabel, "Untitled");
});

test("buildStatusBarModel returns relationship, timeline, and new-tab labels", () => {
  const relsModel = buildStatusBarModel({
    ...buildBaseArgs(),
    activeNav: "rels",
  });
  const timelineModel = buildStatusBarModel({
    ...buildBaseArgs(),
    activeNav: "timeline",
  });
  const newTabModel = buildStatusBarModel({
    ...buildBaseArgs(),
    activeNav: "new",
    activeWorld: undefined,
  });

  assert.equal(relsModel.sectionLabel, "Relationships");
  assert.equal(relsModel.detailLabel, "Relationships");
  assert.equal(timelineModel.sectionLabel, "Timeline");
  assert.equal(timelineModel.detailLabel, "Timeline");
  assert.equal(newTabModel.sectionLabel, "New Tab");
  assert.equal(newTabModel.detailLabel, "Open Page");
  assert.equal(newTabModel.worldName, "No world selected");
});
