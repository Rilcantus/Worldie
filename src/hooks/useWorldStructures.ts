import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

  const resetRelationshipState = (saveState: SaveState = "idle") => {
    setRelationships((current) => (current.length === 0 ? current : []));
    setActiveRelationshipId((current) => (current === null ? current : null));
    setRelationshipSourceId((current) => (current === "" ? current : ""));
    setRelationshipTargetId((current) => (current === "" ? current : ""));
    setRelationshipType((current) => (current === "ally" ? current : "ally"));
    setRelationshipNotes((current) => (current === "" ? current : ""));
    setRelationshipSaveState((current) => (current === saveState ? current : saveState));
    setRelationshipLastSavedAt((current) => (current === null ? current : null));
  };

  const resetTimelineState = (saveState: SaveState = "idle") => {
    setTimelineEvents((current) => (current.length === 0 ? current : []));
    setActiveTimelineEventId((current) => (current === null ? current : null));
    setTimelineTitle((current) => (current === "" ? current : ""));
    setTimelineDate((current) => (current === "" ? current : ""));
    setTimelineType((current) => (current === "event" ? current : "event"));
    setTimelineLinkedPageId((current) => (current === "" ? current : ""));
    setTimelineDescription((current) => (current === "" ? current : ""));
    setTimelineSaveState((current) => (current === saveState ? current : saveState));
    setTimelineLastSavedAt((current) => (current === null ? current : null));
  };

  const markRelationshipSaved = useCallback(() => {
    setRelationshipSaveState("saved");
    setRelationshipLastSavedAt(Date.now());
  }, []);
  const markTimelineSaved = useCallback(() => {
    setTimelineSaveState("saved");
    setTimelineLastSavedAt(Date.now());
  }, []);
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
      resetRelationshipState("idle");
      resetTimelineState("idle");
      return;
    }
    resetRelationshipState("idle");
    resetTimelineState("idle");
    const requestId = ++loadRequestId.current;

    const loadRelationships = async () => {
      try {
        const nextItems = await listRelationships(activeProjectId, activeWorldId);
        if (requestId !== loadRequestId.current) return;
        setRelationships(nextItems);
        const first = nextItems[0] ?? null;
        setActiveRelationshipId(first?.id ?? null);
        setRelationshipSourceId(first?.sourcePageId ?? "");
        setRelationshipTargetId(first?.targetPageId ?? "");
        setRelationshipType(first?.relationType ?? "ally");
        setRelationshipNotes(first?.notes ?? "");
        markRelationshipSaved();
      } catch (error) {
        if (requestId !== loadRequestId.current) return;
        resetRelationshipState("error");
        showToast(error instanceof Error ? error.message : "Worldie could not load relationships for this world.");
      }
    };

    const loadTimeline = async () => {
      try {
        const nextItems = await listTimelineEvents(activeProjectId, activeWorldId);
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
      } catch (error) {
        if (requestId !== loadRequestId.current) return;
        resetTimelineState("error");
        showToast(error instanceof Error ? error.message : "Worldie could not load timeline events for this world.");
      }
    };

    void loadRelationships();
    void loadTimeline();
  }, [activeProjectId, activeWorldId]);

  const selectRelationship = useCallback((relationship: Relationship) => {
    const nextNotes = relationship.notes ?? "";
    const changed =
      activeRelationshipId !== relationship.id ||
      relationshipSourceId !== relationship.sourcePageId ||
      relationshipTargetId !== relationship.targetPageId ||
      relationshipType !== relationship.relationType ||
      relationshipNotes !== nextNotes;
    setActiveRelationshipId((current) => (current === relationship.id ? current : relationship.id));
    setRelationshipSourceId((current) => (current === relationship.sourcePageId ? current : relationship.sourcePageId));
    setRelationshipTargetId((current) => (current === relationship.targetPageId ? current : relationship.targetPageId));
    setRelationshipType((current) => (current === relationship.relationType ? current : relationship.relationType));
    setRelationshipNotes((current) => (current === nextNotes ? current : nextNotes));
    if (!changed) return;
    markRelationshipSaved();
  }, [
    activeRelationshipId,
    markRelationshipSaved,
    relationshipNotes,
    relationshipSourceId,
    relationshipTargetId,
    relationshipType,
  ]);

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
      showToast("Create at least two lore pages before adding relationships.");
      return null;
    }
    if (defaultPage.id === secondPage.id) {
      showToast("Choose two different lore pages before adding a relationship.");
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

  const selectTimelineEvent = useCallback((event: TimelineEvent) => {
    const nextType = event.eventType ?? "event";
    const nextLinkedPageId = event.linkedPageId ?? "";
    const nextDescription = event.description ?? "";
    const changed =
      activeTimelineEventId !== event.id ||
      timelineTitle !== event.title ||
      timelineDate !== event.eventDate ||
      timelineType !== nextType ||
      timelineLinkedPageId !== nextLinkedPageId ||
      timelineDescription !== nextDescription;
    setActiveTimelineEventId((current) => (current === event.id ? current : event.id));
    setTimelineTitle((current) => (current === event.title ? current : event.title));
    setTimelineDate((current) => (current === event.eventDate ? current : event.eventDate));
    setTimelineType((current) => (current === nextType ? current : nextType));
    setTimelineLinkedPageId((current) => (current === nextLinkedPageId ? current : nextLinkedPageId));
    setTimelineDescription((current) => (current === nextDescription ? current : nextDescription));
    if (!changed) return;
    markTimelineSaved();
  }, [
    activeTimelineEventId,
    markTimelineSaved,
    timelineDate,
    timelineDescription,
    timelineLinkedPageId,
    timelineTitle,
    timelineType,
  ]);

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
      setRelationshipSourceId((current) => {
        if (current === value) return current;
        setRelationshipSaveState((saveState) => (saveState === "dirty" ? saveState : "dirty"));
        return value;
      });
    },
    setRelationshipTargetId: (value: string) => {
      setRelationshipTargetId((current) => {
        if (current === value) return current;
        setRelationshipSaveState((saveState) => (saveState === "dirty" ? saveState : "dirty"));
        return value;
      });
    },
    setRelationshipType: (value: string) => {
      setRelationshipType((current) => {
        if (current === value) return current;
        setRelationshipSaveState((saveState) => (saveState === "dirty" ? saveState : "dirty"));
        return value;
      });
    },
    setRelationshipNotes: (value: string) => {
      setRelationshipNotes((current) => {
        if (current === value) return current;
        setRelationshipSaveState((saveState) => (saveState === "dirty" ? saveState : "dirty"));
        return value;
      });
    },
    setTimelineTitle: (value: string) => {
      setTimelineTitle((current) => {
        if (current === value) return current;
        setTimelineSaveState((saveState) => (saveState === "dirty" ? saveState : "dirty"));
        return value;
      });
    },
    setTimelineDate: (value: string) => {
      setTimelineDate((current) => {
        if (current === value) return current;
        setTimelineSaveState((saveState) => (saveState === "dirty" ? saveState : "dirty"));
        return value;
      });
    },
    setTimelineType: (value: string) => {
      setTimelineType((current) => {
        if (current === value) return current;
        setTimelineSaveState((saveState) => (saveState === "dirty" ? saveState : "dirty"));
        return value;
      });
    },
    setTimelineLinkedPageId: (value: string) => {
      setTimelineLinkedPageId((current) => {
        if (current === value) return current;
        setTimelineSaveState((saveState) => (saveState === "dirty" ? saveState : "dirty"));
        return value;
      });
    },
    setTimelineDescription: (value: string) => {
      setTimelineDescription((current) => {
        if (current === value) return current;
        setTimelineSaveState((saveState) => (saveState === "dirty" ? saveState : "dirty"));
        return value;
      });
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
