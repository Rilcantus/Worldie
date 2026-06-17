/*
Project entities are persisted only through the active `.worldie` file.
Local browser storage is reserved for UI state and one-time legacy migration.
*/
import {
  getSeededLoreTypes,
  loadLegacyLoreTypes,
  normalizeLoreTypes,
  type LoreType,
} from "./loreTypes";
import {
  getSeededLoreTemplates,
  loadLegacyLoreTemplates,
  normalizeLoreTemplate,
  type LoreTemplate,
} from "./loreTemplates";
import {
  buildLoreTableViewPayload,
  buildLoreTableViewUpdatePayload,
} from "./loreTableViews";
import { resolveProjectStoreErrorMessage } from "./projectStoreErrors";
import { sanitizeTextForPersistence } from "./textSanitizer";
export {
  buildLoreTableViewPayload,
  buildLoreTableViewUpdatePayload,
} from "./loreTableViews";

type Project = {
  id: string;
  title: string;
  filepath?: string;
  lastEdited?: string;
  createdAt?: string;
};

type ProjectStoreProjectsResponse = {
  projects?: Project[];
  project?: Project | null;
};

type ProjectStoreProjectsResult = {
  projects: Project[];
  project: Project | null;
};

type ExportedFile = {
  kind: "index" | "document" | "lore" | "relationship" | "timeline";
  title: string;
  path: string;
  relativePath: string;
  summary?: string;
};

type WorldMarkdownExportResult = {
  exportPath: string;
  projectTitle: string;
  worldTitle: string;
  documentCount: number;
  lorePageCount: number;
  relationshipCount: number;
  timelineEventCount: number;
  files: ExportedFile[];
};

type ProjectMarkdownExportResult = {
  exportPath: string;
  projectTitle: string;
  worldCount: number;
  documentCount: number;
  lorePageCount: number;
  relationshipCount: number;
  timelineEventCount: number;
  worlds: Array<{
    title: string;
    path: string;
    relativePath: string;
    documentCount: number;
    lorePageCount: number;
    relationshipCount: number;
    timelineEventCount: number;
  }>;
  files: ExportedFile[];
};

type LoreTableCsvExportResult = {
  exportPath: string;
  filename: string;
};

type World = {
  id: string;
  projectId: string;
  title: string;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type LoreCustomFieldValue = string | number | boolean | null;
type LoreCustomFields = Record<string, LoreCustomFieldValue>;

type LorePage = {
  id: string;
  worldId: string;
  title: string;
  type: string;
  tagsJson?: string | null;
  fieldsJson?: string | null;
  coverImagePath?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type LoreTableViewSortDirection = "asc" | "desc";

type LoreTableView = {
  id: string;
  worldId: string;
  name: string;
  loreTypeId?: string | null;
  quickFilter?: string | null;
  sortKey?: string | null;
  sortDirection?: LoreTableViewSortDirection | null;
  visibleColumnsJson?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type Document = {
  id: string;
  worldId: string;
  title: string;
  contentJson?: string | null;
  folderPath?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type Relationship = {
  id: string;
  worldId: string;
  sourcePageId: string;
  targetPageId: string;
  relationType: string;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type TimelineEvent = {
  id: string;
  worldId: string;
  title: string;
  eventDate: string;
  eventType?: string | null;
  linkedPageId?: string | null;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

const isTauri = () =>
  typeof window !== "undefined" &&
  ("__TAURI__" in window || "__TAURI_INTERNALS__" in window);

const importTauriCore = () =>
  import(/* @vite-ignore */ "@tauri-apps/api/core");

let projectStoreErrorHandler: ((message: string) => void) | null = null;

export function setProjectStoreErrorHandler(handler: ((message: string) => void) | null) {
  projectStoreErrorHandler = handler;
}

export class ProjectStoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProjectStoreError";
  }
}

function reportProjectStoreError(message: string) {
  projectStoreErrorHandler?.(message);
}

async function invokeProjectStore<T>(action: string, data?: Record<string, unknown>) {
  if (!isTauri()) {
    throw new ProjectStoreError("Project data requires the desktop app and an active .worldie project file.");
  }
    const { invoke } = await importTauriCore();
  try {
    return (await invoke("sidecar_request", {
      payload: { action, data: sanitizeTextForPersistence(data) },
    })) as T;
  } catch (error) {
    const message = resolveProjectStoreErrorMessage(action, error);
    throw new ProjectStoreError(message);
  }
}

function omitUndefined<T extends Record<string, unknown>>(data: T): Record<string, unknown> {
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
}

export function getProjectFilename(project: Pick<Project, "filepath" | "title"> | null | undefined) {
  if (!project?.filepath) return `${project?.title ?? "Project"}.worldie`;
  const normalized = project.filepath.split("\\").join("/");
  return normalized.split("/").pop() || `${project.title}.worldie`;
}

export function getProjectPathDisplay(project: Pick<Project, "filepath"> | null | undefined) {
  if (!project?.filepath) return "";
  const normalized = project.filepath.split("\\").join("/");
  const lastSlashIndex = normalized.lastIndexOf("/");
  if (lastSlashIndex <= 0) return "";
  return normalized.slice(0, lastSlashIndex);
}

async function invokeDialogCommand<T>(command: string, args?: Record<string, unknown>) {
  if (!isTauri()) {
    throw new ProjectStoreError("Project file dialogs require the desktop app runtime.");
  }
  const { invoke } = await importTauriCore();
  return (await invoke(command, args)) as T;
}

export async function pickNewProjectFile(suggestedName: string): Promise<string | null> {
  try {
    return await invokeDialogCommand<string | null>("pick_new_project_file", {
      suggestedName,
    });
  } catch {
    reportProjectStoreError("Worldie could not open the native new-project file dialog.");
    return null;
  }
}

export async function pickOpenProjectFile(): Promise<string | null> {
  try {
    return await invokeDialogCommand<string | null>("pick_open_project_file");
  } catch {
    reportProjectStoreError("Worldie could not open the native project picker.");
    return null;
  }
}

export async function pickSaveProjectAsFile(suggestedName: string): Promise<string | null> {
  try {
    return await invokeDialogCommand<string | null>("pick_save_project_as_file", {
      suggestedName,
    });
  } catch {
    reportProjectStoreError("Worldie could not open the native Save As dialog.");
    return null;
  }
}

export async function pickExportFolder(): Promise<string | null> {
  try {
    return await invokeDialogCommand<string | null>("pick_export_folder");
  } catch {
    reportProjectStoreError("Worldie could not open the native export folder picker.");
    return null;
  }
}

export async function listProjectLoreTypes(projectId: string | null): Promise<LoreType[]> {
  if (!projectId) return [];
  const response = await invokeProjectStore<{ loreTypes?: LoreType[] }>("list_lore_types", { projectId });
  const loaded = normalizeLoreTypes(response.loreTypes ?? []);
  if (loaded.length > 0) {
    return loaded;
  }
  const legacy = loadLegacyLoreTypes(projectId);
  if (legacy.length > 0) {
    await saveProjectLoreTypes(projectId, legacy);
    return legacy;
  }
  const seeded = getSeededLoreTypes();
  await saveProjectLoreTypes(projectId, seeded);
  return seeded;
}

export async function saveProjectLoreTypes(projectId: string | null, loreTypes: LoreType[]): Promise<void> {
  if (!projectId) return;
  const normalized = normalizeLoreTypes(loreTypes).map((type, index) => ({ ...type, order: index }));
  await invokeProjectStore("save_lore_types", { projectId, loreTypes: normalized });
}

export async function listProjectLoreTemplates(projectId: string | null, loreTypes: LoreType[]): Promise<LoreTemplate[]> {
  if (!projectId) return [];
  const response = await invokeProjectStore<{
    templates?: Array<{ id: string; name: string; loreTypeId: string; traitDefinitionsJson: string }>;
  }>("list_lore_templates", { projectId });
  const loaded = (response.templates ?? [])
    .map((template) =>
      normalizeLoreTemplate(
        {
          id: template.id,
          name: template.name,
          loreTypeId: template.loreTypeId,
          traitDefinitions: JSON.parse(template.traitDefinitionsJson || "[]") as LoreTemplate["traitDefinitions"],
        },
        loreTypes,
      ),
    )
    .filter((template): template is LoreTemplate => Boolean(template));
  if (loaded.length > 0) {
    return loaded;
  }
  const legacy = loadLegacyLoreTemplates(projectId, loreTypes);
  if (legacy.length > 0) {
    await saveProjectLoreTemplates(projectId, legacy);
    return legacy;
  }
  const seeded = getSeededLoreTemplates(loreTypes);
  await saveProjectLoreTemplates(projectId, seeded);
  return seeded;
}

export async function saveProjectLoreTemplates(projectId: string | null, templates: LoreTemplate[]): Promise<void> {
  if (!projectId) return;
  const serializedTemplates = templates.map((template) => ({
    id: template.id,
    name: template.name,
    loreTypeId: template.loreTypeId,
    traitDefinitionsJson: JSON.stringify(template.traitDefinitions),
  }));
  await invokeProjectStore("save_lore_templates", { projectId, templates: serializedTemplates });
}

export async function listProjects(): Promise<Project[]> {
  if (!isTauri()) return [];
  const response = await invokeProjectStore<{ projects?: Project[] }>("list_projects");
  return response.projects ?? [];
}

export async function createProject(title: string): Promise<Project[]> {
  const result = await createProjectAtPath(title, "");
  return result.projects;
}

export async function createProjectAtPath(title: string, filepath: string): Promise<ProjectStoreProjectsResult> {
  const response = await invokeProjectStore<ProjectStoreProjectsResponse>("create_project", { title, filepath });
  return { projects: response.projects ?? [], project: response.project ?? null };
}

export async function openProjectFile(filepath: string): Promise<ProjectStoreProjectsResult> {
  const response = await invokeProjectStore<ProjectStoreProjectsResponse>("open_project", { filepath });
  return { projects: response.projects ?? [], project: response.project ?? null };
}

export async function saveProjectAs(projectId: string, filepath: string): Promise<ProjectStoreProjectsResult> {
  const response = await invokeProjectStore<ProjectStoreProjectsResponse>("save_project_as", {
    projectId,
    filepath,
  });
  return { projects: response.projects ?? [], project: response.project ?? null };
}

export async function exportWorldMarkdown(
  projectId: string,
  worldId: string,
  exportRoot: string,
): Promise<WorldMarkdownExportResult> {
  const response = await invokeProjectStore<{ export?: WorldMarkdownExportResult }>("export_world_markdown", {
    projectId,
    worldId,
    exportRoot,
  });
  if (!response.export) {
    throw new ProjectStoreError("Worldie could not export the active world.");
  }
  return response.export;
}

export async function exportProjectMarkdown(
  projectId: string,
  exportRoot: string,
): Promise<ProjectMarkdownExportResult> {
  const response = await invokeProjectStore<{ export?: ProjectMarkdownExportResult }>("export_project_markdown", {
    projectId,
    exportRoot,
  });
  if (!response.export) {
    throw new ProjectStoreError("Worldie could not export the active project.");
  }
  return response.export;
}

export async function exportLoreTableCsv(
  exportRoot: string,
  filename: string,
  csvText: string,
): Promise<LoreTableCsvExportResult> {
  const response = await invokeProjectStore<{ export?: LoreTableCsvExportResult }>("export_lore_table_csv", {
    exportRoot,
    filename,
    csvText,
  });
  if (!response.export) {
    throw new ProjectStoreError("Worldie could not export the Lore Table CSV.");
  }
  return response.export;
}

export async function updateProjectTitle(projectId: string, title: string): Promise<Project[]> {
  const response = await invokeProjectStore<{ projects?: Project[] }>("update_project", { projectId, title });
  return response.projects ?? [];
}

export async function deleteProject(projectId: string): Promise<Project[]> {
  const response = await invokeProjectStore<{ projects?: Project[] }>("delete_project", { projectId });
  return response.projects ?? [];
}

export async function createDemoProjectBundle(): Promise<Project[]> {
  const projectTitle = "Demo Project - Emberfall";
  const nextProjects = await createProject(projectTitle);
  const project = nextProjects[0];
  if (!project) return nextProjects;

  const mainWorld = await createWorld(project.id, "Emberfall");
  await createWorld(project.id, "Glass Coast");

  const chapter = await createDocument(project.id, mainWorld.id, "Chapter 01 - Arrival at Red Harbor");
  await updateDocument(project.id, chapter.id, {
    title: "Chapter 01 - Arrival at Red Harbor",
    contentJson:
      "The ferry reached [[Red Harbor]] beneath a copper sky. [[Mara Quill]] kept one hand on the rail and the other on the sealed letter from the [[Ashwake Company]].\n\nShe had crossed half the coast to answer a summons that mentioned smoke, disappearances, and a beast the dockworkers only called [[The Cinder Hound]]. The seal carried the mark of the [[Brass Compass]], a symbol tied to the old [[Ashfall Oath]].",
    folderPath: "Scenes/Chapter Drafts",
  });

  const notes = await createDocument(project.id, mainWorld.id, "Scene Notes - Harbor Tension");
  await updateDocument(project.id, notes.id, {
    title: "Scene Notes - Harbor Tension",
    contentJson:
      "Tension points:\n- Mara is new in town\n- The Ashwake Company wants silence\n- Dockworkers fear the Cinder Hound\n- Red Harbor is visibly declining",
    folderPath: "Notes/Planning",
  });

  const mara = await createLorePage(project.id, mainWorld.id, "Mara Quill", "Character");
  await updateLorePage(project.id, mara.id, {
    title: "Mara Quill",
    type: "Character",
    tagsJson: "protagonist, investigator",
    fieldsJson: '{"role":"courier","goal":"discover why ships vanish","status":"active"}',
  });

  const harbor = await createLorePage(project.id, mainWorld.id, "Red Harbor", "Place");
  await updateLorePage(project.id, harbor.id, {
    title: "Red Harbor",
    type: "Place",
    tagsJson: "port, coast, trade",
    fieldsJson: '{"region":"western coast","condition":"declining","mood":"smoky"}',
  });

  const company = await createLorePage(project.id, mainWorld.id, "Ashwake Company", "Faction");
  await updateLorePage(project.id, company.id, {
    title: "Ashwake Company",
    type: "Faction",
    tagsJson: "merchant, secretive",
    fieldsJson: '{"industry":"shipping","reputation":"feared","status":"powerful"}',
  });

  const hound = await createLorePage(project.id, mainWorld.id, "The Cinder Hound", "Creature");
  await updateLorePage(project.id, hound.id, {
    title: "The Cinder Hound",
    type: "Creature",
    tagsJson: "beast, rumor, fire",
    fieldsJson: '{"nature":"predator","threat":"high","origin":"unknown"}',
  });

  const compass = await createLorePage(project.id, mainWorld.id, "Brass Compass", "Item");
  await updateLorePage(project.id, compass.id, {
    title: "Brass Compass",
    type: "Item",
    tagsJson: "artifact, navigation, brass",
    fieldsJson: '{"owner":"Mara Quill","trait":"always points toward danger","status":"carried"}',
  });

  const ashfallOath = await createLorePage(project.id, mainWorld.id, "Ashfall Oath", "Concept");
  await updateLorePage(project.id, ashfallOath.id, {
    title: "Ashfall Oath",
    type: "Concept",
    tagsJson: "belief, creed, emberfall",
    fieldsJson: '{"summary":"A regional code demanding truth in the face of ruin.","followers":"harbor elders"}',
  });

  const blacktide = await createLorePage(project.id, mainWorld.id, "Blacktide Mutiny", "Event");
  await updateLorePage(project.id, blacktide.id, {
    title: "Blacktide Mutiny",
    type: "Event",
    tagsJson: "history, mutiny, ships",
    fieldsJson: '{"era":"17 years ago","impact":"shattered trust in coastal captains","location":"Red Harbor"}',
  });

  await createRelationship(project.id, mainWorld.id, {
    sourcePageId: mara.id,
    targetPageId: company.id,
    relationType: "investigates",
    notes: "Mara was summoned by the company but does not trust them.",
  });

  await createRelationship(project.id, mainWorld.id, {
    sourcePageId: hound.id,
    targetPageId: harbor.id,
    relationType: "haunts",
    notes: "Dockworkers believe the beast stalks the fog around the harbor.",
  });

  await createTimelineEvent(project.id, mainWorld.id, {
    title: "Warehouse Fire",
    eventDate: "Three weeks before Chapter 01",
    eventType: "disaster",
    linkedPageId: harbor.id,
    description: "A fire destroyed three piers and began the latest wave of fear in Red Harbor.",
  });

  await createTimelineEvent(project.id, mainWorld.id, {
    title: "The Blacktide Mutiny",
    eventDate: "17 years before Chapter 01",
    eventType: "history",
    linkedPageId: blacktide.id,
    description: "A failed mutiny reshaped shipping politics across Emberfall and strengthened the Ashwake Company.",
  });

  await createTimelineEvent(project.id, mainWorld.id, {
    title: "Mara Receives the Summons",
    eventDate: "Two days before Chapter 01",
    eventType: "inciting-incident",
    linkedPageId: mara.id,
    description: "A sealed Ashwake letter calls Mara Quill to Emberfall with unusual urgency.",
  });

  return nextProjects;
}

export async function listWorlds(projectId: string): Promise<World[]> {
  const response = await invokeProjectStore<{ worlds?: World[] }>("list_worlds", { projectId });
  return response.worlds ?? [];
}

export async function createWorld(projectId: string, title: string): Promise<World> {
  const response = await invokeProjectStore<{ worldId?: string }>("create_world", { projectId, title });
  if (!response.worldId) throw new ProjectStoreError("Worldie could not create the new world in the active project file.");
  return { id: response.worldId, projectId, title };
}

export async function updateWorldTitle(projectId: string, worldId: string, title: string): Promise<void> {
  await invokeProjectStore("update_world", { projectId, worldId, title });
}

export async function deleteWorld(projectId: string, worldId: string): Promise<void> {
  await invokeProjectStore("delete_world", { projectId, worldId });
}

export async function listLorePages(
  projectId: string,
  worldId: string,
  pageType?: string
): Promise<LorePage[]> {
  const response = await invokeProjectStore<{ lorePages?: LorePage[] }>("list_lore_pages", {
    projectId,
    worldId,
    type: pageType,
  });
  return response.lorePages ?? [];
}

export async function createLorePage(
  projectId: string,
  worldId: string,
  title: string,
  pageType: string
): Promise<LorePage> {
  const response = await invokeProjectStore<{ loreId?: string }>("create_lore_page", {
    projectId,
    worldId,
    title,
    type: pageType,
  });
  if (!response.loreId) throw new ProjectStoreError("Worldie could not create the lore item in the active project file.");
  return { id: response.loreId, worldId, title, type: pageType };
}

export async function updateLorePage(
  projectId: string,
  loreId: string,
  updates: Partial<Pick<LorePage, "title" | "type" | "tagsJson" | "fieldsJson">>
): Promise<void> {
  await invokeProjectStore("update_lore_page", omitUndefined({
    loreId,
    projectId,
    title: updates.title,
    type: updates.type,
    tagsJson: updates.tagsJson,
    fieldsJson: updates.fieldsJson,
  }));
}

export async function deleteLorePage(projectId: string, loreId: string): Promise<void> {
  await invokeProjectStore("delete_lore_page", { projectId, loreId });
}

export async function listLoreTableViews(projectId: string, worldId: string): Promise<LoreTableView[]> {
  const response = await invokeProjectStore<{ views?: LoreTableView[] }>("list_lore_table_views", {
    projectId,
    worldId,
  });
  return response.views ?? [];
}

export async function createLoreTableView(
  projectId: string,
  worldId: string,
  view: Omit<LoreTableView, "id" | "worldId" | "createdAt" | "updatedAt">,
): Promise<LoreTableView> {
  const response = await invokeProjectStore<{ viewId?: string }>(
    "create_lore_table_view",
    buildLoreTableViewPayload(projectId, worldId, view),
  );
  if (!response.viewId) {
    throw new ProjectStoreError("Worldie could not save the lore table view in the active project file.");
  }
  return { id: response.viewId, worldId, ...view };
}

export async function updateLoreTableView(
  projectId: string,
  viewId: string,
  updates: Partial<Omit<LoreTableView, "id" | "worldId" | "createdAt" | "updatedAt">>,
): Promise<void> {
  await invokeProjectStore("update_lore_table_view", buildLoreTableViewUpdatePayload(projectId, viewId, updates));
}

export async function deleteLoreTableView(projectId: string, viewId: string): Promise<void> {
  await invokeProjectStore("delete_lore_table_view", { projectId, viewId });
}

export async function listDocuments(projectId: string, worldId: string): Promise<Document[]> {
  const response = await invokeProjectStore<{ documents?: Document[] }>("list_documents", { projectId, worldId });
  return response.documents ?? [];
}

export async function createDocument(projectId: string, worldId: string, title: string): Promise<Document> {
  const response = await invokeProjectStore<{ documentId?: string }>("create_document", { projectId, worldId, title });
  if (!response.documentId) throw new ProjectStoreError("Worldie could not create the document in the active project file.");
  return { id: response.documentId, worldId, title };
}

export async function updateDocument(
  projectId: string,
  documentId: string,
  updates: Partial<Pick<Document, "title" | "contentJson" | "folderPath">>
): Promise<void> {
  await invokeProjectStore("update_document", omitUndefined({
    documentId,
    projectId,
    title: updates.title,
    contentJson: updates.contentJson,
    folderPath: updates.folderPath,
  }));
}

export async function deleteDocument(projectId: string, documentId: string): Promise<void> {
  await invokeProjectStore("delete_document", { projectId, documentId });
}

export async function listRelationships(projectId: string, worldId: string): Promise<Relationship[]> {
  const response = await invokeProjectStore<{ relationships?: Relationship[] }>("list_relationships", {
    projectId,
    worldId,
  });
  return response.relationships ?? [];
}

export async function createRelationship(
  projectId: string,
  worldId: string,
  data: Pick<Relationship, "sourcePageId" | "targetPageId" | "relationType" | "notes">,
): Promise<Relationship> {
  const response = await invokeProjectStore<{ relationshipId?: string }>("create_relationship", {
    projectId,
    worldId,
    ...data,
  });
  if (!response.relationshipId) {
    throw new ProjectStoreError("Worldie could not create the relationship in the active project file.");
  }
  return { id: response.relationshipId, worldId, ...data };
}

export async function updateRelationship(
  projectId: string,
  relationshipId: string,
  updates: Partial<Pick<Relationship, "sourcePageId" | "targetPageId" | "relationType" | "notes">>,
): Promise<void> {
  await invokeProjectStore("update_relationship", omitUndefined({ projectId, relationshipId, ...updates }));
}

export async function deleteRelationship(projectId: string, relationshipId: string): Promise<void> {
  await invokeProjectStore("delete_relationship", { projectId, relationshipId });
}

export async function listTimelineEvents(projectId: string, worldId: string): Promise<TimelineEvent[]> {
  const response = await invokeProjectStore<{ events?: TimelineEvent[] }>("list_timeline_events", {
    projectId,
    worldId,
  });
  return response.events ?? [];
}

export async function createTimelineEvent(
  projectId: string,
  worldId: string,
  data: Pick<TimelineEvent, "title" | "eventDate" | "eventType" | "linkedPageId" | "description">,
): Promise<TimelineEvent> {
  const response = await invokeProjectStore<{ eventId?: string }>("create_timeline_event", {
    projectId,
    worldId,
    ...data,
  });
  if (!response.eventId) {
    throw new ProjectStoreError("Worldie could not create the timeline event in the active project file.");
  }
  return { id: response.eventId, worldId, ...data };
}

export async function updateTimelineEvent(
  projectId: string,
  eventId: string,
  updates: Partial<Pick<TimelineEvent, "title" | "eventDate" | "eventType" | "linkedPageId" | "description">>,
): Promise<void> {
  await invokeProjectStore("update_timeline_event", omitUndefined({ projectId, eventId, ...updates }));
}

export async function deleteTimelineEvent(projectId: string, eventId: string): Promise<void> {
  await invokeProjectStore("delete_timeline_event", { projectId, eventId });
}

export type {
  Project,
  World,
  LorePage,
  LoreTableView,
  LoreTableViewSortDirection,
  LoreCustomFieldValue,
  LoreCustomFields,
  Document,
  Relationship,
  TimelineEvent,
  WorldMarkdownExportResult,
  ProjectMarkdownExportResult,
  LoreTableCsvExportResult,
};
