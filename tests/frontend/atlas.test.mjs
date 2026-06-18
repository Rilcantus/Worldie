import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAtlasMarkerDraft,
  buildAtlasMarkerUpdate,
  clampAtlasPoint,
  getAtlasPointFromClientPosition,
} from "../../.tmp-frontend-tests/src/lib/atlas.js";

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
  const draft = buildAtlasMarkerDraft({
    id: "marker-1",
    worldId: "world-1",
    mapId: "map-1",
    title: "Red Harbor",
    description: "Port city",
    x: 10,
    y: 20,
    markerType: "city",
    lorePageId: "lore-1",
  });

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

