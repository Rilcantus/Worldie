import { memo } from "react";
import type { TabKind, WorldUI } from "../types/ui";

type PlaceholderViewProps = {
  activeNav: Extract<TabKind, "rels" | "timeline">;
  isSidebarCollapsed: boolean;
  isRightPanelCollapsed: boolean;
  activeWorld?: WorldUI;
  onExpandSidebar: () => void;
  onExpandRightPanel: () => void;
};

export const PlaceholderView = memo(function PlaceholderView({
  activeNav,
  isSidebarCollapsed,
  isRightPanelCollapsed,
  activeWorld,
  onExpandSidebar,
  onExpandRightPanel,
}: PlaceholderViewProps) {
  const isRelationships = activeNav === "rels";

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
                &rsaquo;
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
                &lsaquo;
              </button>
              <span>Context</span>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="editor-toolbar">
        <span className="tb-btn active" aria-current="page">
          {isRelationships ? "R" : "T"}
        </span>
        <span className="tb-btn">{isRelationships ? "Relationships" : "Timeline"}</span>
      </div>

      <h1 className="doc-title-input">{isRelationships ? "Relationships" : "Timeline"}</h1>
      <div className="doc-meta">
        <div className="meta-tag">
          <div className="meta-dot"></div> {activeWorld?.name ?? "World"}
        </div>
        <div className="meta-tag">Coming soon</div>
      </div>

      <div className="doc-empty">
        {isRelationships
          ? "Relationship map is in the next MVP slice."
          : "Timeline builder is in the next MVP slice."}
      </div>
    </div>
  );
});
