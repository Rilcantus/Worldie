import { memo, useEffect, useMemo, useRef, type MouseEvent as ReactMouseEvent, type Ref } from "react";
import type { Document, LorePage } from "../lib/data";
import type { EditorFormattingState } from "./editorCore";

type EditorWidth = "narrow" | "standard" | "wide";
type EditorPresentationMode = "standard" | "typewriter";
type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

type EditorToolbarProps = {
  editorFormattingState: EditorFormattingState;
  saveState: SaveState;
  saveTimestamp: number | null;
  onSave: () => void;
  onApplyHistoryCommand: (command: "undo" | "redo") => void;
  onApplyRichFormat: (command: "bold" | "italic" | "underline") => void;
  onApplyLinePrefix: (prefix: string) => void;
  onApplyOrderedList: () => void;
  onInsertSceneBreak: () => void;
  onInsertNoteBlock: () => void;
  onInsertLoreLink: () => void;
  onCreateLoreFromSelection: () => void;
  canCreateLoreFromSelection: boolean;
  onScanLoreMentions: () => void;
  canScanLoreMentions: boolean;
  selectedLorePageId: string;
  availableLorePages: LorePage[];
  onSelectLorePageId: (value: string) => void;
  activeDocumentId: string | null;
  orderedDocuments: Document[];
  onOpenDocument: (doc: Document) => void;
  isPreviewOpen: boolean;
  onSetPreviewOpen: (isOpen: boolean) => void;
  readableLoreLinks: boolean;
  onToggleReadableLoreLinks: () => void;
  isDetailsOpen: boolean;
  onToggleDetails: () => void;
  isFocusMode: boolean;
  onToggleFocusMode: () => void;
  isDocumentMenuOpen: boolean;
  documentMenuRef: Ref<HTMLDivElement>;
  onToggleDocumentMenu: () => void;
  onCloseDocumentMenu: () => void;
  onAddDocument: () => void;
  onRenameDocument: () => void;
  onDuplicateDocument: () => void;
  editorWidth: EditorWidth;
  onSetEditorWidth: (width: EditorWidth) => void;
  editorMode: EditorPresentationMode;
  onSetEditorMode: (mode: EditorPresentationMode) => void;
};

export const EditorToolbar = memo(function EditorToolbar({
  editorFormattingState,
  saveState,
  saveTimestamp,
  onSave,
  onApplyHistoryCommand,
  onApplyRichFormat,
  onApplyLinePrefix,
  onApplyOrderedList,
  onInsertSceneBreak,
  onInsertNoteBlock,
  onInsertLoreLink,
  onCreateLoreFromSelection,
  canCreateLoreFromSelection,
  onScanLoreMentions,
  canScanLoreMentions,
  selectedLorePageId,
  availableLorePages,
  onSelectLorePageId,
  activeDocumentId,
  orderedDocuments,
  onOpenDocument,
  isPreviewOpen,
  onSetPreviewOpen,
  readableLoreLinks,
  onToggleReadableLoreLinks,
  isDetailsOpen,
  onToggleDetails,
  isFocusMode,
  onToggleFocusMode,
  isDocumentMenuOpen,
  documentMenuRef,
  onToggleDocumentMenu,
  onCloseDocumentMenu,
  onAddDocument,
  onRenameDocument,
  onDuplicateDocument,
  editorWidth,
  onSetEditorWidth,
  editorMode,
  onSetEditorMode,
}: EditorToolbarProps) {
  const documentMenuButtonId = "editor-toolbar-more-button";
  const documentMenuId = "editor-toolbar-more-menu";
  const documentMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousDocumentMenuOpenRef = useRef(false);
  const orderedDocumentsById = useMemo(
    () => new Map(orderedDocuments.map((doc) => [doc.id, doc])),
    [orderedDocuments],
  );
  const closeAfter = (action: () => void) => () => {
    action();
    onCloseDocumentMenu();
  };
  const preserveEditorSelection = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  useEffect(() => {
    const wasOpen = previousDocumentMenuOpenRef.current;
    previousDocumentMenuOpenRef.current = isDocumentMenuOpen;

    if (isDocumentMenuOpen) {
      window.requestAnimationFrame(() => {
        const firstMenuItem = documentMenuRef && "current" in documentMenuRef
          ? documentMenuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"],[role="menuitemradio"]')
          : null;
        firstMenuItem?.focus();
      });
      return;
    }

    if (wasOpen) {
      window.requestAnimationFrame(() => {
        documentMenuButtonRef.current?.focus();
      });
    }
  }, [documentMenuRef, isDocumentMenuOpen]);

  const formattedTimestamp = saveTimestamp
    ? new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(saveTimestamp))
    : null;

  const saveLabel =
    saveState === "saving"
      ? "Saving..."
      : saveState === "dirty"
        ? "Save"
        : saveState === "error"
          ? "Retry Save"
          : formattedTimestamp
            ? `Saved ${formattedTimestamp}`
            : "Saved";
  const saveTitle =
    saveState === "dirty" && formattedTimestamp
      ? `Unsaved changes. Last saved ${formattedTimestamp}.`
      : saveState === "error" && formattedTimestamp
        ? `Save failed. Last successful save ${formattedTimestamp}.`
        : saveState === "saved" && formattedTimestamp
          ? `Last saved ${formattedTimestamp}.`
          : undefined;

  return (
    <div className="editor-toolbar editor-toolbar-sticky">
      <div className="editor-toolbar-main">
        <button
          className={`tb-btn tb-save save-state-${saveState}`}
          type="button"
          onMouseDown={preserveEditorSelection}
          onClick={onSave}
          title={saveTitle}
        >
          {saveLabel}
        </button>
        <button
          className="tb-btn"
          type="button"
          onMouseDown={preserveEditorSelection}
          onClick={() => onApplyHistoryCommand("undo")}
          title="Undo (Ctrl/Cmd+Z)"
        >
          Undo
        </button>
        <button
          className="tb-btn"
          type="button"
          onMouseDown={preserveEditorSelection}
          onClick={() => onApplyHistoryCommand("redo")}
          title="Redo (Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y)"
        >
          Redo
        </button>
        <button
          className={`tb-btn ${editorFormattingState.bold ? "active" : ""}`}
          type="button"
          onMouseDown={preserveEditorSelection}
          onClick={() => onApplyRichFormat("bold")}
          title="Bold (Ctrl/Cmd+B)"
        >
          Bold
        </button>
        <button
          className={`tb-btn ${editorFormattingState.italic ? "active" : ""}`}
          type="button"
          onMouseDown={preserveEditorSelection}
          onClick={() => onApplyRichFormat("italic")}
          title="Italic (Ctrl/Cmd+I)"
        >
          Italic
        </button>
        <button
          className={`tb-btn ${editorFormattingState.underline ? "active" : ""}`}
          type="button"
          onMouseDown={preserveEditorSelection}
          onClick={() => onApplyRichFormat("underline")}
          title="Underline (Ctrl/Cmd+U)"
        >
          Underline
        </button>
        <button
          className={`tb-btn ${editorFormattingState.list ? "active" : ""}`}
          type="button"
          onMouseDown={preserveEditorSelection}
          onClick={() => onApplyLinePrefix("- ")}
          title="Bullet list (Ctrl/Cmd+Shift+8)"
        >
          List
        </button>
        <button
          className={`tb-btn ${editorFormattingState.orderedList ? "active" : ""}`}
          type="button"
          onMouseDown={preserveEditorSelection}
          onClick={onApplyOrderedList}
          title="Numbered list (Ctrl/Cmd+Shift+7)"
        >
          1.
        </button>
        <button
          className={`tb-btn ${editorFormattingState.quote ? "active" : ""}`}
          type="button"
          onMouseDown={preserveEditorSelection}
          onClick={() => onApplyLinePrefix("> ")}
          title="Quote block (Ctrl/Cmd+Shift+9)"
        >
          Quote
        </button>
        <button
          className="tb-btn"
          type="button"
          onMouseDown={preserveEditorSelection}
          onClick={onInsertLoreLink}
          title="Insert lore link (Ctrl/Cmd+K)"
        >
          Link
        </button>
        <button
          className="tb-btn"
          type="button"
          onMouseDown={preserveEditorSelection}
          onClick={onCreateLoreFromSelection}
          disabled={!canCreateLoreFromSelection}
          title="Create lore from selected text"
        >
          Create Lore
        </button>
        <button
          className="tb-btn"
          type="button"
          onMouseDown={preserveEditorSelection}
          onClick={onScanLoreMentions}
          disabled={!canScanLoreMentions}
          title="Scan this document for existing current-world lore"
        >
          Scan Lore
        </button>
        <select
          className="tb-select tb-select-compact toolbar-compact-hide"
          value={selectedLorePageId}
          onChange={(event) => onSelectLorePageId(event.target.value)}
          disabled={availableLorePages.length === 0}
          aria-label="Select lore page to link"
        >
          <option value="">Lore page...</option>
          {availableLorePages.map((page) => (
            <option key={page.id} value={page.id}>
              {page.title}
            </option>
          ))}
        </select>
      </div>

      <div className="editor-toolbar-side">
        <select
          className="tb-select tb-select-doc editor-toolbar-doc-select"
          value={activeDocumentId ?? ""}
          onChange={(event) => {
            const nextDocument = orderedDocumentsById.get(event.target.value);
            if (nextDocument) onOpenDocument(nextDocument);
          }}
          disabled={orderedDocuments.length === 0}
          aria-label="Quick switch document"
        >
          <option value="">Switch document...</option>
          {orderedDocuments.map((doc) => (
            <option key={doc.id} value={doc.id}>
              {doc.title}
            </option>
          ))}
        </select>
        <div className="editor-mode-segment" role="group" aria-label="Editor mode">
          <button
            className={`editor-mode-btn ${!isPreviewOpen ? "active" : ""}`}
            type="button"
            onMouseDown={preserveEditorSelection}
            onClick={() => onSetPreviewOpen(false)}
            aria-pressed={!isPreviewOpen}
            title="Write source text with raw [[Lore Links]]"
          >
            Write
          </button>
          <button
            className={`editor-mode-btn ${isPreviewOpen ? "active" : ""}`}
            type="button"
            onMouseDown={preserveEditorSelection}
            onClick={() => onSetPreviewOpen(true)}
            aria-pressed={isPreviewOpen}
            title="Preview rendered prose (Ctrl/Cmd+Shift+P)"
          >
            Preview
          </button>
        </div>
        {isPreviewOpen ? (
          <button
            className={`tb-btn ${readableLoreLinks ? "active" : ""}`}
            type="button"
            onMouseDown={preserveEditorSelection}
            onClick={onToggleReadableLoreLinks}
            title="Show lore links without wiki brackets in Preview"
          >
            Readable Links
          </button>
        ) : null}
        <button
          className={`tb-btn ${isDetailsOpen ? "active" : ""}`}
          type="button"
          onMouseDown={preserveEditorSelection}
          onClick={onToggleDetails}
          disabled={isFocusMode}
          title="Toggle details (Ctrl/Cmd+Shift+D)"
        >
          Details
        </button>
        <button
          className={`tb-btn ${isFocusMode ? "active" : ""}`}
          type="button"
          onMouseDown={preserveEditorSelection}
          onClick={onToggleFocusMode}
          title="Toggle focus mode (Ctrl/Cmd+Alt+F)"
        >
          {isFocusMode ? "Exit Focus" : "Focus"}
        </button>
        <div ref={documentMenuRef} className="toolbar-menu-wrap">
          <button
            id={documentMenuButtonId}
            ref={documentMenuButtonRef}
            className={`tb-btn ${isDocumentMenuOpen ? "active" : ""}`}
            type="button"
            onMouseDown={preserveEditorSelection}
            onClick={onToggleDocumentMenu}
            aria-haspopup="menu"
            aria-expanded={isDocumentMenuOpen}
            aria-controls={isDocumentMenuOpen ? documentMenuId : undefined}
          >
            More
          </button>
          {isDocumentMenuOpen ? (
            <div
              className="toolbar-menu"
              id={documentMenuId}
              role="menu"
              aria-labelledby={documentMenuButtonId}
            >
              <button
                className="toolbar-menu-item"
                type="button"
                role="menuitem"
                onMouseDown={preserveEditorSelection}
                onClick={closeAfter(onAddDocument)}
                title="New document (Ctrl/Cmd+Alt+N)"
              >
                New document
              </button>
              <button
                className="toolbar-menu-item"
                type="button"
                role="menuitem"
                onMouseDown={preserveEditorSelection}
                onClick={closeAfter(onRenameDocument)}
                disabled={!activeDocumentId}
                title="Rename document (Ctrl/Cmd+Alt+R)"
              >
                Rename document
              </button>
              <button
                className="toolbar-menu-item"
                type="button"
                role="menuitem"
                onMouseDown={preserveEditorSelection}
                onClick={closeAfter(onDuplicateDocument)}
                disabled={!activeDocumentId}
                title="Duplicate document (Ctrl/Cmd+Alt+D)"
              >
                Duplicate document
              </button>
              <button
                className={`toolbar-menu-item ${editorFormattingState.heading1 ? "active" : ""}`}
                type="button"
                role="menuitem"
                onMouseDown={preserveEditorSelection}
                onClick={closeAfter(() => onApplyLinePrefix("# "))}
                title="Large heading (Ctrl/Cmd+Alt+1)"
              >
                Large heading
              </button>
              <button
                className={`toolbar-menu-item ${editorFormattingState.heading2 ? "active" : ""}`}
                type="button"
                role="menuitem"
                onMouseDown={preserveEditorSelection}
                onClick={closeAfter(() => onApplyLinePrefix("## "))}
                title="Medium heading (Ctrl/Cmd+Alt+2)"
              >
                Medium heading
              </button>
              <button
                className={`toolbar-menu-item ${editorFormattingState.orderedList ? "active" : ""}`}
                type="button"
                role="menuitem"
                onMouseDown={preserveEditorSelection}
                onClick={closeAfter(onApplyOrderedList)}
              >
                Numbered list
              </button>
              <button
                className={`toolbar-menu-item ${editorFormattingState.noteBlock ? "active" : ""}`}
                type="button"
                role="menuitem"
                onMouseDown={preserveEditorSelection}
                onClick={closeAfter(onInsertNoteBlock)}
                title="Note block (Ctrl/Cmd+Shift+N)"
              >
                Note block
              </button>
              <button
                className={`toolbar-menu-item ${editorFormattingState.sceneBreak ? "active" : ""}`}
                type="button"
                role="menuitem"
                onMouseDown={preserveEditorSelection}
                onClick={closeAfter(onInsertSceneBreak)}
                title="Scene break (Ctrl/Cmd+Shift+-)"
              >
                Scene break
              </button>
              <button
                className={`toolbar-menu-item ${editorWidth === "narrow" ? "active" : ""}`}
                type="button"
                role="menuitemradio"
                aria-checked={editorWidth === "narrow"}
                onMouseDown={preserveEditorSelection}
                onClick={closeAfter(() => onSetEditorWidth("narrow"))}
              >
                Narrow page width
              </button>
              <button
                className={`toolbar-menu-item ${editorWidth === "standard" ? "active" : ""}`}
                type="button"
                role="menuitemradio"
                aria-checked={editorWidth === "standard"}
                onMouseDown={preserveEditorSelection}
                onClick={closeAfter(() => onSetEditorWidth("standard"))}
              >
                Standard page width
              </button>
              <button
                className={`toolbar-menu-item ${editorWidth === "wide" ? "active" : ""}`}
                type="button"
                role="menuitemradio"
                aria-checked={editorWidth === "wide"}
                onMouseDown={preserveEditorSelection}
                onClick={closeAfter(() => onSetEditorWidth("wide"))}
              >
                Wide page width
              </button>
              <button
                className={`toolbar-menu-item ${editorMode === "standard" ? "active" : ""}`}
                type="button"
                role="menuitemradio"
                aria-checked={editorMode === "standard"}
                onMouseDown={preserveEditorSelection}
                onClick={closeAfter(() => onSetEditorMode("standard"))}
              >
                Standard mode
              </button>
              <button
                className={`toolbar-menu-item ${editorMode === "typewriter" ? "active" : ""}`}
                type="button"
                role="menuitemradio"
                aria-checked={editorMode === "typewriter"}
                onMouseDown={preserveEditorSelection}
                onClick={closeAfter(() => onSetEditorMode("typewriter"))}
                title="Toggle typewriter mode (Ctrl/Cmd+Alt+M)"
              >
                Typewriter mode
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
});
