import { memo, useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from "react";
import type { LorePage, LoreTableView } from "../lib/data";
import {
  parseLoreItemFields,
  stringifyLoreItemFields,
  type LoreCustomFields,
  type LoreCustomFieldValue,
  type LoreTrait,
} from "../lib/loreItems";
import type { LoreTemplate } from "../lib/loreTemplates";
import {
  applyLoreTableView,
  buildLoreTableModel,
  buildLoreTableViewDraft,
  type LoreTableSort,
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
  const loreTypesById = useMemo(() => new Map(loreTypes.map((type) => [type.id, type])), [loreTypes]);
  const templatesById = useMemo(() => new Map(templates.map((template) => [template.id, template])), [templates]);
  const activeLoreType = useMemo(
    () => (activeLoreTypeId ? loreTypesById.get(activeLoreTypeId) : null) ?? loreTypes[0] ?? null,
    [activeLoreTypeId, loreTypes, loreTypesById],
  );
  const [tableLoreTypeId, setTableLoreTypeId] = useState(activeLoreType?.id ?? "");
  const [tableFilterText, setTableFilterText] = useState("");
  const [tableSort, setTableSort] = useState<LoreTableSort | null>({ columnId: "title", direction: "asc" });
  const [selectedTableViewId, setSelectedTableViewId] = useState("");
  const [tableViewName, setTableViewName] = useState("");
  useEffect(() => {
    if (tableLoreTypeId && loreTypesById.has(tableLoreTypeId)) return;
    setTableLoreTypeId(activeLoreType?.id ?? "");
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
      }),
    [activeLoreType?.id, availableLorePages, loreTypes, tableFilterText, tableLoreTypeId, tableSort],
  );

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
  });

  const applySavedTableView = (viewId: string) => {
    setSelectedTableViewId(viewId);
    const view = loreTableViews.find((item) => item.id === viewId);
    if (!view) return;
    const nextState = applyLoreTableView(view, getCurrentTableViewState());
    setTableLoreTypeId(nextState.loreTypeId);
    setTableFilterText(nextState.filterText);
    setTableSort(nextState.sort);
    setTableViewName(view.name);
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
    const normalizedName = normalizeCustomFieldName(nextName);
    const nextFields: LoreCustomFields = {};
    for (const [name, value] of manualCustomFieldEntries) {
      if (name === previousName) {
        nextFields[normalizedName] = value;
      } else if (name !== normalizedName) {
        nextFields[name] = value;
      }
    }
    persistCustomFields(nextFields);
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
                onChange={(event) => setTableLoreTypeId(event.target.value)}
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
            </div>
          </div>
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
                          <td key={column.id}>
                            {column.kind === "title" ? (
                              <button className="lore-table-link" type="button" onClick={() => onOpenLore(row.page)}>
                                {row.cells[column.id]}
                              </button>
                            ) : (
                              row.cells[column.id]
                            )}
                          </td>
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
