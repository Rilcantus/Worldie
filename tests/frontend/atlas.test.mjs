import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAtlasMarkerDraft,
  buildAtlasMarkerTypeOptions,
  buildAtlasMarkerUpdate,
  clampAtlasPoint,
  filterAtlasMarkers,
  getAtlasPointFromClientPosition,
  hasUnsavedAtlasMarkerDraft,
  resolveAtlasMarkerSaveState,
} from "../../.tmp-frontend-tests/src/lib/atlas.js";

const baseMarker = {
  id: "marker-1",
  worldId: "world-1",
  mapId: "map-1",
  title: "Red Harbor",
  description: "Port city",
  x: 10,
  y: 20,
  markerType: "city",
  lorePageId: "lore-1",
};

test("clampAtlasPoint keeps marker coordinates inside map bounds", () => {
  assert.deepEqual(clampAtlasPoint({ x: -10, y: 900 }, { width: 1200, height: 800 }), {
    x: 0,
    y: 800,
  });
  assert.deepEqual(clampAtlasPoint({ x: 600, y: 400 }, { width: 1200, height: 800 }), {
    x: 600,
    y: 400,
  });
});

test("getAtlasPointFromClientPosition converts canvas clicks to map-local coordinates", () => {
  const point = getAtlasPointFromClientPosition(
    250,
    150,
    { left: 50, top: 50, width: 400, height: 200 },
    { width: 1200, height: 800 },
  );

  assert.deepEqual(point, { x: 600, y: 400 });
});

test("atlas marker draft helpers preserve lore links and normalize empty values", () => {
  const draft = buildAtlasMarkerDraft(baseMarker);

  assert.deepEqual(draft, {
    title: "Red Harbor",
    description: "Port city",
    markerType: "city",
    lorePageId: "lore-1",
  });

  assert.deepEqual(
    buildAtlasMarkerUpdate({ title: "  ", description: "Notes", markerType: "  ", lorePageId: "" }),
    {
      title: "Untitled Marker",
      description: "Notes",
      markerType: null,
      lorePageId: null,
    },
  );
});

test("atlas marker dirty detection watches title type notes and lore links", () => {
  assert.equal(hasUnsavedAtlasMarkerDraft(baseMarker, buildAtlasMarkerDraft(baseMarker)), false);
  assert.equal(hasUnsavedAtlasMarkerDraft(baseMarker, { ...buildAtlasMarkerDraft(baseMarker), title: "Blue Harbor" }), true);
  assert.equal(hasUnsavedAtlasMarkerDraft(baseMarker, { ...buildAtlasMarkerDraft(baseMarker), markerType: "landmark" }), true);
  assert.equal(hasUnsavedAtlasMarkerDraft(baseMarker, { ...buildAtlasMarkerDraft(baseMarker), description: "Changed" }), true);
  assert.equal(hasUnsavedAtlasMarkerDraft(baseMarker, { ...buildAtlasMarkerDraft(baseMarker), lorePageId: "" }), true);
});

test("atlas marker save state keeps dirty and error states visible", () => {
  assert.equal(resolveAtlasMarkerSaveState(true, "idle"), "dirty");
  assert.equal(resolveAtlasMarkerSaveState(true, "saved"), "dirty");
  assert.equal(resolveAtlasMarkerSaveState(true, "saving"), "saving");
  assert.equal(resolveAtlasMarkerSaveState(false, "error"), "error");
  assert.equal(resolveAtlasMarkerSaveState(false, "saved"), "saved");
});

test("atlas marker type options include presets and custom marker types", () => {
  const options = buildAtlasMarkerTypeOptions([
    baseMarker,
    { ...baseMarker, id: "marker-2", markerType: "shrine" },
    { ...baseMarker, id: "marker-3", markerType: "  " },
  ]);

  assert.equal(options.includes("city"), true);
  assert.equal(options.includes("landmark"), true);
  assert.equal(options.includes("shrine"), true);
});

test("atlas marker filtering supports type linked unlinked and search", () => {
  const markers = [
    baseMarker,
    {
      ...baseMarker,
      id: "marker-2",
      title: "Old Shrine",
      description: "Hidden in the western wood",
      markerType: "shrine",
      lorePageId: null,
    },
    {
      ...baseMarker,
      id: "marker-3",
      title: "Ash Road",
      description: "Trade route",
      markerType: "landmark",
      lorePageId: "",
    },
  ];

  assert.deepEqual(filterAtlasMarkers(markers, { mode: "type", markerType: "shrine" }).map((marker) => marker.id), [
    "marker-2",
  ]);
  assert.deepEqual(filterAtlasMarkers(markers, { mode: "linked" }).map((marker) => marker.id), ["marker-1"]);
  assert.deepEqual(filterAtlasMarkers(markers, { mode: "unlinked" }).map((marker) => marker.id), [
    "marker-2",
    "marker-3",
  ]);
  assert.deepEqual(filterAtlasMarkers(markers, { search: "western" }).map((marker) => marker.id), ["marker-2"]);
  assert.deepEqual(filterAtlasMarkers(markers, { search: "red" }).map((marker) => marker.id), ["marker-1"]);
});
