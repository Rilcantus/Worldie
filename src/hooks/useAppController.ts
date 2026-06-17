import { useCallback, useEffect, useMemo, useRef } from "react";
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
import { getDirtyNavigationDecision, resolveEditorSaveState, shouldContinueAfterGuard } from "./dirtyState";
import { getSeededLoreTypes } from "../lib/loreTypes";
import { exportWorldMarkdown, pickExportFolder, setProjectStoreErrorHandler } from "../lib/data";

type UseAppControllerArgs = {
  hasPendingEditorDraft?: boolean;
};

export function useAppController({ hasPendingEditorDraft = false }: UseAppControllerArgs = {}) {
  const feedback = useAppFeedback();
  const panelLayout = usePanelLayout();
  const seededLoreTypes = useMemo(() => getSeededLoreTypes(), []);
  const projectWorlds = useProjectWorlds({
    confirmAction: feedback.confirmAction,
    showToast: feedback.showToast,
    initialLoreTypes: seededLoreTypes,
  });
  const loreTypes = useLoreTypes(projectWorlds.activeProjectId, projectWorlds.recoverActiveProjectError);
  const loreTemplates = useLoreTemplates(
    projectWorlds.activeProjectId,
    loreTypes.loreTypes,
    projectWorlds.recoverActiveProjectError,
  );

  const content = useContentManager({
    activeProjectId: projectWorlds.activeProjectId,
    activeWorldId: projectWorlds.activeWorldId,
    loreTypes: loreTypes.loreTypes,
    setWorlds: projectWorlds.setWorlds,
    recoverActiveProjectError: projectWorlds.recoverActiveProjectError,
    confirmAction: feedback.confirmAction,
    showToast: feedback.showToast,
  });

  const worldStructures = useWorldStructures({
    activeProjectId: projectWorlds.activeProjectId,
    activeWorldId: projectWorlds.activeWorldId,
    allLorePages: content.allLorePages,
    recoverActiveProjectError: projectWorlds.recoverActiveProjectError,
    confirmAction: feedback.confirmAction,
    showToast: feedback.showToast,
  });

  const worldIds = useMemo(
    () => projectWorlds.worlds.map((world) => world.id),
    [projectWorlds.worlds],
  );

  const handleSelectLorePage = useCallback(
    (page: Parameters<typeof content.selectLorePage>[0], loreTypeId: string | null) => {
      content.setActiveLoreTypeId(loreTypeId);
      content.selectLorePage(page);
    },
    [content.selectLorePage, content.setActiveLoreTypeId],
  );

  const hasUnsavedProjectChanges =
    hasPendingEditorDraft || content.hasUnsavedChanges || worldStructures.hasUnsavedChanges;
  const activeProjectIdRef = useRef(projectWorlds.activeProjectId);

  useEffect(() => {
    activeProjectIdRef.current = projectWorlds.activeProjectId;
  }, [projectWorlds.activeProjectId]);

  const canLeaveCurrentView = useCallback(async () => {
    const decision = getDirtyNavigationDecision(hasUnsavedProjectChanges);
    if (decision.allowedWithoutConfirmation) return true;
    return feedback.confirmAction("You have unsaved changes in the current view. Continue anyway?", {
      confirmLabel: "Continue",
      tone: "default",
    });
  }, [feedback.confirmAction, hasUnsavedProjectChanges]);

  const tabs = useTabs({
    activeProjectId: projectWorlds.activeProjectId,
    activeWorldId: projectWorlds.activeWorldId,
    worldIds,
    documents: content.documents,
    allLorePages: content.allLorePages,
    activeDocumentId: content.activeDocumentId,
    activeDocumentTitle: content.documentTitle || content.activeDocument?.title || "",
    activeLoreId: content.activeLoreId,
    activeLoreTitle: content.loreTitle || content.activeLore?.title || "",
    resolveLoreTypeId: content.resolveLoreTypeId,
    setActiveWorldId: projectWorlds.setActiveWorldId,
    onSelectDocument: content.selectDocument,
    onSelectLorePage: handleSelectLorePage,
    canLeaveCurrentView,
  });

  const search = useSearch({
    enabled: Boolean(projectWorlds.activeProjectId),
    documents: content.documents,
    allLorePages: content.allLorePages,
    onOpenDocument: tabs.openDocumentTab,
    onOpenLore: tabs.openLoreTab,
    canLeaveCurrentView,
  });

  useEffect(() => {
    setProjectStoreErrorHandler(feedback.showToast);
    return () => setProjectStoreErrorHandler(null);
  }, [feedback.showToast]);

  useEffect(() => {
    if (loreTypes.loreTypes.length === 0) return;
    projectWorlds.syncLoreTypes(loreTypes.loreTypes);
  }, [loreTypes.loreTypes, projectWorlds.syncLoreTypes]);

  useEffect(() => {
    if (tabs.activeNav === "editor" || tabs.activeNav === "lore") {
      panelLayout.setIsDocListCollapsed((current) => (current ? false : current));
    }
  }, [panelLayout.setIsDocListCollapsed, tabs.activeNav]);

  useEffect(() => {
    search.setSearchQuery((current) => (current ? "" : current));
    search.closeQuickOpen();
  }, [projectWorlds.activeProjectId]);

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
    canLeaveCurrentView,
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
    documentsLoadedWorldId: content.documentsLoadedWorldId,
    loreLoadedWorldId: content.loreLoadedWorldId,
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
    canLeaveCurrentView,
  });

  const sidebarActions = useSidebarActions({
    projectTitle: projectWorlds.projectTitle,
    setProjectDraft: projectWorlds.setProjectDraft,
    setIsEditingProject: projectWorlds.setIsEditingProject,
    removeProject: projectWorlds.removeProject,
    setIsSidebarCollapsed: panelLayout.setIsSidebarCollapsed,
    setEditingWorldId: projectWorlds.setEditingWorldId,
    addWorld: projectWorlds.addWorld,
    removeWorld: projectWorlds.removeWorld,
    activeWorldId: projectWorlds.activeWorldId,
    canLeaveCurrentView,
    openSpecialTab: tabs.openSpecialTab,
  });

  const mainContentActions = useMainContentActions({
    setIsSidebarCollapsed: panelLayout.setIsSidebarCollapsed,
    setIsDocListCollapsed: panelLayout.setIsDocListCollapsed,
    setIsRightPanelCollapsed: panelLayout.setIsRightPanelCollapsed,
    canLeaveCurrentView,
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
    addRelationshipWithSeed: worldStructures.addRelationshipWithSeed,
    removeRelationship: worldStructures.removeRelationship,
    saveRelationship: worldStructures.saveRelationship,
    addTimelineEvent: worldStructures.addTimelineEvent,
    addTimelineEventWithSeed: worldStructures.addTimelineEventWithSeed,
    duplicateTimelineEvent: worldStructures.duplicateTimelineEvent,
    removeTimelineEvent: worldStructures.removeTimelineEvent,
    saveTimelineEvent: worldStructures.saveTimelineEvent,
  });

  const statusBarModel = useStatusBarModel({
    hasActiveProject: Boolean(projectWorlds.activeProjectId),
    activeNav: tabs.activeNav,
    projectTitle: projectWorlds.projectTitle,
    activeWorld: projectWorlds.activeWorld,
    documentTitle: content.documentTitle,
    loreTitle: content.loreTitle,
    saveState:
      tabs.activeNav === "editor"
        ? resolveEditorSaveState(hasPendingEditorDraft, content.documentSaveState)
        : tabs.activeNav === "lore"
          ? content.loreSaveState
          : tabs.activeNav === "rels"
            ? worldStructures.relationshipSaveState
            : tabs.activeNav === "timeline"
              ? worldStructures.timelineSaveState
              : "saved",
    saveTimestamp:
      tabs.activeNav === "editor"
        ? content.documentLastSavedAt
        : tabs.activeNav === "lore"
          ? content.loreLastSavedAt
          : tabs.activeNav === "rels"
            ? worldStructures.relationshipLastSavedAt
            : tabs.activeNav === "timeline"
              ? worldStructures.timelineLastSavedAt
              : null,
  });

  const projectFileActions = useMemo(
    () => ({
      addProject: async () => {
        const startingProjectId = projectWorlds.activeProjectId;
        if (!(await canLeaveCurrentView())) return;
        if (!shouldContinueAfterGuard(startingProjectId, activeProjectIdRef.current)) return;
        await projectWorlds.addProject();
      },
      openProject: async () => {
        const startingProjectId = projectWorlds.activeProjectId;
        if (!(await canLeaveCurrentView())) return;
        if (!shouldContinueAfterGuard(startingProjectId, activeProjectIdRef.current)) return;
        await projectWorlds.openProject();
      },
      openRecentProject: async (projectId: string) => {
        const startingProjectId = projectWorlds.activeProjectId;
        if (!(await canLeaveCurrentView())) return;
        if (!shouldContinueAfterGuard(startingProjectId, activeProjectIdRef.current)) return;
        await projectWorlds.openRecentProject(projectId);
      },
      saveCurrentProjectAs: async () => {
        const startingProjectId = projectWorlds.activeProjectId;
        if (!(await canLeaveCurrentView())) return;
        if (!shouldContinueAfterGuard(startingProjectId, activeProjectIdRef.current)) return;
        await projectWorlds.saveCurrentProjectAs();
      },
      addDemoProject: async () => {
        const startingProjectId = projectWorlds.activeProjectId;
        if (!(await canLeaveCurrentView())) return;
        if (!shouldContinueAfterGuard(startingProjectId, activeProjectIdRef.current)) return;
        await projectWorlds.addDemoProject();
      },
      removeProject: async () => {
        const startingProjectId = projectWorlds.activeProjectId;
        if (!(await canLeaveCurrentView())) return;
        if (!shouldContinueAfterGuard(startingProjectId, activeProjectIdRef.current)) return;
        await projectWorlds.removeProject();
      },
    }),
    [
      canLeaveCurrentView,
      projectWorlds.activeProjectId,
      projectWorlds.addProject,
      projectWorlds.openProject,
      projectWorlds.openRecentProject,
      projectWorlds.saveCurrentProjectAs,
      projectWorlds.addDemoProject,
      projectWorlds.removeProject,
    ],
  );

  const exportActions = useMemo(
    () => ({
      exportActiveWorldMarkdown: async () => {
        if (!projectWorlds.activeProjectId || !projectWorlds.activeWorldId) {
          feedback.showToast("Choose a world before exporting.");
          return;
        }
        const startingProjectId = projectWorlds.activeProjectId;
        if (!(await canLeaveCurrentView())) return;
        if (!shouldContinueAfterGuard(startingProjectId, activeProjectIdRef.current)) return;
        const exportRoot = await pickExportFolder();
        if (!exportRoot) return;
        try {
          const result = await exportWorldMarkdown(
            projectWorlds.activeProjectId,
            projectWorlds.activeWorldId,
            exportRoot,
          );
          feedback.showToast(
            `Exported ${result.documentCount} documents, ${result.lorePageCount} lore pages, ${result.relationshipCount} relationships, and ${result.timelineEventCount} timeline events to ${result.exportPath}.`,
          );
        } catch (error) {
          await projectWorlds.recoverActiveProjectError(error, "Worldie could not export this world.");
        }
      },
    }),
    [
      canLeaveCurrentView,
      feedback.showToast,
      projectWorlds.activeProjectId,
      projectWorlds.activeWorldId,
      projectWorlds.recoverActiveProjectError,
    ],
  );

  return useMemo(
    () => ({
      feedback,
      panelLayout,
      projectWorlds,
      projectFileActions,
      exportActions,
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
    }),
    [
      feedback,
      panelLayout,
      projectWorlds,
      projectFileActions,
      exportActions,
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
    ],
  );
}
