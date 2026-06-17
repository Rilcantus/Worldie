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
