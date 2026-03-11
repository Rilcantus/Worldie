type UseMainContentActionsArgs = {
  setIsSidebarCollapsed: (value: boolean) => void;
  setIsDocListCollapsed: (value: boolean) => void;
  setIsRightPanelCollapsed: (value: boolean) => void;
  openSpecialTab: (kind: "rels" | "timeline") => void;
  openNewTab: () => void;
  openWorkbenchTab: () => void;
  openLoreCreateTab: () => void;
  openTemplatesTab: () => void;
  openLoreTypesTab: () => void;
  handleAddDocument: () => Promise<void>;
  duplicateDocument: () => Promise<unknown>;
  handleRemoveDocument: (docId: string) => Promise<void>;
  saveDocument: () => Promise<void>;
  handleOpenLoreCreate: () => Promise<void>;
  handleRemoveLorePage: (loreId: string) => Promise<void>;
  saveLorePage: () => Promise<void>;
  addRelationship: () => Promise<unknown>;
  removeRelationship: (relationshipId: string) => Promise<boolean>;
  saveRelationship: () => Promise<void>;
  addTimelineEvent: () => Promise<unknown>;
  removeTimelineEvent: (eventId: string) => Promise<boolean>;
  saveTimelineEvent: () => Promise<void>;
};

export function useMainContentActions({
  setIsSidebarCollapsed,
  setIsDocListCollapsed,
  setIsRightPanelCollapsed,
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
  removeRelationship,
  saveRelationship,
  addTimelineEvent,
  removeTimelineEvent,
  saveTimelineEvent,
}: UseMainContentActionsArgs) {
  return {
    expandSidebar: () => setIsSidebarCollapsed(false),
    collapseSidebar: () => setIsSidebarCollapsed(true),
    expandDocList: () => setIsDocListCollapsed(false),
    collapseDocList: () => setIsDocListCollapsed(true),
    expandRightPanel: () => setIsRightPanelCollapsed(false),
    collapseRightPanel: () => setIsRightPanelCollapsed(true),
    openRelationships: () => openSpecialTab("rels"),
    openTimeline: () => openSpecialTab("timeline"),
    openTemplates: () => openTemplatesTab(),
    openLoreTypes: () => openLoreTypesTab(),
    openLoreCreate: () => openLoreCreateTab(),
    addTab: () => openNewTab(),
    openWorkbench: () => openWorkbenchTab(),
    addDocument: () => void handleAddDocument(),
    duplicateDocument: () => void duplicateDocument(),
    removeDocument: (docId: string) => void handleRemoveDocument(docId),
    saveDocument: () => void saveDocument(),
    addLorePage: () => void handleOpenLoreCreate(),
    removeLorePage: (loreId: string) => void handleRemoveLorePage(loreId),
    saveLorePage: () => void saveLorePage(),
    addRelationship: () => void addRelationship(),
    removeRelationship: (relationshipId: string) => void removeRelationship(relationshipId),
    saveRelationship: () => void saveRelationship(),
    addTimelineEvent: () => void addTimelineEvent(),
    removeTimelineEvent: (eventId: string) => void removeTimelineEvent(eventId),
    saveTimelineEvent: () => void saveTimelineEvent(),
  };
}
