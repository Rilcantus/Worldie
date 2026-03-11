import type { Document, LorePage } from "../lib/data";
import type { EditorFormattingState } from "./editorCore";

type EditorWidth = "narrow" | "standard" | "wide";
type EditorPresentationMode = "standard" | "typewriter";
type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

type EditorToolbarProps = {
  editorFormattingState: EditorFormattingState;
  saveState: SaveState;
  onSave: () => void;
  onApplyRichFormat: (command: "bold" | "italic" | "underline") => void;
  onApplyLinePrefix: (prefix: string) => void;
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
  onToggleDocumentMenu: () => void;
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
  onSave,
  onApplyRichFormat,
  onApplyLinePrefix,
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
  onToggleDocumentMenu,
  onAddDocument,
  onRenameDocument,
  onDuplicateDocument,
  editorWidth,
  onSetEditorWidth,
  editorMode,
  onSetEditorMode,
}: EditorToolbarProps) {
  const saveLabel =
    saveState === "saving"
      ? "Saving..."
      : saveState === "dirty"
        ? "Save"
        : saveState === "error"
          ? "Retry Save"
          : "Saved";

  return (
    <div className="editor-toolbar editor-toolbar-sticky">
      <div className="editor-toolbar-main">
        <button className={`tb-btn tb-save save-state-${saveState}`} type="button" onClick={onSave}>
          {saveLabel}
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
        >
          List
        </button>
        <button
          className={`tb-btn ${editorFormattingState.quote ? "active" : ""}`}
          type="button"
          onClick={() => onApplyLinePrefix("> ")}
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
          className="tb-select tb-select-compact"
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
        <button className={`tb-btn ${isPreviewOpen ? "active" : ""}`} type="button" onClick={onTogglePreview}>
          Preview
        </button>
        <button
          className={`tb-btn ${isDetailsOpen ? "active" : ""}`}
          type="button"
          onClick={onToggleDetails}
          disabled={isFocusMode}
        >
          Details
        </button>
        <button className={`tb-btn ${isFocusMode ? "active" : ""}`} type="button" onClick={onToggleFocusMode}>
          {isFocusMode ? "Exit Focus" : "Focus"}
        </button>
        <div className="toolbar-menu-wrap">
          <button
            className={`tb-btn ${isDocumentMenuOpen ? "active" : ""}`}
            type="button"
            onClick={onToggleDocumentMenu}
          >
            More
          </button>
          {isDocumentMenuOpen ? (
            <div className="toolbar-menu">
              <button className="toolbar-menu-item" type="button" onClick={onAddDocument}>
                New document
              </button>
              <button
                className="toolbar-menu-item"
                type="button"
                onClick={onRenameDocument}
                disabled={!activeDocumentId}
              >
                Rename document
              </button>
              <button
                className="toolbar-menu-item"
                type="button"
                onClick={onDuplicateDocument}
                disabled={!activeDocumentId}
              >
                Duplicate document
              </button>
              <button
                className={`toolbar-menu-item ${editorFormattingState.heading1 ? "active" : ""}`}
                type="button"
                onClick={() => onApplyLinePrefix("# ")}
              >
                Large heading
              </button>
              <button
                className={`toolbar-menu-item ${editorFormattingState.heading2 ? "active" : ""}`}
                type="button"
                onClick={() => onApplyLinePrefix("## ")}
              >
                Medium heading
              </button>
              <button
                className={`toolbar-menu-item ${editorWidth === "narrow" ? "active" : ""}`}
                type="button"
                onClick={() => onSetEditorWidth("narrow")}
              >
                Narrow page width
              </button>
              <button
                className={`toolbar-menu-item ${editorWidth === "standard" ? "active" : ""}`}
                type="button"
                onClick={() => onSetEditorWidth("standard")}
              >
                Standard page width
              </button>
              <button
                className={`toolbar-menu-item ${editorWidth === "wide" ? "active" : ""}`}
                type="button"
                onClick={() => onSetEditorWidth("wide")}
              >
                Wide page width
              </button>
              <button
                className={`toolbar-menu-item ${editorMode === "standard" ? "active" : ""}`}
                type="button"
                onClick={() => onSetEditorMode("standard")}
              >
                Standard mode
              </button>
              <button
                className={`toolbar-menu-item ${editorMode === "typewriter" ? "active" : ""}`}
                type="button"
                onClick={() => onSetEditorMode("typewriter")}
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
