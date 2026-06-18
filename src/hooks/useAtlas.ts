import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createMap,
  createMapMarker,
  deleteMap,
  deleteMapMarker,
  listMapMarkers,
  listMaps,
  updateMap,
  updateMapMarker,
  type MapMarker,
  type WorldMap,
} from "../lib/data";
import {
  buildAtlasMarkerDraft,
  buildAtlasMarkerUpdate,
  clampAtlasPoint,
  hasUnsavedAtlasMarkerDraft,
  resolveAtlasMarkerSaveState,
  type AtlasMarkerDraft,
  type AtlasPoint,
} from "../lib/atlas";
import type { SaveState } from "./dirtyState";

type UseAtlasArgs = {
  activeProjectId: string | null;
  activeWorldId: string | null;
  recoverActiveProjectError: (error: unknown, fallbackMessage: string) => Promise<boolean>;
  confirmAction: (
    message: string,
    options?: { confirmLabel?: string; tone?: "default" | "danger" },
  ) => Promise<boolean>;
  showToast: (message: string) => void;
};

export function useAtlas({
  activeProjectId,
  activeWorldId,
  recoverActiveProjectError,
  confirmAction,
  showToast,
}: UseAtlasArgs) {
  const [maps, setMaps] = useState<WorldMap[]>([]);
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [activeMapId, setActiveMapId] = useState<string | null>(null);
  const [activeMarkerId, setActiveMarkerId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [markerDraft, setMarkerDraft] = useState<AtlasMarkerDraft>(() => buildAtlasMarkerDraft(null));
  const [markerSaveState, setMarkerSaveState] = useState<SaveState>("idle");
  const [markerLastSavedAt, setMarkerLastSavedAt] = useState<number | null>(null);
  const loadRequestId = useRef(0);
  const markerLoadRequestId = useRef(0);
  const currentScopeRef = useRef({ projectId: activeProjectId, worldId: activeWorldId });

  useEffect(() => {
    currentScopeRef.current = { projectId: activeProjectId, worldId: activeWorldId };
  }, [activeProjectId, activeWorldId]);

  const activeMap = useMemo(
    () => (activeMapId ? maps.find((map) => map.id === activeMapId) ?? null : null),
    [activeMapId, maps],
  );
  const activeMarker = useMemo(
    () => (activeMarkerId ? markers.find((marker) => marker.id === activeMarkerId) ?? null : null),
    [activeMarkerId, markers],
  );
  const hasUnsavedMarkerDraft = useMemo(
    () => hasUnsavedAtlasMarkerDraft(activeMarker, markerDraft),
    [activeMarker, markerDraft],
  );
  const resolvedMarkerSaveState = useMemo(
    () => resolveAtlasMarkerSaveState(hasUnsavedMarkerDraft, markerSaveState),
    [hasUnsavedMarkerDraft, markerSaveState],
  );

  useEffect(() => {
    setMarkerDraft(buildAtlasMarkerDraft(activeMarker));
    setMarkerSaveState("idle");
  }, [activeMarkerId]);

  useEffect(() => {
    if (!activeProjectId || !activeWorldId) {
      loadRequestId.current += 1;
      markerLoadRequestId.current += 1;
      setMaps([]);
      setMarkers([]);
      setActiveMapId(null);
      setActiveMarkerId(null);
      setMarkerDraft(buildAtlasMarkerDraft(null));
      setMarkerSaveState("idle");
      setMarkerLastSavedAt(null);
      setIsLoading(false);
      return;
    }

    const requestId = ++loadRequestId.current;
    setIsLoading(true);
    setMarkers([]);
    setActiveMarkerId(null);
    setMarkerDraft(buildAtlasMarkerDraft(null));
    setMarkerSaveState("idle");

    const load = async () => {
      try {
        const nextMaps = await listMaps(activeProjectId, activeWorldId);
        if (requestId !== loadRequestId.current) return;
        setMaps(nextMaps);
        setActiveMapId((current) => (current && nextMaps.some((map) => map.id === current) ? current : nextMaps[0]?.id ?? null));
      } catch (error) {
        if (requestId !== loadRequestId.current) return;
        await recoverActiveProjectError(error, "Worldie could not load Atlas maps for this world.");
      } finally {
        if (requestId === loadRequestId.current) {
          setIsLoading(false);
        }
      }
    };

    void load();
  }, [activeProjectId, activeWorldId, recoverActiveProjectError]);

  useEffect(() => {
    if (!activeProjectId || !activeMapId) {
      markerLoadRequestId.current += 1;
      setMarkers([]);
      setActiveMarkerId(null);
      setMarkerDraft(buildAtlasMarkerDraft(null));
      setMarkerSaveState("idle");
      return;
    }

    const requestId = ++markerLoadRequestId.current;
    const load = async () => {
      try {
        const nextMarkers = await listMapMarkers(activeProjectId, activeMapId);
        if (requestId !== markerLoadRequestId.current) return;
        setMarkers(nextMarkers);
        setActiveMarkerId((current) =>
          current && nextMarkers.some((marker) => marker.id === current) ? current : nextMarkers[0]?.id ?? null,
        );
      } catch (error) {
        if (requestId !== markerLoadRequestId.current) return;
        await recoverActiveProjectError(error, "Worldie could not load Atlas markers for this map.");
      }
    };

    void load();
  }, [activeMapId, activeProjectId, recoverActiveProjectError]);

  const confirmDiscardMarkerDraft = useCallback(async () => {
    if (!hasUnsavedMarkerDraft && markerSaveState !== "error") return true;
    const confirmed = await confirmAction("You have unsaved marker changes. Continue anyway?", {
      confirmLabel: "Continue",
      tone: "default",
    });
    if (confirmed) {
      setMarkerDraft(buildAtlasMarkerDraft(activeMarker));
      setMarkerSaveState("idle");
    }
    return confirmed;
  }, [activeMarker, confirmAction, hasUnsavedMarkerDraft, markerSaveState]);

  const selectMap = useCallback(
    async (mapId: string) => {
      if (mapId === activeMapId) return true;
      if (!(await confirmDiscardMarkerDraft())) return false;
      setActiveMapId(mapId);
      setMarkers([]);
      setActiveMarkerId(null);
      return true;
    },
    [activeMapId, confirmDiscardMarkerDraft],
  );

  const selectMarker = useCallback(
    async (markerId: string) => {
      if (markerId === activeMarkerId) return true;
      if (!(await confirmDiscardMarkerDraft())) return false;
      setActiveMarkerId(markerId);
      return true;
    },
    [activeMarkerId, confirmDiscardMarkerDraft],
  );

  const addMap = useCallback(async () => {
    if (!activeProjectId || !activeWorldId) return null;
    if (!(await confirmDiscardMarkerDraft())) return null;
    const actionProjectId = activeProjectId;
    const actionWorldId = activeWorldId;
    try {
      const created = await createMap(actionProjectId, actionWorldId, {
        name: `New Map ${maps.length + 1}`,
        description: "",
        width: 1200,
        height: 800,
        backgroundType: "grid",
      });
      if (
        currentScopeRef.current.projectId !== actionProjectId ||
        currentScopeRef.current.worldId !== actionWorldId
      ) {
        return null;
      }
      setMaps((current) => [created, ...current]);
      setActiveMapId(created.id);
      setMarkers([]);
      setActiveMarkerId(null);
      return created;
    } catch (error) {
      await recoverActiveProjectError(error, "Worldie could not create the Atlas map.");
      return null;
    }
  }, [activeProjectId, activeWorldId, confirmDiscardMarkerDraft, maps.length, recoverActiveProjectError]);

  const reviseMap = useCallback(
    async (mapId: string, updates: Partial<Pick<WorldMap, "name" | "description" | "backgroundType">>) => {
      if (!activeProjectId) return false;
      try {
        await updateMap(activeProjectId, mapId, updates);
      } catch (error) {
        await recoverActiveProjectError(error, "Worldie could not save the Atlas map.");
        return false;
      }
      setMaps((current) => current.map((map) => (map.id === mapId ? { ...map, ...updates } : map)));
      return true;
    },
    [activeProjectId, recoverActiveProjectError],
  );

  const removeMap = useCallback(
    async (mapId: string) => {
      if (!activeProjectId) return false;
      if (mapId === activeMapId && !(await confirmDiscardMarkerDraft())) return false;
      const confirmed = await confirmAction("Delete this map and its markers?", {
        confirmLabel: "Delete Map",
        tone: "danger",
      });
      if (!confirmed) return false;
      try {
        await deleteMap(activeProjectId, mapId);
      } catch (error) {
        await recoverActiveProjectError(error, "Worldie could not delete the Atlas map.");
        return false;
      }
      setMaps((current) => {
        const next = current.filter((map) => map.id !== mapId);
        setActiveMapId((currentMapId) => (currentMapId === mapId ? next[0]?.id ?? null : currentMapId));
        return next;
      });
      setMarkers((current) => (activeMapId === mapId ? [] : current));
      setActiveMarkerId((current) => (activeMapId === mapId ? null : current));
      return true;
    },
    [activeMapId, activeProjectId, confirmAction, confirmDiscardMarkerDraft, recoverActiveProjectError],
  );

  const addMarker = useCallback(
    async (point: AtlasPoint) => {
      if (!activeProjectId || !activeWorldId || !activeMap) {
        showToast("Create or select a map before adding markers.");
        return null;
      }
      if (!(await confirmDiscardMarkerDraft())) return null;
      const nextPoint = clampAtlasPoint(point, activeMap);
      try {
        const created = await createMapMarker(activeProjectId, activeWorldId, activeMap.id, {
          title: `Marker ${markers.length + 1}`,
          description: "",
          x: nextPoint.x,
          y: nextPoint.y,
          markerType: "location",
          lorePageId: null,
        });
        setMarkers((current) => [created, ...current]);
        setActiveMarkerId(created.id);
        return created;
      } catch (error) {
        await recoverActiveProjectError(error, "Worldie could not create the Atlas marker.");
        return null;
      }
    },
    [activeMap, activeProjectId, activeWorldId, confirmDiscardMarkerDraft, markers.length, recoverActiveProjectError, showToast],
  );

  const reviseMarker = useCallback(
    async (markerId: string, updates: Partial<Pick<MapMarker, "title" | "description" | "x" | "y" | "markerType" | "lorePageId">>) => {
      if (!activeProjectId) return false;
      try {
        await updateMapMarker(activeProjectId, markerId, updates);
      } catch (error) {
        await recoverActiveProjectError(error, "Worldie could not save the Atlas marker.");
        return false;
      }
      setMarkers((current) => current.map((marker) => (marker.id === markerId ? { ...marker, ...updates } : marker)));
      return true;
    },
    [activeProjectId, recoverActiveProjectError],
  );

  const saveMarkerDraft = useCallback(async () => {
    if (!activeMarker || !activeProjectId) return false;
    const updates = buildAtlasMarkerUpdate(markerDraft);
    setMarkerSaveState("saving");
    try {
      await updateMapMarker(activeProjectId, activeMarker.id, updates);
    } catch (error) {
      setMarkerSaveState("error");
      await recoverActiveProjectError(error, "Worldie could not save the Atlas marker.");
      return false;
    }
    const savedMarker = { ...activeMarker, ...updates };
    setMarkers((current) => current.map((marker) => (marker.id === activeMarker.id ? savedMarker : marker)));
    setMarkerDraft(buildAtlasMarkerDraft(savedMarker));
    setMarkerSaveState("saved");
    setMarkerLastSavedAt(Date.now());
    return true;
  }, [activeMarker, activeProjectId, markerDraft, recoverActiveProjectError]);

  const moveMarker = useCallback(
    async (markerId: string, point: AtlasPoint) => {
      if (!activeMap) return false;
      const nextPoint = clampAtlasPoint(point, activeMap);
      return reviseMarker(markerId, nextPoint);
    },
    [activeMap, reviseMarker],
  );

  const removeMarker = useCallback(
    async (markerId: string) => {
      if (!activeProjectId) return false;
      if (markerId === activeMarkerId && !(await confirmDiscardMarkerDraft())) return false;
      const confirmed = await confirmAction("Delete this marker?", {
        confirmLabel: "Delete Marker",
        tone: "danger",
      });
      if (!confirmed) return false;
      try {
        await deleteMapMarker(activeProjectId, markerId);
      } catch (error) {
        await recoverActiveProjectError(error, "Worldie could not delete the Atlas marker.");
        return false;
      }
      setMarkers((current) => {
        const next = current.filter((marker) => marker.id !== markerId);
        setActiveMarkerId((currentMarkerId) => (currentMarkerId === markerId ? next[0]?.id ?? null : currentMarkerId));
        return next;
      });
      return true;
    },
    [activeMarkerId, activeProjectId, confirmAction, confirmDiscardMarkerDraft, recoverActiveProjectError],
  );

  return useMemo(
    () => ({
      maps,
      markers,
      activeMap,
      activeMarker,
      activeMapId,
      activeMarkerId,
      isLoading,
      markerDraft,
      markerSaveState: resolvedMarkerSaveState,
      markerLastSavedAt,
      hasUnsavedChanges: hasUnsavedMarkerDraft || markerSaveState === "error" || markerSaveState === "saving",
      setMarkerDraft,
      selectMap,
      selectMarker,
      addMap,
      reviseMap,
      removeMap,
      addMarker,
      reviseMarker,
      saveMarkerDraft,
      moveMarker,
      removeMarker,
    }),
    [
      maps,
      markers,
      activeMap,
      activeMarker,
      activeMapId,
      activeMarkerId,
      isLoading,
      markerDraft,
      resolvedMarkerSaveState,
      markerLastSavedAt,
      hasUnsavedMarkerDraft,
      markerSaveState,
      selectMap,
      selectMarker,
      addMap,
      reviseMap,
      removeMap,
      addMarker,
      reviseMarker,
      saveMarkerDraft,
      moveMarker,
      removeMarker,
    ],
  );
}
