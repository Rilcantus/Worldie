import { useMemo } from "react";
import type { Document, LorePage, Relationship, TimelineEvent } from "../lib/data";
import type { LoreType } from "../lib/loreTypes";
import type { SearchResult } from "./useSearch";
import type { TabKind, WorldUI } from "../types/ui";
import { buildContextPanelModel } from "./contextPanelState";

type UseContextPanelModelArgs = {
  activeNav: TabKind;
  activeWorld?: WorldUI;
  projectTitle: string;
  activeLoreTypeId: string | null;
  loreTypes: LoreType[];
  documentTitle: string;
  documentContent: string;
  loreTitle: string;
  loreTags: string;
  loreFields: string;
  allLorePages: LorePage[];
  relationships: Relationship[];
  activeRelationshipId: string | null;
  timelineEvents: TimelineEvent[];
  activeTimelineEventId: string | null;
  timelineTitle: string;
  timelineDate: string;
  timelineDescription: string;
  totalWordCount: number;
  openTabsCount: number;
  searchQuery: string;
  searchResults: SearchResult[];
  recentDocuments: Document[];
  recentLorePages: LorePage[];
};

export function useContextPanelModel({
  activeNav,
  activeWorld,
  projectTitle,
  activeLoreTypeId,
  loreTypes,
  documentTitle,
  documentContent,
  loreTitle,
  loreTags,
  loreFields,
  allLorePages,
  relationships,
  activeRelationshipId,
  timelineEvents,
  activeTimelineEventId,
  timelineTitle,
  timelineDate,
  timelineDescription,
  totalWordCount,
  openTabsCount,
  searchQuery,
  searchResults,
  recentDocuments,
  recentLorePages,
}: UseContextPanelModelArgs) {
  const activeWorldName = activeWorld?.name ?? "No world selected";
  const relationshipsById = useMemo(
    () => new Map(relationships.map((relationship) => [relationship.id, relationship])),
    [relationships],
  );
  const timelineEventsById = useMemo(
    () => new Map(timelineEvents.map((event) => [event.id, event])),
    [timelineEvents],
  );
  const loreTypesById = useMemo(
    () => new Map(loreTypes.map((type) => [type.id, type])),
    [loreTypes],
  );
  const lorePagesById = useMemo(
    () => new Map(allLorePages.map((page) => [page.id, page])),
    [allLorePages],
  );

  return useMemo(() => buildContextPanelModel({
    activeNav,
    activeWorld,
    projectTitle,
    activeLoreTypeId,
    loreTypesById,
    documentTitle,
    documentContent,
    loreTitle,
    loreTags,
    loreFields,
    lorePagesById,
    relationshipsById,
    activeRelationshipId,
    timelineEventsById,
    activeTimelineEventId,
    timelineTitle,
    timelineDate,
    timelineDescription,
    totalWordCount,
    openTabsCount,
    searchQuery,
    searchResults,
    recentDocuments,
    recentLorePages,
  }), [
    activeNav,
    activeWorld,
    projectTitle,
    activeLoreTypeId,
    loreTypesById,
    documentTitle,
    documentContent,
    loreTitle,
    loreTags,
    loreFields,
    lorePagesById,
    relationshipsById,
    activeRelationshipId,
    timelineEventsById,
    activeTimelineEventId,
    timelineTitle,
    timelineDate,
    timelineDescription,
    totalWordCount,
    openTabsCount,
    searchQuery,
    searchResults,
    recentDocuments,
    recentLorePages,
  ]);
}
