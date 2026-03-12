type LauncherViewProps = {
  isSidebarCollapsed: boolean;
  isRightPanelCollapsed: boolean;
  onExpandSidebar: () => void;
  onExpandRightPanel: () => void;
  onOpenWorkbench: () => void;
  onOpenDocument: () => void;
  onOpenLore: () => void;
  onOpenTemplates: () => void;
  onOpenLoreTypes: () => void;
  onOpenRelationships: () => void;
  onOpenTimeline: () => void;
};

export function LauncherView({
  isSidebarCollapsed,
  isRightPanelCollapsed,
  onExpandSidebar,
  onExpandRightPanel,
  onOpenWorkbench,
  onOpenDocument,
  onOpenLore,
  onOpenTemplates,
  onOpenLoreTypes,
  onOpenRelationships,
  onOpenTimeline,
}: LauncherViewProps) {
  return (
    <div className="editor-pane">
      {isSidebarCollapsed || isRightPanelCollapsed ? (
        <div className="collapsed-strip-row">
          {isSidebarCollapsed ? (
            <div className="collapsed-strip">
              <span>Project</span>
              <button className="panel-toggle" type="button" onClick={onExpandSidebar} title="Expand sidebar (Ctrl+1)">
                {" > "}
              </button>
            </div>
          ) : null}
          {isRightPanelCollapsed ? (
            <div className="collapsed-strip">
              <button className="panel-toggle" type="button" onClick={onExpandRightPanel} title="Expand panel (Ctrl+3)">
                {" < "}
              </button>
              <span>Context</span>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="editor-toolbar">
        <div className="editor-toolbar-main">
          <span className="tb-btn active" aria-current="page">
            Launcher
          </span>
          <button className="tb-btn" type="button" onClick={onOpenWorkbench}>
            Workbench
          </button>
          <button className="tb-btn" type="button" onClick={onOpenDocument}>
            New Document
          </button>
        </div>
      </div>

      <input className="doc-title-input" value="New Tab" readOnly />
      <div className="doc-meta">
        <div className="meta-tag">
          <div className="meta-dot"></div> Choose what to open
        </div>
      </div>

      <div className="tab-launcher-grid">
        <button className="launcher-card" type="button" onClick={onOpenWorkbench}>
          <span className="launcher-icon">W</span>
          <span className="launcher-label">Workbench</span>
        </button>
        <button className="launcher-card" type="button" onClick={onOpenDocument}>
          <span className="launcher-icon">D</span>
          <span className="launcher-label">Document</span>
        </button>
        <button className="launcher-card" type="button" onClick={onOpenLore}>
          <span className="launcher-icon">L</span>
          <span className="launcher-label">New Lore Item</span>
        </button>
        <button className="launcher-card" type="button" onClick={onOpenTemplates}>
          <span className="launcher-icon">S</span>
          <span className="launcher-label">Templates</span>
        </button>
        <button className="launcher-card" type="button" onClick={onOpenLoreTypes}>
          <span className="launcher-icon">Y</span>
          <span className="launcher-label">Lore Types</span>
        </button>
        <button className="launcher-card" type="button" onClick={onOpenRelationships}>
          <span className="launcher-icon">R</span>
          <span className="launcher-label">Relationships</span>
        </button>
        <button className="launcher-card" type="button" onClick={onOpenTimeline}>
          <span className="launcher-icon">T</span>
          <span className="launcher-label">Timeline</span>
        </button>
      </div>
    </div>
  );
}
