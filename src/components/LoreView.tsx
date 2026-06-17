import { memo, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import type { LorePage, LoreTableView } from "../lib/data";
import {
  parseLoreItemFields,
  renameLoreCustomField,
  stringifyLoreItemFields,
  type LoreCustomFields,
  type LoreCustomFieldValue,
  type LoreTrait,
} from "../lib/loreItems";
import type { LoreTemplate } from "../lib/loreTemplates";
import {
  applyLoreTableView,
  buildLoreTableModel,
  buildLoreTableCsv,
  buildLoreTableCsvFilename,
  buildLoreTableCsvWithOptions,
  buildLoreTableCsvImportPreview,
  buildLoreTableCsvImportDrafts,
  buildLoreTableUpdateCsvFilename,
  buildLoreTableViewDraft,
  canApplyLoreTableCsvImport,
  canExportLoreTableCsv,
  clearHiddenColumnSort,
  getLoreTableCreateState,
  getLoreTableCustomFieldValue,
  isLoreTableColumnEditable,
  resolveVisibleColumnIds,
  toggleVisibleColumnId,
  type LoreTableSort,
  type LoreTableCsvImportDraft,
  type LoreTableCsvImportPreview,
  type LoreTableViewState,
} from "../lib/loreTable";
import type { CustomFieldDefinition, LoreType } from "../lib/loreTypes";
import { resolveLoreLinks } from "../lib/loreLinks";
import type { WorldUI } from "../types/ui";

type LoreViewProps = {
  isDocListCollapsed: boolean;
  isSidebarCollapsed: boolean;
  isRightPanelCollapsed: boolean;
  docListWidth: number;
  lorePages: LorePage[];
  availableLorePages: LorePage[];
  templates: LoreTemplate[];
  loreTypes: LoreType[];
  activeLoreId: string | null;
  activeLoreTypeId: string | null;
  loreTitle: string;
  loreTags: string;
  loreFields: string;
  lorePageTypeId: string | null;
  loreTableViews: LoreTableView[];
  activeWorld?: WorldUI;
  onCollapseDocList: () => void;
  onExpandDocList: () => void;
  onExpandSidebar: () => void;
  onExpandRightPanel: () => void;
  onResizeStart: (event: ReactMouseEvent<HTMLDivElement>) => void;
  onOpenLoreCreate: () => void;
  onOpenLoreTypes: () => void;
  onOpenLore: (page: LorePage) => void;
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
  onSave: () => void;
  onTitleChange: (value: string) => void;
  onTagsChange: (value: string) => void;
  onFieldsChange: (value: string) => void;
  onPageTypeChange: (value: string) => void;
};

function createBlankTrait(): LoreTrait {
  return {
    id: crypto.randomUUID(),
    name: "New Trait",
    value: "",
  };
}

function normalizeCustomFieldName(value: string) {
  return value.trim() || "Custom field";
}

function formatCustomFieldInputValue(value: LoreCustomFieldValue | undefined) {
  return value == null ? "" : String(value);
}

function formatCsvImportPreviewValue(value: LoreCustomFieldValue | undefined) {
  if (value === undefined || value === null || value === "") return "blank";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export const LoreView = memo(function LoreView({
  isDocListCollapsed,
  isSidebarCollapsed,
  isRightPanelCollapsed,
  docListWidth,
  lorePages,
  availableLorePages,
  templates,
  loreTypes,
  activeLoreId,
  activeLoreTypeId,
  loreTitle,
  loreTags,
  loreFields,
  lorePageTypeId,
  loreTableViews,
  activeWorld,
  onCollapseDocList,
  onExpandDocList,
  onExpandSidebar,
  onExpandRightPanel,
  onResizeStart,
  onOpenLoreCreate,
  onOpenLoreTypes,
  onOpenLore,
  onRemoveLorePage,
  onSaveLoreTableView,
  onUpdateLoreTableView,
  onDeleteLoreTableView,
  onUpdateLoreTableCustomField,
  onCreateLoreFromTable,
  onExportLoreTableCsv,
  onImportLoreTableCsv,
  onSave,
  onTitleChange,
  onTagsChange,
  onFieldsChange,
  onPageTypeChange,
}: LoreViewProps) {
  const loreTypeInputId = "lore-view-type";
  const tableLoreTypeInputId = "lore-table-type";
  const templateUsedInputId = "lore-view-template-used";
  const tagsInputId = "lore-view-tags";
  const detailsInputId = "lore-view-details";
  const csvImportInputRef = useRef<HTMLInputElement | null>(null);
  const loreTypesById = useMemo(() => new Map(loreTypes.map((type) => [type.id, type])), [loreTypes]);
  const templatesById = useMemo(() => new Map(templates.map((template) => [template.id, template])), [templates]);
  const activeLoreType = useMemo(
    () => (activeLoreTypeId ? loreTypesById.get(activeLoreTypeId) : null) ?? loreTypes[0] ?? null,
    [activeLoreTypeId, loreTypes, loreTypesById],
  );
  const [tableLoreTypeId, setTableLoreTypeId] = useState(activeLoreType?.id ?? "");
  const [tableFilterText, setTableFilterText] = useState("");
  const [tableSort, setTableSort] = useState<LoreTableSort | null>({ columnId: "title", direction: "asc" });
  const [visibleTableColumnIds, setVisibleTableColumnIds] = useState<string[] | null>(null);
  const [selectedTableViewId, setSelectedTableViewId] = useState("");
  const [tableViewName, setTableViewName] = useState("");
  const [tableCreateTitle, setTableCreateTitle] = useState("");
  const [isCreatingTableLore, setIsCreatingTableLore] = useState(false);
  const [isExportingTableCsv, setIsExportingTableCsv] = useState(false);
  const [isImportingTableCsv, setIsImportingTableCsv] = useState(false);
  const [csvImportFilename, setCsvImportFilename] = useState("");
  const [csvImportPreview, setCsvImportPreview] = useState<LoreTableCsvImportPreview | null>(null);
  const [csvImportResult, setCsvImportResult] = useState("");
  const [tableEditError, setTableEditError] = useState("");
  useEffect(() => {
    if (tableLoreTypeId && loreTypesById.has(tableLoreTypeId)) return;
    setTableLoreTypeId(activeLoreType?.id ?? "");
    setVisibleTableColumnIds(null);
  }, [activeLoreType?.id, loreTypesById, tableLoreTypeId]);
  const loreItemFields = useMemo(() => parseLoreItemFields(loreFields), [loreFields]);
  const templateUsed = useMemo(
    () => (loreItemFields.templateId ? templatesById.get(loreItemFields.templateId) : null) ?? null,
    [loreItemFields.templateId, templatesById],
  );
  const { linked: linkedLorePages, unresolved: unresolvedLoreLinks } = useMemo(
    () => resolveLoreLinks(`${loreTags}\n${loreItemFields.details}`, availableLorePages),
    [availableLorePages, loreItemFields.details, loreTags],
  );
  const filteredLinkedLorePages = linkedLorePages.filter((page) => page.id !== activeLoreId);
  const loreTableModel = useMemo(
    () =>
      buildLoreTableModel(availableLorePages, loreTypes, tableLoreTypeId || activeLoreType?.id || null, {
        filterText: tableFilterText,
        sort: tableSort,
        visibleColumnIds: visibleTableColumnIds,
      }),
    [activeLoreType?.id, availableLorePages, loreTypes, tableFilterText, tableLoreTypeId, tableSort, visibleTableColumnIds],
  );
  const visibleCustomColumnIds = useMemo(
    () => resolveVisibleColumnIds(loreTableModel.allColumns, visibleTableColumnIds),
    [loreTableModel.allColumns, visibleTableColumnIds],
  );
  const tableCreateState = getLoreTableCreateState({
    title: tableCreateTitle,
    loreType: loreTableModel.loreType,
    isCreating: isCreatingTableLore,
  });
  const canExportTableCsv = canExportLoreTableCsv(loreTableModel);
  const canImportTableCsv = canApplyLoreTableCsvImport(csvImportPreview, loreTableModel.loreType, isImportingTableCsv);
  useEffect(() => {
    setTableSort((current) => clearHiddenColumnSort(current, loreTableModel.columns));
  }, [loreTableModel.columns]);
  useEffect(() => {
    setCsvImportFilename("");
    setCsvImportPreview(null);
    setCsvImportResult("");
  }, [loreTableModel.loreType?.id]);

  const toggleTableSort = (columnId: string) => {
    setTableSort((current) =>
      current?.columnId === columnId
        ? { columnId, direction: current.direction === "asc" ? "desc" : "asc" }
        : { columnId, direction: "asc" },
    );
  };

  const getCurrentTableViewState = (): LoreTableViewState => ({
    loreTypeId: loreTableModel.loreType?.id ?? tableLoreTypeId,
    filterText: tableFilterText,
    sort: tableSort,
    visibleColumnIds: visibleTableColumnIds,
  });

  const applySavedTableView = (viewId: string) => {
    setSelectedTableViewId(viewId);
    const view = loreTableViews.find((item) => item.id === viewId);
    if (!view) return;
    const nextState = applyLoreTableView(view, getCurrentTableViewState());
    setTableLoreTypeId(nextState.loreTypeId);
    setTableFilterText(nextState.filterText);
    setTableSort(nextState.sort);
    setVisibleTableColumnIds(nextState.visibleColumnIds);
    setTableViewName(view.name);
  };

  const toggleTableColumnVisibility = (columnId: string) => {
    setVisibleTableColumnIds((current) => {
      const next = toggleVisibleColumnId(loreTableModel.allColumns, current, columnId);
      setTableSort((sort) => clearHiddenColumnSort(sort, loreTableModel.allColumns.filter(
        (column) => column.kind !== "custom_field" || next.includes(column.id),
      )));
      return next;
    });
  };

  const saveCurrentTableViewAsNew = async () => {
    const fallbackName = loreTableModel.loreType ? `${loreTableModel.loreType.name} View` : "Lore Table View";
    const created = await onSaveLoreTableView(
      buildLoreTableViewDraft(tableViewName || fallbackName, getCurrentTableViewState()),
    );
    if (!created) return;
    setSelectedTableViewId(created.id);
    setTableViewName(created.name);
  };

  const updateSelectedTableView = async () => {
    if (!selectedTableViewId) return;
    const fallbackName = loreTableViews.find((view) => view.id === selectedTableViewId)?.name ?? "Lore Table View";
    const saved = await onUpdateLoreTableView(
      selectedTableViewId,
      buildLoreTableViewDraft(tableViewName || fallbackName, getCurrentTableViewState()),
    );
    if (!saved) return;
    setTableViewName(tableViewName || fallbackName);
  };

  const deleteSelectedTableView = async () => {
    if (!selectedTableViewId) return;
    const deleted = await onDeleteLoreTableView(selectedTableViewId);
    if (!deleted) return;
    setSelectedTableViewId("");
    setTableViewName("");
  };

  const updateLoreTableCell = async (loreId: string, field: CustomFieldDefinition, value: LoreCustomFieldValue) => {
    setTableEditError("");
    const saved = await onUpdateLoreTableCustomField(loreId, field, value);
    if (!saved) {
      setTableEditError("Worldie could not save that table edit.");
    }
  };

  const createLoreFromTable = async () => {
    if (!loreTableModel.loreType || !tableCreateState.canCreate) return;
    setTableEditError("");
    setIsCreatingTableLore(true);
    const created = await onCreateLoreFromTable({
      title: tableCreateState.title,
      loreTypeId: loreTableModel.loreType.id,
      templateId: null,
      tags: "",
    });
    setIsCreatingTableLore(false);
    if (!created) {
      setTableEditError("Worldie could not create that lore page from the table.");
      return;
    }
    setTableCreateTitle("");
  };

  const exportLoreTableCsv = async () => {
    if (!canExportTableCsv || !loreTableModel.loreType) return;
    setTableEditError("");
    setIsExportingTableCsv(true);
    const exported = await onExportLoreTableCsv({
      filename: buildLoreTableCsvFilename(activeWorld?.name, loreTableModel.loreType.name),
      csvText: buildLoreTableCsv(loreTableModel),
    });
    setIsExportingTableCsv(false);
    if (!exported) {
      setTableEditError("Worldie could not export that Lore Table CSV.");
    }
  };

  const exportLoreTableUpdateCsv = async () => {
    if (!canExportTableCsv || !loreTableModel.loreType) return;
    setTableEditError("");
    setIsExportingTableCsv(true);
    const exported = await onExportLoreTableCsv({
      filename: buildLoreTableUpdateCsvFilename(activeWorld?.name, loreTableModel.loreType.name),
      csvText: buildLoreTableCsvWithOptions(loreTableModel, { includeWorldieId: true }),
    });
    setIsExportingTableCsv(false);
    if (!exported) {
      setTableEditError("Worldie could not export that update-ready Lore Table CSV.");
    }
  };

  const previewLoreTableCsvImport = async (file: File | null | undefined) => {
    if (!file || !loreTableModel.loreType) return;
    setTableEditError("");
    try {
      const text = await file.text();
      setCsvImportFilename(file.name);
      setCsvImportPreview(buildLoreTableCsvImportPreview(text, loreTableModel.loreType, { existingPages: availableLorePages }));
      setCsvImportResult("");
    } catch {
      setCsvImportFilename(file.name);
      setCsvImportPreview(null);
      setTableEditError("Worldie could not read that CSV file.");
    } finally {
      if (csvImportInputRef.current) csvImportInputRef.current.value = "";
    }
  };

  const importLoreTableCsvAsNewPages = async () => {
    if (!csvImportPreview || !loreTableModel.loreType || !canImportTableCsv) return;
    setTableEditError("");
    setCsvImportResult("");
    const drafts = buildLoreTableCsvImportDrafts(csvImportPreview, loreTableModel.loreType);
    if (drafts.length === 0) return;
    setIsImportingTableCsv(true);
    const result = await onImportLoreTableCsv({
      loreTypeId: loreTableModel.loreType.id,
      drafts,
    });
    setIsImportingTableCsv(false);
    if (!result) {
      setTableEditError("Worldie could not import those CSV rows.");
      return;
    }
    if (!result.success) {
      setTableEditError(
        result.createdCount > 0
          ? `Worldie imported ${result.createdCount} lore page${result.createdCount === 1 ? "" : "s"} before the CSV import failed.`
          : "Worldie could not import those CSV rows.",
      );
      return;
    }
    setCsvImportResult(`Imported ${result.createdCount} lore page${result.createdCount === 1 ? "" : "s"} from CSV.`);
  };

  const persistFields = (
    traits = loreItemFields.traits,
    details = loreItemFields.details,
    customFields = loreItemFields.customFields,
  ) => {
    onFieldsChange(
      stringifyLoreItemFields({
        loreTypeId: lorePageTypeId,
        templateId: loreItemFields.templateId,
        traits,
        details,
        customFields,
      }),
    );
  };

  const persistTraits = (traits: LoreTrait[], details = loreItemFields.details) => {
    persistFields(traits, details);
  };

  const updateTrait = (traitId: string, updates: Partial<LoreTrait>) => {
    persistTraits(
      loreItemFields.traits.map((trait) => (trait.id === traitId ? { ...trait, ...updates } : trait)),
    );
  };

  const removeTrait = (traitId: string) => {
    persistTraits(loreItemFields.traits.filter((trait) => trait.id !== traitId));
  };

  const fieldDefinitions = activeLoreType?.fieldDefinitions ?? [];
  const definitionKeys = useMemo(
    () => new Set(fieldDefinitions.flatMap((field) => [field.key, field.name])),
    [fieldDefinitions],
  );
  const manualCustomFieldEntries = Object.entries(loreItemFields.customFields).filter(([name]) => !definitionKeys.has(name));

  const persistCustomFields = (customFields: LoreCustomFields) => {
    persistFields(loreItemFields.traits, loreItemFields.details, customFields);
  };

  const addCustomField = () => {
    const baseName = "Custom field";
    let nextName = baseName;
    let index = 2;
    while (Object.prototype.hasOwnProperty.call(loreItemFields.customFields, nextName)) {
      nextName = `${baseName} ${index}`;
      index += 1;
    }
    persistCustomFields({ ...loreItemFields.customFields, [nextName]: "" });
  };

  const renameCustomField = (previousName: string, nextName: string) => {
    persistCustomFields(
      renameLoreCustomField(loreItemFields.customFields, previousName, normalizeCustomFieldName(nextName)),
    );
  };

  const updateCustomFieldValue = (name: string, value: string) => {
    persistCustomFields({ ...loreItemFields.customFields, [name]: value });
  };

  const updateDefinedCustomFieldValue = (field: CustomFieldDefinition, value: LoreCustomFieldValue) => {
    persistCustomFields({ ...loreItemFields.customFields, [field.key]: value });
  };

  const removeCustomField = (name: string) => {
    const { [name]: _removed, ...nextFields } = loreItemFields.customFields;
    persistCustomFields(nextFields);
  };

  const renderDefinedCustomFieldControl = (field: CustomFieldDefinition) => {
    const value = loreItemFields.customFields[field.key] ?? loreItemFields.customFields[field.name] ?? field.defaultValue ?? "";
    if (field.type === "long_text") {
      return (
        <textarea
          aria-label={`${field.name} value`}
          className="lore-textarea custom-field-textarea"
          value={formatCustomFieldInputValue(value)}
          onChange={(event) => updateDefinedCustomFieldValue(field, event.target.value)}
          placeholder={field.name}
        />
      );
    }
    if (field.type === "checkbox") {
      return (
        <label className="meta-tag custom-field-checkbox">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(event) => updateDefinedCustomFieldValue(field, event.target.checked)}
          />
          {Boolean(value) ? "Yes" : "No"}
        </label>
      );
    }
    if (field.type === "select") {
      return (
        <select
          aria-label={`${field.name} value`}
          className="lore-input"
          value={formatCustomFieldInputValue(value)}
          onChange={(event) => updateDefinedCustomFieldValue(field, event.target.value)}
        >
          <option value="">No value</option>
          {field.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }
    return (
      <input
        aria-label={`${field.name} value`}
        className="lore-input"
        type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
        value={formatCustomFieldInputValue(value)}
        onChange={(event) =>
          updateDefinedCustomFieldValue(
            field,
            field.type === "number" && event.target.value !== "" ? Number(event.target.value) : event.target.value,
          )
        }
        placeholder={field.name}
      />
    );
  };

  const renderLoreTableCell = (row: { page: LorePage; cells: Record<string, string> }, column: typeof loreTableModel.columns[number]) => {
    if (column.kind === "title") {
      return (
        <button className="lore-table-link" type="button" onClick={() => onOpenLore(row.page)}>
          {row.cells[column.id]}
        </button>
      );
    }
    if (!isLoreTableColumnEditable(column) || !column.field) {
      return row.cells[column.id];
    }
    const field = column.field;
    const rawValue = getLoreTableCustomFieldValue(row.page, field);
    const inputValue = formatCustomFieldInputValue(rawValue);
    if (field.type === "checkbox") {
      return (
        <input
          className="lore-table-cell-checkbox"
          type="checkbox"
          checked={Boolean(rawValue)}
          aria-label={`${row.page.title} ${field.name}`}
          onChange={(event) => void updateLoreTableCell(row.page.id, field, event.target.checked)}
        />
      );
    }
    if (field.type === "select") {
      return (
        <select
          className="lore-input lore-table-cell-input"
          value={inputValue}
          aria-label={`${row.page.title} ${field.name}`}
          onChange={(event) => void updateLoreTableCell(row.page.id, field, event.target.value)}
        >
          <option value=""></option>
          {field.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }
    return (
      <input
        className="lore-input lore-table-cell-input"
        type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
        value={inputValue}
        aria-label={`${row.page.title} ${field.name}`}
        onChange={(event) =>
          void updateLoreTableCell(
            row.page.id,
            field,
            field.type === "number" && event.target.value !== "" ? Number(event.target.value) : event.target.value,
          )
        }
      />
    );
  };

  return (
    <>
      <div
        className={`doc-list ${isDocListCollapsed ? "collapsed" : ""}`}
        style={{
          width: isDocListCollapsed ? 0 : docListWidth,
          minWidth: isDocListCollapsed ? 0 : 220,
          flexShrink: 0,
        }}
      >
        {!isDocListCollapsed ? (
          <>
            <div className="doc-list-header">
              <div className="doc-list-title">{activeLoreType?.name ?? "Lore"}</div>
              <div className="doc-list-actions">
                <button className="panel-toggle" type="button" onClick={onCollapseDocList} title="Collapse list (Ctrl+2)">
                  &lsaquo;
                </button>
                <button className="doc-add" type="button" onClick={onOpenLoreCreate}>
                  +
                </button>
              </div>
            </div>
            <div className="doc-list-body">
              {lorePages.length === 0 ? (
                <div className="doc-empty">No lore pages yet.</div>
              ) : (
                lorePages.map((page) => (
                  <div key={page.id} className="doc-item-row">
                    <button
                      className={`doc-item ${page.id === activeLoreId ? "active" : ""}`}
                      type="button"
                      onClick={() => onOpenLore(page)}
                    >
                      <div className="doc-item-info">
                        <div className="doc-item-title">{page.title}</div>
                        <div className="doc-item-meta">{page.type}</div>
                      </div>
                    </button>
                    <button
                      className="doc-item-delete"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onRemoveLorePage(page.id);
                      }}
                    >
                      x
                    </button>
                  </div>
                ))
              )}
            </div>
          </>
        ) : null}
      </div>

      {!isDocListCollapsed ? <div className="resizer resizer-vertical" onMouseDown={onResizeStart} /> : null}

      <div className="editor-pane">
        {isSidebarCollapsed || isRightPanelCollapsed || isDocListCollapsed ? (
          <div className="collapsed-strip-row">
            {isSidebarCollapsed ? (
              <div className="collapsed-strip">
                <span>Project</span>
                <button className="panel-toggle" type="button" onClick={onExpandSidebar} title="Expand sidebar (Ctrl+1)">
                  &rsaquo;
                </button>
              </div>
            ) : null}
            {isDocListCollapsed ? (
              <div className="collapsed-strip">
                <span>{activeLoreType?.name ?? "Lore"}</span>
                <button className="panel-toggle" type="button" onClick={onExpandDocList} title="Expand list (Ctrl+2)">
                  &rsaquo;
                </button>
              </div>
            ) : null}
            {isRightPanelCollapsed ? (
              <div className="collapsed-strip">
                <button className="panel-toggle" type="button" onClick={onExpandRightPanel} title="Expand panel (Ctrl+3)">
                  &lsaquo;
                </button>
                <span>Context</span>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="editor-toolbar">
          <button className="tb-btn" type="button" onClick={onOpenLoreTypes}>
            Lore Types
          </button>
          <button className="tb-btn tb-save" type="button" onClick={onSave}>
            Save
          </button>
        </div>

        <input
          className="doc-title-input"
          value={loreTitle}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder="Lore title"
        />
        <div className="doc-meta">
          <div className="meta-tag">
            <div className="meta-dot"></div> {activeWorld?.name ?? "World"}
          </div>
          <div className="meta-tag">{activeLoreType?.name ?? "Lore"}</div>
        </div>

        <div className="lore-panel">
          <div className="lore-panel-header">
            <div className="linked-lore-label">Lore Table</div>
            <div className="lore-table-controls">
              <select
                className="lore-input lore-table-view-select"
                value={selectedTableViewId}
                onChange={(event) => applySavedTableView(event.target.value)}
              >
                <option value="">Saved views</option>
                {loreTableViews.map((view) => (
                  <option key={view.id} value={view.id}>
                    {view.name}
                  </option>
                ))}
              </select>
              <input
                className="lore-input lore-table-filter"
                value={tableFilterText}
                onChange={(event) => setTableFilterText(event.target.value)}
                placeholder="Filter table"
              />
              <select
                id={tableLoreTypeInputId}
                className="lore-input lore-table-type-select"
                value={loreTableModel.loreType?.id ?? ""}
                onChange={(event) => {
                  setTableLoreTypeId(event.target.value);
                  setVisibleTableColumnIds(null);
                  setTableSort({ columnId: "title", direction: "asc" });
                }}
              >
                {loreTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
              <input
                className="lore-input lore-table-view-name"
                value={tableViewName}
                onChange={(event) => setTableViewName(event.target.value)}
                placeholder="View name"
              />
              <button className="tb-btn" type="button" onClick={saveCurrentTableViewAsNew} disabled={!loreTableModel.loreType}>
                Save New
              </button>
              <button className="tb-btn" type="button" onClick={updateSelectedTableView} disabled={!selectedTableViewId}>
                Update
              </button>
              <button className="tb-btn" type="button" onClick={deleteSelectedTableView} disabled={!selectedTableViewId}>
                Delete
              </button>
              <button className="tb-btn" type="button" onClick={() => void exportLoreTableCsv()} disabled={!canExportTableCsv || isExportingTableCsv}>
                {isExportingTableCsv ? "Exporting..." : "Export CSV"}
              </button>
              <button className="tb-btn" type="button" onClick={() => void exportLoreTableUpdateCsv()} disabled={!canExportTableCsv || isExportingTableCsv}>
                Export Update CSV
              </button>
              <button className="tb-btn" type="button" onClick={() => csvImportInputRef.current?.click()} disabled={!loreTableModel.loreType}>
                Import CSV Preview
              </button>
              <input
                ref={csvImportInputRef}
                className="sr-only"
                type="file"
                accept=".csv,text/csv"
                onChange={(event) => void previewLoreTableCsvImport(event.target.files?.[0])}
              />
            </div>
          </div>
          {loreTableModel.allColumns.some((column) => column.kind === "custom_field") ? (
            <div className="lore-table-column-controls" aria-label="Lore table columns">
              <span className="lore-table-column-label">Columns</span>
              {loreTableModel.allColumns
                .filter((column) => column.kind === "custom_field")
                .map((column) => (
                  <label key={column.id} className="meta-tag lore-table-column-toggle">
                    <input
                      type="checkbox"
                      checked={visibleCustomColumnIds.includes(column.id)}
                      onChange={() => toggleTableColumnVisibility(column.id)}
                    />
                    {column.label}
                  </label>
              ))}
            </div>
          ) : null}
          {loreTableModel.loreType ? (
            <form
              className="lore-table-create-row"
              onSubmit={(event) => {
                event.preventDefault();
                void createLoreFromTable();
              }}
            >
              <input
                className="lore-input lore-table-create-input"
                value={tableCreateTitle}
                onChange={(event) => setTableCreateTitle(event.target.value)}
                placeholder={`New ${loreTableModel.loreType.name} title`}
                aria-label={`New ${loreTableModel.loreType.name} title`}
                disabled={isCreatingTableLore}
              />
              <button className="tb-btn" type="submit" disabled={!tableCreateState.canCreate}>
                {isCreatingTableLore ? "Adding..." : tableCreateState.buttonLabel}
              </button>
            </form>
          ) : null}
          {csvImportPreview ? (
            <div className="lore-table-import-preview">
              <div className="lore-table-import-preview-head">
                <div>
                  <div className="lore-table-import-title">CSV Import Preview</div>
                  <div className="lore-table-import-meta">
                    {csvImportFilename || "CSV file"} - {csvImportPreview.headers.length} headers - {csvImportPreview.rowCount} rows
                  </div>
                  <div className="lore-table-import-meta">
                    {csvImportPreview.matchSummary.matched} matched - {csvImportPreview.matchSummary.new} new/no ID -{" "}
                    {csvImportPreview.matchSummary.blocked} blocked - {csvImportPreview.matchSummary.warnings} warnings
                  </div>
                </div>
                <div className="lore-table-import-actions">
                  <button className="tb-btn" type="button" onClick={() => void importLoreTableCsvAsNewPages()} disabled={!canImportTableCsv}>
                    {isImportingTableCsv ? "Importing..." : "Import as New Pages"}
                  </button>
                  <button
                    className="tb-btn"
                    type="button"
                    onClick={() => {
                      setCsvImportFilename("");
                      setCsvImportPreview(null);
                      setCsvImportResult("");
                    }}
                    disabled={isImportingTableCsv}
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className="lore-table-import-grid">
                <div>
                  <div className="lore-table-import-label">Mapped</div>
                  <div className="lore-table-import-list">
                    {csvImportPreview.mappedColumns.length > 0
                      ? csvImportPreview.mappedColumns.map((column) => (
                          <span key={`${column.index}-${column.header}`} className="meta-tag">
                            {column.header} -&gt; {column.target === "title" ? "Name" : column.target === "worldie_id" ? "Worldie ID" : column.fieldName}
                          </span>
                        ))
                      : "No mapped columns."}
                  </div>
                </div>
                <div>
                  <div className="lore-table-import-label">Unmapped</div>
                  <div className="lore-table-import-list">
                    {csvImportPreview.unmappedColumns.length > 0
                      ? csvImportPreview.unmappedColumns.map((column) => (
                          <span key={`${column.index}-${column.header}`} className="meta-tag">
                            {column.header}
                          </span>
                        ))
                      : "None"}
                  </div>
                </div>
                <div>
                  <div className="lore-table-import-label">Ignored</div>
                  <div className="lore-table-import-list">
                    {csvImportPreview.ignoredColumns.length > 0
                      ? csvImportPreview.ignoredColumns.map((column) => (
                          <span key={`${column.index}-${column.header}`} className="meta-tag">
                            {column.header}
                          </span>
                        ))
                      : "None"}
                  </div>
                </div>
              </div>
              {csvImportPreview.errors.length > 0 ? (
                <div className="lore-table-import-messages error">
                  {csvImportPreview.errors.map((message) => (
                    <div key={message}>{message}</div>
                  ))}
                </div>
              ) : null}
              {csvImportPreview.warnings.length > 0 ? (
                <div className="lore-table-import-messages">
                  {csvImportPreview.warnings.slice(0, 6).map((message) => (
                    <div key={message}>{message}</div>
                  ))}
                </div>
              ) : null}
              {csvImportResult ? <div className="lore-table-import-messages success">{csvImportResult}</div> : null}
              {csvImportPreview.sampleRows.length > 0 ? (
                <div className="lore-table-import-samples">
                  {csvImportPreview.sampleRows.map((row) => (
                    <div key={row.rowNumber} className="lore-table-import-sample">
                      <strong>{row.title || `Row ${row.rowNumber}`}</strong>
                      <span>
                        {row.match.status === "matched"
                          ? `Matched: ${row.match.matchedPageTitle}`
                          : row.match.status === "new"
                            ? "New row"
                            : row.match.status === "unknown_id"
                              ? `Unknown ID: ${row.match.worldieId}`
                              : row.match.status === "malformed_id"
                                ? "Malformed Worldie ID"
                                : row.match.status === "wrong_type"
                                  ? `Wrong type: ${row.match.matchedPageTitle ?? row.match.worldieId}`
                                  : row.match.status === "duplicate_id"
                                    ? `Duplicate ID: ${row.match.worldieId}`
                                    : `Title conflict: ${row.match.matchedPageTitle ?? row.match.worldieId}`}
                      </span>
                      {Object.entries(row.customFields).map(([key, value]) => (
                        <span key={key}>
                          {key}: {formatCsvImportPreviewValue(value)}
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
          {tableEditError ? <div className="lore-table-error">{tableEditError}</div> : null}
          {loreTableModel.loreType ? (
            <div className="lore-table-wrap">
              <table className="lore-table">
                <thead>
                  <tr>
                    {loreTableModel.columns.map((column) => (
                      <th key={column.id}>
                        <button className="lore-table-sort" type="button" onClick={() => toggleTableSort(column.id)}>
                          <span>{column.label}</span>
                          {tableSort?.columnId === column.id ? (
                            <span className="lore-table-sort-direction">{tableSort.direction === "asc" ? "Asc" : "Desc"}</span>
                          ) : null}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loreTableModel.rows.length === 0 ? (
                    <tr>
                      <td colSpan={loreTableModel.columns.length || 1}>
                        {tableFilterText.trim()
                          ? "No lore pages match this filter."
                          : `No ${loreTableModel.loreType.name.toLowerCase()} lore pages yet.`}
                      </td>
                    </tr>
                  ) : (
                    loreTableModel.rows.map((row) => (
                      <tr key={row.page.id}>
                        {loreTableModel.columns.map((column) => (
                          <td key={column.id}>{renderLoreTableCell(row, column)}</td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rp-empty">Create a lore type to start using the table view.</div>
          )}
        </div>

        <div className="lore-panel">
          <div className="lore-panel-header">
            <div className="linked-lore-label">Basic Info</div>
          </div>
          <label className="lore-label" htmlFor={loreTypeInputId}>Lore Type</label>
          <select id={loreTypeInputId} className="lore-input" value={lorePageTypeId ?? ""} onChange={(event) => onPageTypeChange(event.target.value)}>
            {loreTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>

          <label className="lore-label" htmlFor={templateUsedInputId}>Template Used</label>
          <input
            id={templateUsedInputId}
            className="lore-input lore-readonly"
            value={templateUsed?.name ?? "No template"}
            readOnly
            placeholder="No template"
          />

          <label className="lore-label" htmlFor={tagsInputId}>Tags (comma-separated)</label>
          <input
            id={tagsInputId}
            className="lore-input"
            value={loreTags}
            onChange={(event) => onTagsChange(event.target.value)}
            placeholder="ex: rumor, coast, chapter-one"
          />
        </div>

        <div className="lore-panel">
          <div className="lore-panel-header">
            <div className="linked-lore-label">Traits</div>
            <button className="tb-btn" type="button" onClick={() => persistTraits([...loreItemFields.traits, createBlankTrait()])}>
              Add Trait
            </button>
          </div>
          {loreItemFields.traits.length === 0 ? (
            <div className="rp-empty">No traits yet. Add the characteristics this lore item should track.</div>
          ) : (
            <div className="trait-list">
              {loreItemFields.traits.map((trait) => (
                <div key={trait.id} className="trait-row">
                  <input
                    aria-label="Trait name"
                    className="lore-input trait-name-input"
                    value={trait.name}
                    onChange={(event) => updateTrait(trait.id, { name: event.target.value })}
                    placeholder="Trait name"
                  />
                  <input
                    aria-label="Trait value"
                    className="lore-input"
                    value={trait.value}
                    onChange={(event) => updateTrait(trait.id, { value: event.target.value })}
                    placeholder="Trait value"
                  />
                  <button className="tb-btn" type="button" onClick={() => removeTrait(trait.id)}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lore-panel">
          <div className="lore-panel-header">
            <div className="linked-lore-label">Custom Fields</div>
            <button className="tb-btn" type="button" onClick={addCustomField}>
              Add Field
            </button>
          </div>
          {fieldDefinitions.length === 0 && manualCustomFieldEntries.length === 0 ? (
            <div className="rp-empty">No custom fields yet. Add structured facts like age, faction, role, or first appearance.</div>
          ) : (
            <div className="trait-list">
              {fieldDefinitions.map((field) => (
                <div key={field.id} className="custom-field-row">
                  <div>
                    <div className="linked-lore-label">{field.name}</div>
                    <div className="template-list-meta">{field.key} · {field.type}{field.required ? " · required" : ""}</div>
                  </div>
                  {renderDefinedCustomFieldControl(field)}
                </div>
              ))}
              {manualCustomFieldEntries.map(([name, value]) => (
                <div key={name} className="trait-row">
                  <input
                    aria-label="Custom field name"
                    className="lore-input trait-name-input"
                    value={name}
                    onBlur={(event) => renameCustomField(name, event.target.value)}
                    onChange={(event) => renameCustomField(name, event.target.value)}
                    placeholder="Field name"
                  />
                  <input
                    aria-label="Custom field value"
                    className="lore-input"
                    value={value == null ? "" : String(value)}
                    onChange={(event) => updateCustomFieldValue(name, event.target.value)}
                    placeholder="Field value"
                  />
                  <button className="tb-btn" type="button" onClick={() => removeCustomField(name)}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lore-panel">
          <div className="lore-panel-header">
            <div className="linked-lore-label">Lore Details</div>
          </div>
          <textarea
            id={detailsInputId}
            className="lore-textarea lore-details-editor"
            value={loreItemFields.details}
            onChange={(event) => persistTraits(loreItemFields.traits, event.target.value)}
            placeholder="Write detailed notes, history, description, or scene context here..."
          />
        </div>

        {filteredLinkedLorePages.length > 0 || unresolvedLoreLinks.length > 0 ? (
          <div className="linked-lore-panel">
            {filteredLinkedLorePages.length > 0 ? (
              <>
                <div className="linked-lore-label">Linked Lore</div>
                <div className="linked-lore-list">
                  {filteredLinkedLorePages.map((page) => (
                    <button key={page.id} className="linked-lore-chip" type="button" onClick={() => onOpenLore(page)}>
                      {page.title}
                    </button>
                  ))}
                </div>
              </>
            ) : null}
            {unresolvedLoreLinks.length > 0 ? (
              <>
                <div className="linked-lore-label unresolved">Unresolved Links</div>
                <div className="linked-lore-list">
                  {unresolvedLoreLinks.map((title) => (
                    <span key={title} className="linked-lore-chip unresolved">
                      {title}
                    </span>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </>
  );
});
