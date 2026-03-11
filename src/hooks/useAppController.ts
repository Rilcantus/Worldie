import { useEffect, useMemo } from "react";
import { useAppFeedback } from "./useAppFeedback";
import { useContentManager } from "./useContentManager";
import { useContentTabActions } from "./useContentTabActions";
import { useLoreTemplates } from "./useLoreTemplates";
import { useLoreTypes } from "./useLoreTypes";
import { useMainContentActions } from "./useMainContentActions";
import { usePanelLayout } from "./usePanelLayout";
import { useProjectWorlds } from "./useProjectWorlds";
import { useSearch } from "./useSearch";
import { useSidebarActions } from "./useSidebarActions";
import { useStatusBarModel } from "./useStatusBarModel";
import { useTabs } from "./useTabs";
import { useWorkspaceNavigation } from "./useWorkspaceNavigation";
import { useWorldStructures } from "./useWorldStructures";
import { getSeededLoreTypes } from "../lib/loreTypes";
import { setProjectStoreErrorHandler } from "../lib/data";

export function useAppController() {
  const feedback = useAppFeedback();
  const panelLayout = usePanelLayout();
  const seededLoreTypes = useMemo(() => getSeededLoreTypes(), []);
  const projectWorlds = useProjectWorlds({
    confirmAction: feedback.confirmAction,
    showToast: feedback.showToast,
    loreTypes: seededLoreTypes,
  });
  const loreTypes = useLoreTypes(projectWorlds.activeProjectId);
  const loreTemplates = useLoreTemplates(projectWorlds.activeProjectId, loreTypes.loreTypes);

  const content = useContentManager({
    activeProjectId: projectWorlds.activeProjectId,
    activeWorldId: projectWorlds.activeWorldId,
    loreTypes: loreTypes.loreTypes,
    setWorlds: projectWorlds.setWorlds,
    confirmAction: feedback.confirmAction,
    showToast: feedback.showToast,
  });

  const worldStructures = useWorldStructures({
    activeProjectId: projectWorlds.activeProjectId,
    activeWorldId: projectWorlds.activeWorldId,
    allLorePages: content.allLorePages,
    confirmAction: feedback.confirmAction,
    showToast: feedback.showToast,
  });

  const tabs = useTabs({
    activeProjectId: projectWorlds.activeProjectId,
    documents: content.documents,
    allLorePages: content.allLorePages,
    activeDocumentId: content.activeDocumentId,
    activeDocumentTitle: content.documentTitle || content.activeDocument?.title || "",
    activeLoreId: content.activeLoreId,
    activeLoreTitle: content.loreTitle || content.activeLore?.title || "",
    resolveLoreTypeId: content.resolveLoreTypeId,
    onSelectDocument: content.selectDocument,
    onSelectLorePage: (page, loreTypeId) => {
      content.setActiveLoreTypeId(loreTypeId);
      content.selectLorePage(page);
    },
  });

  const search = useSearch({
    documents: content.documents,
    allLorePages: content.allLorePages,
    onOpenDocument: tabs.openDocumentTab,
    onOpenLore: tabs.openLoreTab,
  });

  useEffect(() => {
    setProjectStoreErrorHandler(feedback.showToast);
    return () => setProjectStoreErrorHandler(null);
  }, [feedback.showToast]);

  useEffect(() => {
    if (tabs.activeNav === "editor" || tabs.activeNav === "lore") {
      panelLayout.setIsDocListCollapsed(false);
    }
  }, [panelLayout.setIsDocListCollapsed, tabs.activeNav]);

  useEffect(() => {
    search.setSearchQuery("");
    search.closeQuickOpen();
  }, [projectWorlds.activeProjectId]);

  const hasUnsavedProjectChanges = content.hasUnsavedChanges || worldStructures.hasUnsavedChanges;

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedProjectChanges) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedProjectChanges]);

  const contentTabActions = useContentTabActions({
    activeLore: content.activeLore,
    addDocument: content.addDocument,
    removeDocument: content.removeDocument,
    removeLorePage: content.removeLorePage,
    openDocumentTab: tabs.openDocumentTab,
    openLoreTab: tabs.openLoreTab,
    openLoreCreateTab: tabs.openLoreCreateTab,
    openNewTab: tabs.openNewTab,
    removeTabById: tabs.removeTabById,
  });

  const workspaceNavigation = useWorkspaceNavigation({
    activeWorldId: projectWorlds.activeWorldId,
    activeDocumentId: content.activeDocumentId,
    activeLoreId: content.activeLoreId,
    documents: content.documents,
    lorePages: content.lorePages,
    allLorePages: content.allLorePages,
    resolveLoreTypeId: content.resolveLoreTypeId,
    setActiveWorldId: projectWorlds.setActiveWorldId,
    setActiveLoreTypeId: content.setActiveLoreTypeId,
    openDocumentTab: tabs.openDocumentTab,
    openLoreTab: tabs.openLoreTab,
    openLoreCreateTab: tabs.openLoreCreateTab,
    openNewTab: tabs.openNewTab,
  });

  const sidebarActions = useSidebarActions({
    projectTitle: projectWorlds.projectTitle,
    setProjectDraft: projectWorlds.setProjectDraft,
    setIsEditingProject: projectWorlds.setIsEditingProject,
    removeProject: projectWorlds.removeProject,
    setIsSidebarCollapsed: panelLayout.setIsSidebarCollapsed,
    setEditingWorldId: projectWorlds.setEditingWorldId,
    removeWorld: projectWorlds.removeWorld,
    setActiveWorldId: projectWorlds.setActiveWorldId,
    openSpecialTab: tabs.openSpecialTab,
  });

  const mainContentActions = useMainContentActions({
    setIsSidebarCollapsed: panelLayout.setIsSidebarCollapsed,
    setIsDocListCollapsed: panelLayout.setIsDocListCollapsed,
    setIsRightPanelCollapsed: panelLayout.setIsRightPanelCollapsed,
    openSpecialTab: tabs.openSpecialTab,
    openNewTab: tabs.openNewTab,
    openWorkbenchTab: tabs.openWorkbenchTab,
    openLoreCreateTab: tabs.openLoreCreateTab,
    openTemplatesTab: tabs.openTemplatesTab,
    openLoreTypesTab: tabs.openLoreTypesTab,
    handleAddDocument: contentTabActions.handleAddDocument,
    duplicateDocument: content.duplicateDocument,
    handleRemoveDocument: contentTabActions.handleRemoveDocument,
    saveDocument: content.saveDocument,
    handleOpenLoreCreate: contentTabActions.handleOpenLoreCreate,
    handleRemoveLorePage: contentTabActions.handleRemoveLorePage,
    saveLorePage: content.saveLorePage,
    addRelationship: worldStructures.addRelationship,
    removeRelationship: worldStructures.removeRelationship,
    saveRelationship: worldStructures.saveRelationship,
    addTimelineEvent: worldStructures.addTimelineEvent,
    removeTimelineEvent: worldStructures.removeTimelineEvent,
    saveTimelineEvent: worldStructures.saveTimelineEvent,
  });

  const statusBarModel = useStatusBarModel({
    activeNav: tabs.activeNav,
    projectTitle: projectWorlds.projectTitle,
    activeWorld: projectWorlds.activeWorld,
    documentTitle: content.documentTitle,
    loreTitle: content.loreTitle,
    saveState:
      tabs.activeNav === "editor"
        ? content.documentSaveState
        : tabs.activeNav === "lore"
          ? content.loreSaveState
          : tabs.activeNav === "rels"
            ? worldStructures.relationshipSaveState
            : tabs.activeNav === "timeline"
              ? worldStructures.timelineSaveState
              : "saved",
  });

  const confirmProjectSwitch = async () => {
    if (!hasUnsavedProjectChanges) return true;
    return feedback.confirmAction("You have unsaved changes in the current view. Continue anyway?");
  };

  const projectFileActions = {
    addProject: async () => {
      if (!(await confirmProjectSwitch())) return;
      if (await projectWorlds.addProject()) {
        tabs.resetTabs();
      }
    },
    openProject: async () => {
      if (!(await confirmProjectSwitch())) return;
      if (await projectWorlds.openProject()) {
        tabs.resetTabs();
      }
    },
    openRecentProject: async (projectId: string) => {
      if (!(await confirmProjectSwitch())) return;
      if (await projectWorlds.openRecentProject(projectId)) {
        tabs.resetTabs();
      }
    },
    saveCurrentProjectAs: async () => {
      if (!(await confirmProjectSwitch())) return;
      if (await projectWorlds.saveCurrentProjectAs()) {
        tabs.resetTabs();
      }
    },
  };

  return {
    feedback,
    panelLayout,
    projectWorlds,
    projectFileActions,
    content,
    loreTypes,
    loreTemplates,
    worldStructures,
    tabs,
    search,
    contentTabActions,
    workspaceNavigation,
    sidebarActions,
    mainContentActions,
    statusBarModel,
  };
}
