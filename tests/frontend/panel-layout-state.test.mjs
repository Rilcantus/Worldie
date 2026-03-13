import test from "node:test";
import assert from "node:assert/strict";

import {
  clampPanelWidth,
  clampPanelWidths,
  getPanelBounds,
  resolveResizedPanelWidth,
} from "../../.tmp-frontend-tests/src/hooks/panelLayoutState.js";

test("getPanelBounds returns the large desktop tier", () => {
  const bounds = getPanelBounds(1800);

  assert.deepEqual(bounds, {
    sidebar: { min: 220, max: 320, initial: 248 },
    doclist: { min: 240, max: 340, initial: 272 },
    right: { min: 220, max: 320, initial: 252 },
    collapseRightByDefault: false,
  });
});

test("getPanelBounds returns the mid desktop tier", () => {
  const bounds = getPanelBounds(1500);

  assert.deepEqual(bounds, {
    sidebar: { min: 210, max: 280, initial: 232 },
    doclist: { min: 228, max: 300, initial: 252 },
    right: { min: 210, max: 280, initial: 228 },
    collapseRightByDefault: false,
  });
});

test("getPanelBounds returns the compact tier and collapses right panel by default", () => {
  const bounds = getPanelBounds(1200);

  assert.deepEqual(bounds, {
    sidebar: { min: 200, max: 240, initial: 216 },
    doclist: { min: 220, max: 260, initial: 236 },
    right: { min: 200, max: 236, initial: 216 },
    collapseRightByDefault: true,
  });
});

test("clampPanelWidth keeps widths inside bounds", () => {
  assert.equal(clampPanelWidth(150, 200, 300), 200);
  assert.equal(clampPanelWidth(250, 200, 300), 250);
  assert.equal(clampPanelWidth(350, 200, 300), 300);
});

test("resolveResizedPanelWidth expands left panels and inverses right panel drag", () => {
  assert.equal(resolveResizedPanelWidth("sidebar", 232, 100, 140, 1500), 272);
  assert.equal(resolveResizedPanelWidth("doclist", 252, 100, 50, 1500), 228);
  assert.equal(resolveResizedPanelWidth("right", 228, 100, 140, 1500), 210);
});

test("clampPanelWidths clamps all panel widths against the current tier", () => {
  const widths = clampPanelWidths(
    {
      sidebarWidth: 500,
      docListWidth: 100,
      rightPanelWidth: 999,
    },
    1200,
  );

  assert.deepEqual(widths, {
    sidebarWidth: 240,
    docListWidth: 220,
    rightPanelWidth: 236,
  });
});
