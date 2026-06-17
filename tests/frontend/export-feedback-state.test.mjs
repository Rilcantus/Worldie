import test from "node:test";
import assert from "node:assert/strict";

import {
  buildExportCountSummary,
  buildProjectExportSuccessMessage,
  buildWorldExportSuccessMessage,
} from "../../.tmp-frontend-tests/src/hooks/exportFeedbackState.js";

test("buildExportCountSummary includes singular and plural item labels", () => {
  assert.equal(
    buildExportCountSummary({
      worldCount: 1,
      documentCount: 2,
      lorePageCount: 1,
      relationshipCount: 0,
      timelineEventCount: 3,
    }),
    "1 world, 2 documents, 1 lore page, 0 relationships, 3 timeline events",
  );
});

test("buildWorldExportSuccessMessage names the active-world scope and destination", () => {
  assert.equal(
    buildWorldExportSuccessMessage({
      exportPath: "C:/Exports/Project - World",
      documentCount: 4,
      lorePageCount: 5,
      relationshipCount: 2,
      timelineEventCount: 1,
    }),
    "Active world Markdown export complete: 4 documents, 5 lore pages, 2 relationships, 1 timeline event written to C:/Exports/Project - World.",
  );
});

test("buildProjectExportSuccessMessage names the full-project scope and world count", () => {
  assert.equal(
    buildProjectExportSuccessMessage({
      exportPath: "C:/Exports/Project",
      worldCount: 2,
      documentCount: 4,
      lorePageCount: 5,
      relationshipCount: 2,
      timelineEventCount: 1,
    }),
    "Full project Markdown export complete: 2 worlds, 4 documents, 5 lore pages, 2 relationships, 1 timeline event written to C:/Exports/Project.",
  );
});
