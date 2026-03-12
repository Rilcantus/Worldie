import type { LorePage } from "../lib/data";

type EditorDetailsDrawerProps = {
  documentFolderPath: string;
  onFolderPathChange: (value: string) => void;
  linkedLorePages: LorePage[];
  unresolvedLoreLinks: string[];
  onOpenLore: (page: LorePage) => void;
  wordCount: number;
  characterCount: number;
  readingMinutes: number;
  selectedWordCount: number;
};

export function EditorDetailsDrawer({
  documentFolderPath,
  onFolderPathChange,
  linkedLorePages,
  unresolvedLoreLinks,
  onOpenLore,
  wordCount,
  characterCount,
  readingMinutes,
  selectedWordCount,
}: EditorDetailsDrawerProps) {
  return (
    <div className="document-details-drawer">
      <div className="document-details-grid">
        <div className="document-organization-panel">
          <label className="lore-label" htmlFor="document-folder-path">
            Folder / Path
          </label>
          <input
            id="document-folder-path"
            className="lore-input"
            value={documentFolderPath}
            onChange={(event) => onFolderPathChange(event.target.value)}
            placeholder="Scenes/Act 1 or Notes/Research"
          />
          <div className="document-folder-presets">
            {["Scenes", "Notes", "Reference"].map((folder) => (
              <button
                key={folder}
                className={`folder-chip ${documentFolderPath.trim() === folder ? "active" : ""}`}
                type="button"
                onClick={() => onFolderPathChange(folder)}
              >
                {folder}
              </button>
            ))}
          </div>
        </div>

        {(linkedLorePages.length > 0 || unresolvedLoreLinks.length > 0) ? (
          <div className="linked-lore-panel">
            {linkedLorePages.length > 0 ? (
              <>
                <div className="linked-lore-label">Linked Lore</div>
                <div className="linked-lore-list">
                  {linkedLorePages.map((page) => (
                    <button
                      key={page.id}
                      className="linked-lore-chip"
                      type="button"
                      onClick={() => onOpenLore(page)}
                    >
                      {page.title}
                    </button>
                  ))}
                </div>
              </>
            ) : null}
            {unresolvedLoreLinks.length > 0 ? (
              <>
                <div className="linked-lore-label unresolved">Unresolved Links</div>
                <div className="linked-lore-list">
                  {unresolvedLoreLinks.map((title) => (
                    <span key={title} className="linked-lore-chip unresolved">
                      {title}
                    </span>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        ) : null}

        <div className="editor-insights">
          <div className="word-count-box">
            <div className="wc-row">
              <span className="wc-label">Words</span>
              <span className="wc-value">{wordCount}</span>
            </div>
            <div className="wc-row">
              <span className="wc-label">Characters</span>
              <span className="wc-value">{characterCount}</span>
            </div>
            <div className="wc-row">
              <span className="wc-label">Read Time</span>
              <span className="wc-value">{readingMinutes} min</span>
            </div>
          </div>

          <div className="word-count-box">
            <div className="wc-row">
              <span className="wc-label">Selection</span>
              <span className="wc-value">{selectedWordCount || 0} words</span>
            </div>
            <div className="wc-row">
              <span className="wc-label">Linked Lore</span>
              <span className="wc-value">{linkedLorePages.length}</span>
            </div>
            <div className="wc-row">
              <span className="wc-label">Unresolved</span>
              <span className="wc-value">{unresolvedLoreLinks.length}</span>
            </div>
          </div>

          <div className="editor-shortcuts">
            <div className="linked-lore-label">Shortcuts</div>
            <div className="editor-shortcuts-list">
              <span>Ctrl/Cmd+B bold</span>
              <span>Ctrl/Cmd+I italic</span>
              <span>Ctrl/Cmd+U underline</span>
              <span>Ctrl/Cmd+K lore link</span>
              <span>Ctrl/Cmd+S save</span>
              <span>Ctrl/Cmd+Alt+1 heading 1</span>
              <span>Ctrl/Cmd+Alt+2 heading 2</span>
              <span>Ctrl/Cmd+Shift+8 bullet list</span>
              <span>Ctrl/Cmd+Shift+7 numbered list</span>
              <span>Ctrl/Cmd+Shift+9 quote block</span>
              <span>Ctrl/Cmd+Shift+N note block</span>
              <span>Ctrl/Cmd+Shift+P preview</span>
              <span>Ctrl/Cmd+Shift+D details</span>
              <span>Ctrl/Cmd+Alt+F focus mode</span>
              <span>Ctrl/Cmd+Alt+M typewriter mode</span>
              <span>Ctrl/Cmd+Shift+[ or ] switch docs</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
