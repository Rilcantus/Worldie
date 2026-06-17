import type { LorePage } from "./data";
import type { CustomFieldDefinition, CustomFieldDefinitionType } from "./customFieldDefinitions";
import type { LoreType } from "./loreTypes";

type LoreTableFieldValue = string | number | boolean | null;

type ParsedLoreTableFields = {
  loreTypeId: string | null;
  customFields: Record<string, LoreTableFieldValue>;
};

export type LoreTableColumn = {
  id: string;
  label: string;
  kind: "title" | "type" | "custom_field" | "updated";
  fieldType?: CustomFieldDefinitionType;
};

export type LoreTableRow = {
  page: LorePage;
  cells: Record<string, string>;
};

export type LoreTableModel = {
  loreType: LoreType | null;
  columns: LoreTableColumn[];
  rows: LoreTableRow[];
};

function slugText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function pageMatchesLoreType(page: LorePage, loreType: LoreType) {
  const fields = parseLoreTableFields(page.fieldsJson);
  if (fields.loreTypeId) {
    return fields.loreTypeId === loreType.id;
  }
  const pageType = page.type.trim().toLowerCase();
  return pageType === loreType.name.trim().toLowerCase() || slugText(page.type) === loreType.slug;
}

export function formatLoreTableValue(
  value: LoreTableFieldValue | undefined,
  fieldType: CustomFieldDefinitionType,
) {
  if (value === undefined || value === null || value === "") return "";
  if (fieldType === "checkbox") return value ? "Yes" : "No";
  return String(value);
}

function getCustomFieldValue(page: LorePage, field: CustomFieldDefinition) {
  const fields = parseLoreTableFields(page.fieldsJson);
  return fields.customFields[field.key] ?? fields.customFields[field.name] ?? field.defaultValue;
}

function parseLoreTableFields(fieldsJson: string | null | undefined): ParsedLoreTableFields {
  if (!fieldsJson?.trim()) return { loreTypeId: null, customFields: {} };
  try {
    const parsed = JSON.parse(fieldsJson) as { loreTypeId?: string | null; customFields?: Record<string, unknown> };
    return {
      loreTypeId: parsed.loreTypeId ?? null,
      customFields: normalizeCustomFields(parsed.customFields),
    };
  } catch {
    return { loreTypeId: null, customFields: {} };
  }
}

function normalizeCustomFields(fields: Record<string, unknown> | null | undefined) {
  if (!fields || typeof fields !== "object" || Array.isArray(fields)) return {};
  const normalized: Record<string, LoreTableFieldValue> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null) {
      normalized[key] = value;
    } else {
      normalized[key] = String(value);
    }
  }
  return normalized;
}

export function buildLoreTableModel(
  pages: LorePage[],
  loreTypes: LoreType[],
  selectedLoreTypeId: string | null,
): LoreTableModel {
  const loreType = (selectedLoreTypeId ? loreTypes.find((type) => type.id === selectedLoreTypeId) : null) ?? loreTypes[0] ?? null;
  if (!loreType) {
    return { loreType: null, columns: [], rows: [] };
  }

  const fieldColumns = loreType.fieldDefinitions.map((field) => ({
    id: field.id,
    label: field.name,
    kind: "custom_field" as const,
    fieldType: field.type,
  }));
  const columns: LoreTableColumn[] = [
    { id: "title", label: "Name", kind: "title" },
    { id: "type", label: "Type", kind: "type" },
    ...fieldColumns,
    { id: "updated", label: "Updated", kind: "updated" },
  ];

  const rows = pages
    .filter((page) => pageMatchesLoreType(page, loreType))
    .map((page) => {
      const cells: Record<string, string> = {
        title: page.title,
        type: page.type,
        updated: page.updatedAt ?? page.createdAt ?? "",
      };
      for (const field of loreType.fieldDefinitions) {
        cells[field.id] = formatLoreTableValue(getCustomFieldValue(page, field), field.type);
      }
      return { page, cells };
    });

  return { loreType, columns, rows };
}
