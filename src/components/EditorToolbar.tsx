import type { Ref } from "react";
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
  selectedLorePageId: string;
  availableLorePages: LorePage[];
  onSelectLorePageId: (value: string) => void;
  activeDocumentId: string | null;
  orderedDocuments: Document[];
  onOpenDocument: (doc: Document) => void;
  isPreviewOpen: boolean;
  onTogglePreview: () => void;
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

export function EditorToolbar({
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
  selectedLorePageId,
  availableLorePages,
  onSelectLorePageId,
  activeDocumentId,
  orderedDocuments,
  onOpenDocument,
  isPreviewOpen,
  onTogglePreview,
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
  const closeAfter = (action: () => void) => () => {
    action();
    onCloseDocumentMenu();
  };

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
          onClick={onSave}
          title={saveTitle}
        >
          {saveLabel}
        </button>
        <button
          className="tb-btn"
          type="button"
          onClick={() => onApplyHistoryCommand("undo")}
          title="Undo (Ctrl/Cmd+Z)"
        >
          Undo
        </button>
        <button
          className="tb-btn"
          type="button"
          onClick={() => onApplyHistoryCommand("redo")}
          title="Redo (Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y)"
        >
          Redo
        </button>
        <button
          className={`tb-btn ${editorFormattingState.bold ? "active" : ""}`}
          type="button"
          onClick={() => onApplyRichFormat("bold")}
          title="Bold (Ctrl/Cmd+B)"
        >
          Bold
        </button>
        <button
          className={`tb-btn ${editorFormattingState.italic ? "active" : ""}`}
          type="button"
          onClick={() => onApplyRichFormat("italic")}
          title="Italic (Ctrl/Cmd+I)"
        >
          Italic
        </button>
        <button
          className={`tb-btn ${editorFormattingState.underline ? "active" : ""}`}
          type="button"
          onClick={() => onApplyRichFormat("underline")}
          title="Underline (Ctrl/Cmd+U)"
        >
          Underline
        </button>
        <button
          className={`tb-btn ${editorFormattingState.list ? "active" : ""}`}
          type="button"
          onClick={() => onApplyLinePrefix("- ")}
          title="Bullet list (Ctrl/Cmd+Shift+8)"
        >
          List
        </button>
        <button
          className={`tb-btn ${editorFormattingState.orderedList ? "active" : ""}`}
          type="button"
          onClick={onApplyOrderedList}
          title="Numbered list (Ctrl/Cmd+Shift+7)"
        >
          1.
        </button>
        <button
          className={`tb-btn ${editorFormattingState.quote ? "active" : ""}`}
          type="button"
          onClick={() => onApplyLinePrefix("> ")}
          title="Quote block (Ctrl/Cmd+Shift+9)"
        >
          Quote
        </button>
        <button
          className="tb-btn"
          type="button"
          onClick={onInsertLoreLink}
          title="Insert lore link (Ctrl/Cmd+K)"
        >
          Link
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
        <select
          className="tb-select tb-select-doc"
          value={activeDocumentId ?? ""}
          onChange={(event) => {
            const nextDocument = orderedDocuments.find((doc) => doc.id === event.target.value);
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
      </div>

      <div className="editor-toolbar-side">
        <button
          className={`tb-btn ${isPreviewOpen ? "active" : ""}`}
          type="button"
          onClick={onTogglePreview}
          title="Toggle preview (Ctrl/Cmd+Shift+P)"
        >
          Preview
        </button>
        <button
          className={`tb-btn ${isDetailsOpen ? "active" : ""}`}
          type="button"
          onClick={onToggleDetails}
          disabled={isFocusMode}
          title="Toggle details (Ctrl/Cmd+Shift+D)"
        >
          Details
        </button>
        <button
          className={`tb-btn ${isFocusMode ? "active" : ""}`}
          type="button"
          onClick={onToggleFocusMode}
          title="Toggle focus mode (Ctrl/Cmd+Alt+F)"
        >
          {isFocusMode ? "Exit Focus" : "Focus"}
        </button>
        <div ref={documentMenuRef} className="toolbar-menu-wrap">
          <button
            className={`tb-btn ${isDocumentMenuOpen ? "active" : ""}`}
            type="button"
            onClick={onToggleDocumentMenu}
            aria-haspopup="menu"
            aria-expanded={isDocumentMenuOpen}
          >
            More
          </button>
          {isDocumentMenuOpen ? (
            <div className="toolbar-menu" role="menu">
              <button
                className="toolbar-menu-item"
                type="button"
                onClick={closeAfter(onAddDocument)}
                title="New document (Ctrl/Cmd+Alt+N)"
              >
                New document
              </button>
              <button
                className="toolbar-menu-item"
                type="button"
                onClick={closeAfter(onRenameDocument)}
                disabled={!activeDocumentId}
                title="Rename document (Ctrl/Cmd+Alt+R)"
              >
                Rename document
              </button>
              <button
                className="toolbar-menu-item"
                type="button"
                onClick={closeAfter(onDuplicateDocument)}
                disabled={!activeDocumentId}
                title="Duplicate document (Ctrl/Cmd+Alt+D)"
              >
                Duplicate document
              </button>
              <button
                className={`toolbar-menu-item ${editorFormattingState.heading1 ? "active" : ""}`}
                type="button"
                onClick={closeAfter(() => onApplyLinePrefix("# "))}
                title="Large heading (Ctrl/Cmd+Alt+1)"
              >
                Large heading
              </button>
              <button
                className={`toolbar-menu-item ${editorFormattingState.heading2 ? "active" : ""}`}
                type="button"
                onClick={closeAfter(() => onApplyLinePrefix("## "))}
                title="Medium heading (Ctrl/Cmd+Alt+2)"
              >
                Medium heading
              </button>
              <button
                className={`toolbar-menu-item ${editorFormattingState.orderedList ? "active" : ""}`}
                type="button"
                onClick={closeAfter(onApplyOrderedList)}
              >
                Numbered list
              </button>
              <button
                className={`toolbar-menu-item ${editorFormattingState.noteBlock ? "active" : ""}`}
                type="button"
                onClick={closeAfter(onInsertNoteBlock)}
                title="Note block (Ctrl/Cmd+Shift+N)"
              >
                Note block
              </button>
              <button
                className={`toolbar-menu-item ${editorFormattingState.sceneBreak ? "active" : ""}`}
                type="button"
                onClick={closeAfter(onInsertSceneBreak)}
                title="Scene break (Ctrl/Cmd+Shift+-)"
              >
                Scene break
              </button>
              <button
                className={`toolbar-menu-item ${editorWidth === "narrow" ? "active" : ""}`}
                type="button"
                onClick={closeAfter(() => onSetEditorWidth("narrow"))}
              >
                Narrow page width
              </button>
              <button
                className={`toolbar-menu-item ${editorWidth === "standard" ? "active" : ""}`}
                type="button"
                onClick={closeAfter(() => onSetEditorWidth("standard"))}
              >
                Standard page width
              </button>
              <button
                className={`toolbar-menu-item ${editorWidth === "wide" ? "active" : ""}`}
                type="button"
                onClick={closeAfter(() => onSetEditorWidth("wide"))}
              >
                Wide page width
              </button>
              <button
                className={`toolbar-menu-item ${editorMode === "standard" ? "active" : ""}`}
                type="button"
                onClick={closeAfter(() => onSetEditorMode("standard"))}
              >
                Standard mode
              </button>
              <button
                className={`toolbar-menu-item ${editorMode === "typewriter" ? "active" : ""}`}
                type="button"
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
}
