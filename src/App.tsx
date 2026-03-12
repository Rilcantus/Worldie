import { useMemo, useRef } from "react";
import { ActivityBar } from "./components/ActivityBar";
import { Sidebar } from "./components/Sidebar";
import { MainContent } from "./components/MainContent";
import { AppStatusBar } from "./components/AppStatusBar";
import { AppOverlays } from "./components/AppOverlays";
import { StartScreen } from "./components/StartScreen";
import { useAppController } from "./hooks/useAppController";

export default function App() {
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const {
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
  } = useAppController();

  const loreItemsInUse = useMemo(
    () =>
      Object.fromEntries(
        loreTypes.loreTypes.map((type) => [
          type.id,
          content.allLorePages.filter((page) => content.resolveLoreTypeId(page) === type.id).length,
        ]),
      ),
    [content, loreTypes.loreTypes],
  );

  const templatesInUse = useMemo(
    () =>
      Object.fromEntries(
        loreTypes.loreTypes.map((type) => [
          type.id,
          loreTemplates.templates.filter((template) => template.loreTypeId === type.id).length,
        ]),
      ),
    [loreTemplates.templates, loreTypes.loreTypes],
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
          onOpenRelationships={() => tabs.openSpecialTab("rels")}
          onOpenTimeline={() => tabs.openSpecialTab("timeline")}
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
          onRemoveProject={sidebarActions.removeProject}
          onCollapse={sidebarActions.collapseSidebar}
          onOpenRecentProject={projectFileActions.openRecentProject}
          onSearchQueryChange={search.setSearchQuery}
          onAddWorld={projectWorlds.addWorld}
          onToggleWorld={projectWorlds.toggleWorld}
          onWorldDraftChange={projectWorlds.setWorldDraft}
          onCommitWorldTitle={projectWorlds.commitWorldTitle}
          onCancelWorldEdit={sidebarActions.cancelWorldEdit}
          onStartWorldEdit={projectWorlds.startWorldEdit}
          onRemoveWorld={projectWorlds.removeWorld}
          onOpenEditor={workspaceNavigation.openEditorForWorld}
          onOpenLoreRoot={workspaceNavigation.openLoreRootForWorld}
          onOpenLoreCategory={workspaceNavigation.openLoreCategoryForWorld}
          onOpenRelationships={sidebarActions.openRelationshipsForWorld}
          onOpenTimeline={sidebarActions.openTimelineForWorld}
        />

        {!panelLayout.isSidebarCollapsed ? (
          <div
            className="resizer resizer-vertical"
            onMouseDown={(event) => {
              panelLayout.startResize("sidebar", event.clientX);
            }}
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
          onDuplicateDocument={mainContentActions.duplicateDocument}
          onRemoveDocument={mainContentActions.removeDocument}
          onSaveDocument={mainContentActions.saveDocument}
          onDocumentTitleChange={content.setDocumentTitle}
          onDocumentContentChange={content.setDocumentContent}
          onDocumentFolderPathChange={content.setDocumentFolderPath}
          onAddLorePage={mainContentActions.addLorePage}
          onRemoveLorePage={mainContentActions.removeLorePage}
          onSaveLorePage={mainContentActions.saveLorePage}
          onLoreTitleChange={content.setLoreTitle}
          onLoreTagsChange={content.setLoreTags}
          onLoreFieldsChange={content.setLoreFields}
          onLorePageTypeChange={content.setLorePageTypeId}
          onCreateLoreItem={({ title, loreTypeId, templateId, tags }) => {
            const template = loreTemplates.templates.find((item) => item.id === templateId) ?? null;
            void content.createLoreItem({ title, loreTypeId, template, tags }).then((created) => {
              if (created) {
                tabs.openLoreTab(created);
              }
            });
          }}
          onSelectTemplate={loreTemplates.setSelectedTemplateId}
          onCreateTemplate={() => loreTemplates.createTemplate()}
          onUpdateTemplate={loreTemplates.updateTemplate}
          onDeleteTemplate={loreTemplates.deleteTemplate}
          onAddTraitDefinition={loreTemplates.addTraitDefinition}
          onUpdateTraitDefinition={loreTemplates.updateTraitDefinition}
          onDeleteTraitDefinition={loreTemplates.deleteTraitDefinition}
          onMoveTraitDefinition={loreTemplates.moveTraitDefinition}
          onSelectLoreType={loreTypes.setSelectedLoreTypeId}
          onCreateLoreType={() => loreTypes.createLoreType()}
          onUpdateLoreType={loreTypes.updateLoreType}
          onDeleteLoreType={(loreTypeId) => {
            if ((loreItemsInUse[loreTypeId] ?? 0) > 0 || (templatesInUse[loreTypeId] ?? 0) > 0) return;
            void feedback.confirmAction("Delete this lore type?").then((confirmed) => {
              if (confirmed) loreTypes.deleteLoreType(loreTypeId);
            });
          }}
          onReassignAndDeleteLoreType={(loreTypeId, replacementLoreTypeId) => {
            void feedback
              .confirmAction("Reassign this lore type's items and templates, then delete it?")
              .then((confirmed) => {
                if (!confirmed) return;
                loreTemplates.reassignLoreTypeInTemplates(loreTypeId, replacementLoreTypeId);
                void content.reassignLoreType(loreTypeId, replacementLoreTypeId).then(() => {
                  loreTypes.deleteLoreType(loreTypeId);
                });
              });
          }}
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
          onStartDocListResize={(event) => {
            panelLayout.startResize("doclist", event.clientX);
          }}
          onStartRightPanelResize={(event) => {
            panelLayout.startResize("right", event.clientX);
          }}
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
        quickOpenState={{
          isOpen: search.isQuickOpenOpen,
          query: search.searchQuery,
          results: search.quickOpenResults,
          activeIndex: search.activeQuickOpenIndex,
        }}
        onResolveConfirm={feedback.resolveConfirm}
        onClearToast={feedback.clearToast}
        onQuickOpenQueryChange={search.setSearchQuery}
        onQuickOpenClose={search.closeQuickOpen}
        onQuickOpenMove={(direction) => {
          const total = search.quickOpenResults.length;
          if (total === 0) return;
          search.setActiveQuickOpenIndex((current) => {
            const next = current + direction;
            if (next < 0) return total - 1;
            if (next >= total) return 0;
            return next;
          });
        }}
        onQuickOpenHover={search.setActiveQuickOpenIndex}
        onQuickOpenSelect={search.selectSearchResult}
      />
    </div>
  );
}
