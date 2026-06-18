import { memo, useEffect, useMemo, useState } from "react";
import type { LorePage, TimelineEvent } from "../lib/data";
import { getTimelineTrackLabel, groupTimelineEventsByTrack } from "../hooks/worldStructureState";
import type { WorldUI } from "../types/ui";

type TimelineViewProps = {
  isDocListCollapsed: boolean;
  isSidebarCollapsed: boolean;
  isRightPanelCollapsed: boolean;
  docListWidth: number;
  timelineEvents: TimelineEvent[];
  activeTimelineEventId: string | null;
  timelineTitle: string;
  timelineDate: string;
  timelineType: string;
  timelineTrack: string;
  timelineLinkedPageId: string;
  timelineDescription: string;
  lorePages: LorePage[];
  activeWorld?: WorldUI;
  onCollapseDocList: () => void;
  onExpandDocList: () => void;
  onExpandSidebar: () => void;
  onExpandRightPanel: () => void;
  onResizeStart: (event: React.MouseEvent<HTMLDivElement>) => void;
  onSelectTimelineEvent: (event: TimelineEvent) => void;
  onAddTimelineEvent: () => void;
  onAddTimelineEventWithSeed: (seed?: {
    title?: string;
    eventDate?: string;
    eventType?: string;
    track?: string;
    linkedPageId?: string;
    description?: string;
  }) => void;
  onDuplicateTimelineEvent: (eventId: string) => void;
  onRemoveTimelineEvent: (eventId: string) => void;
  onSave: () => void;
  onTitleChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  onTrackChange: (value: string) => void;
  onLinkedPageChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onOpenLore: (page: LorePage) => void;
};

const sortTimelineEvents = (events: TimelineEvent[]) =>
  [...events].sort((left, right) => {
    if (left.eventDate && right.eventDate) {
      return left.eventDate.localeCompare(right.eventDate);
    }
    if (left.eventDate) return -1;
    if (right.eventDate) return 1;
    return left.title.localeCompare(right.title);
  });

const deriveEraLabel = (eventDate: string | null | undefined) => {
  const normalized = (eventDate ?? "").trim();
  if (!normalized) return "Undated";
  const prefixMatch = normalized.match(/^([^,/-]{1,32})/);
  return prefixMatch?.[1]?.trim() || "Undated";
};

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

export const TimelineView = memo(function TimelineView({
  isDocListCollapsed,
  isSidebarCollapsed,
  isRightPanelCollapsed,
  docListWidth,
  timelineEvents,
  activeTimelineEventId,
  timelineTitle,
  timelineDate,
  timelineType,
  timelineTrack,
  timelineLinkedPageId,
  timelineDescription,
  lorePages,
  activeWorld,
  onCollapseDocList,
  onExpandDocList,
  onExpandSidebar,
  onExpandRightPanel,
  onResizeStart,
  onSelectTimelineEvent,
  onAddTimelineEvent,
  onAddTimelineEventWithSeed,
  onDuplicateTimelineEvent,
  onRemoveTimelineEvent,
  onSave,
  onTitleChange,
  onDateChange,
  onTypeChange,
  onTrackChange,
  onLinkedPageChange,
  onDescriptionChange,
  onOpenLore,
}: TimelineViewProps) {
  const [timelineSearch, setTimelineSearch] = useState("");
  const [timelineTypeFilter, setTimelineTypeFilter] = useState("all");
  const [timelineTrackFilter, setTimelineTrackFilter] = useState("all");
  const [timelineLinkedFilter, setTimelineLinkedFilter] = useState("all");
  const [focusedTrackType, setFocusedTrackType] = useState<string | null>(null);
  const [focusedTimelineTrack, setFocusedTimelineTrack] = useState<string | null>(null);
  const [focusedEra, setFocusedEra] = useState<string | null>(null);
  const titleInputId = "timeline-title";
  const dateInputId = "timeline-date";
  const typeInputId = "timeline-type";
  const trackInputId = "timeline-track";
  const linkedPageInputId = "timeline-linked-page";
  const descriptionInputId = "timeline-description";
  const timelineSearchInputId = "timeline-search";
  const timelineTypeFilterId = "timeline-type-filter";
  const timelineTrackFilterId = "timeline-track-filter";
  const timelineLinkedFilterId = "timeline-linked-filter";
  const lorePagesById = useMemo(() => new Map(lorePages.map((page) => [page.id, page])), [lorePages]);
  const getLorePageById = (pageId: string | null | undefined) => (pageId ? lorePagesById.get(pageId) ?? null : null);

  const filteredTimelineEvents = useMemo(() => {
    const query = timelineSearch.trim().toLowerCase();
    return timelineEvents.filter((event) => {
      const linkedTitle = getLorePageById(event.linkedPageId)?.title ?? "";
      const matchesQuery =
        !query ||
        event.title.toLowerCase().includes(query) ||
        (event.eventDate ?? "").toLowerCase().includes(query) ||
        (event.eventType ?? "").toLowerCase().includes(query) ||
        (event.track ?? "").toLowerCase().includes(query) ||
        (event.description ?? "").toLowerCase().includes(query) ||
        linkedTitle.toLowerCase().includes(query);
      const matchesType = timelineTypeFilter === "all" || (event.eventType || "event") === timelineTypeFilter;
      const matchesTrack = timelineTrackFilter === "all" || getTimelineTrackLabel(event) === timelineTrackFilter;
      const matchesLinked =
        timelineLinkedFilter === "all" ||
        (timelineLinkedFilter === "unlinked" ? !event.linkedPageId : event.linkedPageId === timelineLinkedFilter);
      return matchesQuery && matchesType && matchesTrack && matchesLinked;
    });
  }, [lorePagesById, timelineEvents, timelineLinkedFilter, timelineSearch, timelineTrackFilter, timelineTypeFilter]);

  const orderedEvents = useMemo(() => sortTimelineEvents(filteredTimelineEvents), [filteredTimelineEvents]);
  const activeLinkedPage = getLorePageById(timelineLinkedPageId);
  const allTimelineTypes = useMemo(
    () => [...new Set(timelineEvents.map((event) => event.eventType || "event"))].sort((a, b) => a.localeCompare(b)),
    [timelineEvents],
  );
  const allTimelineTracks = useMemo(
    () => [...new Set(timelineEvents.map((event) => getTimelineTrackLabel(event)))].sort((a, b) => a.localeCompare(b)),
    [timelineEvents],
  );

  const timelineTypeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const event of filteredTimelineEvents) {
      const key = event.eventType || "untyped";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()].sort((left, right) => right[1] - left[1]).slice(0, 4);
  }, [filteredTimelineEvents]);

  const linkedEventCount = useMemo(
    () => filteredTimelineEvents.filter((event) => Boolean(event.linkedPageId)).length,
    [filteredTimelineEvents],
  );

  const timelineSpan = orderedEvents.filter((event) => event.eventDate);
  const earliestEvent = timelineSpan[0] ?? null;
  const latestEvent = timelineSpan[timelineSpan.length - 1] ?? null;
  const featuredTimelineEvents = orderedEvents.slice(0, 10);
  const groupedTimelineEvents = useMemo(() => {
    const groups = new Map<string, TimelineEvent[]>();
    for (const event of orderedEvents) {
      const key = event.eventType || "General";
      const existing = groups.get(key) ?? [];
      existing.push(event);
      groups.set(key, existing);
    }
    return [...groups.entries()];
  }, [orderedEvents]);
  const groupedTimelineEras = useMemo(() => {
    const groups = new Map<string, TimelineEvent[]>();
    for (const event of orderedEvents) {
      const key = deriveEraLabel(event.eventDate);
      const existing = groups.get(key) ?? [];
      existing.push(event);
      groups.set(key, existing);
    }
    return [...groups.entries()];
  }, [orderedEvents]);
  const groupedTimelineTracks = useMemo(() => groupTimelineEventsByTrack(orderedEvents), [orderedEvents]);
  const focusedTrackEvents = useMemo(() => {
    if (!focusedTrackType) return [];
    return groupedTimelineEvents.find(([label]) => label === focusedTrackType)?.[1] ?? [];
  }, [focusedTrackType, groupedTimelineEvents]);
  const focusedTimelineTrackEvents = useMemo(() => {
    if (!focusedTimelineTrack) return [];
    return groupedTimelineTracks.find(([label]) => label === focusedTimelineTrack)?.[1] ?? [];
  }, [focusedTimelineTrack, groupedTimelineTracks]);
  const focusedEraEvents = useMemo(() => {
    if (!focusedEra) return [];
    return groupedTimelineEras.find(([label]) => label === focusedEra)?.[1] ?? [];
  }, [focusedEra, groupedTimelineEras]);

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
        onAddTimelineEvent();
        return;
      }

      if (modifier && event.altKey && !event.shiftKey && (key === "backspace" || key === "delete")) {
        if (!activeTimelineEventId) {
          return;
        }
        event.preventDefault();
        onRemoveTimelineEvent(activeTimelineEventId);
        return;
      }

      if (modifier && event.shiftKey && !event.altKey && (key === "[" || key === "]")) {
        if (orderedEvents.length === 0) {
          return;
        }
        event.preventDefault();
        const currentIndex = orderedEvents.findIndex((timelineEvent) => timelineEvent.id === activeTimelineEventId);
        const safeIndex = currentIndex === -1 ? 0 : currentIndex;
        const nextIndex =
          key === "]"
            ? (safeIndex + 1) % orderedEvents.length
            : (safeIndex - 1 + orderedEvents.length) % orderedEvents.length;
        onSelectTimelineEvent(orderedEvents[nextIndex]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    activeTimelineEventId,
    onAddTimelineEvent,
    onRemoveTimelineEvent,
    onSave,
    onSelectTimelineEvent,
    orderedEvents,
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
              <div className="doc-list-title">Timeline</div>
              <div className="doc-list-actions">
                <button
                  className="panel-toggle"
                  type="button"
                  onClick={onCollapseDocList}
                  title="Collapse list (Ctrl+2)"
                >
                  &lt;
                </button>
                <button className="doc-add" type="button" onClick={onAddTimelineEvent}>
                  +
                </button>
              </div>
            </div>
            <div className="doc-list-body">
              {orderedEvents.length === 0 ? (
                <div className="doc-empty">
                  {timelineEvents.length === 0
                    ? "No timeline events yet. Add the first milestone for this world."
                    : "No timeline events match the current filters."}
                </div>
              ) : (
                orderedEvents.map((item) => (
                  <div key={item.id} className="doc-item-row">
                    <button
                      className={`doc-item ${item.id === activeTimelineEventId ? "active" : ""}`}
                      type="button"
                      onClick={() => onSelectTimelineEvent(item)}
                    >
                      <div className="doc-item-info">
                        <div className="doc-item-title">{item.title}</div>
                        <div className="doc-item-meta">{item.eventDate || "No date"}</div>
                      </div>
                    </button>
                    <button
                      className="doc-item-delete"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onRemoveTimelineEvent(item.id);
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
                <span>Timeline</span>
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
            <label className="lore-label" htmlFor={timelineSearchInputId}>
              Search
            </label>
            <input
              id={timelineSearchInputId}
              className="lore-input"
              value={timelineSearch}
              onChange={(event) => setTimelineSearch(event.target.value)}
              placeholder="Filter by title, date, type, description, or linked lore"
            />
          </div>
          <div className="structure-filter-field">
            <label className="lore-label" htmlFor={timelineTypeFilterId}>
              Type
            </label>
            <select
              id={timelineTypeFilterId}
              className="lore-input"
              value={timelineTypeFilter}
              onChange={(event) => setTimelineTypeFilter(event.target.value)}
            >
              <option value="all">All types</option>
              {allTimelineTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div className="structure-filter-field">
            <label className="lore-label" htmlFor={timelineTrackFilterId}>
              Track
            </label>
            <select
              id={timelineTrackFilterId}
              className="lore-input"
              value={timelineTrackFilter}
              onChange={(event) => setTimelineTrackFilter(event.target.value)}
            >
              <option value="all">All tracks</option>
              {allTimelineTracks.map((track) => (
                <option key={track} value={track}>
                  {track}
                </option>
              ))}
            </select>
          </div>
          <div className="structure-filter-field">
            <label className="lore-label" htmlFor={timelineLinkedFilterId}>
              Linked lore
            </label>
            <select
              id={timelineLinkedFilterId}
              className="lore-input"
              value={timelineLinkedFilter}
              onChange={(event) => setTimelineLinkedFilter(event.target.value)}
            >
              <option value="all">All events</option>
              <option value="unlinked">Unlinked only</option>
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
              setTimelineSearch("");
              setTimelineTypeFilter("all");
              setTimelineTrackFilter("all");
              setTimelineLinkedFilter("all");
              setFocusedTrackType(null);
              setFocusedTimelineTrack(null);
              setFocusedEra(null);
            }}
          >
            Clear Filters
          </button>
        </div>

        <input
          id={titleInputId}
          className="doc-title-input"
          value={timelineTitle}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder="Event title"
          aria-label="Event title"
        />
        <div className="doc-meta">
          <div className="meta-tag">
            <div className="meta-dot"></div> {activeWorld?.name ?? "World"}
          </div>
          <div className="meta-tag">Timeline event</div>
        </div>

        <div className="structure-summary-grid">
          <div className="structure-card">
            <div className="structure-card-label">Event Count</div>
            <div className="structure-card-value">{filteredTimelineEvents.length}</div>
            <div className="structure-card-meta">
              Matching milestones in {activeWorld?.name ?? "this world"}
            </div>
          </div>
          <div className="structure-card">
            <div className="structure-card-label">Linked Events</div>
            <div className="structure-card-value">{linkedEventCount}</div>
            <div className="structure-card-meta">
              Events tied directly to lore pages for cross-reference
            </div>
          </div>
          <div className="structure-card">
            <div className="structure-card-label">Timeline Span</div>
            <div className="structure-card-value relationship-focus-text">
              {earliestEvent?.eventDate ?? "Start"} to {latestEvent?.eventDate ?? "latest"}
            </div>
            <div className="structure-card-meta">
              Based on the current date labels entered in the timeline
            </div>
          </div>
          <div className="structure-card">
            <div className="structure-card-label">Era Groups</div>
            <div className="structure-card-value">{groupedTimelineEras.length}</div>
            <div className="structure-card-meta">
              Date clusters inferred from your event labels and eras
            </div>
          </div>
          <div className="structure-card">
            <div className="structure-card-label">Tracks</div>
            <div className="structure-card-value">{groupedTimelineTracks.length}</div>
            <div className="structure-card-meta">
              Chronicle lanes for arcs, factions, wars, and plot threads
            </div>
          </div>
        </div>

        <div className="structure-grid">
          <div className="lore-panel">
            <div className="lore-panel-header">
              <div className="linked-lore-label">Timeline Canvas</div>
            </div>
            {orderedEvents.length === 0 ? (
              <div className="rp-empty">Your timeline will build here as you add major beats.</div>
            ) : (
                <div className="timeline-canvas">
                  <div className="timeline-canvas-track" />
                {featuredTimelineEvents.map((event, index) => {
                  const linkedPage = getLorePageById(event.linkedPageId);
                  const position =
                    featuredTimelineEvents.length <= 1
                      ? 0
                      : (index / (featuredTimelineEvents.length - 1)) * 100;

                  return (
                    <div
                      key={event.id}
                      className={`timeline-canvas-event ${event.id === activeTimelineEventId ? "active" : ""}`}
                      style={{ left: `${position}%` }}
                    >
                      <button type="button" className="timeline-canvas-event-button" onClick={() => onSelectTimelineEvent(event)}>
                        <div className="timeline-canvas-marker" />
                        <div className="timeline-canvas-card">
                          <div className="timeline-rail-date">{event.eventDate || "Undated"}</div>
                          <div className="timeline-rail-title">{event.title || "Untitled event"}</div>
                          <div className="timeline-rail-meta">
                            <span>{getTimelineTrackLabel(event)}</span>
                          </div>
                        </div>
                      </button>
                      {linkedPage ? (
                        <button className="timeline-link-chip" type="button" onClick={() => onOpenLore(linkedPage)}>
                          {linkedPage.title}
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="lore-panel">
            <div className="lore-panel-header">
              <div className="linked-lore-label">Event Types</div>
            </div>
            {timelineTypeCounts.length === 0 ? (
              <div className="rp-empty">No patterns yet.</div>
            ) : (
              <div className="structure-list">
                {timelineTypeCounts.map(([label, count]) => (
                  <button
                    key={label}
                    className={`structure-list-item structure-list-item-button ${
                      timelineTypeFilter === label ? "active" : ""
                    }`}
                    type="button"
                    onClick={() => {
                      setTimelineTypeFilter(label);
                      setFocusedTrackType(label);
                    }}
                  >
                    <span>{label}</span>
                    <span>{count}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="advanced-json-note">
              This is still a compact narrative timeline, not the final multi-track visualization.
            </div>
            <div className="advanced-json-note">
              Shortcuts: Ctrl/Cmd+S save, Ctrl/Cmd+Alt+N new event, Ctrl/Cmd+Shift+[ or ] move
              through events, Ctrl/Cmd+Alt+Backspace delete selected.
            </div>
            {focusedTrackType ? (
              <div className="relationship-action-row">
                <button
                  className="tb-btn"
                  type="button"
                  onClick={() =>
                    onAddTimelineEventWithSeed({
                      title: `New ${focusedTrackType} Event`,
                      eventType: focusedTrackType,
                    })
                  }
                >
                  New in this track
                </button>
                <button className="tb-btn" type="button" onClick={() => setFocusedTrackType(null)}>
                  Clear track focus
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="lore-panel">
          <div className="lore-panel-header">
            <div className="linked-lore-label">Chronological Outline</div>
          </div>
          {orderedEvents.length === 0 ? (
            <div className="rp-empty">Saved events will appear here in reading order.</div>
          ) : (
            <div className="timeline-outline">
              {orderedEvents.map((event) => {
                const linkedPage = getLorePageById(event.linkedPageId);
                return (
                  <button
                    key={`${event.id}-outline`}
                    className={`timeline-outline-item ${
                      event.id === activeTimelineEventId ? "active" : ""
                    }`}
                    type="button"
                    onClick={() => onSelectTimelineEvent(event)}
                  >
                    <div className="timeline-outline-date">{event.eventDate || "Undated"}</div>
                    <div className="timeline-outline-body">
                      <div className="timeline-outline-title">{event.title || "Untitled event"}</div>
                      <div className="timeline-outline-meta">
                        <span>{event.eventType || "General"}</span>
                        {linkedPage ? <span>{linkedPage.title}</span> : null}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="lore-panel">
          <div className="lore-panel-header">
            <div className="linked-lore-label">Era Groups</div>
          </div>
          {groupedTimelineEras.length === 0 ? (
            <div className="rp-empty">Era groupings will appear as your timeline gets dates.</div>
          ) : (
            <div className="timeline-track-groups">
              {groupedTimelineEras.map(([label, events]) => (
                <div key={label} className="timeline-track-group">
                  <div className="timeline-track-header">
                    <button
                      className={`timeline-track-chip ${focusedEra === label ? "active" : ""}`}
                      type="button"
                      onClick={() => setFocusedEra((current) => (current === label ? null : label))}
                    >
                      {label}
                    </button>
                    <span className="timeline-track-count">{events.length} events</span>
                  </div>
                  <div className="timeline-track-list">
                    {events.slice(0, 4).map((event) => {
                      const linkedPage = getLorePageById(event.linkedPageId);
                      return (
                        <div key={`${label}-${event.id}-era`} className="timeline-track-row">
                          <button
                            className={`timeline-track-item ${event.id === activeTimelineEventId ? "active" : ""}`}
                            type="button"
                            onClick={() => onSelectTimelineEvent(event)}
                          >
                            <span className="timeline-track-item-date">{event.eventDate || "Undated"}</span>
                            <span className="timeline-track-item-title">{event.title}</span>
                            <span className="timeline-track-item-meta">
                              {linkedPage ? linkedPage.title : event.eventType || "General"}
                            </span>
                          </button>
                          {linkedPage ? (
                            <button className="linked-lore-chip" type="button" onClick={() => onOpenLore(linkedPage)}>
                              Open
                            </button>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lore-panel">
          <div className="lore-panel-header">
            <div className="linked-lore-label">Type Tracks</div>
          </div>
          {groupedTimelineEvents.length === 0 ? (
            <div className="rp-empty">Grouped tracks will appear as the timeline grows.</div>
          ) : (
            <div className="timeline-track-groups">
              {groupedTimelineEvents.map(([label, events]) => (
                <div key={label} className="timeline-track-group">
                  <div className="timeline-track-header">
                    <button
                      className={`timeline-track-chip ${
                        timelineTypeFilter === label || focusedTrackType === label ? "active" : ""
                      }`}
                      type="button"
                      onClick={() => {
                        setTimelineTypeFilter(label);
                        setFocusedTrackType((current) => (current === label ? null : label));
                      }}
                    >
                      {label}
                    </button>
                    <span className="timeline-track-count">{events.length} events</span>
                  </div>
                  <div className="timeline-track-list">
                    {events.map((event) => {
                      const linkedPage = getLorePageById(event.linkedPageId);
                      return (
                        <button
                          key={`${label}-${event.id}`}
                          className={`timeline-track-item ${event.id === activeTimelineEventId ? "active" : ""}`}
                          type="button"
                          onClick={() => onSelectTimelineEvent(event)}
                        >
                          <span className="timeline-track-item-date">{event.eventDate || "Undated"}</span>
                          <span className="timeline-track-item-title">{event.title}</span>
                          <span className="timeline-track-item-meta">
                            {linkedPage ? linkedPage.title : "No linked page"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lore-panel">
          <div className="lore-panel-header">
            <div className="linked-lore-label">Track View</div>
          </div>
          {groupedTimelineTracks.length === 0 ? (
            <div className="rp-empty">Chronicle tracks will appear as you assign events to lanes.</div>
          ) : (
            <div className="timeline-track-groups">
              {groupedTimelineTracks.map(([label, events]) => (
                <div key={label} className="timeline-track-group">
                  <div className="timeline-track-header">
                    <button
                      className={`timeline-track-chip ${
                        timelineTrackFilter === label || focusedTimelineTrack === label ? "active" : ""
                      }`}
                      type="button"
                      onClick={() => {
                        setTimelineTrackFilter(label);
                        setFocusedTimelineTrack((current) => (current === label ? null : label));
                      }}
                    >
                      {label}
                    </button>
                    <span className="timeline-track-count">{events.length} events</span>
                  </div>
                  <div className="timeline-track-list">
                    {events.map((event) => {
                      const linkedPage = getLorePageById(event.linkedPageId);
                      return (
                        <div key={`${label}-${event.id}-chronicle-track`} className="timeline-track-row">
                          <button
                            className={`timeline-track-item ${event.id === activeTimelineEventId ? "active" : ""}`}
                            type="button"
                            onClick={() => onSelectTimelineEvent(event)}
                          >
                            <span className="timeline-track-item-date">{event.eventDate || "Undated"}</span>
                            <span className="timeline-track-item-title">{event.title}</span>
                            <span className="timeline-track-item-meta">
                              {linkedPage ? linkedPage.title : event.eventType || "General"}
                            </span>
                          </button>
                          {linkedPage ? (
                            <button className="linked-lore-chip" type="button" onClick={() => onOpenLore(linkedPage)}>
                              Open
                            </button>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lore-panel">
          <div className="lore-panel-header">
            <div className="linked-lore-label">Focused Type Track</div>
          </div>
          {!focusedTrackType ? (
            <div className="rp-empty">Choose an event type or track chip to inspect a single track.</div>
          ) : focusedTrackEvents.length === 0 ? (
            <div className="rp-empty">{focusedTrackType} has no visible events in the current filters.</div>
          ) : (
            <>
              <div className="advanced-json-note">
                {focusedTrackType} track with {focusedTrackEvents.length} visible events.
              </div>
              <div className="relationship-action-row">
                <button
                  className="tb-btn"
                  type="button"
                  onClick={() =>
                    onAddTimelineEventWithSeed({
                      title: `New ${focusedTrackType} Event`,
                      eventType: focusedTrackType,
                    })
                  }
                >
                  Add event to {focusedTrackType}
                </button>
              </div>
              <div className="timeline-track-list">
                {focusedTrackEvents.slice(0, 6).map((event) => {
                  const linkedPage = getLorePageById(event.linkedPageId);
                  return (
                    <div key={`focus-${event.id}`} className="timeline-track-row">
                      <button
                        className={`timeline-track-item ${event.id === activeTimelineEventId ? "active" : ""}`}
                        type="button"
                        onClick={() => onSelectTimelineEvent(event)}
                      >
                        <span className="timeline-track-item-date">{event.eventDate || "Undated"}</span>
                        <span className="timeline-track-item-title">{event.title}</span>
                        <span className="timeline-track-item-meta">
                          {linkedPage ? linkedPage.title : "No linked page"}
                        </span>
                      </button>
                      {linkedPage ? (
                        <button className="linked-lore-chip" type="button" onClick={() => onOpenLore(linkedPage)}>
                          Open
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="lore-panel">
          <div className="lore-panel-header">
            <div className="linked-lore-label">Focused Chronicle Track</div>
          </div>
          {!focusedTimelineTrack ? (
            <div className="rp-empty">Choose a Chronicle track chip to inspect one lane.</div>
          ) : focusedTimelineTrackEvents.length === 0 ? (
            <div className="rp-empty">{focusedTimelineTrack} has no visible events in the current filters.</div>
          ) : (
            <>
              <div className="advanced-json-note">
                {focusedTimelineTrack} contains {focusedTimelineTrackEvents.length} visible events.
              </div>
              <div className="relationship-action-row">
                <button
                  className="tb-btn"
                  type="button"
                  onClick={() =>
                    onAddTimelineEventWithSeed({
                      title: `New ${focusedTimelineTrack} Event`,
                      track: focusedTimelineTrack,
                    })
                  }
                >
                  Add event to {focusedTimelineTrack}
                </button>
                <button className="tb-btn" type="button" onClick={() => setFocusedTimelineTrack(null)}>
                  Clear track focus
                </button>
              </div>
              <div className="timeline-track-list">
                {focusedTimelineTrackEvents.slice(0, 6).map((event) => {
                  const linkedPage = getLorePageById(event.linkedPageId);
                  return (
                    <div key={`chronicle-focus-${event.id}`} className="timeline-track-row">
                      <button
                        className={`timeline-track-item ${event.id === activeTimelineEventId ? "active" : ""}`}
                        type="button"
                        onClick={() => onSelectTimelineEvent(event)}
                      >
                        <span className="timeline-track-item-date">{event.eventDate || "Undated"}</span>
                        <span className="timeline-track-item-title">{event.title}</span>
                        <span className="timeline-track-item-meta">
                          {event.eventType || linkedPage?.title || "General"}
                        </span>
                      </button>
                      {linkedPage ? (
                        <button className="linked-lore-chip" type="button" onClick={() => onOpenLore(linkedPage)}>
                          Open
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="lore-panel">
          <div className="lore-panel-header">
            <div className="linked-lore-label">Focused Era</div>
          </div>
          {!focusedEra ? (
            <div className="rp-empty">Choose an era chip to inspect one date cluster at a time.</div>
          ) : focusedEraEvents.length === 0 ? (
            <div className="rp-empty">{focusedEra} has no visible events in the current filters.</div>
          ) : (
            <>
              <div className="advanced-json-note">
                {focusedEra} contains {focusedEraEvents.length} visible events.
              </div>
              <div className="timeline-track-list">
                {focusedEraEvents.slice(0, 6).map((event) => {
                  const linkedPage = getLorePageById(event.linkedPageId);
                  return (
                    <div key={`era-focus-${event.id}`} className="timeline-track-row">
                      <button
                        className={`timeline-track-item ${event.id === activeTimelineEventId ? "active" : ""}`}
                        type="button"
                        onClick={() => onSelectTimelineEvent(event)}
                      >
                        <span className="timeline-track-item-date">{event.eventDate || "Undated"}</span>
                        <span className="timeline-track-item-title">{event.title}</span>
                        <span className="timeline-track-item-meta">
                          {event.eventType || linkedPage?.title || "General"}
                        </span>
                      </button>
                      {linkedPage ? (
                        <button className="linked-lore-chip" type="button" onClick={() => onOpenLore(linkedPage)}>
                          Open
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              <div className="relationship-action-row">
                <button className="tb-btn" type="button" onClick={() => setFocusedEra(null)}>
                  Clear era focus
                </button>
              </div>
            </>
          )}
        </div>

        <div className="structure-grid">
          <div className="lore-panel">
            <div className="lore-panel-header">
              <div className="linked-lore-label">Event Details</div>
            </div>

            <label className="lore-label" htmlFor={dateInputId}>
              Date
            </label>
            <input
              id={dateInputId}
              className="lore-input"
              value={timelineDate}
              onChange={(event) => onDateChange(event.target.value)}
              placeholder="847 AE / Spring / Chapter 4"
            />

            <label className="lore-label" htmlFor={typeInputId}>
              Type
            </label>
            <input
              id={typeInputId}
              className="lore-input"
              value={timelineType}
              onChange={(event) => onTypeChange(event.target.value)}
              placeholder="event, war, discovery..."
            />

            <label className="lore-label" htmlFor={trackInputId}>
              Track
            </label>
            <input
              id={trackInputId}
              className="lore-input"
              value={timelineTrack}
              onChange={(event) => onTrackChange(event.target.value)}
              placeholder="Main History, Character Arcs, Wars..."
            />

            <label className="lore-label" htmlFor={linkedPageInputId}>
              Linked lore page
            </label>
            <select
              id={linkedPageInputId}
              className="lore-input"
              value={timelineLinkedPageId}
              onChange={(event) => onLinkedPageChange(event.target.value)}
            >
              <option value="">No linked page</option>
              {lorePages.map((page) => (
                <option key={page.id} value={page.id}>
                  {page.title}
                </option>
              ))}
            </select>

            <label className="lore-label" htmlFor={descriptionInputId}>
              Description
            </label>
            <textarea
              id={descriptionInputId}
              className="lore-textarea"
              value={timelineDescription}
              onChange={(event) => onDescriptionChange(event.target.value)}
              placeholder="What happened, and why does it matter?"
            />
          </div>

          <div className="lore-panel">
            <div className="lore-panel-header">
              <div className="linked-lore-label">Current Event Snapshot</div>
            </div>
            <div className="structure-list">
              <div className="structure-list-item">
                <span>Date</span>
                <span>{timelineDate || "Not set"}</span>
              </div>
              <div className="structure-list-item">
                <span>Type</span>
                <span>{timelineType || "General"}</span>
              </div>
              <div className="structure-list-item">
                <span>Track</span>
                <span>{timelineTrack || "Uses type/default track"}</span>
              </div>
              <div className="structure-list-item">
                <span>Linked page</span>
                <span>{activeLinkedPage?.title ?? "None"}</span>
              </div>
            </div>
            <div className="relationship-action-row">
              {activeTimelineEventId ? (
                <button
                  className="tb-btn"
                  type="button"
                  onClick={() => onDuplicateTimelineEvent(activeTimelineEventId)}
                >
                  Duplicate event
                </button>
              ) : null}
              {activeLinkedPage ? (
                <>
                  <button
                    className="tb-btn"
                    type="button"
                    onClick={() =>
                      onAddTimelineEventWithSeed({
                        title: `New Event for ${activeLinkedPage.title}`,
                        linkedPageId: activeLinkedPage.id,
                        eventType: timelineType || "event",
                      })
                    }
                  >
                    New linked event
                  </button>
                  <button className="linked-lore-chip" type="button" onClick={() => onOpenLore(activeLinkedPage)}>
                    Open linked lore page
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </>
  );
});
