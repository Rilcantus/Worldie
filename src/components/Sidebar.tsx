import { memo, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { getProjectFilename, getProjectPathDisplay, type Project } from "../lib/data";
import type { WorldUI } from "../types/ui";

type SidebarProps = {
  isCollapsed: boolean;
  width: number;
  isEditingProject: boolean;
  projectDraft: string;
  projectTitle: string;
  activeProject: Project | null;
  activeProjectId: string | null;
  searchQuery: string;
  searchInputRef: RefObject<HTMLInputElement>;
  worlds: WorldUI[];
  editingWorldId: string | null;
  worldDraft: string;
  activeWorldId: string | null;
  activeNav: string;
  activeLoreCategory: string;
  recentProjects: Project[];
  isProjectBusy: boolean;
  projectStatusMessage: string;
  onProjectDraftChange: (value: string) => void;
  onCommitProjectTitle: () => void;
  onCancelProjectEdit: () => void;
  onStartProjectEdit: () => void;
  onAddProject: () => void;
  onOpenProject: () => void;
  onSaveProjectAs: () => void;
  onAddDemoProject: () => void;
  onRemoveProject: () => void;
  onCollapse: () => void;
  onOpenRecentProject: (projectId: string) => void;
  onSearchQueryChange: (value: string) => void;
  onAddWorld: () => void;
  onToggleWorld: (worldId: string) => void;
  onWorldDraftChange: (value: string) => void;
  onCommitWorldTitle: () => void;
  onCancelWorldEdit: () => void;
  onStartWorldEdit: (world: WorldUI) => void;
  onRemoveWorld: (worldId: string) => void;
  onOpenEditor: (worldId: string) => void;
  onOpenLoreRoot: (worldId: string) => void;
  onOpenLoreCategory: (worldId: string, categoryId: string) => void;
  onOpenRelationships: (worldId: string) => void;
  onOpenTimeline: (worldId: string) => void;
};

export const Sidebar = memo(function Sidebar({
  isCollapsed,
  width,
  isEditingProject,
  projectDraft,
  projectTitle,
  activeProject,
  activeProjectId,
  searchQuery,
  searchInputRef,
  worlds,
  editingWorldId,
  worldDraft,
  activeWorldId,
  activeNav,
  activeLoreCategory,
  recentProjects,
  isProjectBusy,
  projectStatusMessage,
  onProjectDraftChange,
  onCommitProjectTitle,
  onCancelProjectEdit,
  onStartProjectEdit,
  onAddProject,
  onOpenProject,
  onSaveProjectAs,
  onAddDemoProject,
  onRemoveProject,
  onCollapse,
  onOpenRecentProject,
  onSearchQueryChange,
  onAddWorld,
  onToggleWorld,
  onWorldDraftChange,
  onCommitWorldTitle,
  onCancelWorldEdit,
  onStartWorldEdit,
  onRemoveWorld,
  onOpenEditor,
  onOpenLoreRoot,
  onOpenLoreCategory,
  onOpenRelationships,
  onOpenTimeline,
}: SidebarProps) {
  const worldClickTimeoutRef = useRef<number | null>(null);
  const projectMenuRef = useRef<HTMLDivElement | null>(null);
  const projectMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousProjectMenuOpenRef = useRef(false);
  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false);
  const projectMenuButtonId = "sidebar-project-menu-button";
  const projectMenuId = "sidebar-project-menu";
  const activeWorld = useMemo(
    () => worlds.find((world) => world.id === activeWorldId) ?? worlds[0] ?? null,
    [activeWorldId, worlds],
  );

  useEffect(() => {
    const wasOpen = previousProjectMenuOpenRef.current;
    previousProjectMenuOpenRef.current = isProjectMenuOpen;

    if (isProjectMenuOpen) {
      window.requestAnimationFrame(() => {
        const firstMenuItem = projectMenuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)');
        firstMenuItem?.focus();
      });
      return;
    }

    if (wasOpen) {
      window.requestAnimationFrame(() => {
        projectMenuButtonRef.current?.focus();
      });
    }
  }, [isProjectMenuOpen]);

  useEffect(() => {
    if (!isProjectMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (projectMenuRef.current?.contains(target)) return;
      setIsProjectMenuOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsProjectMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isProjectMenuOpen]);

  return (
    <div className={`sidebar ${isCollapsed ? "collapsed" : ""}`} style={{ width: isCollapsed ? 0 : width }}>
      <div className="sidebar-header">
        <div className="project-header-top">
          <div className="project-label">Current Project</div>
          <div className="project-header-actions">
            <button
              id={projectMenuButtonId}
              ref={projectMenuButtonRef}
              className="project-menu-button"
              type="button"
              disabled={isProjectBusy}
              onClick={() => setIsProjectMenuOpen((current) => !current)}
              aria-haspopup="menu"
              aria-expanded={isProjectMenuOpen}
              aria-controls={isProjectMenuOpen ? projectMenuId : undefined}
            >
              Project
            </button>
            <button className="panel-toggle" type="button" onClick={onCollapse} title="Collapse sidebar (Ctrl+1)">
              {"<"}
            </button>
          </div>
        </div>

        <div className="project-card" title={activeProject?.filepath ?? undefined}>
          {isEditingProject && activeProjectId ? (
            <input
              className="project-input"
              value={projectDraft}
              onChange={(event) => onProjectDraftChange(event.target.value)}
              onBlur={onCommitProjectTitle}
              onKeyDown={(event) => {
                if (event.key === "Enter") onCommitProjectTitle();
                if (event.key === "Escape") onCancelProjectEdit();
              }}
              autoFocus
            />
          ) : (
            <button className="project-name" type="button" onClick={activeProjectId ? onStartProjectEdit : onAddProject}>
              <div className="gem"></div>
              {projectTitle}
            </button>
          )}
          <div className="project-subtitle">{activeWorld ? activeWorld.name : "Open a project and start building"}</div>
          <div className="project-path">{getProjectFilename(activeProject ?? { title: projectTitle, filepath: undefined })}</div>
          {projectStatusMessage ? <div className="project-status-line">{projectStatusMessage}</div> : null}
        </div>

        {isProjectMenuOpen ? (
          <div
            ref={projectMenuRef}
            className="project-menu"
            id={projectMenuId}
            role="menu"
            aria-labelledby={projectMenuButtonId}
          >
            <button
              className="project-menu-item"
              type="button"
              role="menuitem"
              disabled={isProjectBusy}
              onClick={() => {
                setIsProjectMenuOpen(false);
                onAddProject();
              }}
            >
              New Project
            </button>
            <button
              className="project-menu-item"
              type="button"
              role="menuitem"
              disabled={isProjectBusy}
              onClick={() => {
                setIsProjectMenuOpen(false);
                onOpenProject();
              }}
            >
              Open Project
            </button>
            <button
              className="project-menu-item"
              type="button"
              role="menuitem"
              disabled={!activeProjectId || isProjectBusy}
              onClick={() => {
                setIsProjectMenuOpen(false);
                onSaveProjectAs();
              }}
            >
              Save As
            </button>
            <button
              className="project-menu-item"
              type="button"
              role="menuitem"
              disabled={isProjectBusy}
              onClick={() => {
                setIsProjectMenuOpen(false);
                onAddDemoProject();
              }}
            >
              New Demo Project
            </button>
            <button
              className="project-menu-item danger"
              type="button"
              role="menuitem"
              disabled={!activeProjectId || isProjectBusy}
              onClick={() => {
                setIsProjectMenuOpen(false);
                onRemoveProject();
              }}
            >
              Delete Project
            </button>
            <div className="project-menu-divider" role="separator"></div>
            <div className="project-menu-label" role="presentation">Recent Projects</div>
            {recentProjects.length === 0 ? (
              <div className="project-menu-empty" role="presentation">No recent projects yet.</div>
            ) : (
              recentProjects.map((project) => (
                <button
                  key={project.id}
                  className={`project-menu-item project-menu-recent ${project.id === activeProjectId ? "active" : ""}`}
                  type="button"
                  role="menuitem"
                  disabled={isProjectBusy}
                  onClick={() => {
                    setIsProjectMenuOpen(false);
                    onOpenRecentProject(project.id);
                  }}
                >
                  <span>{project.title}</span>
                  <span className="project-menu-meta">
                    {getProjectPathDisplay(project) || getProjectFilename(project)}
                  </span>
                </button>
              ))
            )}
          </div>
        ) : null}
      </div>

      <div className="sidebar-search">
        <div className="search-wrap">
          <span className="search-icon">{"\u2315"}</span>
          <input
            className="search-input"
            placeholder="Search lore & docs..."
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            ref={searchInputRef}
          />
        </div>
      </div>

      <div className="sidebar-scroll">
        <div className="sidebar-section">
          <div className="sidebar-section-header">
            Worlds
            <button className="add-btn" type="button" onClick={onAddWorld} disabled={!activeProjectId}>
              +
            </button>
          </div>

          {worlds.map((world) => (
            <div className="world-item" key={world.id}>
              <div
                className={`world-header ${world.isOpen ? "open" : ""}`}
                onClick={(event) => {
                  const target = event.target as HTMLElement;
                  if (target.closest(".world-delete")) return;
                  if (worldClickTimeoutRef.current) {
                    window.clearTimeout(worldClickTimeoutRef.current);
                    worldClickTimeoutRef.current = null;
                  }
                  worldClickTimeoutRef.current = window.setTimeout(() => {
                    onToggleWorld(world.id);
                    worldClickTimeoutRef.current = null;
                  }, 220);
                }}
              >
                <div className="world-dot" style={{ background: world.color }}></div>
                {editingWorldId === world.id ? (
                  <input
                    className="world-input"
                    value={worldDraft}
                    onChange={(event) => onWorldDraftChange(event.target.value)}
                    onBlur={onCommitWorldTitle}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") onCommitWorldTitle();
                      if (event.key === "Escape") onCancelWorldEdit();
                    }}
                    autoFocus
                    onClick={(event) => event.stopPropagation()}
                  />
                ) : (
                  <button
                    className="world-title"
                    type="button"
                    onDoubleClick={(event) => {
                      event.stopPropagation();
                      if (worldClickTimeoutRef.current) {
                        window.clearTimeout(worldClickTimeoutRef.current);
                        worldClickTimeoutRef.current = null;
                      }
                      onStartWorldEdit(world);
                    }}
                  >
                    {world.name}
                  </button>
                )}
                <span className="world-chevron">{"\u25B6"}</span>
                <button
                  className="world-delete"
                  type="button"
                  disabled={worlds.length <= 1}
                  onClick={(event) => {
                    event.stopPropagation();
                    onRemoveWorld(world.id);
                  }}
                  title={worlds.length <= 1 ? "Projects need at least one world" : "Delete world"}
                >
                  {"\u00D7"}
                </button>
              </div>
              {world.isOpen ? (
                <div className="world-children">
                  <button
                    className={`nav-item ${world.id === activeWorldId && activeNav === "editor" ? "active" : ""}`}
                    type="button"
                    onClick={() => onOpenEditor(world.id)}
                  >
                    <span className="nav-icon">{"\u270D"}</span> Editor
                    <span className="nav-count">{world.editorCount}</span>
                  </button>
                  <button
                    className={`nav-item ${world.id === activeWorldId && activeNav === "lore" ? "active" : ""}`}
                    type="button"
                    onClick={() => onOpenLoreRoot(world.id)}
                  >
                    <span className="nav-icon">{"\uD83D\uDCCB"}</span> Lore Pages
                    <span className="nav-count">{world.loreCount}</span>
                  </button>

                  <div className="lore-sub">
                    {world.loreCategories.map((category) => (
                      <button
                        className={`lore-entry ${world.id === activeWorldId && activeLoreCategory === category.id ? "active" : ""}`}
                        key={category.id}
                        type="button"
                        onClick={() => onOpenLoreCategory(world.id, category.id)}
                      >
                        <span className="dot"></span> {category.label}
                        <span className="lore-entry-count">{category.count}</span>
                      </button>
                    ))}
                  </div>

                  <button
                    className={`nav-item ${world.id === activeWorldId && activeNav === "rels" ? "active" : ""}`}
                    type="button"
                    onClick={() => onOpenRelationships(world.id)}
                  >
                    <span className="nav-icon">{"\uD83D\uDD78"}</span> Relationships
                  </button>
                  <button
                    className={`nav-item ${world.id === activeWorldId && activeNav === "timeline" ? "active" : ""}`}
                    type="button"
                    onClick={() => onOpenTimeline(world.id)}
                  >
                    <span className="nav-icon">{"\u23F3"}</span> Timeline
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>

        <div className="sidebar-section" style={{ marginTop: "12px" }}>
          <div className="sidebar-section-header">Recent Projects</div>
          {recentProjects.length === 0 ? (
            <div className="lore-entry" style={{ paddingLeft: "8px" }}>
              No recent projects yet
            </div>
          ) : (
            recentProjects.map((project) => (
              <button
                className={`recent-project-row ${project.id === activeProjectId ? "active" : ""}`}
                type="button"
                key={project.id}
                disabled={isProjectBusy}
                onClick={() => onOpenRecentProject(project.id)}
                title={project.filepath ?? undefined}
              >
                <span className="recent-project-title">{project.title}</span>
                <span className="recent-project-path">{getProjectPathDisplay(project) || getProjectFilename(project)}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
});
