import type { MapMarker, WorldMap } from "./data";
import type { SaveState } from "../hooks/dirtyState";

export type AtlasPoint = {
  x: number;
  y: number;
};

export type AtlasMarkerDraft = {
  title: string;
  description: string;
  markerType: string;
  lorePageId: string;
};

export function clampAtlasPoint(point: AtlasPoint, map: Pick<WorldMap, "width" | "height">): AtlasPoint {
  const width = Number.isFinite(map.width) && map.width > 0 ? map.width : 1;
  const height = Number.isFinite(map.height) && map.height > 0 ? map.height : 1;
  return {
    x: Math.min(Math.max(point.x, 0), width),
    y: Math.min(Math.max(point.y, 0), height),
  };
}

export function getAtlasPointFromClientPosition(
  clientX: number,
  clientY: number,
  rect: Pick<DOMRect, "left" | "top" | "width" | "height">,
  map: Pick<WorldMap, "width" | "height">,
): AtlasPoint {
  const safeRectWidth = rect.width > 0 ? rect.width : 1;
  const safeRectHeight = rect.height > 0 ? rect.height : 1;
  return clampAtlasPoint(
    {
      x: ((clientX - rect.left) / safeRectWidth) * map.width,
      y: ((clientY - rect.top) / safeRectHeight) * map.height,
    },
    map,
  );
}

export function buildAtlasMarkerDraft(marker: MapMarker | null): AtlasMarkerDraft {
  return {
    title: marker?.title ?? "",
    description: marker?.description ?? "",
    markerType: marker?.markerType ?? "",
    lorePageId: marker?.lorePageId ?? "",
  };
}

export function buildAtlasMarkerUpdate(draft: AtlasMarkerDraft) {
  return {
    title: draft.title.trim() || "Untitled Marker",
    description: draft.description,
    markerType: draft.markerType.trim() || null,
    lorePageId: draft.lorePageId || null,
  };
}

export function hasUnsavedAtlasMarkerDraft(marker: MapMarker | null | undefined, draft: AtlasMarkerDraft) {
  if (!marker) return false;
  return (
    marker.title !== draft.title ||
    (marker.description ?? "") !== draft.description ||
    (marker.markerType ?? "") !== draft.markerType ||
    (marker.lorePageId ?? "") !== draft.lorePageId
  );
}

export function resolveAtlasMarkerSaveState(hasUnsavedDraft: boolean, saveState: SaveState): SaveState {
  if (saveState === "saving" || saveState === "error") return saveState;
  return hasUnsavedDraft ? "dirty" : saveState;
}
