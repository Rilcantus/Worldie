import type { LorePage } from "../lib/data";
import type { LoreCustomFieldValue, LoreCustomFields } from "../lib/loreItems";
import type { LoreTemplate } from "../lib/loreTemplates";
import type { CustomFieldDefinition, LoreType } from "../lib/loreTypes";

export function buildLoreCreateDefaultCustomFields(loreType: LoreType | null | undefined) {
  const customFields: LoreCustomFields = {};
  for (const field of loreType?.fieldDefinitions ?? []) {
    if (field.defaultValue === undefined || field.defaultValue === null) continue;
    customFields[field.key] = field.defaultValue;
  }
  return customFields;
}

export function countNonEmptyWords(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export function buildInitialLoreFields(
  loreTypeId: string | null,
  template: LoreTemplate | null,
  loreType?: LoreType | null,
  draft: { details?: string; customFields?: LoreCustomFields } = {},
) {
  return JSON.stringify(
    {
      loreTypeId,
      templateId: template?.id ?? null,
      traits:
        template?.traitDefinitions.map((trait) => ({
          id: crypto.randomUUID(),
          name: trait.label.trim() || "Trait",
          value: "",
        })) ?? [],
      details: draft.details ?? "",
      customFields: {
        ...buildLoreCreateDefaultCustomFields(loreType),
        ...(draft.customFields ?? {}),
      },
    },
    null,
    2,
  );
}

export function normalizeLoreTitleDraft(value: string | null | undefined) {
  return value?.trim() ?? "";
}

export const MAX_LORE_SELECTION_TITLE_LENGTH = 120;

export function normalizeLoreSelectionTitle(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_LORE_SELECTION_TITLE_LENGTH);
}

export function getLoreSelectionCreateState({
  selectedText,
  title,
  loreType,
  isCreating = false,
}: {
  selectedText: string;
  title: string;
  loreType: LoreType | null | undefined;
  isCreating?: boolean;
}) {
  const selectionTitle = normalizeLoreSelectionTitle(selectedText);
  const draftTitle = normalizeLoreTitleDraft(title);
  return {
    selectionTitle,
    title: draftTitle || selectionTitle,
    canOpen: Boolean(selectionTitle),
    canCreate: Boolean(loreType && draftTitle && !isCreating),
    buttonLabel: loreType ? `Create ${loreType.name}` : "Create Lore Item",
    titleWasTruncated: selectionTitle.length === MAX_LORE_SELECTION_TITLE_LENGTH && normalizeLoreTitleDraft(selectedText).length > MAX_LORE_SELECTION_TITLE_LENGTH,
  };
}

export function getLoreSelectionActionState({
  selectedText,
  loreType,
  hasActiveDocument = true,
  isDialogOpen = false,
}: {
  selectedText: string;
  loreType: LoreType | null | undefined;
  hasActiveDocument?: boolean;
  isDialogOpen?: boolean;
}) {
  const selectionTitle = normalizeLoreSelectionTitle(selectedText);
  return {
    selectionTitle,
    canShow: Boolean(hasActiveDocument && loreType && selectionTitle && !isDialogOpen),
    label: "Create Lore",
  };
}

export function buildLoreCreateDraftPayload({
  title,
  loreTypeId,
  templateId,
  tags,
  details = "",
  customFields = {},
}: {
  title: string;
  loreTypeId: string | null | undefined;
  templateId: string | null;
  tags: string;
  details?: string;
  customFields?: LoreCustomFields;
}) {
  const normalizedTitle = normalizeLoreTitleDraft(title);
  if (!normalizedTitle || !loreTypeId) return null;
  return {
    title: normalizedTitle,
    loreTypeId,
    templateId,
    tags,
    details,
    customFields,
  };
}

export function getLoreCreateDraftState({
  title,
  loreType,
  isCreating = false,
}: {
  title: string;
  loreType: LoreType | null | undefined;
  isCreating?: boolean;
}) {
  const normalizedTitle = normalizeLoreTitleDraft(title);
  return {
    title: normalizedTitle,
    canCreate: Boolean(loreType && normalizedTitle && !isCreating),
    buttonLabel: loreType ? `Create ${loreType.name}` : "Create Lore Item",
    titlePlaceholder: loreType ? `New ${loreType.name} title` : "New lore item title",
  };
}

export function normalizeLoreCreateCustomFieldValue(
  field: CustomFieldDefinition,
  value: string | number | boolean | null,
): LoreCustomFieldValue {
  if (field.type === "checkbox") return Boolean(value);
  if (field.type === "number") {
    if (value === "" || value === null) return "";
    const numberValue = typeof value === "number" ? value : Number(value);
    return Number.isFinite(numberValue) ? numberValue : "";
  }
  return value == null ? "" : String(value);
}

export function setLoreCreateCustomFieldValue(
  current: LoreCustomFields,
  field: CustomFieldDefinition,
  value: string | number | boolean | null,
) {
  return {
    ...current,
    [field.key]: normalizeLoreCreateCustomFieldValue(field, value),
  };
}

export function getDocumentEditorModeState({
  isPreviewOpen,
  readableLoreLinks,
}: {
  isPreviewOpen: boolean;
  readableLoreLinks: boolean;
}) {
  return {
    mode: isPreviewOpen ? "preview" : "write",
    canUseReadableLinks: isPreviewOpen,
    readableLoreLinksActive: Boolean(isPreviewOpen && readableLoreLinks),
  };
}

export function resolveDocumentPreviewContent(
  documentContent: string,
  previewContentSnapshot: string | null | undefined,
) {
  return previewContentSnapshot ?? documentContent;
}

export function buildDocumentModeSurfaceState({
  documentTitle,
  documentContent,
  previewContentSnapshot,
  isPreviewOpen,
}: {
  documentTitle: string;
  documentContent: string;
  previewContentSnapshot?: string | null;
  isPreviewOpen: boolean;
}) {
  return {
    mode: isPreviewOpen ? ("preview" as const) : ("write" as const),
    title: documentTitle,
    body: isPreviewOpen ? resolveDocumentPreviewContent(documentContent, previewContentSnapshot) : documentContent,
  };
}

export function buildEditorToolbarDocumentState({
  activeDocumentId,
  orderedDocuments,
}: {
  activeDocumentId: string | null;
  orderedDocuments: Array<{ id: string; title: string }>;
}) {
  const activeDocument = orderedDocuments.find((document) => document.id === activeDocumentId) ?? null;
  return {
    selectedDocumentId: activeDocument?.id ?? "",
    selectedDocumentTitle: activeDocument?.title ?? "",
    canSwitchDocuments: orderedDocuments.length > 0,
  };
}

export function buildBulkLoreScanSelectionState({
  items,
  selectedMentionIds,
}: {
  items: Array<{ page: { id: string }; snippets?: Array<{ id: string }>; count: number }>;
  selectedMentionIds?: Iterable<string> | null;
}) {
  const allMentionIds = items.flatMap((item) => item.snippets?.map((snippet) => snippet.id) ?? []);
  const selectedSet = selectedMentionIds ? new Set(selectedMentionIds) : new Set(allMentionIds);
  const selectedMentionIdsInOrder = allMentionIds.filter((id) => selectedSet.has(id));
  const selectedItems = items.filter((item) => item.snippets?.some((snippet) => selectedSet.has(snippet.id)));
  const selectedMentionCount = selectedMentionIdsInOrder.length;
  return {
    selectedMentionIds: selectedMentionIdsInOrder,
    selectedPageIds: selectedItems.map((item) => item.page.id),
    selectedMentionCount,
    selectedItemCount: selectedItems.length,
    canLinkSelected: selectedMentionCount > 0,
  };
}

export function buildLoreEditorDraftPage(
  page: LorePage,
  updates: Pick<LorePage, "title" | "type"> & { tagsJson: string; fieldsJson: string },
) {
  if (
    page.title === updates.title &&
    page.type === updates.type &&
    (page.tagsJson ?? "") === updates.tagsJson &&
    (page.fieldsJson ?? "") === updates.fieldsJson
  ) {
    return page;
  }
  return {
    ...page,
    title: updates.title,
    type: updates.type,
    tagsJson: updates.tagsJson,
    fieldsJson: updates.fieldsJson,
  };
}

export function buildLoreTypeCounts(
  pages: LorePage[],
  orderedLoreTypes: LoreType[],
  resolveLoreTypeId: (page: LorePage) => string | null,
) {
  const counts = Object.fromEntries(orderedLoreTypes.map((type) => [type.id, 0]));
  for (const page of pages) {
    const loreTypeId = resolveLoreTypeId(page);
    if (!loreTypeId || !(loreTypeId in counts)) continue;
    counts[loreTypeId] += 1;
  }
  return counts;
}

export function collectLoreStats(
  pages: LorePage[],
  activeTypeId: string | null,
  orderedLoreTypes: LoreType[],
  resolveLoreTypeId: (page: LorePage) => string | null,
) {
  const counts = Object.fromEntries(orderedLoreTypes.map((type) => [type.id, 0]));
  const pagesForActiveType: LorePage[] = [];
  for (const page of pages) {
    const loreTypeId = resolveLoreTypeId(page);
    if (!loreTypeId || !(loreTypeId in counts)) continue;
    counts[loreTypeId] += 1;
    if (activeTypeId && loreTypeId === activeTypeId) {
      pagesForActiveType.push(page);
    }
  }
  return { counts, pagesForActiveType };
}
