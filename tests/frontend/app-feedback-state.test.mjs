import test from "node:test";
import assert from "node:assert/strict";

import {
  buildConfirmState,
  buildToastState,
  shouldAutoClearToast,
} from "../../.tmp-frontend-tests/src/hooks/appFeedbackState.js";

test("buildConfirmState uses destructive defaults", () => {
  assert.deepEqual(buildConfirmState("Delete this item?"), {
    message: "Delete this item?",
    confirmLabel: "Delete",
    tone: "danger",
  });
});

test("buildConfirmState respects custom confirm label and tone", () => {
  assert.deepEqual(buildConfirmState("Continue anyway?", { confirmLabel: "Continue", tone: "default" }), {
    message: "Continue anyway?",
    confirmLabel: "Continue",
    tone: "default",
  });
});

test("buildToastState keeps the message and undo callback", () => {
  const undo = () => {};
  const toast = buildToastState("Document deleted", undo);

  assert.equal(toast.message, "Document deleted");
  assert.equal(toast.onUndo, undo);
});

test("shouldAutoClearToast only clears the matching toast message", () => {
  assert.equal(shouldAutoClearToast({ message: "Saved" }, "Saved"), true);
  assert.equal(shouldAutoClearToast({ message: "Saved" }, "Deleted"), false);
  assert.equal(shouldAutoClearToast(null, "Saved"), false);
});
