import type { Document, LorePage } from "../lib/data";
import type { TabItem, WorldUI } from "../types/ui";

type WorkbenchViewProps = {
  isSidebarCollapsed: boolean;
  isRightPanelCollapsed: boolean;
  projectTitle: string;
  activeWorld?: WorldUI;
  worlds: WorldUI[];
  documents: Document[];
  allLorePages: LorePage[];
  totalWordCount: number;
  tabs: TabItem[];
  recentDocuments: Document[];
  recentLorePages: LorePage[];
  onExpandSidebar: () => void;
  onExpandRightPanel: () => void;
  onAddDocument: () => void;
  onAddLorePage: () => void;
  onOpenDocument: (doc: Document) => void;
  onOpenLore: (page: LorePage) => void;
};

export function WorkbenchView({
  isSidebarCollapsed,
  isRightPanelCollapsed,
  projectTitle,
  activeWorld,
  worlds,
  documents,
  allLorePages,
  totalWordCount,
  tabs,
  recentDocuments,
  recentLorePages,
  onExpandSidebar,
  onExpandRightPanel,
  onAddDocument,
  onAddLorePage,
  onOpenDocument,
  onOpenLore,
}: WorkbenchViewProps) {
  return (
    <div className="editor-pane">
      {isSidebarCollapsed || isRightPanelCollapsed ? (
        <div className="collapsed-strip-row">
          {isSidebarCollapsed ? (
            <div className="collapsed-strip">
              <span>Project</span>
              <button
                className="panel-toggle"
                type="button"
                onClick={onExpandSidebar}
                title="Expand sidebar (Ctrl+1)"
              >
                {" > "}
              </button>
            </div>
          ) : null}
          {isRightPanelCollapsed ? (
            <div className="collapsed-strip">
              <button
                className="panel-toggle"
                type="button"
                onClick={onExpandRightPanel}
                title="Expand panel (Ctrl+3)"
              >
                {" < "}
              </button>
              <span>Context</span>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="editor-toolbar">
        <div className="tb-btn active">W</div>
        <div className="tb-btn">Workbench</div>
        <div className="tb-sep"></div>
        <button className="tb-btn" type="button" onClick={onAddDocument}>
          New Document
        </button>
        <button className="tb-btn" type="button" onClick={onAddLorePage}>
          New Lore
        </button>
      </div>

      <input className="doc-title-input" value={projectTitle} readOnly />
      <div className="doc-meta">
        <div className="meta-tag">
          <div className="meta-dot"></div> {activeWorld?.name ?? "No world selected"}
        </div>
        <div className="meta-tag">{worlds.length} worlds</div>
        <div className="meta-tag">{documents.length} docs</div>
        <div className="meta-tag">{allLorePages.length} lore pages</div>
      </div>

      <div className="workbench-grid">
        <div className="workbench-card">
          <div className="workbench-card-label">Current World</div>
          <div className="workbench-card-value">{activeWorld?.name ?? "No world selected"}</div>
          <div className="workbench-card-meta">
            {activeWorld?.editorCount ?? 0} docs · {activeWorld?.loreCount ?? 0} lore pages
          </div>
        </div>
        <div className="workbench-card">
          <div className="workbench-card-label">Project Words</div>
          <div className="workbench-card-value">{totalWordCount}</div>
          <div className="workbench-card-meta">Estimated from all loaded documents</div>
        </div>
        <div className="workbench-card">
          <div className="workbench-card-label">Open Tabs</div>
          <div className="workbench-card-value">{tabs.length}</div>
          <div className="workbench-card-meta">Pages currently active in this project</div>
        </div>
      </div>

      <div className="workbench-columns">
        <div className="workbench-panel">
          <div className="workbench-panel-title">Recent Documents</div>
          {recentDocuments.length === 0 ? (
            <div className="doc-empty">No documents yet.</div>
          ) : (
            recentDocuments.map((doc) => (
              <button
                key={doc.id}
                className="workbench-link"
                type="button"
                onClick={() => onOpenDocument(doc)}
              >
                <span className="workbench-link-icon">D</span>
                <span>{doc.title}</span>
              </button>
            ))
          )}
        </div>

        <div className="workbench-panel">
          <div className="workbench-panel-title">Recent Lore</div>
          {recentLorePages.length === 0 ? (
            <div className="doc-empty">No lore pages yet.</div>
          ) : (
            recentLorePages.map((page) => (
              <button
                key={page.id}
                className="workbench-link"
                type="button"
                onClick={() => onOpenLore(page)}
              >
                <span className="workbench-link-icon">L</span>
                <span>{page.title}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
