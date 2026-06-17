import type { LorePage, LoreTableView } from "./data";
import type { CustomFieldDefinition, CustomFieldDefinitionType } from "./customFieldDefinitions";
import { parseLoreItemFields, stringifyLoreItemFields, type LoreCustomFieldValue } from "./loreItems.js";
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
  field?: CustomFieldDefinition;
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
  allColumns: LoreTableColumn[];
  rows: LoreTableRow[];
};

export type LoreTableViewState = {
  loreTypeId: string;
  filterText: string;
  sort: LoreTableSort | null;
  visibleColumnIds: string[] | null;
};

export type LoreTableViewDraft = Omit<LoreTableView, "id" | "worldId" | "createdAt" | "updatedAt">;

export type LoreTableCreateState = {
  title: string;
  loreType: LoreType | null;
  isCreating: boolean;
};

export type LoreTableCsvImportColumnMapping = {
  index: number;
  header: string;
  target: "title" | "worldie_id" | "custom_field" | "ignored" | "unmapped";
  fieldId?: string;
  fieldKey?: string;
  fieldName?: string;
  reason?: string;
};

export type LoreTableCsvImportMatchStatus =
  | "matched"
  | "new"
  | "unknown_id"
  | "malformed_id"
  | "wrong_type"
  | "duplicate_id"
  | "title_conflict";

export type LoreTableCsvImportRowMatch = {
  status: LoreTableCsvImportMatchStatus;
  worldieId: string | null;
  matchedPageId: string | null;
  matchedPageTitle: string | null;
};

export type LoreTableCsvImportPreviewRow = {
  rowNumber: number;
  title: string;
  customFields: Record<string, LoreCustomFieldValue>;
  match: LoreTableCsvImportRowMatch;
  warnings: string[];
  errors: string[];
};

export type LoreTableCsvImportMatchSummary = {
  matched: number;
  new: number;
  blocked: number;
  warnings: number;
};

export type LoreTableCsvImportPreview = {
  headers: string[];
  rowCount: number;
  validRowCount: number;
  mappedColumns: LoreTableCsvImportColumnMapping[];
  unmappedColumns: LoreTableCsvImportColumnMapping[];
  ignoredColumns: LoreTableCsvImportColumnMapping[];
  matchSummary: LoreTableCsvImportMatchSummary;
  warnings: string[];
  errors: string[];
  rows: LoreTableCsvImportPreviewRow[];
  sampleRows: LoreTableCsvImportPreviewRow[];
};

export type LoreTableCsvImportDraft = {
  title: string;
  loreTypeId: string;
  fieldsJson: string;
};

export function getLoreTableCreateState(state: LoreTableCreateState) {
  const title = state.title.trim();
  return {
    title,
    buttonLabel: state.loreType ? `Add ${state.loreType.name}` : "Add Lore Page",
    canCreate: Boolean(state.loreType && title && !state.isCreating),
  };
}

function escapeCsvCell(value: string) {
  const cell = value ?? "";
  const escaped = cell.replace(/"/g, '""');
  return /[",\r\n]/.test(escaped) ? `"${escaped}"` : escaped;
}

export function buildLoreTableCsv(model: Pick<LoreTableModel, "columns" | "rows">) {
  if (model.columns.length === 0) return "";
  return buildLoreTableCsvWithOptions(model);
}

export function buildLoreTableCsvWithOptions(
  model: Pick<LoreTableModel, "columns" | "rows">,
  options: { includeWorldieId?: boolean } = {},
) {
  if (model.columns.length === 0) return "";
  const headerCells = options.includeWorldieId ? ["Worldie ID", ...model.columns.map((column) => column.label)] : model.columns.map((column) => column.label);
  const header = headerCells.map((cell) => escapeCsvCell(cell)).join(",");
  const rows = model.rows.map((row) =>
    (options.includeWorldieId ? [row.page.id, ...model.columns.map((column) => row.cells[column.id] ?? "")] : model.columns.map((column) => row.cells[column.id] ?? ""))
      .map((cell) => escapeCsvCell(cell))
      .join(","),
  );
  return [header, ...rows].join("\n");
}

export function canExportLoreTableCsv(model: Pick<LoreTableModel, "loreType" | "columns">) {
  return Boolean(model.loreType && model.columns.length > 0);
}

export function buildLoreTableCsvFilename(worldTitle: string | null | undefined, loreTypeName: string | null | undefined) {
  const base = `${worldTitle?.trim() || "World"} - ${loreTypeName?.trim() || "Lore"} Table`;
  const safeBase = base
    .replace(/[<>:"/\\|?*\x00-\x1f]+/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[ .-]+$/g, "");
  return `${safeBase || "Lore Table"}.csv`;
}

export function buildLoreTableUpdateCsvFilename(worldTitle: string | null | undefined, loreTypeName: string | null | undefined) {
  const base = `${worldTitle?.trim() || "World"} - ${loreTypeName?.trim() || "Lore"} Table Update Ready`;
  const safeBase = base
    .replace(/[<>:"/\\|?*\x00-\x1f]+/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[ .-]+$/g, "");
  return `${safeBase || "Lore Table Update Ready"}.csv`;
}

function parseCsvRows(csvText: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  let index = 0;
  let error: string | null = null;
  const text = csvText.replace(/^\uFEFF/, "");

  while (index < text.length) {
    const char = text[index];
    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          cell += '"';
          index += 2;
          continue;
        }
        inQuotes = false;
        index += 1;
        continue;
      }
      cell += char;
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      index += 1;
      continue;
    }
    if (char === ",") {
      row.push(cell);
      cell = "";
      index += 1;
      continue;
    }
    if (char === "\r" || char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      if (char === "\r" && text[index + 1] === "\n") {
        index += 2;
      } else {
        index += 1;
      }
      continue;
    }
    cell += char;
    index += 1;
  }

  if (inQuotes) {
    error = "CSV has an unclosed quoted field.";
  }
  row.push(cell);
  if (row.some((value) => value.length > 0) || rows.length === 0) {
    rows.push(row);
  }
  return { rows, error };
}

function normalizeCsvHeader(value: string) {
  return value.trim().toLowerCase();
}

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());
}

function isEmptyCsvRow(row: string[]) {
  return row.every((value) => value.trim() === "");
}

function buildCsvColumnMappings(headers: string[], loreType: LoreType) {
  const fieldsByNameOrKey = new Map<string, CustomFieldDefinition>();
  for (const field of loreType.fieldDefinitions) {
    fieldsByNameOrKey.set(normalizeCsvHeader(field.name), field);
    fieldsByNameOrKey.set(normalizeCsvHeader(field.key), field);
  }
  return headers.map((header, index): LoreTableCsvImportColumnMapping => {
    const normalized = normalizeCsvHeader(header);
    if (["name", "title", "lore page"].includes(normalized)) {
      return { index, header, target: "title" };
    }
    if (normalized === "worldie id") {
      return { index, header, target: "worldie_id", reason: "Stable Worldie matching ID" };
    }
    if (["type", "updated"].includes(normalized)) {
      return { index, header, target: "ignored", reason: "Core export column" };
    }
    const field = fieldsByNameOrKey.get(normalized);
    if (field) {
      return {
        index,
        header,
        target: "custom_field",
        fieldId: field.id,
        fieldKey: field.key,
        fieldName: field.name,
      };
    }
    return { index, header, target: "unmapped" };
  });
}

function normalizeCsvPreviewValue(value: string, field: CustomFieldDefinition, rowNumber: number) {
  const trimmed = value.trim();
  if (!trimmed) return { value: "", warning: null, error: null };
  if (field.type === "number") {
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
      const message = `Row ${rowNumber}: ${field.name} is not a valid number.`;
      return { value: trimmed, warning: message, error: message };
    }
    return { value: parsed, warning: null, error: null };
  }
  if (field.type === "checkbox") {
    const normalized = trimmed.toLowerCase();
    if (["yes", "true", "1"].includes(normalized)) return { value: true, warning: null, error: null };
    if (["no", "false", "0"].includes(normalized)) return { value: false, warning: null, error: null };
    const message = `Row ${rowNumber}: ${field.name} is not a recognized checkbox value.`;
    return { value: trimmed, warning: message, error: message };
  }
  return { value: trimmed, warning: null, error: null };
}

function buildDefaultLoreTableCustomFields(loreType: LoreType) {
  const customFields: Record<string, LoreCustomFieldValue> = {};
  for (const field of loreType.fieldDefinitions) {
    if (field.defaultValue === undefined || field.defaultValue === null) continue;
    customFields[field.key] = field.defaultValue;
  }
  return customFields;
}

function createEmptyCsvImportPreview(warnings: string[], errors: string[]): LoreTableCsvImportPreview {
  return {
    headers: [],
    rowCount: 0,
    validRowCount: 0,
    mappedColumns: [],
    unmappedColumns: [],
    ignoredColumns: [],
    matchSummary: { matched: 0, new: 0, blocked: 0, warnings: warnings.length },
    warnings,
    errors,
    rows: [],
    sampleRows: [],
  };
}

function createNewCsvRowMatch(worldieId: string | null = null): LoreTableCsvImportRowMatch {
  return {
    status: worldieId ? "unknown_id" : "new",
    worldieId,
    matchedPageId: null,
    matchedPageTitle: null,
  };
}

function resolveCsvRowMatch(
  row: string[],
  rowNumber: number,
  mappings: LoreTableCsvImportColumnMapping[],
  title: string,
  loreType: LoreType,
  existingPages: LorePage[],
  seenIds: Set<string>,
) {
  const warnings: string[] = [];
  const errors: string[] = [];
  const idMapping = mappings.find((mapping) => mapping.target === "worldie_id");
  const worldieId = idMapping ? (row[idMapping.index] ?? "").trim() : "";
  if (!worldieId) {
    return { match: createNewCsvRowMatch(), warnings, errors };
  }
  if (!isUuidLike(worldieId)) {
    const message = `Row ${rowNumber}: Worldie ID is malformed.`;
    errors.push(message);
    return {
      match: { ...createNewCsvRowMatch(worldieId), status: "malformed_id" as const },
      warnings,
      errors,
    };
  }
  if (seenIds.has(worldieId)) {
    const message = `Row ${rowNumber}: duplicate Worldie ID targets the same existing page.`;
    errors.push(message);
    return {
      match: { ...createNewCsvRowMatch(worldieId), status: "duplicate_id" as const },
      warnings,
      errors,
    };
  }
  seenIds.add(worldieId);

  const matchedPage = existingPages.find((page) => page.id === worldieId) ?? null;
  if (!matchedPage) {
    const message = `Row ${rowNumber}: Worldie ID does not match a page in the selected table.`;
    warnings.push(message);
    return { match: createNewCsvRowMatch(worldieId), warnings, errors };
  }
  if (!pageMatchesLoreType(matchedPage, loreType)) {
    const message = `Row ${rowNumber}: Worldie ID belongs to a different lore type.`;
    errors.push(message);
    return {
      match: {
        status: "wrong_type" as const,
        worldieId,
        matchedPageId: matchedPage.id,
        matchedPageTitle: matchedPage.title,
      },
      warnings,
      errors,
    };
  }
  if (title && title !== matchedPage.title) {
    const message = `Row ${rowNumber}: Worldie ID matches "${matchedPage.title}" but the CSV title is "${title}".`;
    errors.push(message);
    return {
      match: {
        status: "title_conflict" as const,
        worldieId,
        matchedPageId: matchedPage.id,
        matchedPageTitle: matchedPage.title,
      },
      warnings,
      errors,
    };
  }
  warnings.push(`Row ${rowNumber}: Worldie ID matches existing page "${matchedPage.title}". Import as New Pages will still create a new page.`);
  return {
    match: {
      status: "matched" as const,
      worldieId,
      matchedPageId: matchedPage.id,
      matchedPageTitle: matchedPage.title,
    },
    warnings,
    errors,
  };
}

export function buildLoreTableCsvImportPreview(
  csvText: string,
  loreType: LoreType | null,
  options: { sampleLimit?: number; existingPages?: LorePage[] } = {},
): LoreTableCsvImportPreview {
  const sampleLimit = options.sampleLimit ?? 5;
  const warnings: string[] = [];
  const errors: string[] = [];
  if (!loreType) {
    errors.push("Choose a lore type before previewing CSV import.");
    return createEmptyCsvImportPreview(warnings, errors);
  }

  const parsed = parseCsvRows(csvText);
  if (parsed.error) errors.push(parsed.error);
  const [rawHeaders = [], ...rawRows] = parsed.rows;
  const headers = rawHeaders.map((header) => header.trim());
  if (headers.length === 0 || headers.every((header) => header === "")) {
    errors.push("CSV needs a header row.");
    return createEmptyCsvImportPreview(warnings, errors);
  }

  const mappings = buildCsvColumnMappings(headers, loreType);
  const mappedColumns = mappings.filter((mapping) => mapping.target === "title" || mapping.target === "worldie_id" || mapping.target === "custom_field");
  const unmappedColumns = mappings.filter((mapping) => mapping.target === "unmapped");
  const ignoredColumns = mappings.filter((mapping) => mapping.target === "ignored");
  const titleMapping = mappings.find((mapping) => mapping.target === "title");
  if (!titleMapping) {
    errors.push("CSV needs a Name, Title, or Lore Page column before it can be imported.");
  }

  let ignoredEmptyRows = 0;
  const nonEmptyRows = rawRows.map((row, index) => ({ row, rowNumber: index + 2 })).filter(({ row }) => {
    if (!isEmptyCsvRow(row)) return true;
    ignoredEmptyRows += 1;
    return false;
  });
  if (ignoredEmptyRows > 0) {
    warnings.push(`Ignored ${ignoredEmptyRows} empty row${ignoredEmptyRows === 1 ? "" : "s"}.`);
  }

  const fieldsById = new Map(loreType.fieldDefinitions.map((field) => [field.id, field]));
  const existingPages = options.existingPages ?? [];
  const seenWorldieIds = new Set<string>();
  const rows = nonEmptyRows.map(({ row, rowNumber }) => {
    const rowWarnings: string[] = [];
    const rowErrors: string[] = [];
    const title = titleMapping ? (row[titleMapping.index] ?? "").trim() : "";
    if (titleMapping && !title) {
      const message = `Row ${rowNumber}: title is blank.`;
      rowWarnings.push(message);
      rowErrors.push(message);
    }
    const customFields: Record<string, LoreCustomFieldValue> = {};
    for (const mapping of mappings) {
      if (mapping.target !== "custom_field" || !mapping.fieldId || !mapping.fieldKey) continue;
      const field = fieldsById.get(mapping.fieldId);
      if (!field) continue;
      const normalized = normalizeCsvPreviewValue(row[mapping.index] ?? "", field, rowNumber);
      customFields[mapping.fieldKey] = normalized.value;
      if (normalized.warning) rowWarnings.push(normalized.warning);
      if (normalized.error) rowErrors.push(normalized.error);
    }
    const match = resolveCsvRowMatch(row, rowNumber, mappings, title, loreType, existingPages, seenWorldieIds);
    rowWarnings.push(...match.warnings);
    rowErrors.push(...match.errors);
    return { rowNumber, title, customFields, match: match.match, warnings: rowWarnings, errors: rowErrors };
  });

  for (const row of rows) {
    warnings.push(...row.warnings);
    errors.push(...row.errors);
  }

  const matchSummary = rows.reduce<LoreTableCsvImportMatchSummary>(
    (summary, row) => {
      if (row.match.status === "matched") summary.matched += 1;
      if (row.match.status === "new" || row.match.status === "unknown_id") summary.new += 1;
      if (row.errors.length > 0) summary.blocked += 1;
      return summary;
    },
    { matched: 0, new: 0, blocked: 0, warnings: 0 },
  );
  matchSummary.warnings = warnings.length;

  return {
    headers,
    rowCount: nonEmptyRows.length,
    validRowCount: rows.filter((row) => row.errors.length === 0).length,
    mappedColumns,
    unmappedColumns,
    ignoredColumns,
    matchSummary,
    warnings,
    errors,
    rows,
    sampleRows: rows.slice(0, sampleLimit),
  };
}

export function canApplyLoreTableCsvImport(
  preview: LoreTableCsvImportPreview | null | undefined,
  loreType: LoreType | null | undefined,
  isImporting = false,
) {
  return Boolean(loreType && preview && preview.errors.length === 0 && preview.validRowCount > 0 && !isImporting);
}

export function buildLoreTableCsvImportDrafts(
  preview: LoreTableCsvImportPreview,
  loreType: LoreType,
): LoreTableCsvImportDraft[] {
  if (!canApplyLoreTableCsvImport(preview, loreType)) return [];
  const defaults = buildDefaultLoreTableCustomFields(loreType);
  return preview.rows.map((row) => {
    const csvCustomFields = Object.fromEntries(
      Object.entries(row.customFields).filter(([, value]) => value !== ""),
    );
    return {
      title: row.title,
      loreTypeId: loreType.id,
      fieldsJson: stringifyLoreItemFields({
        loreTypeId: loreType.id,
        templateId: null,
        traits: [],
        details: "",
        customFields: {
          ...defaults,
          ...csvCustomFields,
        },
      }),
    };
  });
}

export function buildLoreTableViewDraft(name: string, state: LoreTableViewState): LoreTableViewDraft {
  return {
    name: name.trim() || "Untitled Table View",
    loreTypeId: state.loreTypeId || null,
    quickFilter: state.filterText.trim() || null,
    sortKey: state.sort?.columnId ?? null,
    sortDirection: state.sort?.direction ?? null,
    visibleColumnsJson: state.visibleColumnIds ? JSON.stringify(state.visibleColumnIds) : null,
  };
}

export function parseVisibleColumnIds(value: string | null | undefined) {
  if (!value?.trim()) return null;
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return null;
    const ids = parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
    return ids.length > 0 ? ids : null;
  } catch {
    return null;
  }
}

export function resolveVisibleColumnIds(columns: LoreTableColumn[], visibleColumnIds: string[] | null | undefined) {
  const customColumnIds = columns.filter((column) => column.kind === "custom_field").map((column) => column.id);
  if (!visibleColumnIds) return customColumnIds;
  const knownCustomColumnIds = new Set(customColumnIds);
  return visibleColumnIds.filter((columnId) => knownCustomColumnIds.has(columnId));
}

export function toggleVisibleColumnId(
  columns: LoreTableColumn[],
  visibleColumnIds: string[] | null | undefined,
  columnId: string,
) {
  const current = new Set(resolveVisibleColumnIds(columns, visibleColumnIds));
  if (current.has(columnId)) {
    current.delete(columnId);
  } else {
    const knownCustomColumnIds = new Set(columns.filter((column) => column.kind === "custom_field").map((column) => column.id));
    if (knownCustomColumnIds.has(columnId)) current.add(columnId);
  }
  return columns
    .filter((column) => column.kind === "custom_field" && current.has(column.id))
    .map((column) => column.id);
}

export function clearHiddenColumnSort(sort: LoreTableSort | null, visibleColumns: LoreTableColumn[]) {
  if (!sort) return null;
  return visibleColumns.some((column) => column.id === sort.columnId) ? sort : null;
}

export function applyLoreTableView(
  view: LoreTableView,
  fallback: LoreTableViewState,
): LoreTableViewState {
  const visibleColumnIds = parseVisibleColumnIds(view.visibleColumnsJson);
  return {
    loreTypeId: view.loreTypeId || fallback.loreTypeId,
    filterText: view.quickFilter ?? "",
    sort:
      view.sortKey && (view.sortDirection === "asc" || view.sortDirection === "desc")
        ? { columnId: view.sortKey, direction: view.sortDirection }
        : fallback.sort,
    visibleColumnIds,
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

export function isLoreTableColumnEditable(column: LoreTableColumn) {
  return column.kind === "custom_field" && Boolean(column.field);
}

export function normalizeLoreTableEditValue(
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

export function applyLoreTableCustomFieldEdit(
  page: LorePage,
  field: CustomFieldDefinition,
  value: string | number | boolean | null,
): LorePage {
  const parsedFields = parseLoreItemFields(page.fieldsJson);
  const nextCustomFields = {
    ...parsedFields.customFields,
    [field.key]: normalizeLoreTableEditValue(field, value),
  };
  return {
    ...page,
    fieldsJson: stringifyLoreItemFields({
      ...parsedFields,
      customFields: nextCustomFields,
    }),
  };
}

export function getLoreTableCustomFieldValue(page: LorePage, field: CustomFieldDefinition) {
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
  options: { filterText?: string; sort?: LoreTableSort | null; visibleColumnIds?: string[] | null } = {},
): LoreTableModel {
  const loreType = (selectedLoreTypeId ? loreTypes.find((type) => type.id === selectedLoreTypeId) : null) ?? loreTypes[0] ?? null;
  if (!loreType) {
    return { loreType: null, columns: [], allColumns: [], rows: [] };
  }

  const fieldColumns = loreType.fieldDefinitions.map((field) => ({
    id: field.id,
    label: field.name,
    kind: "custom_field" as const,
    fieldType: field.type,
    field,
  }));
  const allColumns: LoreTableColumn[] = [
    { id: "title", label: "Name", kind: "title" },
    { id: "type", label: "Type", kind: "type" },
    ...fieldColumns,
    { id: "updated", label: "Updated", kind: "updated" },
  ];
  const visibleCustomColumnIds = new Set(resolveVisibleColumnIds(allColumns, options.visibleColumnIds));
  const columns = allColumns.filter((column) => column.kind !== "custom_field" || visibleCustomColumnIds.has(column.id));

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
        cells[field.id] = formatLoreTableValue(getLoreTableCustomFieldValue(page, field), field.type);
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

  return { loreType, columns, allColumns, rows };
}
