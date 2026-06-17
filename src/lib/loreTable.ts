import type { LorePage, LoreTableView } from "./data";
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

export type LoreTableSortDirection = "asc" | "desc";

export type LoreTableSort = {
  columnId: string;
  direction: LoreTableSortDirection;
};

export type LoreTableModel = {
  loreType: LoreType | null;
  columns: LoreTableColumn[];
  rows: LoreTableRow[];
};

export type LoreTableViewState = {
  loreTypeId: string;
  filterText: string;
  sort: LoreTableSort | null;
};

export type LoreTableViewDraft = Omit<LoreTableView, "id" | "worldId" | "createdAt" | "updatedAt">;

export function buildLoreTableViewDraft(name: string, state: LoreTableViewState): LoreTableViewDraft {
  return {
    name: name.trim() || "Untitled Table View",
    loreTypeId: state.loreTypeId || null,
    quickFilter: state.filterText.trim() || null,
    sortKey: state.sort?.columnId ?? null,
    sortDirection: state.sort?.direction ?? null,
    visibleColumnsJson: null,
  };
}

export function applyLoreTableView(
  view: LoreTableView,
  fallback: LoreTableViewState,
): LoreTableViewState {
  return {
    loreTypeId: view.loreTypeId || fallback.loreTypeId,
    filterText: view.quickFilter ?? "",
    sort:
      view.sortKey && (view.sortDirection === "asc" || view.sortDirection === "desc")
        ? { columnId: view.sortKey, direction: view.sortDirection }
        : fallback.sort,
  };
}

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

function getSearchText(row: LoreTableRow, columns: LoreTableColumn[]) {
  return columns
    .filter((column) => column.kind === "title" || column.kind === "custom_field")
    .map((column) => row.cells[column.id] ?? "")
    .join(" ")
    .toLowerCase();
}

function getSortValue(row: LoreTableRow, column: LoreTableColumn | undefined) {
  if (!column) return "";
  return row.cells[column.id] ?? "";
}

function compareLoreTableRows(
  left: LoreTableRow,
  right: LoreTableRow,
  column: LoreTableColumn | undefined,
  direction: LoreTableSortDirection,
) {
  const leftValue = getSortValue(left, column);
  const rightValue = getSortValue(right, column);
  if (!leftValue && !rightValue) return left.page.title.localeCompare(right.page.title);
  if (!leftValue) return 1;
  if (!rightValue) return -1;

  let comparison = 0;
  if (column?.fieldType === "number") {
    const leftNumber = Number(leftValue);
    const rightNumber = Number(rightValue);
    if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber) && leftNumber !== rightNumber) {
      comparison = leftNumber - rightNumber;
    }
  }

  if (comparison === 0 && column?.fieldType === "checkbox") {
    const leftNumber = leftValue === "Yes" ? 1 : 0;
    const rightNumber = rightValue === "Yes" ? 1 : 0;
    if (leftNumber !== rightNumber) comparison = leftNumber - rightNumber;
  }

  if (comparison === 0) {
    comparison = leftValue.localeCompare(rightValue, undefined, {
      numeric: column?.kind !== "custom_field",
    });
  }
  return direction === "desc" ? -comparison : comparison;
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
  options: { filterText?: string; sort?: LoreTableSort | null } = {},
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

  const filterText = options.filterText?.trim().toLowerCase() ?? "";
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
    })
    .filter((row) => !filterText || getSearchText(row, columns).includes(filterText));

  const sortColumn = options.sort ? columns.find((column) => column.id === options.sort?.columnId) : null;
  if (sortColumn && options.sort) {
    rows.sort((left, right) => {
      const comparison = compareLoreTableRows(left, right, sortColumn, options.sort?.direction ?? "asc");
      if (comparison !== 0) return comparison;
      return left.page.id.localeCompare(right.page.id);
    });
  }

  return { loreType, columns, rows };
}
