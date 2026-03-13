import type { Document, LorePage, Relationship, TimelineEvent } from "../lib/data";
import type { LoreType } from "../lib/loreTypes";
import type { SearchResult } from "./searchState";
import type { TabKind, WorldUI } from "../types/ui";

function countNonEmptyWords(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function splitCommaTokens(value: string) {
  return value
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);
}

type BuildContextPanelModelArgs = {
  activeNav: TabKind;
  activeWorld?: WorldUI;
  projectTitle: string;
  activeLoreTypeId: string | null;
  loreTypesById: Map<string, LoreType>;
  documentTitle: string;
  documentContent: string;
  loreTitle: string;
  loreTags: string;
  loreFields: string;
  lorePagesById: Map<string, LorePage>;
  relationshipsById: Map<string, Relationship>;
  activeRelationshipId: string | null;
  timelineEventsById: Map<string, TimelineEvent>;
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

export function buildContextPanelModel({
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
}: BuildContextPanelModelArgs) {
  const activeWorldName = activeWorld?.name ?? "No world selected";
  const activeRelationship =
    (activeRelationshipId ? relationshipsById.get(activeRelationshipId) : null) ?? null;
  const activeTimelineEvent =
    (activeTimelineEventId ? timelineEventsById.get(activeTimelineEventId) : null) ?? null;
  const activeLoreType = (activeLoreTypeId ? loreTypesById.get(activeLoreTypeId) : null) ?? null;
  const findLorePage = (pageId: string | null | undefined) =>
    (pageId ? lorePagesById.get(pageId) : null) ?? null;
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
      ? countNonEmptyWords(documentContent)
      : activeNav === "lore"
        ? countNonEmptyWords(loreFields)
        : activeNav === "timeline"
          ? countNonEmptyWords(`${timelineTitle} ${timelineDescription}`)
          : activeNav === "rels"
            ? countNonEmptyWords(`${activeRelationship?.relationType ?? ""} ${activeRelationship?.notes ?? ""}`)
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
      ? splitCommaTokens(loreTags).map((label) => ({
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
}
