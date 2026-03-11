type ActivityBarProps = {
  activeNav: string;
  activeLoreExists: boolean;
  onOpenWorkbench: () => void;
  onOpenLore: () => void;
  onOpenTemplates: () => void;
  onOpenLoreTypes: () => void;
  onOpenRelationships: () => void;
  onOpenTimeline: () => void;
  onFocusSearch: () => void;
};

export function ActivityBar({
  activeNav,
  activeLoreExists,
  onOpenWorkbench,
  onOpenLore,
  onOpenTemplates,
  onOpenLoreTypes,
  onOpenRelationships,
  onOpenTimeline,
  onFocusSearch,
}: ActivityBarProps) {
  return (
    <div className="activity-bar">
      <button className={`ab-icon ${activeNav === "workbench" || activeNav === "editor" ? "active" : ""}`} title="Explorer" type="button" onClick={onOpenWorkbench}>
        X
      </button>
      <button className={`ab-icon ${activeNav === "lore" || activeNav === "lcreate" ? "active" : ""}`} title="Lore Items" type="button" onClick={onOpenLore}>
        {activeLoreExists ? "L" : "+"}
      </button>
      <button className={`ab-icon ${activeNav === "templates" ? "active" : ""}`} title="Templates" type="button" onClick={onOpenTemplates}>
        S
      </button>
      <button className={`ab-icon ${activeNav === "ltypes" ? "active" : ""}`} title="Lore Types" type="button" onClick={onOpenLoreTypes}>
        Y
      </button>
      <button className={`ab-icon ${activeNav === "rels" ? "active" : ""}`} title="Relationship Map" type="button" onClick={onOpenRelationships}>
        R
      </button>
      <button className={`ab-icon ${activeNav === "timeline" ? "active" : ""}`} title="Timeline" type="button" onClick={onOpenTimeline}>
        T
      </button>
      <button className="ab-icon" title="Search" type="button" onClick={onFocusSearch}>
        ?
      </button>
      <div className="ab-spacer"></div>
      <button className="ab-icon" title="Settings" type="button">
        *
      </button>
    </div>
  );
}
