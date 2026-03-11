import { useMemo } from "react";
import type { LorePage, TimelineEvent } from "../lib/data";
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
  onRemoveTimelineEvent: (eventId: string) => void;
  onSave: () => void;
  onTitleChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  onLinkedPageChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
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

export function TimelineView({
  isDocListCollapsed,
  isSidebarCollapsed,
  isRightPanelCollapsed,
  docListWidth,
  timelineEvents,
  activeTimelineEventId,
  timelineTitle,
  timelineDate,
  timelineType,
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
  onRemoveTimelineEvent,
  onSave,
  onTitleChange,
  onDateChange,
  onTypeChange,
  onLinkedPageChange,
  onDescriptionChange,
}: TimelineViewProps) {
  const titleInputId = "timeline-title";
  const dateInputId = "timeline-date";
  const typeInputId = "timeline-type";
  const linkedPageInputId = "timeline-linked-page";
  const descriptionInputId = "timeline-description";

  const orderedEvents = useMemo(() => sortTimelineEvents(timelineEvents), [timelineEvents]);
  const activeLinkedPage = lorePages.find((page) => page.id === timelineLinkedPageId) ?? null;

  const timelineTypeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const event of timelineEvents) {
      const key = event.eventType || "untyped";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()].sort((left, right) => right[1] - left[1]).slice(0, 4);
  }, [timelineEvents]);

  const linkedEventCount = useMemo(
    () => timelineEvents.filter((event) => Boolean(event.linkedPageId)).length,
    [timelineEvents],
  );

  const timelineSpan = orderedEvents.filter((event) => event.eventDate);
  const earliestEvent = timelineSpan[0] ?? null;
  const latestEvent = timelineSpan[timelineSpan.length - 1] ?? null;
  const featuredTimelineEvents = orderedEvents.slice(0, 10);

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
              {timelineEvents.length === 0 ? (
                <div className="doc-empty">
                  No timeline events yet. Add the first milestone for this world.
                </div>
              ) : (
                orderedEvents.map((item) => (
                  <div
                    key={item.id}
                    className={`doc-item ${item.id === activeTimelineEventId ? "active" : ""}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectTimelineEvent(item)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") onSelectTimelineEvent(item);
                    }}
                  >
                    <div className="doc-item-info">
                      <div className="doc-item-title">{item.title}</div>
                      <div className="doc-item-meta">{item.eventDate || "No date"}</div>
                    </div>
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
            <div className="structure-card-value">{timelineEvents.length}</div>
            <div className="structure-card-meta">
              Milestones currently tracked in {activeWorld?.name ?? "this world"}
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
                  const linkedPage =
                    lorePages.find((page) => page.id === event.linkedPageId) ?? null;
                  const position =
                    featuredTimelineEvents.length <= 1
                      ? 0
                      : (index / (featuredTimelineEvents.length - 1)) * 100;

                  return (
                    <button
                      key={event.id}
                      className={`timeline-canvas-event ${
                        event.id === activeTimelineEventId ? "active" : ""
                      }`}
                      type="button"
                      style={{ left: `${position}%` }}
                      onClick={() => onSelectTimelineEvent(event)}
                    >
                      <div className="timeline-canvas-marker" />
                      <div className="timeline-canvas-card">
                        <div className="timeline-rail-date">{event.eventDate || "Undated"}</div>
                        <div className="timeline-rail-title">{event.title || "Untitled event"}</div>
                        <div className="timeline-rail-meta">
                          <span>{event.eventType || "General"}</span>
                          {linkedPage ? (
                            <span className="timeline-link-chip">{linkedPage.title}</span>
                          ) : null}
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
              <div className="linked-lore-label">Event Types</div>
            </div>
            {timelineTypeCounts.length === 0 ? (
              <div className="rp-empty">No patterns yet.</div>
            ) : (
              <div className="structure-list">
                {timelineTypeCounts.map(([label, count]) => (
                  <div key={label} className="structure-list-item">
                    <span>{label}</span>
                    <span>{count}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="advanced-json-note">
              This is still a compact narrative timeline, not the final multi-track visualization.
            </div>
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
                const linkedPage = lorePages.find((page) => page.id === event.linkedPageId) ?? null;
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
                <span>Linked page</span>
                <span>{activeLinkedPage?.title ?? "None"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
