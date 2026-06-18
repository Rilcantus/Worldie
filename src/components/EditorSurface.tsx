import { memo, type ClipboardEvent, type KeyboardEvent, type ReactNode, type Ref } from "react";
import type { LorePage } from "../lib/data";
import type { WorldUI } from "../types/ui";
import { EditorDetailsDrawer } from "./EditorDetailsDrawer";

type EditorPresentationMode = "standard" | "typewriter";
type EditorWidth = "narrow" | "standard" | "wide";

type EditorSurfaceProps = {
  titleInputRef: Ref<HTMLInputElement>;
  editorRef: Ref<HTMLDivElement>;
  documentTitle: string;
  onTitleChange: (value: string) => void;
  activeWorld?: WorldUI;
  documentFolderPath: string;
  isFocusMode: boolean;
  editorMode: EditorPresentationMode;
  editorWidth: EditorWidth;
  typewriterRenderedPreview: ReactNode[];
  renderedPreview: ReactNode[];
  onEditorInput: () => void;
  onEditorKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  onEditorPaste: (event: ClipboardEvent<HTMLDivElement>) => void;
  onEditorBlur: () => void;
  onTitleBlur: () => void;
  onSyncSelection: () => void;
  isPreviewOpen: boolean;
  isDetailsOpen: boolean;
  onFolderPathChange: (value: string) => void;
  linkedLorePages: LorePage[];
  unresolvedLoreLinks: string[];
  onOpenLore: (page: LorePage) => void;
  wordCount: number;
  characterCount: number;
  readingMinutes: number;
  selectedWordCount: number;
};

export const EditorSurface = memo(function EditorSurface({
  titleInputRef,
  editorRef,
  documentTitle,
  onTitleChange,
  activeWorld,
  documentFolderPath,
  isFocusMode,
  editorMode,
  editorWidth,
  typewriterRenderedPreview,
  renderedPreview,
  onEditorInput,
  onEditorKeyDown,
  onEditorPaste,
  onEditorBlur,
  onTitleBlur,
  onSyncSelection,
  isPreviewOpen,
  isDetailsOpen,
  onFolderPathChange,
  linkedLorePages,
  unresolvedLoreLinks,
  onOpenLore,
  wordCount,
  characterCount,
  readingMinutes,
  selectedWordCount,
}: EditorSurfaceProps) {
  return (
    <div
      className={[
        "editor-writing-shell",
        `editor-width-${editorWidth}`,
        editorMode === "typewriter" ? "editor-writing-shell-typewriter" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className={`document-header ${isFocusMode ? "document-header-inline" : ""}`}>
        <input
          ref={titleInputRef}
          className={`doc-title-input ${isFocusMode ? "doc-title-input-inline" : ""}`}
          value={documentTitle}
          onChange={(event) => onTitleChange(event.target.value)}
          onBlur={onTitleBlur}
          placeholder="Document title"
        />
        <div className={`doc-meta ${isFocusMode ? "doc-meta-inline" : ""}`}>
          <div className="meta-tag">
            <div className="meta-dot"></div> {activeWorld?.name ?? "World"}
          </div>
          <div className="meta-tag">Draft</div>
          <div className="meta-tag">{documentFolderPath.trim() || "Ungrouped"}</div>
        </div>
      </div>

      {editorMode === "typewriter" ? (
        <div className="typewriter-layout">
          <div className="typewriter-composition">
            <div className="linked-lore-label">Composition</div>
            <div className="editor-preview-body typewriter-preview-body">
              {typewriterRenderedPreview.length > 0 ? typewriterRenderedPreview : <div className="editor-preview-spacer" />}
            </div>
          </div>
          <div className="typewriter-input-shell">
            <div className="linked-lore-label">Input</div>
            <div className="typewriter-input-hint">Enter commits. Shift+Enter adds a new line.</div>
            <div
              ref={editorRef}
              className={`doc-editor doc-editor-typewriter ${isFocusMode ? "doc-editor-focus" : ""}`}
              contentEditable
              suppressContentEditableWarning
              data-placeholder="Type here to compose upward..."
              onInput={onEditorInput}
              onKeyDown={onEditorKeyDown}
              onPaste={onEditorPaste}
              onBlur={onEditorBlur}
              onMouseUp={onSyncSelection}
              onKeyUp={onSyncSelection}
              spellCheck
            />
          </div>
        </div>
      ) : (
        <>
          <div
            ref={editorRef}
            className={[
              "doc-editor",
              isFocusMode ? "doc-editor-focus" : "",
              isPreviewOpen ? "doc-editor-preview-hidden" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            contentEditable
            suppressContentEditableWarning
            data-placeholder="Start writing..."
            onInput={onEditorInput}
            onKeyDown={onEditorKeyDown}
            onPaste={onEditorPaste}
            onBlur={onEditorBlur}
            onMouseUp={onSyncSelection}
            onKeyUp={onSyncSelection}
            spellCheck
            aria-hidden={isPreviewOpen}
          />
          {isPreviewOpen ? (
            <div className="editor-preview editor-preview-reading-mode">
              <div className="editor-preview-body">{renderedPreview}</div>
            </div>
          ) : null}
        </>
      )}

      {isDetailsOpen && !isFocusMode ? (
        <EditorDetailsDrawer
          documentFolderPath={documentFolderPath}
          onFolderPathChange={onFolderPathChange}
          linkedLorePages={linkedLorePages}
          unresolvedLoreLinks={unresolvedLoreLinks}
          onOpenLore={onOpenLore}
          wordCount={wordCount}
          characterCount={characterCount}
          readingMinutes={readingMinutes}
          selectedWordCount={selectedWordCount}
        />
      ) : null}
    </div>
  );
});
