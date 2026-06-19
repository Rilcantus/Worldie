import type { LorePage, Relationship, TimelineEvent } from "../lib/data";

export function removeItemWithFallback<T extends { id: string }>(items: T[], itemId: string) {
  const next: T[] = [];
  let removed = false;

  for (const item of items) {
    if (item.id === itemId) {
      removed = true;
      continue;
    }
    next.push(item);
  }

  return {
    next,
    first: next[0] ?? null,
    removed,
  };
}

export function hasUnsavedRelationshipChanges(
  activeRelationship: Relationship | null,
  relationshipSourceId: string,
  relationshipTargetId: string,
  relationshipType: string,
  relationshipNotes: string,
) {
  if (!activeRelationship) return false;
  return (
    activeRelationship.sourcePageId !== relationshipSourceId ||
    activeRelationship.targetPageId !== relationshipTargetId ||
    activeRelationship.relationType !== relationshipType ||
    (activeRelationship.notes ?? "") !== relationshipNotes
  );
}

export function hasUnsavedTimelineChanges(
  activeTimelineEvent: TimelineEvent | null,
  timelineTitle: string,
  timelineDate: string,
  timelineType: string,
  timelineTrack: string,
  timelineLinkedPageId: string,
  timelineMapMarkerId: string,
  timelineDescription: string,
) {
  if (!activeTimelineEvent) return false;
  return (
    activeTimelineEvent.title !== timelineTitle ||
    activeTimelineEvent.eventDate !== timelineDate ||
    (activeTimelineEvent.eventType ?? "event") !== timelineType ||
    (activeTimelineEvent.track ?? "") !== timelineTrack ||
    (activeTimelineEvent.linkedPageId ?? "") !== timelineLinkedPageId ||
    (activeTimelineEvent.mapMarkerId ?? "") !== timelineMapMarkerId ||
    (activeTimelineEvent.description ?? "") !== timelineDescription
  );
}

export function getTimelineTrackLabel(event: Pick<TimelineEvent, "track" | "eventType">) {
  const track = (event.track ?? "").trim();
  if (track) return track;
  const type = (event.eventType ?? "").trim();
  return type ? `${type} Track` : "General Track";
}

export function groupTimelineEventsByTrack<T extends Pick<TimelineEvent, "track" | "eventType">>(events: T[]) {
  const groups = new Map<string, T[]>();
  for (const event of events) {
    const label = getTimelineTrackLabel(event);
    const existing = groups.get(label) ?? [];
    existing.push(event);
    groups.set(label, existing);
  }
  return [...groups.entries()];
}

export function getAlternateLorePage(allLorePages: LorePage[], excludedId: string | undefined) {
  for (const page of allLorePages) {
    if (page.id !== excludedId) {
      return page;
    }
  }
  return null;
}

export function resolveRelationshipSeedPages(
  allLorePages: LorePage[],
  lorePagesById: Map<string, LorePage>,
  firstLorePage: LorePage | null,
  seed?: {
    sourcePageId?: string;
    targetPageId?: string;
  },
) {
  const sourcePage =
    (seed?.sourcePageId ? lorePagesById.get(seed.sourcePageId) ?? null : null) ?? firstLorePage;
  const targetPage =
    (seed?.targetPageId ? lorePagesById.get(seed.targetPageId) ?? null : null) ??
    getAlternateLorePage(allLorePages, sourcePage?.id) ??
    firstLorePage;
  return { sourcePage, targetPage };
}

export function validateRelationshipDraft(
  relationshipSourceId: string,
  relationshipTargetId: string,
  relationshipType: string,
) {
  if (!relationshipSourceId || !relationshipTargetId) {
    return "Select both a source page and a target page";
  }
  if (relationshipSourceId === relationshipTargetId) {
    return "Choose two different lore pages for a relationship";
  }
  if (!relationshipType.trim()) {
    return "Enter a relationship type";
  }
  return null;
}

export function validateTimelineDraft(timelineTitle: string, timelineDate: string) {
  if (!timelineTitle.trim()) {
    return "Enter a timeline event title";
  }
  if (!timelineDate.trim()) {
    return "Enter a timeline date or marker";
  }
  return null;
}
