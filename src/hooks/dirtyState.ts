export type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

type EditableDocumentSnapshot = {
  title: string;
  contentJson?: string | null;
  folderPath?: string | null;
};

type DocumentDraft = {
  title: string;
  contentJson: string;
  folderPath: string;
};

type SaveCompletionArgs = {
  requestId: number;
  currentRequestId: number;
  version: number;
  currentVersion: number;
  projectId: string | null;
  currentProjectId: string | null;
  itemId: string | null;
  currentItemId: string | null;
  succeeded: boolean;
};

export function hasUnsavedDocumentDraft(
  activeDocument: EditableDocumentSnapshot | null | undefined,
  draft: DocumentDraft,
) {
  if (!activeDocument) return false;
  return (
    activeDocument.title !== draft.title ||
    (activeDocument.contentJson ?? "") !== draft.contentJson ||
    (activeDocument.folderPath ?? "") !== draft.folderPath
  );
}

export function getDirtyNavigationDecision(hasUnsavedChanges: boolean) {
  return {
    needsConfirmation: hasUnsavedChanges,
    allowedWithoutConfirmation: !hasUnsavedChanges,
  };
}

export function shouldContinueAfterGuard<T>(startingValue: T, currentValue: T) {
  return Object.is(startingValue, currentValue);
}

export function shouldGuardActiveTabRemoval(activeTabId: string, tabId: string, skipGuard = false) {
  return activeTabId === tabId && !skipGuard;
}

export function resolveEditorSaveState(hasPendingEditorDraft: boolean, documentSaveState: SaveState): SaveState {
  return hasPendingEditorDraft && documentSaveState !== "saving" ? "dirty" : documentSaveState;
}

export function isBlockingSaveState(saveState: SaveState) {
  return saveState === "dirty" || saveState === "saving" || saveState === "error";
}

export function resolveSaveCompletionState({
  requestId,
  currentRequestId,
  version,
  currentVersion,
  projectId,
  currentProjectId,
  itemId,
  currentItemId,
  succeeded,
}: SaveCompletionArgs): SaveState | null {
  if (requestId !== currentRequestId) return null;
  if (version !== currentVersion) return null;
  if (projectId !== currentProjectId || itemId !== currentItemId) return null;
  return succeeded ? "saved" : "error";
}
