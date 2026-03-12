import { useEffect, useMemo, useState } from "react";
import type { LorePage, Relationship } from "../lib/data";
import type { WorldUI } from "../types/ui";

type RelationshipsViewProps = {
  isDocListCollapsed: boolean;
  isSidebarCollapsed: boolean;
  isRightPanelCollapsed: boolean;
  docListWidth: number;
  relationships: Relationship[];
  activeRelationshipId: string | null;
  relationshipSourceId: string;
  relationshipTargetId: string;
  relationshipType: string;
  relationshipNotes: string;
  lorePages: LorePage[];
  activeWorld?: WorldUI;
  onCollapseDocList: () => void;
  onExpandDocList: () => void;
  onExpandSidebar: () => void;
  onExpandRightPanel: () => void;
  onResizeStart: (event: React.MouseEvent<HTMLDivElement>) => void;
  onSelectRelationship: (relationship: Relationship) => void;
  onAddRelationship: () => void;
  onRemoveRelationship: (relationshipId: string) => void;
  onSave: () => void;
  onSourceChange: (value: string) => void;
  onTargetChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onOpenLore: (page: LorePage) => void;
};

const relationLabel = (relationship: Relationship, lorePages: LorePage[]) => {
  const source = lorePages.find((page) => page.id === relationship.sourcePageId)?.title ?? "Unknown";
  const target = lorePages.find((page) => page.id === relationship.targetPageId)?.title ?? "Unknown";
  return `${source} -> ${target}`;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName;
  return (
    target.isContentEditable ||
    tagName === "INPUT" ||
    tagName === "TEXTAREA" ||
    tagName === "SELECT"
  );
};

export function RelationshipsView({
  isDocListCollapsed,
  isSidebarCollapsed,
  isRightPanelCollapsed,
  docListWidth,
  relationships,
  activeRelationshipId,
  relationshipSourceId,
  relationshipTargetId,
  relationshipType,
  relationshipNotes,
  lorePages,
  activeWorld,
  onCollapseDocList,
  onExpandDocList,
  onExpandSidebar,
  onExpandRightPanel,
  onResizeStart,
  onSelectRelationship,
  onAddRelationship,
  onRemoveRelationship,
  onSave,
  onSourceChange,
  onTargetChange,
  onTypeChange,
  onNotesChange,
  onOpenLore,
}: RelationshipsViewProps) {
  const [relationshipSearch, setRelationshipSearch] = useState("");
  const [relationshipTypeFilter, setRelationshipTypeFilter] = useState("all");
  const [relationshipPageFilter, setRelationshipPageFilter] = useState("all");
  const [graphScope, setGraphScope] = useState<"all" | "focused">("all");
  const sourceInputId = "relationship-source";
  const typeInputId = "relationship-type";
  const targetInputId = "relationship-target";
  const notesInputId = "relationship-notes";
  const relationshipSearchInputId = "relationship-search";
  const relationshipTypeFilterId = "relationship-type-filter";
  const relationshipPageFilterId = "relationship-page-filter";

  const loreTitleById = useMemo(
    () => new Map(lorePages.map((page) => [page.id, page.title])),
    [lorePages],
  );

  const filteredRelationships = useMemo(() => {
    const query = relationshipSearch.trim().toLowerCase();
    return relationships.filter((relationship) => {
      const sourceTitle = loreTitleById.get(relationship.sourcePageId) ?? "Unknown";
      const targetTitle = loreTitleById.get(relationship.targetPageId) ?? "Unknown";
      const matchesQuery =
        !query ||
        sourceTitle.toLowerCase().includes(query) ||
        targetTitle.toLowerCase().includes(query) ||
        relationship.relationType.toLowerCase().includes(query) ||
        (relationship.notes ?? "").toLowerCase().includes(query);
      const matchesType =
        relationshipTypeFilter === "all" || relationship.relationType === relationshipTypeFilter;
      const matchesPage =
        relationshipPageFilter === "all" ||
        relationship.sourcePageId === relationshipPageFilter ||
        relationship.targetPageId === relationshipPageFilter;
      return matchesQuery && matchesType && matchesPage;
    });
  }, [loreTitleById, relationshipPageFilter, relationshipSearch, relationshipTypeFilter, relationships]);

  const relationshipPages = useMemo(
    () =>
      lorePages.filter((page) =>
        filteredRelationships.some(
          (relationship) =>
            relationship.sourcePageId === page.id || relationship.targetPageId === page.id,
        ),
      ),
    [filteredRelationships, lorePages],
  );

  const relationshipTypeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const relationship of filteredRelationships) {
      counts.set(relationship.relationType, (counts.get(relationship.relationType) ?? 0) + 1);
    }
    return [...counts.entries()].sort((left, right) => right[1] - left[1]).slice(0, 4);
  }, [filteredRelationships]);

  const allRelationshipTypes = useMemo(
    () =>
      [...new Set(relationships.map((relationship) => relationship.relationType).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [relationships],
  );

  const keyPages = useMemo(
    () =>
      relationshipPages
        .map((page) => ({
          page,
          count: filteredRelationships.filter(
            (relationship) =>
              relationship.sourcePageId === page.id || relationship.targetPageId === page.id,
          ).length,
        }))
        .sort((left, right) => right.count - left.count)
        .slice(0, 5),
    [filteredRelationships, relationshipPages],
  );

  const focusedPage = useMemo(() => {
    if (relationshipPageFilter !== "all") {
      return lorePages.find((page) => page.id === relationshipPageFilter) ?? null;
    }
    if (activeRelationshipId) {
      return (
        lorePages.find((page) => page.id === relationshipSourceId) ??
        lorePages.find((page) => page.id === relationshipTargetId) ??
        null
      );
    }
    return keyPages[0]?.page ?? null;
  }, [activeRelationshipId, keyPages, lorePages, relationshipPageFilter, relationshipSourceId, relationshipTargetId]);

  const focusedConnections = useMemo(() => {
    if (!focusedPage) return [];
    return filteredRelationships
      .filter(
        (relationship) =>
          relationship.sourcePageId === focusedPage.id || relationship.targetPageId === focusedPage.id,
      )
      .map((relationship) => {
        const counterpartId =
          relationship.sourcePageId === focusedPage.id ? relationship.targetPageId : relationship.sourcePageId;
        const counterpart = lorePages.find((page) => page.id === counterpartId) ?? null;
        return { relationship, counterpart };
      })
      .sort((left, right) => left.relationship.relationType.localeCompare(right.relationship.relationType));
  }, [filteredRelationships, focusedPage, lorePages]);

  const focusedConnectionCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of focusedConnections) {
      counts.set(entry.relationship.relationType, (counts.get(entry.relationship.relationType) ?? 0) + 1);
    }
    return [...counts.entries()].sort((left, right) => right[1] - left[1]);
  }, [focusedConnections]);

  const graphRelationships = useMemo(() => {
    if (graphScope !== "focused" || !focusedPage) {
      return filteredRelationships;
    }
    return filteredRelationships.filter(
      (relationship) =>
        relationship.sourcePageId === focusedPage.id || relationship.targetPageId === focusedPage.id,
    );
  }, [filteredRelationships, focusedPage, graphScope]);

  const graphPages = useMemo(
    () =>
      lorePages.filter((page) =>
        graphRelationships.some(
          (relationship) =>
            relationship.sourcePageId === page.id || relationship.targetPageId === page.id,
        ),
      ),
    [graphRelationships, lorePages],
  );

  const networkNodes = useMemo(() => {
    if (graphPages.length === 0) {
      return [];
    }

    const centerX = 50;
    const centerY = 50;
    const radius = graphPages.length <= 1 ? 0 : graphScope === "focused" ? 24 : 32;

    return graphPages.slice(0, 10).map((page, index, pages) => {
      const degree = graphRelationships.filter(
        (relationship) =>
          relationship.sourcePageId === page.id || relationship.targetPageId === page.id,
      ).length;
      const angle = pages.length === 1 ? 0 : (index / pages.length) * Math.PI * 2 - Math.PI / 2;
      const x = pages.length === 1 ? centerX : centerX + Math.cos(angle) * radius;
      const y = pages.length === 1 ? centerY : centerY + Math.sin(angle) * radius;

      return {
        id: page.id,
        title: page.title,
        x: clamp(x, 12, 88),
        y: clamp(y, 16, 84),
        degree,
      };
    });
  }, [graphPages, graphRelationships, graphScope]);

  const networkEdges = useMemo(
    () =>
      graphRelationships
        .map((relationship) => {
          const source = networkNodes.find((node) => node.id === relationship.sourcePageId);
          const target = networkNodes.find((node) => node.id === relationship.targetPageId);
          if (!source || !target) {
            return null;
          }
          return { relationship, source, target };
        })
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry)),
    [graphRelationships, networkNodes],
  );

  const activeRelationship =
    relationships.find((relationship) => relationship.id === activeRelationshipId) ?? null;
  const activeSource = lorePages.find((page) => page.id === relationshipSourceId) ?? null;
  const activeTarget = lorePages.find((page) => page.id === relationshipTargetId) ?? null;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const modifier = event.ctrlKey || event.metaKey;
      const editableTarget = isEditableTarget(event.target);

      if (modifier && !event.altKey && !event.shiftKey && key === "s") {
        event.preventDefault();
        onSave();
        return;
      }

      if (editableTarget) {
        return;
      }

      if (modifier && event.altKey && !event.shiftKey && key === "n") {
        event.preventDefault();
        onAddRelationship();
        return;
      }

      if (modifier && event.altKey && !event.shiftKey && (key === "backspace" || key === "delete")) {
        if (!activeRelationshipId) {
          return;
        }
        event.preventDefault();
        onRemoveRelationship(activeRelationshipId);
        return;
      }

      if (modifier && event.shiftKey && !event.altKey && (key === "[" || key === "]")) {
        if (filteredRelationships.length === 0) {
          return;
        }
        event.preventDefault();
        const currentIndex = filteredRelationships.findIndex(
          (relationship) => relationship.id === activeRelationshipId,
        );
        const safeIndex = currentIndex === -1 ? 0 : currentIndex;
        const nextIndex =
          key === "]"
            ? (safeIndex + 1) % filteredRelationships.length
            : (safeIndex - 1 + filteredRelationships.length) % filteredRelationships.length;
        onSelectRelationship(filteredRelationships[nextIndex]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    activeRelationshipId,
    filteredRelationships,
    onAddRelationship,
    onRemoveRelationship,
    onSave,
    onSelectRelationship,
  ]);

  return (
    <>
      <div
        className={`doc-list ${isDocListCollapsed ? "collapsed" : ""}`}
        style={{
          width: isDocListCollapsed ? 0 : docListWidth,
          minWidth: isDocListCollapsed ? 0 : 220,
          flexShrink: 0,
        }}
      >
        {!isDocListCollapsed ? (
          <>
            <div className="doc-list-header">
              <div className="doc-list-title">Relationships</div>
              <div className="doc-list-actions">
                <button
                  className="panel-toggle"
                  type="button"
                  onClick={onCollapseDocList}
                  title="Collapse list (Ctrl+2)"
                >
                  &lt;
                </button>
                <button
                  className="doc-add"
                  type="button"
                  onClick={onAddRelationship}
                  disabled={lorePages.length === 0}
                >
                  +
                </button>
              </div>
            </div>
            <div className="doc-list-body">
              {filteredRelationships.length === 0 ? (
                <div className="doc-empty">
                  {relationships.length === 0
                    ? "Create lore pages first, then connect them here."
                    : "No relationships match the current filters."}
                </div>
              ) : (
                filteredRelationships.map((relationship) => (
                  <div
                    key={relationship.id}
                    className={`doc-item ${relationship.id === activeRelationshipId ? "active" : ""}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectRelationship(relationship)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") onSelectRelationship(relationship);
                    }}
                  >
                    <div className="doc-item-info">
                      <div className="doc-item-title">{relationLabel(relationship, lorePages)}</div>
                      <div className="doc-item-meta">{relationship.relationType}</div>
                    </div>
                    <button
                      className="doc-item-delete"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onRemoveRelationship(relationship.id);
                      }}
                    >
                      x
                    </button>
                  </div>
                ))
              )}
            </div>
          </>
        ) : null}
      </div>

      {!isDocListCollapsed ? (
        <div className="resizer resizer-vertical" onMouseDown={onResizeStart} />
      ) : null}

      <div className="editor-pane">
        {isSidebarCollapsed || isRightPanelCollapsed || isDocListCollapsed ? (
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
                  &gt;
                </button>
              </div>
            ) : null}
            {isDocListCollapsed ? (
              <div className="collapsed-strip">
                <span>Relationships</span>
                <button
                  className="panel-toggle"
                  type="button"
                  onClick={onExpandDocList}
                  title="Expand list (Ctrl+2)"
                >
                  &gt;
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
                  &lt;
                </button>
                <span>Context</span>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="editor-toolbar">
          <button className="tb-btn tb-save" type="button" onClick={onSave}>
            Save
          </button>
        </div>

        <div className="structure-filter-bar">
          <div className="structure-filter-field structure-filter-field-wide">
            <label className="lore-label" htmlFor={relationshipSearchInputId}>
              Search
            </label>
            <input
              id={relationshipSearchInputId}
              className="lore-input"
              value={relationshipSearch}
              onChange={(event) => setRelationshipSearch(event.target.value)}
              placeholder="Filter by page, type, or notes"
            />
          </div>
          <div className="structure-filter-field">
            <label className="lore-label" htmlFor={relationshipTypeFilterId}>
              Type
            </label>
            <select
              id={relationshipTypeFilterId}
              className="lore-input"
              value={relationshipTypeFilter}
              onChange={(event) => setRelationshipTypeFilter(event.target.value)}
            >
              <option value="all">All types</option>
              {allRelationshipTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div className="structure-filter-field">
            <label className="lore-label" htmlFor={relationshipPageFilterId}>
              Focus page
            </label>
            <select
              id={relationshipPageFilterId}
              className="lore-input"
              value={relationshipPageFilter}
              onChange={(event) => setRelationshipPageFilter(event.target.value)}
            >
              <option value="all">All pages</option>
              {lorePages.map((page) => (
                <option key={page.id} value={page.id}>
                  {page.title}
                </option>
              ))}
            </select>
          </div>
          <button
            className="tb-btn"
            type="button"
            onClick={() => {
              setRelationshipSearch("");
              setRelationshipTypeFilter("all");
              setRelationshipPageFilter("all");
              setGraphScope("all");
            }}
          >
            Clear Filters
          </button>
        </div>

        <div className="doc-title-input" style={{ display: "flex", alignItems: "center" }}>
          Relationship Network
        </div>
        <div className="doc-meta">
          <div className="meta-tag">
            <div className="meta-dot"></div> {activeWorld?.name ?? "World"}
          </div>
          <div className="meta-tag">Lore link</div>
        </div>

        <div className="structure-summary-grid">
          <div className="structure-card">
            <div className="structure-card-label">Connected Pages</div>
            <div className="structure-card-value">{graphPages.length}</div>
            <div className="structure-card-meta">
              Lore entries participating in the {graphScope === "focused" ? "focused" : "current"} network
            </div>
          </div>
          <div className="structure-card">
            <div className="structure-card-label">Relationship Count</div>
            <div className="structure-card-value">{filteredRelationships.length}</div>
            <div className="structure-card-meta">
              Matching links in {activeWorld?.name ?? "this world"}
            </div>
          </div>
          <div className="structure-card">
            <div className="structure-card-label">Current Focus</div>
            <div className="structure-card-value relationship-focus-text">
              {focusedPage?.title ?? activeSource?.title ?? "Select"}{" "}
              {focusedPage ? `${focusedConnections.length} links` : relationshipType || "link"}{" "}
              {focusedPage ? "" : activeTarget?.title ?? "pages"}
            </div>
            <div className="structure-card-meta">
              {focusedPage
                ? "Focused page for inspecting neighbors and connection density"
                : "Use this to inspect faction ties, rivalries, and affiliations"}
            </div>
          </div>
        </div>

        <div className="structure-grid">
          <div className="lore-panel">
            <div className="lore-panel-header">
              <div className="linked-lore-label">Network Preview</div>
              <div className="relationship-action-row">
                <button
                  className={`timeline-track-chip ${graphScope === "all" ? "active" : ""}`}
                  type="button"
                  onClick={() => setGraphScope("all")}
                >
                  Full Network
                </button>
                <button
                  className={`timeline-track-chip ${graphScope === "focused" ? "active" : ""}`}
                  type="button"
                  onClick={() => setGraphScope("focused")}
                  disabled={!focusedPage}
                >
                  Focused Radius
                </button>
              </div>
            </div>
            {graphPages.length === 0 ? (
              <div className="rp-empty">
                Create a few linked lore pages to start seeing the world&apos;s connection web.
              </div>
            ) : (
              <div className="relationship-map">
                <svg className="relationship-map-canvas" viewBox="0 0 100 100" aria-hidden="true">
                  {networkEdges.map(({ relationship, source, target }) => (
                    <line
                      key={relationship.id}
                      className={`relationship-map-edge ${
                        relationship.id === activeRelationshipId ? "active" : ""
                      }`}
                      x1={source.x}
                      y1={source.y}
                      x2={target.x}
                      y2={target.y}
                    />
                  ))}
                </svg>
                {networkEdges.map(({ relationship, source, target }) => (
                  <button
                    key={`${relationship.id}-label`}
                    className={`relationship-map-label ${
                      relationship.id === activeRelationshipId ? "active" : ""
                    }`}
                    type="button"
                    style={{
                      left: `${(source.x + target.x) / 2}%`,
                      top: `${(source.y + target.y) / 2}%`,
                    }}
                    onClick={() => onSelectRelationship(relationship)}
                  >
                    {relationship.relationType || relationLabel(relationship, lorePages)}
                  </button>
                ))}
                {networkNodes.map((node) => (
                  <button
                    key={node.id}
                    className="relationship-map-node"
                    type="button"
                    style={{
                      left: `${node.x}%`,
                      top: `${node.y}%`,
                    }}
                    onClick={() => setRelationshipPageFilter(node.id)}
                  >
                    <span className="relationship-map-node-title">{node.title}</span>
                    <span className="relationship-map-node-meta">{node.degree} links</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="lore-panel">
            <div className="lore-panel-header">
              <div className="linked-lore-label">Connection Patterns</div>
            </div>
            {relationshipTypeCounts.length === 0 ? (
              <div className="rp-empty">No connection patterns yet.</div>
            ) : (
              <div className="structure-list">
                {relationshipTypeCounts.map(([label, count]) => (
                  <div key={label} className="structure-list-item">
                    <span>{label}</span>
                    <span>{count}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="advanced-json-note">
              This is still a lightweight preview, not the final graph map. It gives you a
              faster read on the shape of the world while editing.
            </div>
            <div className="advanced-json-note">
              Graph scope: {graphScope === "focused" && focusedPage ? `focused on ${focusedPage.title}` : "full visible network"}.
            </div>
            <div className="advanced-json-note">
              Shortcuts: Ctrl/Cmd+S save, Ctrl/Cmd+Alt+N new relationship, Ctrl/Cmd+Shift+[ or
              ] move through links, Ctrl/Cmd+Alt+Backspace delete selected.
            </div>
          </div>
        </div>

        <div className="structure-grid">
          <div className="lore-panel">
            <div className="lore-panel-header">
              <div className="linked-lore-label">Focused Page Neighbors</div>
            </div>
            {!focusedPage ? (
              <div className="rp-empty">Pick a page or relationship to inspect its immediate network.</div>
            ) : focusedConnections.length === 0 ? (
              <div className="rp-empty">{focusedPage.title} has no matching connections in the current filter.</div>
            ) : (
              <div className="structure-list">
                {focusedConnections.map(({ relationship, counterpart }) => (
                  <div key={relationship.id} className="relationship-list-row">
                    <button
                      className={`structure-list-item structure-list-item-button ${
                        relationship.id === activeRelationshipId ? "active" : ""
                      }`}
                      type="button"
                      onClick={() => onSelectRelationship(relationship)}
                    >
                      <span>{counterpart?.title ?? "Unknown page"}</span>
                      <span>{relationship.relationType}</span>
                    </button>
                    {counterpart ? (
                      <button className="linked-lore-chip" type="button" onClick={() => onOpenLore(counterpart)}>
                        Open
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lore-panel">
            <div className="lore-panel-header">
              <div className="linked-lore-label">Focused Connection Mix</div>
            </div>
            {!focusedPage || focusedConnectionCounts.length === 0 ? (
              <div className="rp-empty">Connection breakdown will appear here for the focused page.</div>
            ) : (
              <div className="structure-list">
                {focusedConnectionCounts.map(([label, count]) => (
                  <div key={`${focusedPage.id}-${label}`} className="structure-list-item">
                    <span>{label}</span>
                    <span>{count}</span>
                  </div>
                ))}
              </div>
            )}
            {focusedPage ? (
              <div className="advanced-json-note">
                Focused on {focusedPage.title}. Use the page filter, node buttons, or key-page buttons to pivot the graph.
              </div>
            ) : null}
            {focusedPage ? (
              <div className="relationship-action-row">
                <button className="linked-lore-chip" type="button" onClick={() => onOpenLore(focusedPage)}>
                  Open focused page
                </button>
                {relationshipPageFilter !== "all" ? (
                  <button className="tb-btn" type="button" onClick={() => setRelationshipPageFilter("all")}>
                    Show full network
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="structure-grid">
          <div className="lore-panel">
            <div className="lore-panel-header">
              <div className="linked-lore-label">Key Pages</div>
            </div>
            {keyPages.length === 0 ? (
              <div className="rp-empty">
                The most connected pages will appear here as the network grows.
              </div>
            ) : (
              <div className="structure-list">
                {keyPages.map(({ page, count }) => (
                  <div key={page.id} className="relationship-list-row">
                    <button
                      className={`structure-list-item structure-list-item-button ${
                        relationshipPageFilter === page.id ? "active" : ""
                      }`}
                      type="button"
                      onClick={() => setRelationshipPageFilter(page.id)}
                    >
                      <span>{page.title}</span>
                      <span>{count} links</span>
                    </button>
                    <button className="linked-lore-chip" type="button" onClick={() => onOpenLore(page)}>
                      Open
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lore-panel">
            <div className="lore-panel-header">
              <div className="linked-lore-label">Relationship Composer</div>
            </div>

            <label className="lore-label" htmlFor={sourceInputId}>
              Source page
            </label>
            <select
              id={sourceInputId}
              className="lore-input"
              value={relationshipSourceId}
              onChange={(event) => onSourceChange(event.target.value)}
            >
              <option value="">Select source</option>
              {lorePages.map((page) => (
                <option key={page.id} value={page.id}>
                  {page.title}
                </option>
              ))}
            </select>

            <label className="lore-label" htmlFor={typeInputId}>
              Relationship type
            </label>
            <input
              id={typeInputId}
              className="lore-input"
              value={relationshipType}
              onChange={(event) => onTypeChange(event.target.value)}
              placeholder="ally, enemy, member of..."
            />

            <label className="lore-label" htmlFor={targetInputId}>
              Target page
            </label>
            <select
              id={targetInputId}
              className="lore-input"
              value={relationshipTargetId}
              onChange={(event) => onTargetChange(event.target.value)}
            >
              <option value="">Select target</option>
              {lorePages.map((page) => (
                <option key={page.id} value={page.id}>
                  {page.title}
                </option>
              ))}
            </select>

            <label className="lore-label" htmlFor={notesInputId}>
              Notes
            </label>
            <textarea
              id={notesInputId}
              className="lore-textarea"
              value={relationshipNotes}
              onChange={(event) => onNotesChange(event.target.value)}
              placeholder="Optional context for this connection"
            />
          </div>
        </div>

        {activeRelationship ? (
          <div className="lore-panel">
            <div className="lore-panel-header">
              <div className="linked-lore-label">Current Relationship Snapshot</div>
            </div>
            <div className="structure-list">
              <div className="structure-list-item">
                <span>Source</span>
                <span>{activeSource?.title ?? "Not set"}</span>
              </div>
              <div className="structure-list-item">
                <span>Type</span>
                <span>{relationshipType || "Not set"}</span>
              </div>
              <div className="structure-list-item">
                <span>Target</span>
                <span>{activeTarget?.title ?? "Not set"}</span>
              </div>
            </div>
            <div className="relationship-action-row">
              {activeSource ? (
                <button className="linked-lore-chip" type="button" onClick={() => onOpenLore(activeSource)}>
                  Open source
                </button>
              ) : null}
              {activeTarget ? (
                <button className="linked-lore-chip" type="button" onClick={() => onOpenLore(activeTarget)}>
                  Open target
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
