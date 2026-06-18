import { memo } from "react";

type ActivityBarProps = {
  activeNav: string;
  activeLoreExists: boolean;
  hasActiveProject: boolean;
  onOpenWorkbench: () => void;
  onOpenLore: () => void;
  onOpenTemplates: () => void;
  onOpenLoreTypes: () => void;
  onOpenRelationships: () => void;
  onOpenTimeline: () => void;
  onOpenAtlas: () => void;
  onFocusSearch: () => void;
};

export const ActivityBar = memo(function ActivityBar({
  activeNav,
  activeLoreExists,
  hasActiveProject,
  onOpenWorkbench,
  onOpenLore,
  onOpenTemplates,
  onOpenLoreTypes,
  onOpenRelationships,
  onOpenTimeline,
  onOpenAtlas,
  onFocusSearch,
}: ActivityBarProps) {
  const disabledTitle = "Open or create a project first";

  return (
    <div className="activity-bar">
      <button
        className={`ab-icon ${activeNav === "workbench" || activeNav === "editor" ? "active" : ""}`}
        title={hasActiveProject ? "Explorer" : disabledTitle}
        type="button"
        onClick={onOpenWorkbench}
        disabled={!hasActiveProject}
      >
        X
      </button>
      <button
        className={`ab-icon ${activeNav === "lore" || activeNav === "lcreate" ? "active" : ""}`}
        title={hasActiveProject ? "Lore Items" : disabledTitle}
        type="button"
        onClick={onOpenLore}
        disabled={!hasActiveProject}
      >
        {activeLoreExists ? "L" : "+"}
      </button>
      <button
        className={`ab-icon ${activeNav === "templates" ? "active" : ""}`}
        title={hasActiveProject ? "Templates" : disabledTitle}
        type="button"
        onClick={onOpenTemplates}
        disabled={!hasActiveProject}
      >
        S
      </button>
      <button
        className={`ab-icon ${activeNav === "ltypes" ? "active" : ""}`}
        title={hasActiveProject ? "Lore Types" : disabledTitle}
        type="button"
        onClick={onOpenLoreTypes}
        disabled={!hasActiveProject}
      >
        Y
      </button>
      <button
        className={`ab-icon ${activeNav === "rels" ? "active" : ""}`}
        title={hasActiveProject ? "Relationship Map" : disabledTitle}
        type="button"
        onClick={onOpenRelationships}
        disabled={!hasActiveProject}
      >
        R
      </button>
      <button
        className={`ab-icon ${activeNav === "timeline" ? "active" : ""}`}
        title={hasActiveProject ? "Timeline" : disabledTitle}
        type="button"
        onClick={onOpenTimeline}
        disabled={!hasActiveProject}
      >
        T
      </button>
      <button
        className={`ab-icon ${activeNav === "atlas" ? "active" : ""}`}
        title={hasActiveProject ? "Atlas" : disabledTitle}
        type="button"
        onClick={onOpenAtlas}
        disabled={!hasActiveProject}
      >
        A
      </button>
      <button
        className="ab-icon"
        title={hasActiveProject ? "Search" : disabledTitle}
        type="button"
        onClick={onFocusSearch}
        disabled={!hasActiveProject}
      >
        ?
      </button>
      <div className="ab-spacer"></div>
    </div>
  );
});
