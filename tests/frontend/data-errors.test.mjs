import test from "node:test";
import assert from "node:assert/strict";

import {
  resolveProjectStoreErrorMessage,
} from "../../.tmp-frontend-tests/src/lib/projectStoreErrors.js";

test("project store errors preserve string details from the Tauri sidecar", () => {
  assert.equal(
    resolveProjectStoreErrorMessage("update_document", "Document not found in active project file: doc-1"),
    "Worldie could not update document in the active project file. Detail: Document not found in active project file: doc-1",
  );
});

test("project store errors preserve Error details from failed commands", () => {
  assert.equal(
    resolveProjectStoreErrorMessage("update_document", new Error("database is locked")),
    "Worldie could not update document in the active project file. Detail: database is locked",
  );
});
