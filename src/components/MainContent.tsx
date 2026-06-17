import { memo, useCallback, type MouseEvent as ReactMouseEvent } from "react";
import type { Document, LorePage, LoreTableView, Relationship, TimelineEvent } from "../lib/data";
import type { LoreCustomFieldValue } from "../lib/loreItems";
import type { LoreTemplate } from "../lib/loreTemplates";
import type { CustomFieldDefinition, LoreType } from "../lib/loreTypes";
import type { LoreTableCsvImportDraft } from "../lib/loreTable";
import type { SearchResult } from "../hooks/useSearch";
import type { TabItem, TabKind, WorldUI } from "../types/ui";
import { TabBar } from "./TabBar";
import { WorkbenchView } from "./WorkbenchView";
import { LauncherView } from "./LauncherView";
import { EditorView } from "./EditorView";
import { LoreView } from "./LoreView";
import { LoreCreateView } from "./LoreCreateView";
import { TemplatesView } from "./TemplatesView";
import { LoreTypesView } from "./LoreTypesView";
import { RelationshipsView } from "./RelationshipsView";
import { TimelineView } from "./TimelineView";
import { ContextPanel } from "./ContextPanel";
import { useContextPanelModel } from "../hooks/useContextPanelModel";

type MainContentProps = {
  tabs: TabItem[];
  activeTabId: string;
  activeNav: TabKind;
  isSidebarCollapsed: boolean;
  isDocListCollapsed: boolean;
  isRightPanelCollapsed: boolean;
  docListWidth: number;
  rightPanelWidth: number;
  projectTitle: string;
  activeWorld: WorldUI | undefined;
  worlds: WorldUI[];
  documents: Document[];
  allLorePages: LorePage[];
  templates: LoreTemplate[];
  loreTypes: LoreType[];
  selectedTemplateId: string | null;
  selectedLoreTypeId: string | null;
  activeDocumentId: string | null;
  documentTitle: string;
  documentContent: string;
  documentFolderPath: string;
  documentSaveState: "idle" | "dirty" | "saving" | "saved" | "error";
  documentSaveTimestamp: number | null;
  lorePages: LorePage[];
  activeLoreId: string | null;
  activeLoreTypeId: string | null;
  loreTitle: string;
  loreTags: string;
  loreFields: string;
  lorePageTypeId: string | null;
  loreTableViews: LoreTableView[];
  relationships: Relationship[];
  activeRelationshipId: string | null;
  relationshipSourceId: string;
  relationshipTargetId: string;
  relationshipType: string;
  relationshipNotes: string;
  timelineEvents: TimelineEvent[];
  activeTimelineEventId: string | null;
  timelineTitle: string;
  timelineDate: string;
  timelineType: string;
  timelineLinkedPageId: string;
  timelineDescription: string;
  totalWordCount: number;
  recentDocuments: Document[];
  recentLorePages: LorePage[];
  searchQuery: string;
  searchResults: SearchResult[];
  loreItemsInUse: Record<string, number>;
  templatesInUse: Record<string, number>;
  onSelectTab: (tab: TabItem) => void;
  onCloseTab: (tab: TabItem) => void;
  onAddTab: () => void;
  onExpandSidebar: () => void;
  onCollapseSidebar: () => void;
  onExpandDocList: () => void;
  onCollapseDocList: () => void;
  onExpandRightPanel: () => void;
  onCollapseRightPanel: () => void;
  onOpenWorkbench: () => void;
  onOpenDocument: (doc: Document) => void;
  onOpenLore: (page: LorePage) => void;
  onOpenLoreCreate: () => void;
  onOpenTemplates: () => void;
  onOpenLoreTypes: () => void;
  onOpenRelationships: () => void;
  onOpenTimeline: () => void;
  onAddDocument: () => void;
  onExportWorldMarkdown: () => void;
  onExportProjectMarkdown: () => void;
  onDuplicateDocument: () => void;
  onRemoveDocument: (docId: string) => void;
  onSaveDocument: () => void;
  onDocumentTitleChange: (value: string) => void;
  onDocumentContentChange: (value: string) => void;
  onDocumentFolderPathChange: (value: string) => void;
  onAddLorePage: () => void;
  onRemoveLorePage: (loreId: string) => void;
  onSaveLoreTableView: (view: Omit<LoreTableView, "id" | "worldId" | "createdAt" | "updatedAt">) => Promise<LoreTableView | null>;
  onUpdateLoreTableView: (
    viewId: string,
    updates: Partial<Omit<LoreTableView, "id" | "worldId" | "createdAt" | "updatedAt">>,
  ) => Promise<boolean>;
  onDeleteLoreTableView: (viewId: string) => Promise<boolean>;
  onUpdateLoreTableCustomField: (loreId: string, field: CustomFieldDefinition, value: LoreCustomFieldValue) => Promise<boolean>;
  onCreateLoreFromTable: (payload: { title: string; loreTypeId: string; templateId: string | null; tags: string }) => Promise<LorePage | null>;
  onExportLoreTableCsv: (payload: { filename: string; csvText: string }) => Promise<boolean>;
  onImportLoreTableCsv: (payload: { loreTypeId: string; drafts: LoreTableCsvImportDraft[] }) => Promise<{ createdCount: number; success: boolean } | null>;
  onSaveLorePage: () => void;
  onLoreTitleChange: (value: string) => void;
  onLoreTagsChange: (value: string) => void;
  onLoreFieldsChange: (value: string) => void;
  onLorePageTypeChange: (value: string) => void;
  onCreateLoreItem: (payload: { title: string; loreTypeId: string; templateId: string | null; tags: string }) => void;
  onSelectTemplate: (templateId: string) => void;
  onCreateTemplate: () => void;
  onUpdateTemplate: (templateId: string, updates: Partial<Omit<LoreTemplate, "id">>) => void;
  onDeleteTemplate: (templateId: string) => void;
  onAddTraitDefinition: (templateId: string) => void;
  onUpdateTraitDefinition: (
    templateId: string,
    traitId: string,
    updates: { label?: string; placeholder?: string; order?: number },
  ) => void;
  onDeleteTraitDefinition: (templateId: string, traitId: string) => void;
  onMoveTraitDefinition: (templateId: string, traitId: string, direction: -1 | 1) => void;
  onSelectLoreType: (loreTypeId: string) => void;
  onCreateLoreType: () => void;
  onUpdateLoreType: (loreTypeId: string, updates: Partial<Omit<LoreType, "id" | "isSystem">>) => void;
  onDeleteLoreType: (loreTypeId: string) => void;
  onReassignAndDeleteLoreType: (loreTypeId: string, replacementLoreTypeId: string) => void;
  onMoveLoreType: (loreTypeId: string, direction: -1 | 1) => void;
  onSelectRelationship: (relationship: Relationship) => void;
  onAddRelationship: () => void;
  onAddRelationshipWithSeed: (seed?: {
    sourcePageId?: string;
    targetPageId?: string;
    relationType?: string;
    notes?: string;
  }) => void;
  onRemoveRelationship: (relationshipId: string) => void;
  onSaveRelationship: () => void;
  onRelationshipSourceChange: (value: string) => void;
  onRelationshipTargetChange: (value: string) => void;
  onRelationshipTypeChange: (value: string) => void;
  onRelationshipNotesChange: (value: string) => void;
  onSelectTimelineEvent: (event: TimelineEvent) => void;
  onAddTimelineEvent: () => void;
  onAddTimelineEventWithSeed: (seed?: {
    title?: string;
    eventDate?: string;
    eventType?: string;
    linkedPageId?: string;
    description?: string;
  }) => void;
  onDuplicateTimelineEvent: (eventId: string) => void;
  onRemoveTimelineEvent: (eventId: string) => void;
  onSaveTimelineEvent: () => void;
  onTimelineTitleChange: (value: string) => void;
  onTimelineDateChange: (value: string) => void;
  onTimelineTypeChange: (value: string) => void;
  onTimelineLinkedPageChange: (value: string) => void;
  onTimelineDescriptionChange: (value: string) => void;
  onSelectSearchResult: (result: SearchResult) => void;
  onStartDocListResize: (event: ReactMouseEvent<HTMLDivElement>) => void;
  onStartRightPanelResize: (event: ReactMouseEvent<HTMLDivElement>) => void;
  onPendingEditorDraftChange: (hasPendingDraft: boolean) => void;
};

export const MainContent = memo(function MainContent(props: MainContentProps) {
  const contextPanelModel = useContextPanelModel({
    activeNav: props.activeNav,
    activeWorld: props.activeWorld,
    projectTitle: props.projectTitle,
    activeLoreTypeId: props.activeLoreTypeId,
    loreTypes: props.loreTypes,
    documentTitle: props.documentTitle,
    documentContent: props.documentContent,
    loreTitle: props.loreTitle,
    loreTags: props.loreTags,
    loreFields: props.loreFields,
    allLorePages: props.allLorePages,
    relationships: props.relationships,
    activeRelationshipId: props.activeRelationshipId,
    timelineEvents: props.timelineEvents,
    activeTimelineEventId: props.activeTimelineEventId,
    timelineTitle: props.timelineTitle,
    timelineDate: props.timelineDate,
    timelineDescription: props.timelineDescription,
    totalWordCount: props.totalWordCount,
    openTabsCount: props.tabs.length,
    searchQuery: props.searchQuery,
    searchResults: props.searchResults,
    recentDocuments: props.recentDocuments,
    recentLorePages: props.recentLorePages,
  });

  const handleOpenLauncherDocument = useCallback(() => {
    if (props.documents[0]) {
      props.onOpenDocument(props.documents[0]);
      return;
    }
    props.onAddDocument();
  }, [props.documents, props.onAddDocument, props.onOpenDocument]);

  return (
    <div className="main-content">
      <TabBar tabs={props.tabs} activeTabId={props.activeTabId} onSelect={props.onSelectTab} onClose={props.onCloseTab} onAdd={props.onAddTab} />
      <div className="content-area">
        <div className="content-row">
          {props.activeNav === "workbench" ? (
            <WorkbenchView
              isSidebarCollapsed={props.isSidebarCollapsed}
              isRightPanelCollapsed={props.isRightPanelCollapsed}
              projectTitle={props.projectTitle}
              activeWorld={props.activeWorld}
              worlds={props.worlds}
              documents={props.documents}
              allLorePages={props.allLorePages}
              totalWordCount={props.totalWordCount}
              tabs={props.tabs}
              recentDocuments={props.recentDocuments}
              recentLorePages={props.recentLorePages}
              onExpandSidebar={props.onExpandSidebar}
              onExpandRightPanel={props.onExpandRightPanel}
              onAddDocument={props.onAddDocument}
              onExportWorldMarkdown={props.onExportWorldMarkdown}
              onExportProjectMarkdown={props.onExportProjectMarkdown}
              onAddLorePage={props.onAddLorePage}
              onOpenDocument={props.onOpenDocument}
              onOpenLore={props.onOpenLore}
            />
          ) : null}

          {props.activeNav === "new" ? (
            <LauncherView
              isSidebarCollapsed={props.isSidebarCollapsed}
              isRightPanelCollapsed={props.isRightPanelCollapsed}
              onExpandSidebar={props.onExpandSidebar}
              onExpandRightPanel={props.onExpandRightPanel}
              onOpenWorkbench={props.onOpenWorkbench}
              onOpenDocument={handleOpenLauncherDocument}
              onOpenLore={props.onOpenLoreCreate}
              onOpenTemplates={props.onOpenTemplates}
              onOpenLoreTypes={props.onOpenLoreTypes}
              onOpenRelationships={props.onOpenRelationships}
              onOpenTimeline={props.onOpenTimeline}
            />
          ) : null}

          {props.activeNav === "editor" ? (
            <EditorView
              isDocListCollapsed={props.isDocListCollapsed}
              isSidebarCollapsed={props.isSidebarCollapsed}
              isRightPanelCollapsed={props.isRightPanelCollapsed}
              docListWidth={props.docListWidth}
              documents={props.documents}
              availableLorePages={props.allLorePages}
              activeDocumentId={props.activeDocumentId}
              documentTitle={props.documentTitle}
              documentContent={props.documentContent}
              documentFolderPath={props.documentFolderPath}
              documentSaveState={props.documentSaveState}
              documentSaveTimestamp={props.documentSaveTimestamp}
              activeWorld={props.activeWorld}
              onCollapseDocList={props.onCollapseDocList}
              onCollapseSidebar={props.onCollapseSidebar}
              onExpandDocList={props.onExpandDocList}
              onExpandSidebar={props.onExpandSidebar}
              onExpandRightPanel={props.onExpandRightPanel}
              onCollapseRightPanel={props.onCollapseRightPanel}
              onResizeStart={props.onStartDocListResize}
              onAddDocument={props.onAddDocument}
              onDuplicateDocument={props.onDuplicateDocument}
              onOpenDocument={props.onOpenDocument}
              onOpenLore={props.onOpenLore}
              onRemoveDocument={props.onRemoveDocument}
              onSave={props.onSaveDocument}
              onTitleChange={props.onDocumentTitleChange}
              onContentChange={props.onDocumentContentChange}
              onFolderPathChange={props.onDocumentFolderPathChange}
              onPendingDraftChange={props.onPendingEditorDraftChange}
            />
          ) : null}

          {props.activeNav === "lcreate" ? (
            <LoreCreateView
              isSidebarCollapsed={props.isSidebarCollapsed}
              isRightPanelCollapsed={props.isRightPanelCollapsed}
              activeWorld={props.activeWorld}
              templates={props.templates}
              loreTypes={props.loreTypes}
              onExpandSidebar={props.onExpandSidebar}
              onExpandRightPanel={props.onExpandRightPanel}
              onCreateLoreItem={props.onCreateLoreItem}
              onOpenTemplates={props.onOpenTemplates}
              onOpenLoreTypes={props.onOpenLoreTypes}
            />
          ) : null}

          {props.activeNav === "templates" ? (
            <TemplatesView
              isSidebarCollapsed={props.isSidebarCollapsed}
              isRightPanelCollapsed={props.isRightPanelCollapsed}
              templates={props.templates}
              loreTypes={props.loreTypes}
              selectedTemplateId={props.selectedTemplateId}
              onExpandSidebar={props.onExpandSidebar}
              onExpandRightPanel={props.onExpandRightPanel}
              onOpenLoreTypes={props.onOpenLoreTypes}
              onSelectTemplate={props.onSelectTemplate}
              onCreateTemplate={props.onCreateTemplate}
              onDeleteTemplate={props.onDeleteTemplate}
              onTemplateChange={props.onUpdateTemplate}
              onAddTraitDefinition={props.onAddTraitDefinition}
              onUpdateTraitDefinition={props.onUpdateTraitDefinition}
              onDeleteTraitDefinition={props.onDeleteTraitDefinition}
              onMoveTraitDefinition={props.onMoveTraitDefinition}
            />
          ) : null}

          {props.activeNav === "ltypes" ? (
            <LoreTypesView
              isSidebarCollapsed={props.isSidebarCollapsed}
              isRightPanelCollapsed={props.isRightPanelCollapsed}
              loreTypes={props.loreTypes}
              selectedLoreTypeId={props.selectedLoreTypeId}
              templates={props.templates}
              loreItemsInUse={props.loreItemsInUse}
              templatesInUse={props.templatesInUse}
              onExpandSidebar={props.onExpandSidebar}
              onExpandRightPanel={props.onExpandRightPanel}
              onSelectLoreType={props.onSelectLoreType}
              onCreateLoreType={props.onCreateLoreType}
              onUpdateLoreType={props.onUpdateLoreType}
              onDeleteLoreType={props.onDeleteLoreType}
              onReassignAndDeleteLoreType={props.onReassignAndDeleteLoreType}
              onMoveLoreType={props.onMoveLoreType}
            />
          ) : null}

          {props.activeNav === "lore" ? (
            <LoreView
              isDocListCollapsed={props.isDocListCollapsed}
              isSidebarCollapsed={props.isSidebarCollapsed}
              isRightPanelCollapsed={props.isRightPanelCollapsed}
              docListWidth={props.docListWidth}
              lorePages={props.lorePages}
              availableLorePages={props.allLorePages}
              templates={props.templates}
              loreTypes={props.loreTypes}
              activeLoreId={props.activeLoreId}
              activeLoreTypeId={props.activeLoreTypeId}
              loreTitle={props.loreTitle}
              loreTags={props.loreTags}
              loreFields={props.loreFields}
              lorePageTypeId={props.lorePageTypeId}
              loreTableViews={props.loreTableViews}
              activeWorld={props.activeWorld}
              onCollapseDocList={props.onCollapseDocList}
              onExpandDocList={props.onExpandDocList}
              onExpandSidebar={props.onExpandSidebar}
              onExpandRightPanel={props.onExpandRightPanel}
              onResizeStart={props.onStartDocListResize}
              onOpenLoreCreate={props.onOpenLoreCreate}
              onOpenLoreTypes={props.onOpenLoreTypes}
              onOpenLore={props.onOpenLore}
              onRemoveLorePage={props.onRemoveLorePage}
              onSaveLoreTableView={props.onSaveLoreTableView}
              onUpdateLoreTableView={props.onUpdateLoreTableView}
              onDeleteLoreTableView={props.onDeleteLoreTableView}
              onUpdateLoreTableCustomField={props.onUpdateLoreTableCustomField}
              onCreateLoreFromTable={props.onCreateLoreFromTable}
              onExportLoreTableCsv={props.onExportLoreTableCsv}
              onImportLoreTableCsv={props.onImportLoreTableCsv}
              onSave={props.onSaveLorePage}
              onTitleChange={props.onLoreTitleChange}
              onTagsChange={props.onLoreTagsChange}
              onFieldsChange={props.onLoreFieldsChange}
              onPageTypeChange={props.onLorePageTypeChange}
            />
          ) : null}

          {props.activeNav === "rels" ? (
            <RelationshipsView
              isDocListCollapsed={props.isDocListCollapsed}
              isSidebarCollapsed={props.isSidebarCollapsed}
              isRightPanelCollapsed={props.isRightPanelCollapsed}
              docListWidth={props.docListWidth}
              relationships={props.relationships}
              activeRelationshipId={props.activeRelationshipId}
              relationshipSourceId={props.relationshipSourceId}
              relationshipTargetId={props.relationshipTargetId}
              relationshipType={props.relationshipType}
              relationshipNotes={props.relationshipNotes}
              lorePages={props.allLorePages}
              activeWorld={props.activeWorld}
              onCollapseDocList={props.onCollapseDocList}
              onExpandDocList={props.onExpandDocList}
              onExpandSidebar={props.onExpandSidebar}
              onExpandRightPanel={props.onExpandRightPanel}
              onResizeStart={props.onStartDocListResize}
              onSelectRelationship={props.onSelectRelationship}
              onAddRelationship={props.onAddRelationship}
              onAddRelationshipWithSeed={props.onAddRelationshipWithSeed}
              onRemoveRelationship={props.onRemoveRelationship}
              onSave={props.onSaveRelationship}
              onSourceChange={props.onRelationshipSourceChange}
              onTargetChange={props.onRelationshipTargetChange}
              onTypeChange={props.onRelationshipTypeChange}
              onNotesChange={props.onRelationshipNotesChange}
              onOpenLore={props.onOpenLore}
            />
          ) : null}

          {props.activeNav === "timeline" ? (
            <TimelineView
              isDocListCollapsed={props.isDocListCollapsed}
              isSidebarCollapsed={props.isSidebarCollapsed}
              isRightPanelCollapsed={props.isRightPanelCollapsed}
              docListWidth={props.docListWidth}
              timelineEvents={props.timelineEvents}
              activeTimelineEventId={props.activeTimelineEventId}
              timelineTitle={props.timelineTitle}
              timelineDate={props.timelineDate}
              timelineType={props.timelineType}
              timelineLinkedPageId={props.timelineLinkedPageId}
              timelineDescription={props.timelineDescription}
              lorePages={props.allLorePages}
              activeWorld={props.activeWorld}
              onCollapseDocList={props.onCollapseDocList}
              onExpandDocList={props.onExpandDocList}
              onExpandSidebar={props.onExpandSidebar}
              onExpandRightPanel={props.onExpandRightPanel}
              onResizeStart={props.onStartDocListResize}
              onSelectTimelineEvent={props.onSelectTimelineEvent}
              onAddTimelineEvent={props.onAddTimelineEvent}
              onAddTimelineEventWithSeed={props.onAddTimelineEventWithSeed}
              onDuplicateTimelineEvent={props.onDuplicateTimelineEvent}
              onRemoveTimelineEvent={props.onRemoveTimelineEvent}
              onSave={props.onSaveTimelineEvent}
              onTitleChange={props.onTimelineTitleChange}
              onDateChange={props.onTimelineDateChange}
              onTypeChange={props.onTimelineTypeChange}
              onLinkedPageChange={props.onTimelineLinkedPageChange}
              onDescriptionChange={props.onTimelineDescriptionChange}
              onOpenLore={props.onOpenLore}
            />
          ) : null}

          {!props.isRightPanelCollapsed ? <div className="resizer resizer-vertical" onMouseDown={props.onStartRightPanelResize} /> : null}

          <ContextPanel
            isCollapsed={props.isRightPanelCollapsed}
            width={props.rightPanelWidth}
            model={contextPanelModel}
            onCollapse={props.onCollapseRightPanel}
            onSelectSearchResult={props.onSelectSearchResult}
            onOpenDocument={props.onOpenDocument}
            onOpenLore={props.onOpenLore}
          />
        </div>
      </div>
    </div>
  );
});
