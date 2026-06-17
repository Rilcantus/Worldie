import { useCallback, useMemo, useRef, useState } from "react";
import { ActivityBar } from "./components/ActivityBar";
import { Sidebar } from "./components/Sidebar";
import { MainContent } from "./components/MainContent";
import { AppStatusBar } from "./components/AppStatusBar";
import { AppOverlays } from "./components/AppOverlays";
import { StartScreen } from "./components/StartScreen";
import { useAppController } from "./hooks/useAppController";
import type { LoreTableCsvImportDraft, LoreTableCsvUpdateDraft } from "./lib/loreTable";

export default function App() {
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [hasPendingEditorDraft, setHasPendingEditorDraft] = useState(false);

  const {
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
  } = useAppController({ hasPendingEditorDraft });

  const loreItemsInUse = useMemo(
    () => {
      const counts = Object.fromEntries(loreTypes.loreTypes.map((type) => [type.id, 0]));
      for (const page of content.allLorePages) {
        const loreTypeId = content.resolveLoreTypeId(page);
        if (!loreTypeId || !(loreTypeId in counts)) continue;
        counts[loreTypeId] += 1;
      }
      return counts;
    },
    [content.allLorePages, content.resolveLoreTypeId, loreTypes.loreTypes],
  );

  const templatesInUse = useMemo(
    () => {
      const counts = Object.fromEntries(loreTypes.loreTypes.map((type) => [type.id, 0]));
      for (const template of loreTemplates.templates) {
        if (!(template.loreTypeId in counts)) continue;
        counts[template.loreTypeId] += 1;
      }
      return counts;
    },
    [loreTemplates.templates, loreTypes.loreTypes],
  );
  const loreTemplatesById = useMemo(
    () => new Map(loreTemplates.templates.map((template) => [template.id, template])),
    [loreTemplates.templates],
  );

  const handleOpenRelationshipsTab = useCallback(() => {
    tabs.openSpecialTab("rels");
  }, [tabs.openSpecialTab]);

  const handleOpenTimelineTab = useCallback(() => {
    tabs.openSpecialTab("timeline");
  }, [tabs.openSpecialTab]);

  const quickOpenState = useMemo(
    () => ({
      isOpen: search.isQuickOpenOpen,
      query: search.searchQuery,
      results: search.quickOpenResults,
      activeIndex: search.activeQuickOpenIndex,
    }),
    [search.activeQuickOpenIndex, search.isQuickOpenOpen, search.quickOpenResults, search.searchQuery],
  );

  const handleQuickOpenMove = useCallback(
    (direction: 1 | -1) => {
      const total = search.quickOpenResults.length;
      if (total === 0) return;
      search.setActiveQuickOpenIndex((current) => {
        const next = current + direction;
        if (next < 0) return total - 1;
        if (next >= total) return 0;
        return next;
      });
    },
    [search.quickOpenResults.length, search.setActiveQuickOpenIndex],
  );

  const handleCreateLoreItem = useCallback(
    ({ title, loreTypeId, templateId, tags }: { title: string; loreTypeId: string; templateId: string | null; tags: string }) => {
      const template = templateId ? loreTemplatesById.get(templateId) ?? null : null;
      return (async () => {
        const hasUnsavedChanges =
          hasPendingEditorDraft || content.hasUnsavedChanges || worldStructures.hasUnsavedChanges;
        if (hasUnsavedChanges) {
          const canContinue = await feedback.confirmAction("You have unsaved changes in the current view. Continue anyway?", {
            confirmLabel: "Continue",
            tone: "default",
          });
          if (!canContinue) return null;
        }
        const created = await content.createLoreItem({ title, loreTypeId, template, tags });
        if (created) {
          tabs.openLoreTab(created);
        }
        return created;
      })();
    },
    [
      content.createLoreItem,
      content.hasUnsavedChanges,
      feedback.confirmAction,
      hasPendingEditorDraft,
      loreTemplatesById,
      tabs.openLoreTab,
      worldStructures.hasUnsavedChanges,
    ],
  );

  const handleImportLoreTableCsv = useCallback(
    ({ loreTypeId, drafts }: { loreTypeId: string; drafts: LoreTableCsvImportDraft[] }) => {
      return (async () => {
        const hasUnsavedChanges =
          hasPendingEditorDraft || content.hasUnsavedChanges || worldStructures.hasUnsavedChanges;
        if (hasUnsavedChanges) {
          const canContinue = await feedback.confirmAction("You have unsaved changes in the current view. Continue anyway?", {
            confirmLabel: "Continue",
            tone: "default",
          });
          if (!canContinue) return null;
        }
        return content.importLoreItemsFromCsv({ loreTypeId, drafts });
      })();
    },
    [
      content.hasUnsavedChanges,
      content.importLoreItemsFromCsv,
      feedback.confirmAction,
      hasPendingEditorDraft,
      worldStructures.hasUnsavedChanges,
    ],
  );

  const handleUpdateLoreTableCsv = useCallback(
    ({ loreTypeId, drafts }: { loreTypeId: string; drafts: LoreTableCsvUpdateDraft[] }) => {
      return (async () => {
        const hasUnsavedChanges =
          hasPendingEditorDraft || content.hasUnsavedChanges || worldStructures.hasUnsavedChanges;
        if (hasUnsavedChanges) {
          const canContinue = await feedback.confirmAction("You have unsaved changes in the current view. Continue anyway?", {
            confirmLabel: "Continue",
            tone: "default",
          });
          if (!canContinue) return null;
        }
        return content.updateLoreItemsFromCsv({ loreTypeId, drafts });
      })();
    },
    [
      content.hasUnsavedChanges,
      content.updateLoreItemsFromCsv,
      feedback.confirmAction,
      hasPendingEditorDraft,
      worldStructures.hasUnsavedChanges,
    ],
  );

  const handleCreateTemplate = useCallback(() => {
    loreTemplates.createTemplate();
  }, [loreTemplates.createTemplate]);

  const handleCreateLoreType = useCallback(() => {
    loreTypes.createLoreType();
  }, [loreTypes.createLoreType]);

  const handleStartDocListResize = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      panelLayout.startResize("doclist", event.clientX);
    },
    [panelLayout.startResize],
  );

  const handleStartSidebarResize = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      panelLayout.startResize("sidebar", event.clientX);
    },
    [panelLayout.startResize],
  );

  const handleStartRightPanelResize = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      panelLayout.startResize("right", event.clientX);
    },
    [panelLayout.startResize],
  );

  const handleDeleteLoreType = useCallback(
    (loreTypeId: string) => {
      if ((loreItemsInUse[loreTypeId] ?? 0) > 0 || (templatesInUse[loreTypeId] ?? 0) > 0) return;
      void feedback.confirmAction("Delete this lore type?").then((confirmed) => {
        if (confirmed) loreTypes.deleteLoreType(loreTypeId);
      });
    },
    [feedback.confirmAction, loreItemsInUse, loreTypes.deleteLoreType, templatesInUse],
  );

  const handleReassignAndDeleteLoreType = useCallback(
    (loreTypeId: string, replacementLoreTypeId: string) => {
      void feedback
        .confirmAction("Reassign this lore type's items and templates, then delete it?")
        .then((confirmed) => {
          if (!confirmed) return;
          loreTemplates.reassignLoreTypeInTemplates(loreTypeId, replacementLoreTypeId);
          void content.reassignLoreType(loreTypeId, replacementLoreTypeId).then(() => {
            loreTypes.deleteLoreType(loreTypeId);
          });
        });
    },
    [
      content.reassignLoreType,
      feedback.confirmAction,
      loreTemplates.reassignLoreTypeInTemplates,
      loreTypes.deleteLoreType,
    ],
  );

  return (
    <div className="window">
      <div className="noise-overlay"></div>

      <div className="app-body">
        <ActivityBar
          activeNav={tabs.activeNav}
          activeLoreExists={Boolean(content.activeLore)}
          hasActiveProject={Boolean(projectWorlds.activeProjectId)}
          onOpenWorkbench={tabs.openWorkbenchTab}
          onOpenLore={contentTabActions.openLoreEntryPoint}
          onOpenTemplates={tabs.openTemplatesTab}
          onOpenLoreTypes={tabs.openLoreTypesTab}
          onOpenRelationships={handleOpenRelationshipsTab}
          onOpenTimeline={handleOpenTimelineTab}
          onFocusSearch={search.openQuickOpen}
        />

        <Sidebar
          isCollapsed={panelLayout.isSidebarCollapsed}
          width={panelLayout.sidebarWidth}
          isEditingProject={projectWorlds.isEditingProject}
          projectDraft={projectWorlds.projectDraft}
          projectTitle={projectWorlds.projectTitle}
          activeProject={projectWorlds.activeProject}
          activeProjectId={projectWorlds.activeProjectId}
          searchQuery={search.searchQuery}
          searchInputRef={searchInputRef}
          worlds={projectWorlds.worlds}
          editingWorldId={projectWorlds.editingWorldId}
          worldDraft={projectWorlds.worldDraft}
          activeWorldId={projectWorlds.activeWorldId}
          activeNav={tabs.activeNav}
          activeLoreCategory={content.activeLoreTypeId ?? ""}
          recentProjects={projectWorlds.recentProjects}
          isProjectBusy={projectWorlds.isProjectActionPending}
          projectStatusMessage={projectWorlds.projectActionState.message}
          onProjectDraftChange={projectWorlds.setProjectDraft}
          onCommitProjectTitle={projectWorlds.commitProjectTitle}
          onCancelProjectEdit={sidebarActions.cancelProjectEdit}
          onStartProjectEdit={sidebarActions.startProjectEdit}
          onAddProject={projectFileActions.addProject}
          onOpenProject={projectFileActions.openProject}
          onSaveProjectAs={projectFileActions.saveCurrentProjectAs}
          onAddDemoProject={projectFileActions.addDemoProject}
          onRemoveProject={projectFileActions.removeProject}
          onCollapse={sidebarActions.collapseSidebar}
          onOpenRecentProject={projectFileActions.openRecentProject}
          onSearchQueryChange={search.setSearchQuery}
          onAddWorld={sidebarActions.addWorld}
          onToggleWorld={projectWorlds.toggleWorld}
          onWorldDraftChange={projectWorlds.setWorldDraft}
          onCommitWorldTitle={projectWorlds.commitWorldTitle}
          onCancelWorldEdit={sidebarActions.cancelWorldEdit}
          onStartWorldEdit={projectWorlds.startWorldEdit}
          onRemoveWorld={sidebarActions.removeWorld}
          onOpenEditor={workspaceNavigation.openEditorForWorld}
          onOpenLoreRoot={workspaceNavigation.openLoreRootForWorld}
          onOpenLoreCategory={workspaceNavigation.openLoreCategoryForWorld}
          onOpenRelationships={sidebarActions.openRelationshipsForWorld}
          onOpenTimeline={sidebarActions.openTimelineForWorld}
        />

        {!panelLayout.isSidebarCollapsed ? (
          <div
            className="resizer resizer-vertical"
            onMouseDown={handleStartSidebarResize}
          />
        ) : null}

        {projectWorlds.activeProjectId ? (
        <MainContent
          tabs={tabs.displayTabs}
          activeTabId={tabs.activeTabId}
          activeNav={tabs.activeNav}
          isSidebarCollapsed={panelLayout.isSidebarCollapsed}
          isDocListCollapsed={panelLayout.isDocListCollapsed}
          isRightPanelCollapsed={panelLayout.isRightPanelCollapsed}
          docListWidth={panelLayout.docListWidth}
          rightPanelWidth={panelLayout.rightPanelWidth}
          projectTitle={projectWorlds.projectTitle}
          activeWorld={projectWorlds.activeWorld}
          worlds={projectWorlds.worlds}
          documents={content.documents}
          allLorePages={content.allLorePages}
          templates={loreTemplates.templates}
          loreTypes={loreTypes.loreTypes}
          selectedTemplateId={loreTemplates.selectedTemplateId}
          selectedLoreTypeId={loreTypes.selectedLoreTypeId}
          activeDocumentId={content.activeDocumentId}
          documentTitle={content.documentTitle}
          documentContent={content.documentContent}
          documentFolderPath={content.documentFolderPath}
          documentSaveState={content.documentSaveState}
          documentSaveTimestamp={content.documentLastSavedAt}
          lorePages={content.lorePages}
          activeLoreId={content.activeLoreId}
          activeLoreTypeId={content.activeLoreTypeId}
          loreTitle={content.loreTitle}
          loreTags={content.loreTags}
          loreFields={content.loreFields}
          lorePageTypeId={content.lorePageTypeId}
          loreTableViews={content.loreTableViews}
          relationships={worldStructures.relationships}
          activeRelationshipId={worldStructures.activeRelationshipId}
          relationshipSourceId={worldStructures.relationshipSourceId}
          relationshipTargetId={worldStructures.relationshipTargetId}
          relationshipType={worldStructures.relationshipType}
          relationshipNotes={worldStructures.relationshipNotes}
          timelineEvents={worldStructures.timelineEvents}
          activeTimelineEventId={worldStructures.activeTimelineEventId}
          timelineTitle={worldStructures.timelineTitle}
          timelineDate={worldStructures.timelineDate}
          timelineType={worldStructures.timelineType}
          timelineLinkedPageId={worldStructures.timelineLinkedPageId}
          timelineDescription={worldStructures.timelineDescription}
          totalWordCount={content.totalWordCount}
          recentDocuments={content.recentDocuments}
          recentLorePages={content.recentLorePages}
          searchQuery={search.searchQuery}
          searchResults={search.searchResults}
          loreItemsInUse={loreItemsInUse}
          templatesInUse={templatesInUse}
          onSelectTab={tabs.handleTabSelect}
          onCloseTab={tabs.handleTabClose}
          onAddTab={mainContentActions.addTab}
          onExpandSidebar={mainContentActions.expandSidebar}
          onCollapseSidebar={mainContentActions.collapseSidebar}
          onExpandDocList={mainContentActions.expandDocList}
          onCollapseDocList={mainContentActions.collapseDocList}
          onExpandRightPanel={mainContentActions.expandRightPanel}
          onCollapseRightPanel={mainContentActions.collapseRightPanel}
          onOpenWorkbench={mainContentActions.openWorkbench}
          onOpenDocument={tabs.openDocumentTab}
          onOpenLore={tabs.openLoreTab}
          onOpenLoreCreate={mainContentActions.openLoreCreate}
          onOpenTemplates={mainContentActions.openTemplates}
          onOpenLoreTypes={mainContentActions.openLoreTypes}
          onOpenRelationships={mainContentActions.openRelationships}
          onOpenTimeline={mainContentActions.openTimeline}
          onAddDocument={mainContentActions.addDocument}
          onExportWorldMarkdown={exportActions.exportActiveWorldMarkdown}
          onExportProjectMarkdown={exportActions.exportProjectMarkdown}
          onDuplicateDocument={mainContentActions.duplicateDocument}
          onRemoveDocument={mainContentActions.removeDocument}
          onSaveDocument={mainContentActions.saveDocument}
          onDocumentTitleChange={content.setDocumentTitle}
          onDocumentContentChange={content.setDocumentContent}
          onDocumentFolderPathChange={content.setDocumentFolderPath}
          onAddLorePage={mainContentActions.addLorePage}
          onRemoveLorePage={mainContentActions.removeLorePage}
          onSaveLoreTableView={content.saveLoreTableView}
          onUpdateLoreTableView={content.reviseLoreTableView}
          onDeleteLoreTableView={content.removeLoreTableView}
          onUpdateLoreTableCustomField={content.updateLoreTableCustomField}
          onCreateLoreFromTable={handleCreateLoreItem}
          onExportLoreTableCsv={exportActions.exportLoreTableCsv}
          onImportLoreTableCsv={handleImportLoreTableCsv}
          onUpdateLoreTableCsv={handleUpdateLoreTableCsv}
          onSaveLorePage={mainContentActions.saveLorePage}
          onLoreTitleChange={content.setLoreTitle}
          onLoreTagsChange={content.setLoreTags}
          onLoreFieldsChange={content.setLoreFields}
          onLorePageTypeChange={content.setLorePageTypeId}
          onCreateLoreItem={handleCreateLoreItem}
          onSelectTemplate={loreTemplates.setSelectedTemplateId}
          onCreateTemplate={handleCreateTemplate}
          onUpdateTemplate={loreTemplates.updateTemplate}
          onDeleteTemplate={loreTemplates.deleteTemplate}
          onAddTraitDefinition={loreTemplates.addTraitDefinition}
          onUpdateTraitDefinition={loreTemplates.updateTraitDefinition}
          onDeleteTraitDefinition={loreTemplates.deleteTraitDefinition}
          onMoveTraitDefinition={loreTemplates.moveTraitDefinition}
          onSelectLoreType={loreTypes.setSelectedLoreTypeId}
          onCreateLoreType={handleCreateLoreType}
          onUpdateLoreType={loreTypes.updateLoreType}
          onDeleteLoreType={handleDeleteLoreType}
          onReassignAndDeleteLoreType={handleReassignAndDeleteLoreType}
          onMoveLoreType={loreTypes.moveLoreType}
          onSelectRelationship={worldStructures.selectRelationship}
          onAddRelationship={mainContentActions.addRelationship}
          onAddRelationshipWithSeed={mainContentActions.addRelationshipWithSeed}
          onRemoveRelationship={mainContentActions.removeRelationship}
          onSaveRelationship={mainContentActions.saveRelationship}
          onRelationshipSourceChange={worldStructures.setRelationshipSourceId}
          onRelationshipTargetChange={worldStructures.setRelationshipTargetId}
          onRelationshipTypeChange={worldStructures.setRelationshipType}
          onRelationshipNotesChange={worldStructures.setRelationshipNotes}
          onSelectTimelineEvent={worldStructures.selectTimelineEvent}
          onAddTimelineEvent={mainContentActions.addTimelineEvent}
          onAddTimelineEventWithSeed={mainContentActions.addTimelineEventWithSeed}
          onDuplicateTimelineEvent={mainContentActions.duplicateTimelineEvent}
          onRemoveTimelineEvent={mainContentActions.removeTimelineEvent}
          onSaveTimelineEvent={mainContentActions.saveTimelineEvent}
          onTimelineTitleChange={worldStructures.setTimelineTitle}
          onTimelineDateChange={worldStructures.setTimelineDate}
          onTimelineTypeChange={worldStructures.setTimelineType}
          onTimelineLinkedPageChange={worldStructures.setTimelineLinkedPageId}
          onTimelineDescriptionChange={worldStructures.setTimelineDescription}
          onSelectSearchResult={search.selectSearchResult}
          onStartDocListResize={handleStartDocListResize}
          onStartRightPanelResize={handleStartRightPanelResize}
          onPendingEditorDraftChange={setHasPendingEditorDraft}
        />
        ) : (
          <div className="main-content">
            <StartScreen
              recentProjects={projectWorlds.recentProjects}
              isBusy={projectWorlds.isProjectActionPending}
              statusMessage={projectWorlds.projectActionState.message}
              onNewProject={projectFileActions.addProject}
              onOpenProject={projectFileActions.openProject}
              onOpenDemoProject={projectFileActions.addDemoProject}
              onOpenRecentProject={projectFileActions.openRecentProject}
            />
          </div>
        )}
      </div>

      <AppStatusBar
        projectTitle={statusBarModel.projectTitle}
        worldName={statusBarModel.worldName}
        sectionLabel={statusBarModel.sectionLabel}
        detailLabel={statusBarModel.detailLabel}
        projectFileLabel={projectWorlds.activeProject?.filepath ?? ""}
        saveState={statusBarModel.saveState}
        saveTimestamp={statusBarModel.saveTimestamp}
      />

      <AppOverlays
        confirmState={feedback.confirmState}
        toast={feedback.toast}
        quickOpenState={quickOpenState}
        onResolveConfirm={feedback.resolveConfirm}
        onClearToast={feedback.clearToast}
        onQuickOpenQueryChange={search.setSearchQuery}
        onQuickOpenClose={search.closeQuickOpen}
        onQuickOpenMove={handleQuickOpenMove}
        onQuickOpenHover={search.setActiveQuickOpenIndex}
        onQuickOpenSelect={search.selectSearchResult}
      />
    </div>
  );
}
