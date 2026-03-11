import type { TabKind, WorldUI } from "../types/ui";

type PlaceholderViewProps = {
  activeNav: Extract<TabKind, "rels" | "timeline">;
  isSidebarCollapsed: boolean;
  isRightPanelCollapsed: boolean;
  activeWorld?: WorldUI;
  onExpandSidebar: () => void;
  onExpandRightPanel: () => void;
};

export function PlaceholderView({
  activeNav,
  isSidebarCollapsed,
  isRightPanelCollapsed,
  activeWorld,
  onExpandSidebar,
  onExpandRightPanel,
}: PlaceholderViewProps) {
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
                ▶
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
                ◀
              </button>
              <span>Context</span>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="editor-toolbar">
        <div className="tb-btn active">{activeNav === "rels" ? "🕸" : "⏳"}</div>
        <div className="tb-btn">{activeNav === "rels" ? "Relationships" : "Timeline"}</div>
      </div>

      <div className="doc-meta">
        <div className="meta-tag">
          <div className="meta-dot"></div> {activeWorld?.name ?? "World"}
        </div>
        <div className="meta-tag">Coming soon</div>
      </div>

      <textarea
        className="doc-editor"
        value={
          activeNav === "rels"
            ? "Relationship map is in the next MVP slice."
            : "Timeline builder is in the next MVP slice."
        }
        onChange={() => {}}
        readOnly
      />
    </div>
  );
}
