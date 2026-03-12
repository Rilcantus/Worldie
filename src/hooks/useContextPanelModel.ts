import { useMemo } from "react";
import type { Document, LorePage, Relationship, TimelineEvent } from "../lib/data";
import type { LoreType } from "../lib/loreTypes";
import type { SearchResult } from "./useSearch";
import type { TabKind, WorldUI } from "../types/ui";

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

  return useMemo(() => {
    const activeRelationship =
      relationships.find((relationship) => relationship.id === activeRelationshipId) ?? null;
    const activeTimelineEvent =
      timelineEvents.find((event) => event.id === activeTimelineEventId) ?? null;

    const activeLoreType = loreTypes.find((type) => type.id === activeLoreTypeId) ?? null;
    const findLorePage = (pageId: string | null | undefined) =>
      allLorePages.find((page) => page.id === pageId) ?? null;
    const findLoreTitle = (pageId: string | null | undefined) =>
      findLorePage(pageId)?.title ?? "Unknown";

    const activePageTitle =
      activeNav === "workbench"
        ? projectTitle
        : activeNav === "editor"
          ? documentTitle || "Untitled"
          : activeNav === "lore"
            ? loreTitle || "Untitled"
            : activeNav === "rels"
              ? activeRelationship
                ? `${findLoreTitle(activeRelationship.sourcePageId)} -> ${findLoreTitle(activeRelationship.targetPageId)}`
                : "Relationships"
              : activeNav === "timeline"
                ? timelineTitle || activeTimelineEvent?.title || "Timeline"
                : activeNav === "templates"
                  ? "Templates"
                  : activeNav === "ltypes"
                    ? "Lore Types"
                    : "Open Page";

    const activePageType =
      activeNav === "workbench"
        ? "Workbench"
        : activeNav === "editor"
          ? "Document"
          : activeNav === "lore"
            ? activeLoreType?.name ?? "Lore"
            : activeNav === "rels"
              ? "Relationship"
              : activeNav === "timeline"
                ? "Timeline Event"
                : activeNav === "templates"
                  ? "Templates"
          : activeNav === "ltypes"
            ? "Lore Types"
            : "Launcher";

    const activeWordCount =
      activeNav === "editor"
        ? documentContent.trim().split(/\s+/).filter(Boolean).length
        : activeNav === "lore"
          ? loreFields.trim().split(/\s+/).filter(Boolean).length
          : activeNav === "timeline"
            ? `${timelineTitle} ${timelineDescription}`.trim().split(/\s+/).filter(Boolean).length
            : activeNav === "rels"
              ? `${activeRelationship?.relationType ?? ""} ${activeRelationship?.notes ?? ""}`
                  .trim()
                  .split(/\s+/)
                  .filter(Boolean).length
              : 0;

    const linkedPages =
      activeNav === "editor"
        ? recentLorePages.slice(0, 4).map((page) => ({
            key: page.id,
            label: page.title,
            meta: page.type,
            kind: "lore" as const,
            page,
            icon: "L",
            style: { background: "rgba(157,125,232,0.15)", color: "var(--accent-bright)" },
          }))
        : activeNav === "lore"
          ? recentDocuments.slice(0, 4).map((doc) => ({
              key: doc.id,
              label: doc.title,
              meta: "Document",
              kind: "document" as const,
              doc,
              icon: "D",
              style: { background: "rgba(91,155,213,0.15)", color: "var(--blue)" },
            }))
          : [];

    const tags =
      activeNav === "lore" && loreTags.trim()
        ? loreTags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
            .map((label) => ({
              key: label,
              label,
              style: {
                background: "rgba(157,125,232,0.12)",
                color: "var(--accent-bright)",
                border: "1px solid rgba(157,125,232,0.25)",
              },
            }))
        : [];

    const summary =
      activeNav === "timeline"
        ? activeTimelineEvent
          ? `${timelineDate || "No date"} - ${timelineDescription || "No description yet."}`
          : "Create a timeline event to see it summarized here."
        : activeNav === "rels"
          ? activeRelationship
            ? `${findLoreTitle(activeRelationship.sourcePageId)} is marked as ${activeRelationship.relationType} with ${findLoreTitle(activeRelationship.targetPageId)}.`
            : "Create a relationship to see it summarized here."
          : activeNav === "templates"
            ? "Templates define the starter traits for new lore items."
          : activeNav === "ltypes"
              ? "Lore types drive sidebar navigation, filtering, and template assignment."
              : activeWorldName !== "No world selected"
                ? `${activeWorldName} is currently active.`
                : "No active world selected.";

    return {
      searchQuery,
      searchResults,
      activePageTitle,
      activePageType,
      activeWordCount,
      projectTotalWordCount: totalWordCount,
      openTabsCount,
      linkedPages,
      tags,
      summary,
      activeWorldName,
    };
  }, [
    activeNav,
    activeWorldName,
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
  ]);
}
