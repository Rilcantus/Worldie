import { useMemo } from "react";
import type { NavigationResult } from "./navigationResult";

type UseMainContentActionsArgs = {
  setIsSidebarCollapsed: (value: boolean) => void;
  setIsDocListCollapsed: (value: boolean) => void;
  setIsRightPanelCollapsed: (value: boolean) => void;
  canLeaveCurrentView: () => Promise<boolean>;
  openSpecialTab: (kind: "rels" | "timeline" | "atlas") => Promise<NavigationResult>;
  openNewTab: () => Promise<NavigationResult>;
  openWorkbenchTab: () => Promise<NavigationResult>;
  openLoreCreateTab: () => Promise<NavigationResult>;
  openTemplatesTab: () => Promise<NavigationResult>;
  openLoreTypesTab: () => Promise<NavigationResult>;
  handleAddDocument: () => Promise<void>;
  duplicateDocument: () => Promise<unknown>;
  handleRemoveDocument: (docId: string) => Promise<void>;
  saveDocument: () => Promise<void>;
  handleOpenLoreCreate: () => Promise<void>;
  handleRemoveLorePage: (loreId: string) => Promise<void>;
  saveLorePage: () => Promise<void>;
  addRelationship: () => Promise<unknown>;
  addRelationshipWithSeed: (seed?: {
    sourcePageId?: string;
    targetPageId?: string;
    relationType?: string;
    notes?: string;
  }) => Promise<unknown>;
  removeRelationship: (relationshipId: string) => Promise<boolean>;
  saveRelationship: () => Promise<void>;
  addTimelineEvent: () => Promise<unknown>;
  addTimelineEventWithSeed: (seed?: {
    title?: string;
    eventDate?: string;
    eventType?: string;
    track?: string;
    linkedPageId?: string;
    mapMarkerId?: string;
    description?: string;
  }) => Promise<unknown>;
  duplicateTimelineEvent: (eventId: string) => Promise<unknown>;
  removeTimelineEvent: (eventId: string) => Promise<boolean>;
  saveTimelineEvent: () => Promise<void>;
};

type RelationshipSeed = {
  sourcePageId?: string;
  targetPageId?: string;
  relationType?: string;
  notes?: string;
};

type TimelineSeed = {
  title?: string;
  eventDate?: string;
  eventType?: string;
  track?: string;
  linkedPageId?: string;
  mapMarkerId?: string;
  description?: string;
};

export function useMainContentActions({
  setIsSidebarCollapsed,
  setIsDocListCollapsed,
  setIsRightPanelCollapsed,
  canLeaveCurrentView,
  openSpecialTab,
  openNewTab,
  openWorkbenchTab,
  openLoreCreateTab,
  openTemplatesTab,
  openLoreTypesTab,
  handleAddDocument,
  duplicateDocument,
  handleRemoveDocument,
  saveDocument,
  handleOpenLoreCreate,
  handleRemoveLorePage,
  saveLorePage,
  addRelationship,
  addRelationshipWithSeed,
  removeRelationship,
  saveRelationship,
  addTimelineEvent,
  addTimelineEventWithSeed,
  duplicateTimelineEvent,
  removeTimelineEvent,
  saveTimelineEvent,
}: UseMainContentActionsArgs) {
  return useMemo(
    () => ({
      expandSidebar: () => setIsSidebarCollapsed(false),
      collapseSidebar: () => setIsSidebarCollapsed(true),
      expandDocList: () => setIsDocListCollapsed(false),
      collapseDocList: () => setIsDocListCollapsed(true),
      expandRightPanel: () => setIsRightPanelCollapsed(false),
      collapseRightPanel: () => setIsRightPanelCollapsed(true),
      openRelationships: () => openSpecialTab("rels"),
      openTimeline: () => openSpecialTab("timeline"),
      openAtlas: () => openSpecialTab("atlas"),
      openTemplates: () => openTemplatesTab(),
      openLoreTypes: () => openLoreTypesTab(),
      openLoreCreate: () => openLoreCreateTab(),
      addTab: () => openNewTab(),
      openWorkbench: () => openWorkbenchTab(),
      addDocument: () => void handleAddDocument(),
      duplicateDocument: async () => {
        if (!(await canLeaveCurrentView())) return;
        void duplicateDocument();
      },
      removeDocument: (docId: string) => void handleRemoveDocument(docId),
      saveDocument: () => void saveDocument(),
      addLorePage: () => void handleOpenLoreCreate(),
      removeLorePage: (loreId: string) => void handleRemoveLorePage(loreId),
      saveLorePage: () => void saveLorePage(),
      addRelationship: () => void addRelationship(),
      addRelationshipWithSeed: (seed?: RelationshipSeed) => void addRelationshipWithSeed(seed),
      removeRelationship: (relationshipId: string) => void removeRelationship(relationshipId),
      saveRelationship: () => void saveRelationship(),
      addTimelineEvent: () => void addTimelineEvent(),
      addTimelineEventWithSeed: (seed?: TimelineSeed) => void addTimelineEventWithSeed(seed),
      duplicateTimelineEvent: (eventId: string) => void duplicateTimelineEvent(eventId),
      removeTimelineEvent: (eventId: string) => void removeTimelineEvent(eventId),
      saveTimelineEvent: () => void saveTimelineEvent(),
    }),
    [
      addRelationship,
      addRelationshipWithSeed,
      addTimelineEvent,
      addTimelineEventWithSeed,
      canLeaveCurrentView,
      duplicateDocument,
      duplicateTimelineEvent,
      handleAddDocument,
      handleOpenLoreCreate,
      handleRemoveDocument,
      handleRemoveLorePage,
      openLoreCreateTab,
      openLoreTypesTab,
      openNewTab,
      openSpecialTab,
      openTemplatesTab,
      openWorkbenchTab,
      removeRelationship,
      removeTimelineEvent,
      saveDocument,
      saveLorePage,
      saveRelationship,
      saveTimelineEvent,
      setIsDocListCollapsed,
      setIsRightPanelCollapsed,
      setIsSidebarCollapsed,
    ],
  );
}
