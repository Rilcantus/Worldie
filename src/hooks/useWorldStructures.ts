import { useEffect, useMemo, useRef, useState } from "react";
import {
  createRelationship,
  createTimelineEvent,
  deleteRelationship,
  deleteTimelineEvent,
  listRelationships,
  listTimelineEvents,
  updateRelationship,
  updateTimelineEvent,
  type LorePage,
  type Relationship,
  type TimelineEvent,
} from "../lib/data";

type UseWorldStructuresArgs = {
  activeProjectId: string | null;
  activeWorldId: string | null;
  allLorePages: LorePage[];
  confirmAction: (message: string) => Promise<boolean>;
  showToast: (message: string) => void;
};

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

export function useWorldStructures({
  activeProjectId,
  activeWorldId,
  allLorePages,
  confirmAction,
  showToast,
}: UseWorldStructuresArgs) {
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [activeRelationshipId, setActiveRelationshipId] = useState<string | null>(null);
  const [relationshipSourceId, setRelationshipSourceId] = useState("");
  const [relationshipTargetId, setRelationshipTargetId] = useState("");
  const [relationshipType, setRelationshipType] = useState("ally");
  const [relationshipNotes, setRelationshipNotes] = useState("");
  const [relationshipSaveState, setRelationshipSaveState] = useState<SaveState>("idle");
  const [relationshipLastSavedAt, setRelationshipLastSavedAt] = useState<number | null>(null);

  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [activeTimelineEventId, setActiveTimelineEventId] = useState<string | null>(null);
  const [timelineTitle, setTimelineTitle] = useState("");
  const [timelineDate, setTimelineDate] = useState("");
  const [timelineType, setTimelineType] = useState("event");
  const [timelineLinkedPageId, setTimelineLinkedPageId] = useState("");
  const [timelineDescription, setTimelineDescription] = useState("");
  const [timelineSaveState, setTimelineSaveState] = useState<SaveState>("idle");
  const [timelineLastSavedAt, setTimelineLastSavedAt] = useState<number | null>(null);
  const loadRequestId = useRef(0);
  const markRelationshipSaved = () => {
    setRelationshipSaveState("saved");
    setRelationshipLastSavedAt(Date.now());
  };
  const markTimelineSaved = () => {
    setTimelineSaveState("saved");
    setTimelineLastSavedAt(Date.now());
  };
  const activeRelationship = useMemo(
    () => relationships.find((item) => item.id === activeRelationshipId) ?? null,
    [activeRelationshipId, relationships],
  );
  const activeTimelineEvent = useMemo(
    () => timelineEvents.find((item) => item.id === activeTimelineEventId) ?? null,
    [activeTimelineEventId, timelineEvents],
  );
  const hasUnsavedRelationshipChanges = useMemo(() => {
    if (!activeRelationship) return false;
    return (
      activeRelationship.sourcePageId !== relationshipSourceId ||
      activeRelationship.targetPageId !== relationshipTargetId ||
      activeRelationship.relationType !== relationshipType ||
      (activeRelationship.notes ?? "") !== relationshipNotes
    );
  }, [
    activeRelationship,
    relationshipNotes,
    relationshipSourceId,
    relationshipTargetId,
    relationshipType,
  ]);
  const hasUnsavedTimelineChanges = useMemo(() => {
    if (!activeTimelineEvent) return false;
    return (
      activeTimelineEvent.title !== timelineTitle ||
      activeTimelineEvent.eventDate !== timelineDate ||
      (activeTimelineEvent.eventType ?? "event") !== timelineType ||
      (activeTimelineEvent.linkedPageId ?? "") !== timelineLinkedPageId ||
      (activeTimelineEvent.description ?? "") !== timelineDescription
    );
  }, [
    activeTimelineEvent,
    timelineDate,
    timelineDescription,
    timelineLinkedPageId,
    timelineTitle,
    timelineType,
  ]);

  useEffect(() => {
    if (!activeProjectId || !activeWorldId) {
      loadRequestId.current += 1;
      setRelationships([]);
      setActiveRelationshipId(null);
      setRelationshipSourceId("");
      setRelationshipTargetId("");
      setRelationshipType("ally");
      setRelationshipNotes("");
      setRelationshipSaveState("idle");
      setRelationshipLastSavedAt(null);
      setTimelineEvents([]);
      setActiveTimelineEventId(null);
      setTimelineTitle("");
      setTimelineDate("");
      setTimelineType("event");
      setTimelineLinkedPageId("");
      setTimelineDescription("");
      setTimelineSaveState("idle");
      setTimelineLastSavedAt(null);
      return;
    }
    const requestId = ++loadRequestId.current;

    void listRelationships(activeProjectId, activeWorldId).then((items) => {
      const nextItems = items;
      if (requestId !== loadRequestId.current) return;
      setRelationships(nextItems);
      const first = nextItems[0] ?? null;
      setActiveRelationshipId(first?.id ?? null);
      setRelationshipSourceId(first?.sourcePageId ?? "");
      setRelationshipTargetId(first?.targetPageId ?? "");
      setRelationshipType(first?.relationType ?? "ally");
      setRelationshipNotes(first?.notes ?? "");
      markRelationshipSaved();
    }).catch((error) => {
      showToast(error instanceof Error ? error.message : "Worldie could not load relationships for this world.");
    });

    void listTimelineEvents(activeProjectId, activeWorldId).then((items) => {
      const nextItems = items;
      if (requestId !== loadRequestId.current) return;
      setTimelineEvents(nextItems);
      const first = nextItems[0] ?? null;
      setActiveTimelineEventId(first?.id ?? null);
      setTimelineTitle(first?.title ?? "");
      setTimelineDate(first?.eventDate ?? "");
      setTimelineType(first?.eventType ?? "event");
      setTimelineLinkedPageId(first?.linkedPageId ?? "");
      setTimelineDescription(first?.description ?? "");
      markTimelineSaved();
    }).catch((error) => {
      showToast(error instanceof Error ? error.message : "Worldie could not load timeline events for this world.");
    });
  }, [activeProjectId, activeWorldId]);

  const selectRelationship = (relationship: Relationship) => {
    setActiveRelationshipId(relationship.id);
    setRelationshipSourceId(relationship.sourcePageId);
    setRelationshipTargetId(relationship.targetPageId);
    setRelationshipType(relationship.relationType);
    setRelationshipNotes(relationship.notes ?? "");
    markRelationshipSaved();
  };

  const addRelationship = async () => {
    return addRelationshipWithSeed();
  };

  const addRelationshipWithSeed = async (seed?: {
    sourcePageId?: string;
    targetPageId?: string;
    relationType?: string;
    notes?: string;
  }) => {
    if (!activeProjectId || !activeWorldId) return null;
    const sourcePage =
      (seed?.sourcePageId ? allLorePages.find((page) => page.id === seed.sourcePageId) : null) ?? allLorePages[0];
    const targetPage =
      (seed?.targetPageId ? allLorePages.find((page) => page.id === seed.targetPageId) : null) ??
      allLorePages.find((page) => page.id !== sourcePage?.id) ??
      allLorePages[0];
    const defaultPage = sourcePage;
    const secondPage = targetPage;
    if (!defaultPage || !secondPage) {
      showToast("Create at least one lore page before adding relationships");
      return null;
    }
    let created: Relationship;
    try {
      created = await createRelationship(activeProjectId, activeWorldId, {
        sourcePageId: defaultPage.id,
        targetPageId: secondPage.id,
        relationType: seed?.relationType?.trim() || "ally",
        notes: seed?.notes ?? "",
      });
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Worldie could not create the relationship.");
      return null;
    }
    setRelationships((prev) => [created, ...prev]);
    selectRelationship(created);
    markRelationshipSaved();
    return created;
  };

  const saveRelationship = async () => {
    if (!activeRelationshipId) return;
    if (!relationshipSourceId || !relationshipTargetId) {
      showToast("Select both a source page and a target page");
      return;
    }
    if (relationshipSourceId === relationshipTargetId) {
      showToast("Choose two different lore pages for a relationship");
      return;
    }
    if (!relationshipType.trim()) {
      showToast("Enter a relationship type");
      return;
    }
    if (!activeProjectId) return;
    try {
      setRelationshipSaveState("saving");
      await updateRelationship(activeProjectId, activeRelationshipId, {
        sourcePageId: relationshipSourceId,
        targetPageId: relationshipTargetId,
        relationType: relationshipType.trim(),
        notes: relationshipNotes,
      });
      markRelationshipSaved();
    } catch (error) {
      setRelationshipSaveState("error");
      showToast(error instanceof Error ? error.message : "Worldie could not save the relationship.");
      return;
    }
    setRelationships((prev) =>
      prev.map((item) =>
        item.id === activeRelationshipId
          ? {
              ...item,
              sourcePageId: relationshipSourceId,
              targetPageId: relationshipTargetId,
              relationType: relationshipType.trim(),
              notes: relationshipNotes,
            }
          : item,
      ),
    );
  };

  const removeRelationship = async (relationshipId: string) => {
    const confirmDelete = await confirmAction("Delete this relationship?");
    if (!confirmDelete) return false;
    if (!activeProjectId) return false;
    try {
      await deleteRelationship(activeProjectId, relationshipId);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Worldie could not delete the relationship.");
      return false;
    }
    const next = relationships.filter((item) => item.id !== relationshipId);
    setRelationships(next);
    if (activeRelationshipId === relationshipId) {
      const first = next[0] ?? null;
      setActiveRelationshipId(first?.id ?? null);
      setRelationshipSourceId(first?.sourcePageId ?? "");
      setRelationshipTargetId(first?.targetPageId ?? "");
      setRelationshipType(first?.relationType ?? "ally");
      setRelationshipNotes(first?.notes ?? "");
      if (first) {
        markRelationshipSaved();
      } else {
        setRelationshipSaveState("idle");
        setRelationshipLastSavedAt(null);
      }
    }
    return true;
  };

  const selectTimelineEvent = (event: TimelineEvent) => {
    setActiveTimelineEventId(event.id);
    setTimelineTitle(event.title);
    setTimelineDate(event.eventDate);
    setTimelineType(event.eventType ?? "event");
    setTimelineLinkedPageId(event.linkedPageId ?? "");
    setTimelineDescription(event.description ?? "");
    markTimelineSaved();
  };

  const addTimelineEvent = async () => {
    return addTimelineEventWithSeed();
  };

  const addTimelineEventWithSeed = async (seed?: {
    title?: string;
    eventDate?: string;
    eventType?: string;
    linkedPageId?: string;
    description?: string;
  }) => {
    if (!activeProjectId || !activeWorldId) return null;
    let created: TimelineEvent;
    try {
      created = await createTimelineEvent(activeProjectId, activeWorldId, {
        title: seed?.title?.trim() || `New Event ${timelineEvents.length + 1}`,
        eventDate: seed?.eventDate ?? "",
        eventType: seed?.eventType?.trim() || "event",
        linkedPageId: seed?.linkedPageId ?? "",
        description: seed?.description ?? "",
      });
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Worldie could not create the timeline event.");
      return null;
    }
    setTimelineEvents((prev) => [created, ...prev]);
    selectTimelineEvent(created);
    markTimelineSaved();
    return created;
  };

  const duplicateTimelineEvent = async (eventId: string) => {
    const sourceEvent = timelineEvents.find((item) => item.id === eventId);
    if (!sourceEvent) return null;
    return addTimelineEventWithSeed({
      title: `${sourceEvent.title} Copy`,
      eventDate: sourceEvent.eventDate,
      eventType: sourceEvent.eventType ?? "event",
      linkedPageId: sourceEvent.linkedPageId ?? "",
      description: sourceEvent.description ?? "",
    });
  };

  const saveTimelineEvent = async () => {
    if (!activeTimelineEventId) return;
    if (!timelineTitle.trim()) {
      showToast("Enter a timeline event title");
      return;
    }
    if (!timelineDate.trim()) {
      showToast("Enter a timeline date or marker");
      return;
    }
    if (!activeProjectId) return;
    try {
      setTimelineSaveState("saving");
      await updateTimelineEvent(activeProjectId, activeTimelineEventId, {
        title: timelineTitle.trim(),
        eventDate: timelineDate.trim(),
        eventType: timelineType.trim() || "event",
        linkedPageId: timelineLinkedPageId,
        description: timelineDescription,
      });
      markTimelineSaved();
    } catch (error) {
      setTimelineSaveState("error");
      showToast(error instanceof Error ? error.message : "Worldie could not save the timeline event.");
      return;
    }
    setTimelineEvents((prev) =>
      prev.map((item) =>
        item.id === activeTimelineEventId
          ? {
              ...item,
              title: timelineTitle.trim(),
              eventDate: timelineDate.trim(),
              eventType: timelineType.trim() || "event",
              linkedPageId: timelineLinkedPageId,
              description: timelineDescription,
            }
          : item,
      ),
    );
  };

  const removeTimelineEvent = async (eventId: string) => {
    const confirmDelete = await confirmAction("Delete this timeline event?");
    if (!confirmDelete) return false;
    if (!activeProjectId) return false;
    try {
      await deleteTimelineEvent(activeProjectId, eventId);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Worldie could not delete the timeline event.");
      return false;
    }
    const next = timelineEvents.filter((item) => item.id !== eventId);
    setTimelineEvents(next);
    if (activeTimelineEventId === eventId) {
      const first = next[0] ?? null;
      setActiveTimelineEventId(first?.id ?? null);
      setTimelineTitle(first?.title ?? "");
      setTimelineDate(first?.eventDate ?? "");
      setTimelineType(first?.eventType ?? "event");
      setTimelineLinkedPageId(first?.linkedPageId ?? "");
      setTimelineDescription(first?.description ?? "");
      if (first) {
        markTimelineSaved();
      } else {
        setTimelineSaveState("idle");
        setTimelineLastSavedAt(null);
      }
    }
    return true;
  };

  return {
    relationships,
    activeRelationshipId,
    relationshipSourceId,
    relationshipTargetId,
    relationshipType,
    relationshipNotes,
    timelineEvents,
    activeTimelineEventId,
    timelineTitle,
    timelineDate,
    timelineType,
    timelineLinkedPageId,
    timelineDescription,
    hasUnsavedChanges: hasUnsavedRelationshipChanges || hasUnsavedTimelineChanges,
    relationshipSaveState,
    relationshipLastSavedAt,
    timelineSaveState,
    timelineLastSavedAt,
    setRelationshipSourceId: (value: string) => {
      setRelationshipSaveState("dirty");
      setRelationshipSourceId(value);
    },
    setRelationshipTargetId: (value: string) => {
      setRelationshipSaveState("dirty");
      setRelationshipTargetId(value);
    },
    setRelationshipType: (value: string) => {
      setRelationshipSaveState("dirty");
      setRelationshipType(value);
    },
    setRelationshipNotes: (value: string) => {
      setRelationshipSaveState("dirty");
      setRelationshipNotes(value);
    },
    setTimelineTitle: (value: string) => {
      setTimelineSaveState("dirty");
      setTimelineTitle(value);
    },
    setTimelineDate: (value: string) => {
      setTimelineSaveState("dirty");
      setTimelineDate(value);
    },
    setTimelineType: (value: string) => {
      setTimelineSaveState("dirty");
      setTimelineType(value);
    },
    setTimelineLinkedPageId: (value: string) => {
      setTimelineSaveState("dirty");
      setTimelineLinkedPageId(value);
    },
    setTimelineDescription: (value: string) => {
      setTimelineSaveState("dirty");
      setTimelineDescription(value);
    },
    selectRelationship,
    addRelationship,
    addRelationshipWithSeed,
    saveRelationship,
    removeRelationship,
    selectTimelineEvent,
    addTimelineEvent,
    addTimelineEventWithSeed,
    duplicateTimelineEvent,
    saveTimelineEvent,
    removeTimelineEvent,
  };
}
