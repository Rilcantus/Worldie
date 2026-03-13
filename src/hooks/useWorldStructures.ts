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
import {
  hasUnsavedRelationshipChanges,
  hasUnsavedTimelineChanges,
  removeItemWithFallback,
  resolveRelationshipSeedPages,
  validateRelationshipDraft,
  validateTimelineDraft,
} from "./worldStructureState";

type UseWorldStructuresArgs = {
  activeProjectId: string | null;
  activeWorldId: string | null;
  allLorePages: LorePage[];
  recoverActiveProjectError: (error: unknown, fallbackMessage: string) => Promise<boolean>;
  confirmAction: (
    message: string,
    options?: { confirmLabel?: string; tone?: "default" | "danger" },
  ) => Promise<boolean>;
  showToast: (message: string) => void;
};

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

type SelectionOptions = {
  skipGuard?: boolean;
};

export function useWorldStructures({
  activeProjectId,
  activeWorldId,
  allLorePages,
  recoverActiveProjectError,
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
  const currentScopeRef = useRef<{ projectId: string | null; worldId: string | null }>({
    projectId: activeProjectId,
    worldId: activeWorldId,
  });
  const currentRelationshipSaveTargetRef = useRef<{ projectId: string | null; relationshipId: string | null }>({
    projectId: activeProjectId,
    relationshipId: null,
  });
  const currentTimelineSaveTargetRef = useRef<{ projectId: string | null; timelineEventId: string | null }>({
    projectId: activeProjectId,
    timelineEventId: null,
  });

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
  const relationshipsById = useMemo(
    () => new Map(relationships.map((item) => [item.id, item])),
    [relationships],
  );
  const timelineEventsById = useMemo(
    () => new Map(timelineEvents.map((item) => [item.id, item])),
    [timelineEvents],
  );
  const lorePagesById = useMemo(
    () => new Map(allLorePages.map((page) => [page.id, page])),
    [allLorePages],
  );
  const firstLorePage = useMemo(() => allLorePages[0] ?? null, [allLorePages]);
  const activeRelationship = useMemo(
    () => (activeRelationshipId ? relationshipsById.get(activeRelationshipId) ?? null : null),
    [activeRelationshipId, relationshipsById],
  );
  const activeTimelineEvent = useMemo(
    () => (activeTimelineEventId ? timelineEventsById.get(activeTimelineEventId) ?? null : null),
    [activeTimelineEventId, timelineEventsById],
  );
  const hasUnsavedRelationshipDraftChanges = useMemo(() => hasUnsavedRelationshipChanges(
    activeRelationship,
    relationshipSourceId,
    relationshipTargetId,
    relationshipType,
    relationshipNotes,
  ), [
    activeRelationship,
    relationshipNotes,
    relationshipSourceId,
    relationshipTargetId,
    relationshipType,
  ]);
  const hasUnsavedTimelineDraftChanges = useMemo(() => hasUnsavedTimelineChanges(
    activeTimelineEvent,
    timelineTitle,
    timelineDate,
    timelineType,
    timelineLinkedPageId,
    timelineDescription,
  ), [
    activeTimelineEvent,
    timelineDate,
    timelineDescription,
    timelineLinkedPageId,
    timelineTitle,
    timelineType,
  ]);

  useEffect(() => {
    currentScopeRef.current = {
      projectId: activeProjectId,
      worldId: activeWorldId,
    };
  }, [activeProjectId, activeWorldId]);

  useEffect(() => {
    currentRelationshipSaveTargetRef.current = {
      projectId: activeProjectId,
      relationshipId: activeRelationshipId,
    };
  }, [activeProjectId, activeRelationshipId]);

  useEffect(() => {
    currentTimelineSaveTargetRef.current = {
      projectId: activeProjectId,
      timelineEventId: activeTimelineEventId,
    };
  }, [activeProjectId, activeTimelineEventId]);

  const canLeaveRelationshipDraft = useCallback(
    async (nextRelationshipId?: string | null) => {
      if (!hasUnsavedRelationshipDraftChanges) return true;
      if (nextRelationshipId && nextRelationshipId === activeRelationshipId) return true;
      return confirmAction("You have unsaved relationship changes. Continue anyway?", {
        confirmLabel: "Continue",
        tone: "default",
      });
    },
    [activeRelationshipId, confirmAction, hasUnsavedRelationshipDraftChanges],
  );

  const canLeaveTimelineDraft = useCallback(
    async (nextTimelineEventId?: string | null) => {
      if (!hasUnsavedTimelineDraftChanges) return true;
      if (nextTimelineEventId && nextTimelineEventId === activeTimelineEventId) return true;
      return confirmAction("You have unsaved timeline changes. Continue anyway?", {
        confirmLabel: "Continue",
        tone: "default",
      });
    },
    [activeTimelineEventId, confirmAction, hasUnsavedTimelineDraftChanges],
  );

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
        await recoverActiveProjectError(error, "Worldie could not load relationships for this world.");
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
        await recoverActiveProjectError(error, "Worldie could not load timeline events for this world.");
      }
    };

    void loadRelationships();
    void loadTimeline();
  }, [activeProjectId, activeWorldId, recoverActiveProjectError]);

  const selectRelationship = useCallback(async (relationship: Relationship, options?: SelectionOptions) => {
    if (!options?.skipGuard && !(await canLeaveRelationshipDraft(relationship.id))) return;
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
    canLeaveRelationshipDraft,
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
    const actionProjectId = activeProjectId;
    const actionWorldId = activeWorldId;
    if (!(await canLeaveRelationshipDraft())) return null;
    const { sourcePage, targetPage } = resolveRelationshipSeedPages(allLorePages, lorePagesById, firstLorePage, seed);
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
      created = await createRelationship(actionProjectId, actionWorldId, {
        sourcePageId: defaultPage.id,
        targetPageId: secondPage.id,
        relationType: seed?.relationType?.trim() || "ally",
        notes: seed?.notes ?? "",
      });
    } catch (error) {
      await recoverActiveProjectError(error, "Worldie could not create the relationship.");
      return null;
    }
    if (
      currentScopeRef.current.projectId !== actionProjectId ||
      currentScopeRef.current.worldId !== actionWorldId
    ) {
      return null;
    }
    setRelationships((prev) => [created, ...prev]);
    void selectRelationship(created, { skipGuard: true });
    markRelationshipSaved();
    return created;
  };

  const saveRelationship = async () => {
    if (!activeRelationshipId) return;
    const relationshipValidationError = validateRelationshipDraft(
      relationshipSourceId,
      relationshipTargetId,
      relationshipType,
    );
    if (relationshipValidationError) {
      showToast(relationshipValidationError);
      return;
    }
    if (!activeProjectId) return;
    const saveProjectId = activeProjectId;
    const saveRelationshipId = activeRelationshipId;
    try {
      setRelationshipSaveState("saving");
      await updateRelationship(saveProjectId, saveRelationshipId, {
        sourcePageId: relationshipSourceId,
        targetPageId: relationshipTargetId,
        relationType: relationshipType.trim(),
        notes: relationshipNotes,
      });
      const currentTarget = currentRelationshipSaveTargetRef.current;
      if (currentTarget.projectId !== saveProjectId || currentTarget.relationshipId !== saveRelationshipId) return;
      markRelationshipSaved();
    } catch (error) {
      const currentTarget = currentRelationshipSaveTargetRef.current;
      if (currentTarget.projectId !== saveProjectId || currentTarget.relationshipId !== saveRelationshipId) return;
      setRelationshipSaveState("error");
      await recoverActiveProjectError(error, "Worldie could not save the relationship.");
      return;
    }
    setRelationships((prev) =>
      prev.map((item) =>
        item.id === saveRelationshipId
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
    const actionProjectId = activeProjectId;
    const actionWorldId = activeWorldId;
    try {
      await deleteRelationship(actionProjectId, relationshipId);
    } catch (error) {
      await recoverActiveProjectError(error, "Worldie could not delete the relationship.");
      return false;
    }
    if (
      currentScopeRef.current.projectId !== actionProjectId ||
      currentScopeRef.current.worldId !== actionWorldId
    ) {
      return false;
    }
    const { next, first } = removeItemWithFallback(relationships, relationshipId);
    setRelationships(next);
    if (activeRelationshipId === relationshipId) {
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

  const selectTimelineEvent = useCallback(async (event: TimelineEvent, options?: SelectionOptions) => {
    if (!options?.skipGuard && !(await canLeaveTimelineDraft(event.id))) return;
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
    canLeaveTimelineDraft,
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
    const actionProjectId = activeProjectId;
    const actionWorldId = activeWorldId;
    if (!(await canLeaveTimelineDraft())) return null;
    let created: TimelineEvent;
    try {
      created = await createTimelineEvent(actionProjectId, actionWorldId, {
        title: seed?.title?.trim() || `New Event ${timelineEvents.length + 1}`,
        eventDate: seed?.eventDate ?? "",
        eventType: seed?.eventType?.trim() || "event",
        linkedPageId: seed?.linkedPageId ?? "",
        description: seed?.description ?? "",
      });
    } catch (error) {
      await recoverActiveProjectError(error, "Worldie could not create the timeline event.");
      return null;
    }
    if (
      currentScopeRef.current.projectId !== actionProjectId ||
      currentScopeRef.current.worldId !== actionWorldId
    ) {
      return null;
    }
    setTimelineEvents((prev) => [created, ...prev]);
    void selectTimelineEvent(created, { skipGuard: true });
    markTimelineSaved();
    return created;
  };

  const duplicateTimelineEvent = async (eventId: string) => {
    const sourceEvent = timelineEventsById.get(eventId);
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
    const timelineValidationError = validateTimelineDraft(timelineTitle, timelineDate);
    if (timelineValidationError) {
      showToast(timelineValidationError);
      return;
    }
    if (!activeProjectId) return;
    const saveProjectId = activeProjectId;
    const saveTimelineEventId = activeTimelineEventId;
    try {
      setTimelineSaveState("saving");
      await updateTimelineEvent(saveProjectId, saveTimelineEventId, {
        title: timelineTitle.trim(),
        eventDate: timelineDate.trim(),
        eventType: timelineType.trim() || "event",
        linkedPageId: timelineLinkedPageId,
        description: timelineDescription,
      });
      const currentTarget = currentTimelineSaveTargetRef.current;
      if (currentTarget.projectId !== saveProjectId || currentTarget.timelineEventId !== saveTimelineEventId) return;
      markTimelineSaved();
    } catch (error) {
      const currentTarget = currentTimelineSaveTargetRef.current;
      if (currentTarget.projectId !== saveProjectId || currentTarget.timelineEventId !== saveTimelineEventId) return;
      setTimelineSaveState("error");
      await recoverActiveProjectError(error, "Worldie could not save the timeline event.");
      return;
    }
    setTimelineEvents((prev) =>
      prev.map((item) =>
        item.id === saveTimelineEventId
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
    const actionProjectId = activeProjectId;
    const actionWorldId = activeWorldId;
    try {
      await deleteTimelineEvent(actionProjectId, eventId);
    } catch (error) {
      await recoverActiveProjectError(error, "Worldie could not delete the timeline event.");
      return false;
    }
    if (
      currentScopeRef.current.projectId !== actionProjectId ||
      currentScopeRef.current.worldId !== actionWorldId
    ) {
      return false;
    }
    const { next, first } = removeItemWithFallback(timelineEvents, eventId);
    setTimelineEvents(next);
    if (activeTimelineEventId === eventId) {
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

  const updateRelationshipSourceId = useCallback((value: string) => {
    setRelationshipSourceId((current) => {
      if (current === value) return current;
      setRelationshipSaveState((saveState) => (saveState === "dirty" ? saveState : "dirty"));
      return value;
    });
  }, []);

  const updateRelationshipTargetId = useCallback((value: string) => {
    setRelationshipTargetId((current) => {
      if (current === value) return current;
      setRelationshipSaveState((saveState) => (saveState === "dirty" ? saveState : "dirty"));
      return value;
    });
  }, []);

  const updateRelationshipType = useCallback((value: string) => {
    setRelationshipType((current) => {
      if (current === value) return current;
      setRelationshipSaveState((saveState) => (saveState === "dirty" ? saveState : "dirty"));
      return value;
    });
  }, []);

  const updateRelationshipNotes = useCallback((value: string) => {
    setRelationshipNotes((current) => {
      if (current === value) return current;
      setRelationshipSaveState((saveState) => (saveState === "dirty" ? saveState : "dirty"));
      return value;
    });
  }, []);

  const updateTimelineTitle = useCallback((value: string) => {
    setTimelineTitle((current) => {
      if (current === value) return current;
      setTimelineSaveState((saveState) => (saveState === "dirty" ? saveState : "dirty"));
      return value;
    });
  }, []);

  const updateTimelineDate = useCallback((value: string) => {
    setTimelineDate((current) => {
      if (current === value) return current;
      setTimelineSaveState((saveState) => (saveState === "dirty" ? saveState : "dirty"));
      return value;
    });
  }, []);

  const updateTimelineType = useCallback((value: string) => {
    setTimelineType((current) => {
      if (current === value) return current;
      setTimelineSaveState((saveState) => (saveState === "dirty" ? saveState : "dirty"));
      return value;
    });
  }, []);

  const updateTimelineLinkedPageId = useCallback((value: string) => {
    setTimelineLinkedPageId((current) => {
      if (current === value) return current;
      setTimelineSaveState((saveState) => (saveState === "dirty" ? saveState : "dirty"));
      return value;
    });
  }, []);

  const updateTimelineDescription = useCallback((value: string) => {
    setTimelineDescription((current) => {
      if (current === value) return current;
      setTimelineSaveState((saveState) => (saveState === "dirty" ? saveState : "dirty"));
      return value;
    });
  }, []);

  return useMemo(
    () => ({
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
      hasUnsavedChanges: hasUnsavedRelationshipDraftChanges || hasUnsavedTimelineDraftChanges,
      relationshipSaveState,
      relationshipLastSavedAt,
      timelineSaveState,
      timelineLastSavedAt,
      setRelationshipSourceId: updateRelationshipSourceId,
      setRelationshipTargetId: updateRelationshipTargetId,
      setRelationshipType: updateRelationshipType,
      setRelationshipNotes: updateRelationshipNotes,
      setTimelineTitle: updateTimelineTitle,
      setTimelineDate: updateTimelineDate,
      setTimelineType: updateTimelineType,
      setTimelineLinkedPageId: updateTimelineLinkedPageId,
      setTimelineDescription: updateTimelineDescription,
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
    }),
    [
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
      hasUnsavedRelationshipDraftChanges,
      hasUnsavedTimelineDraftChanges,
      relationshipSaveState,
      relationshipLastSavedAt,
      timelineSaveState,
      timelineLastSavedAt,
      updateRelationshipSourceId,
      updateRelationshipTargetId,
      updateRelationshipType,
      updateRelationshipNotes,
      updateTimelineTitle,
      updateTimelineDate,
      updateTimelineType,
      updateTimelineLinkedPageId,
      updateTimelineDescription,
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
    ],
  );
}
