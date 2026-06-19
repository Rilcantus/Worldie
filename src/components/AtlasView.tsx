import { memo, useEffect, useMemo, useRef, useState, type Dispatch, type MouseEvent as ReactMouseEvent, type SetStateAction } from "react";
import {
  buildAtlasMarkerTypeOptions,
  filterAtlasMarkers,
  getAtlasPointFromClientPosition,
  type AtlasMarkerDraft,
  type AtlasMarkerFilterMode,
} from "../lib/atlas";
import type { LorePage, MapMarker, TimelineEvent, WorldMap } from "../lib/data";
import type { WorldUI } from "../types/ui";
import type { SaveState } from "../hooks/dirtyState";

type AtlasViewProps = {
  isDocListCollapsed: boolean;
  isSidebarCollapsed: boolean;
  isRightPanelCollapsed: boolean;
  docListWidth: number;
  maps: WorldMap[];
  markers: MapMarker[];
  timelineEvents: TimelineEvent[];
  activeMap: WorldMap | null;
  activeMarker: MapMarker | null;
  activeMapId: string | null;
  activeMarkerId: string | null;
  markerDraft: AtlasMarkerDraft;
  markerSaveState: SaveState;
  lorePages: LorePage[];
  activeWorld?: WorldUI;
  isLoading: boolean;
  onCollapseDocList: () => void;
  onExpandDocList: () => void;
  onExpandSidebar: () => void;
  onExpandRightPanel: () => void;
  onResizeStart: (event: React.MouseEvent<HTMLDivElement>) => void;
  onSelectMap: (mapId: string) => void;
  onSelectMarker: (markerId: string) => void;
  onAddMap: () => void;
  onUpdateMap: (mapId: string, updates: Partial<Pick<WorldMap, "name" | "description" | "backgroundType">>) => Promise<boolean>;
  onRemoveMap: (mapId: string) => void;
  onAddMarker: (point: { x: number; y: number }) => void;
  onMoveMarker: (markerId: string, point: { x: number; y: number }) => Promise<boolean>;
  onRemoveMarker: (markerId: string) => void;
  onMarkerDraftChange: Dispatch<SetStateAction<AtlasMarkerDraft>>;
  onSaveMarkerDraft: () => Promise<boolean>;
  onOpenLore: (page: LorePage) => void;
};

export const AtlasView = memo(function AtlasView({
  isDocListCollapsed,
  isSidebarCollapsed,
  isRightPanelCollapsed,
  docListWidth,
  maps,
  markers,
  timelineEvents,
  activeMap,
  activeMarker,
  activeMapId,
  activeMarkerId,
  markerDraft,
  markerSaveState,
  lorePages,
  activeWorld,
  isLoading,
  onCollapseDocList,
  onExpandDocList,
  onExpandSidebar,
  onExpandRightPanel,
  onResizeStart,
  onSelectMap,
  onSelectMarker,
  onAddMap,
  onUpdateMap,
  onRemoveMap,
  onAddMarker,
  onMoveMarker,
  onRemoveMarker,
  onMarkerDraftChange,
  onSaveMarkerDraft,
  onOpenLore,
}: AtlasViewProps) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const draggedMarkerIdRef = useRef<string | null>(null);
  const dragPointRef = useRef<{ x: number; y: number } | null>(null);
  const [mapNameDraft, setMapNameDraft] = useState("");
  const [mapDescriptionDraft, setMapDescriptionDraft] = useState("");
  const [mapBackgroundDraft, setMapBackgroundDraft] = useState<WorldMap["backgroundType"]>("grid");
  const [markerFilterMode, setMarkerFilterMode] = useState<AtlasMarkerFilterMode>("all");
  const [markerTypeFilter, setMarkerTypeFilter] = useState("");
  const [markerSearch, setMarkerSearch] = useState("");
  const [dragPreview, setDragPreview] = useState<{ markerId: string; point: { x: number; y: number } } | null>(null);

  const lorePagesById = useMemo(() => new Map(lorePages.map((page) => [page.id, page])), [lorePages]);
  const linkedLorePage = activeMarker?.lorePageId ? lorePagesById.get(activeMarker.lorePageId) ?? null : null;
  const linkedTimelineEvents = useMemo(
    () => (activeMarker ? timelineEvents.filter((event) => event.mapMarkerId === activeMarker.id) : []),
    [activeMarker, timelineEvents],
  );
  const formatTimelineEventMeta = (event: TimelineEvent) => {
    const dateOrEra = event.eventDate?.trim() || "Undated";
    const details = [dateOrEra, event.track, event.eventType].filter(Boolean);
    return details.join(" - ");
  };
  const markerTypes = useMemo(() => buildAtlasMarkerTypeOptions(markers), [markers]);
  const filteredMarkers = useMemo(
    () =>
      filterAtlasMarkers(markers, {
        mode: markerFilterMode,
        markerType: markerTypeFilter,
        search: markerSearch,
      }),
    [markerFilterMode, markerSearch, markerTypeFilter, markers],
  );

  useEffect(() => {
    setMapNameDraft(activeMap?.name ?? "");
    setMapDescriptionDraft(activeMap?.description ?? "");
    setMapBackgroundDraft(activeMap?.backgroundType ?? "grid");
  }, [activeMap]);

  useEffect(() => {
    setMarkerFilterMode("all");
    setMarkerTypeFilter("");
    setMarkerSearch("");
  }, [activeMapId]);

  const getCanvasPoint = (event: ReactMouseEvent<HTMLElement>) => {
    if (!activeMap || !canvasRef.current) return null;
    return getAtlasPointFromClientPosition(event.clientX, event.clientY, canvasRef.current.getBoundingClientRect(), activeMap);
  };

  const saveMap = () => {
    if (!activeMap) return;
    void onUpdateMap(activeMap.id, {
      name: mapNameDraft.trim() || "Untitled Map",
      description: mapDescriptionDraft,
      backgroundType: mapBackgroundDraft,
    });
  };

  const saveMarker = () => {
    if (!activeMarker) return;
    void onSaveMarkerDraft();
  };

  const finishMarkerDrag = () => {
    const markerId = draggedMarkerIdRef.current;
    const point = dragPointRef.current;
    draggedMarkerIdRef.current = null;
    dragPointRef.current = null;
    setDragPreview(null);
    if (markerId && point) {
      void onMoveMarker(markerId, point);
    }
  };

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
              <div className="doc-list-title">Atlas</div>
              <div className="doc-list-actions">
                <button className="panel-toggle" type="button" onClick={onCollapseDocList} title="Collapse list (Ctrl+2)">
                  &lt;
                </button>
                <button className="doc-add" type="button" onClick={onAddMap}>
                  +
                </button>
              </div>
            </div>
            <div className="doc-list-body">
              {isLoading ? (
                <div className="doc-empty">Loading maps...</div>
              ) : maps.length === 0 ? (
                <div className="doc-empty">No maps yet. Create a blank Atlas map for this world.</div>
              ) : (
                maps.map((map) => (
                  <div key={map.id} className="doc-item-row">
                    <button
                      className={`doc-item ${map.id === activeMapId ? "active" : ""}`}
                      type="button"
                      onClick={() => onSelectMap(map.id)}
                    >
                      <div className="doc-item-info">
                        <div className="doc-item-title">{map.name}</div>
                        <div className="doc-item-meta">
                          {map.width} x {map.height} - {map.backgroundType}
                        </div>
                      </div>
                    </button>
                    <button
                      className="doc-item-delete"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onRemoveMap(map.id);
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

      {!isDocListCollapsed ? <div className="resizer resizer-vertical" onMouseDown={onResizeStart} /> : null}

      <div className="editor-pane">
        {isSidebarCollapsed || isRightPanelCollapsed || isDocListCollapsed ? (
          <div className="collapsed-strip-row">
            {isSidebarCollapsed ? (
              <div className="collapsed-strip">
                <span>Project</span>
                <button className="panel-toggle" type="button" onClick={onExpandSidebar} title="Expand sidebar (Ctrl+1)">
                  &gt;
                </button>
              </div>
            ) : null}
            {isDocListCollapsed ? (
              <div className="collapsed-strip">
                <span>Atlas</span>
                <button className="panel-toggle" type="button" onClick={onExpandDocList} title="Expand list (Ctrl+2)">
                  &gt;
                </button>
              </div>
            ) : null}
            {isRightPanelCollapsed ? (
              <div className="collapsed-strip">
                <button className="panel-toggle" type="button" onClick={onExpandRightPanel} title="Expand panel (Ctrl+3)">
                  &lt;
                </button>
                <span>Context</span>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="editor-toolbar">
          <button className="tb-btn" type="button" onClick={onAddMap}>
            New Map
          </button>
          <button className="tb-btn" type="button" disabled={!activeMap} onClick={() => activeMap && onAddMarker({ x: activeMap.width / 2, y: activeMap.height / 2 })}>
            Add Marker
          </button>
        </div>

        <input
          className="doc-title-input"
          value={activeMap ? mapNameDraft : "Atlas"}
          onChange={(event) => setMapNameDraft(event.target.value)}
          onBlur={saveMap}
          disabled={!activeMap}
          placeholder="Map name"
          aria-label="Map name"
        />
        <div className="doc-meta">
          <div className="meta-tag">
            <div className="meta-dot"></div> {activeWorld?.name ?? "World"}
          </div>
          <div className="meta-tag">Marker-only Atlas</div>
          {activeMap ? (
            <div className="meta-tag">
              {filteredMarkers.length} of {markers.length} markers
            </div>
          ) : null}
        </div>

        <div className="atlas-layout">
          <div className="atlas-map-panel">
            {!activeMap ? (
              <div className="rp-empty atlas-empty">
                Create a map to start placing lore markers. This first Atlas slice uses blank/grid maps only.
              </div>
            ) : (
              <div
                ref={canvasRef}
                className={`atlas-canvas ${activeMap.backgroundType === "grid" ? "grid" : ""}`}
                role="presentation"
                onClick={(event) => {
                  if (event.target !== event.currentTarget) return;
                  const point = getCanvasPoint(event);
                  if (point) onAddMarker(point);
                }}
                onPointerMove={(event) => {
                  const markerId = draggedMarkerIdRef.current;
                  if (!markerId) return;
                  const point = getCanvasPoint(event);
                  if (!point) return;
                  dragPointRef.current = point;
                  setDragPreview({ markerId, point });
                }}
                onPointerUp={finishMarkerDrag}
                onPointerLeave={finishMarkerDrag}
              >
                {filteredMarkers.map((marker) => {
                  const previewPoint = dragPreview?.markerId === marker.id ? dragPreview.point : null;
                  const markerX = previewPoint?.x ?? marker.x;
                  const markerY = previewPoint?.y ?? marker.y;
                  const left = `${(markerX / activeMap.width) * 100}%`;
                  const top = `${(markerY / activeMap.height) * 100}%`;
                  return (
                    <button
                      key={marker.id}
                      className={`atlas-marker ${marker.id === activeMarkerId ? "active" : ""}`}
                      style={{ left, top }}
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelectMarker(marker.id);
                      }}
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        draggedMarkerIdRef.current = marker.id;
                        dragPointRef.current = { x: marker.x, y: marker.y };
                        onSelectMarker(marker.id);
                      }}
                      title={marker.title}
                    >
                      <span className="atlas-marker-dot"></span>
                      <span className="atlas-marker-label">{marker.title}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="atlas-detail-panel">
            <div className="lore-panel">
              <div className="lore-panel-header">
                <div className="linked-lore-label">Map Details</div>
              </div>
              <label className="lore-label" htmlFor="atlas-map-description">
                Notes
              </label>
              <textarea
                id="atlas-map-description"
                className="lore-textarea"
                value={mapDescriptionDraft}
                onChange={(event) => setMapDescriptionDraft(event.target.value)}
                onBlur={saveMap}
                disabled={!activeMap}
                placeholder="What does this map cover?"
              />
              <label className="lore-label" htmlFor="atlas-map-background">
                Background
              </label>
              <select
                id="atlas-map-background"
                className="lore-input"
                value={mapBackgroundDraft}
                onChange={(event) => {
                  const value = event.target.value === "blank" ? "blank" : "grid";
                  setMapBackgroundDraft(value);
                  if (activeMap) void onUpdateMap(activeMap.id, { backgroundType: value });
                }}
                disabled={!activeMap}
              >
                <option value="grid">Grid</option>
                <option value="blank">Blank</option>
              </select>
            </div>

            <div className="lore-panel">
              <div className="lore-panel-header">
                <div className="linked-lore-label">Markers</div>
                <div className="relationship-count">{filteredMarkers.length}</div>
              </div>
              <div className="atlas-marker-filter-row">
                <select
                  className="lore-input"
                  value={markerFilterMode}
                  onChange={(event) => setMarkerFilterMode(event.target.value as AtlasMarkerFilterMode)}
                  disabled={!activeMap}
                  aria-label="Marker filter"
                >
                  <option value="all">All markers</option>
                  <option value="type">By type</option>
                  <option value="linked">Linked to lore</option>
                  <option value="unlinked">Unlinked markers</option>
                </select>
                {markerFilterMode === "type" ? (
                  <select
                    className="lore-input"
                    value={markerTypeFilter}
                    onChange={(event) => setMarkerTypeFilter(event.target.value)}
                    disabled={!activeMap}
                    aria-label="Marker type filter"
                  >
                    <option value="">Choose type</option>
                    {markerTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                ) : null}
              </div>
              <input
                className="lore-input"
                value={markerSearch}
                onChange={(event) => setMarkerSearch(event.target.value)}
                disabled={!activeMap}
                placeholder="Search marker title or notes"
                aria-label="Search markers"
              />
              <div className="atlas-marker-list">
                {!activeMap ? (
                  <div className="rp-empty">Create a map before organizing markers.</div>
                ) : markers.length === 0 ? (
                  <div className="rp-empty">No markers yet.</div>
                ) : filteredMarkers.length === 0 ? (
                  <div className="rp-empty">No markers match this filter.</div>
                ) : (
                  filteredMarkers.map((marker) => {
                    const markerLorePage = marker.lorePageId ? lorePagesById.get(marker.lorePageId) ?? null : null;
                    return (
                      <button
                        key={marker.id}
                        className={`atlas-marker-list-item ${marker.id === activeMarkerId ? "active" : ""}`}
                        type="button"
                        onClick={() => onSelectMarker(marker.id)}
                      >
                        <span>
                          <strong>{marker.title}</strong>
                          <small>{marker.markerType || "No type"}</small>
                        </span>
                        <span className="atlas-marker-list-meta">{markerLorePage ? "linked" : "unlinked"}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="lore-panel">
              <div className="lore-panel-header">
                <div className="linked-lore-label">Marker Details</div>
              </div>
              {!activeMarker ? (
                <div className="rp-empty">Select a marker or click the map to create one.</div>
              ) : (
                <>
                  <label className="lore-label" htmlFor="atlas-marker-title">
                    Title
                  </label>
                  <input
                    id="atlas-marker-title"
                    className="lore-input"
                    value={markerDraft.title}
                    onChange={(event) => onMarkerDraftChange((current) => ({ ...current, title: event.target.value }))}
                    onBlur={saveMarker}
                  />
                  <label className="lore-label" htmlFor="atlas-marker-type">
                    Type
                  </label>
                  <input
                    id="atlas-marker-type"
                    className="lore-input"
                    list="atlas-marker-type-presets"
                    value={markerDraft.markerType}
                    onChange={(event) => onMarkerDraftChange((current) => ({ ...current, markerType: event.target.value }))}
                    onBlur={saveMarker}
                    placeholder="Type or choose a preset"
                  />
                  <datalist id="atlas-marker-type-presets">
                    {markerTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </datalist>
                  <label className="lore-label" htmlFor="atlas-marker-lore">
                    Linked lore page
                  </label>
                  <select
                    id="atlas-marker-lore"
                    className="lore-input"
                    value={markerDraft.lorePageId}
                    onChange={(event) => onMarkerDraftChange((current) => ({ ...current, lorePageId: event.target.value }))}
                    onBlur={saveMarker}
                  >
                    <option value="">No linked lore</option>
                    {lorePages.map((page) => (
                      <option key={page.id} value={page.id}>
                        {page.title}
                      </option>
                    ))}
                  </select>
                  <label className="lore-label" htmlFor="atlas-marker-notes">
                    Notes
                  </label>
                  <textarea
                    id="atlas-marker-notes"
                    className="lore-textarea"
                    value={markerDraft.description}
                    onChange={(event) => onMarkerDraftChange((current) => ({ ...current, description: event.target.value }))}
                    onBlur={saveMarker}
                    placeholder="What is here?"
                  />
                  {markerSaveState === "dirty" || markerSaveState === "saving" || markerSaveState === "error" ? (
                    <div className={`save-pill ${markerSaveState}`}>
                      {markerSaveState === "dirty"
                        ? "Unsaved marker changes"
                        : markerSaveState === "saving"
                          ? "Saving marker..."
                          : "Marker save failed. Keep changes and retry."}
                    </div>
                  ) : null}
                  <div className="structure-list">
                    <div className="structure-list-item">
                      <span>Position</span>
                      <span>
                        {Math.round(activeMarker.x)}, {Math.round(activeMarker.y)}
                      </span>
                    </div>
                    <div className="structure-list-item">
                      <span>Linked lore</span>
                      <span>{linkedLorePage?.title ?? "None"}</span>
                    </div>
                  </div>
                  {linkedTimelineEvents.length > 0 ? (
                    <div className="lore-panel-subsection">
                      <div className="linked-lore-label">Linked timeline events</div>
                      <div className="structure-list">
                        {linkedTimelineEvents.map((event) => (
                          <div key={event.id} className="structure-list-item">
                            <span>{event.title}</span>
                            <span>{formatTimelineEventMeta(event)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <div className="relationship-action-row">
                    {linkedLorePage ? (
                      <button className="linked-lore-chip" type="button" onClick={() => onOpenLore(linkedLorePage)}>
                        Open linked lore page
                      </button>
                    ) : null}
                    <button className="tb-btn" type="button" onClick={saveMarker}>
                      Save marker
                    </button>
                    <button className="tb-btn danger" type="button" onClick={() => onRemoveMarker(activeMarker.id)}>
                      Delete marker
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
});
