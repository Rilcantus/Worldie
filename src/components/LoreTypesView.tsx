import type { LoreTemplate } from "../lib/loreTemplates";
import {
  slugifyCustomFieldKey,
  type CustomFieldDefinition,
  type CustomFieldDefinitionType,
  type LoreType,
} from "../lib/loreTypes";
import { memo, useEffect, useMemo, useState } from "react";

type LoreTypesViewProps = {
  isSidebarCollapsed: boolean;
  isRightPanelCollapsed: boolean;
  loreTypes: LoreType[];
  selectedLoreTypeId: string | null;
  templates: LoreTemplate[];
  loreItemsInUse: Record<string, number>;
  templatesInUse: Record<string, number>;
  onExpandSidebar: () => void;
  onExpandRightPanel: () => void;
  onSelectLoreType: (loreTypeId: string) => void;
  onCreateLoreType: () => void;
  onUpdateLoreType: (loreTypeId: string, updates: Partial<Omit<LoreType, "id" | "isSystem">>) => void;
  onDeleteLoreType: (loreTypeId: string) => void;
  onReassignAndDeleteLoreType: (loreTypeId: string, replacementLoreTypeId: string) => void;
  onMoveLoreType: (loreTypeId: string, direction: -1 | 1) => void;
};

const FIELD_TYPES: CustomFieldDefinitionType[] = ["text", "long_text", "number", "checkbox", "select", "date"];

export const LoreTypesView = memo(function LoreTypesView({
  isSidebarCollapsed,
  isRightPanelCollapsed,
  loreTypes,
  selectedLoreTypeId,
  templates,
  loreItemsInUse,
  templatesInUse,
  onExpandSidebar,
  onExpandRightPanel,
  onSelectLoreType,
  onCreateLoreType,
  onUpdateLoreType,
  onDeleteLoreType,
  onReassignAndDeleteLoreType,
  onMoveLoreType,
}: LoreTypesViewProps) {
  const loreTypeNameInputId = "lore-type-name";
  const loreTypeSlugInputId = "lore-type-slug";
  const loreTypeReassignInputId = "lore-type-reassign";
  const loreTypesById = useMemo(() => new Map(loreTypes.map((type) => [type.id, type])), [loreTypes]);
  const templatesByLoreTypeId = useMemo(() => {
    const grouped = new Map<string, LoreTemplate[]>();
    for (const template of templates) {
      const existing = grouped.get(template.loreTypeId) ?? [];
      existing.push(template);
      grouped.set(template.loreTypeId, existing);
    }
    return grouped;
  }, [templates]);
  const selectedLoreType = (selectedLoreTypeId ? loreTypesById.get(selectedLoreTypeId) : null) ?? loreTypes[0] ?? null;
  const selectedIndex = loreTypes.findIndex((type) => type.id === selectedLoreType?.id);
  const loreItemCount = selectedLoreType ? loreItemsInUse[selectedLoreType.id] ?? 0 : 0;
  const templateCount = selectedLoreType ? templatesInUse[selectedLoreType.id] ?? 0 : 0;
  const canDelete = selectedLoreType && !selectedLoreType.isSystem && loreItemCount === 0 && templateCount === 0;
  const replacementOptions = useMemo(
    () => loreTypes.filter((type) => type.id !== selectedLoreType?.id),
    [loreTypes, selectedLoreType?.id],
  );
  const [replacementLoreTypeId, setReplacementLoreTypeId] = useState(replacementOptions[0]?.id ?? "");

  useEffect(() => {
    if (replacementLoreTypeId && replacementOptions.some((type) => type.id === replacementLoreTypeId)) return;
    setReplacementLoreTypeId(replacementOptions[0]?.id ?? "");
  }, [replacementLoreTypeId, replacementOptions]);

  const updateFieldDefinitions = (fieldDefinitions: CustomFieldDefinition[]) => {
    if (!selectedLoreType) return;
    onUpdateLoreType(selectedLoreType.id, {
      fieldDefinitions: fieldDefinitions.map((definition, order) => ({ ...definition, order })),
    });
  };

  const addFieldDefinition = () => {
    if (!selectedLoreType) return;
    const nextIndex = selectedLoreType.fieldDefinitions.length + 1;
    const nextField: CustomFieldDefinition = {
      id: crypto.randomUUID(),
      name: `Field ${nextIndex}`,
      key: `field_${nextIndex}`,
      type: "text",
      options: [],
      required: false,
      order: selectedLoreType.fieldDefinitions.length,
    };
    updateFieldDefinitions([...selectedLoreType.fieldDefinitions, nextField]);
  };

  const updateFieldDefinition = (fieldId: string, updates: Partial<CustomFieldDefinition>) => {
    if (!selectedLoreType) return;
    updateFieldDefinitions(
      selectedLoreType.fieldDefinitions.map((definition) => {
        if (definition.id !== fieldId) return definition;
        const name = updates.name ?? definition.name;
        return {
          ...definition,
          ...updates,
          name,
          key:
            updates.key !== undefined
              ? slugifyCustomFieldKey(updates.key)
              : updates.name !== undefined
                ? slugifyCustomFieldKey(name)
                : definition.key,
        };
      }),
    );
  };

  const deleteFieldDefinition = (fieldId: string) => {
    if (!selectedLoreType) return;
    updateFieldDefinitions(selectedLoreType.fieldDefinitions.filter((definition) => definition.id !== fieldId));
  };

  return (
    <div className="editor-pane">
      {isSidebarCollapsed || isRightPanelCollapsed ? (
        <div className="collapsed-strip-row">
          {isSidebarCollapsed ? (
            <div className="collapsed-strip">
              <span>Project</span>
              <button className="panel-toggle" type="button" onClick={onExpandSidebar} title="Expand sidebar (Ctrl+1)">
                {" > "}
              </button>
            </div>
          ) : null}
          {isRightPanelCollapsed ? (
            <div className="collapsed-strip">
              <button className="panel-toggle" type="button" onClick={onExpandRightPanel} title="Expand panel (Ctrl+3)">
                {" < "}
              </button>
              <span>Context</span>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="editor-toolbar">
        <button className="tb-btn tb-save" type="button" onClick={onCreateLoreType}>
          New Lore Type
        </button>
      </div>

      <h1 className="doc-title-input">Lore Types</h1>
      <div className="doc-meta">
        <div className="meta-tag">
          <div className="meta-dot"></div> User-defined categories drive navigation, templates, and lore items
        </div>
      </div>

      <div className="templates-layout">
        <div className="templates-list">
          <div className="lore-panel-header">
            <div className="linked-lore-label">All Lore Types</div>
          </div>
          {loreTypes.length === 0 ? (
            <div className="rp-empty">No lore types yet. Create one to start structuring lore.</div>
          ) : (
            loreTypes.map((type) => (
              <button
                key={type.id}
                className={`template-list-item ${type.id === selectedLoreType?.id ? "active" : ""}`}
                type="button"
                onClick={() => onSelectLoreType(type.id)}
              >
                <span>{type.name}</span>
                <span className="template-list-meta">{type.isSystem ? "System" : "User"}</span>
              </button>
            ))
          )}
        </div>

        <div className="templates-editor">
          {selectedLoreType ? (
            <>
              <div className="lore-panel">
                <div className="lore-panel-header">
                  <div className="linked-lore-label">Lore Type Info</div>
                  <button className="tb-btn" type="button" disabled={!canDelete} onClick={() => onDeleteLoreType(selectedLoreType.id)}>
                    Delete
                  </button>
                </div>
                <label className="lore-label" htmlFor={loreTypeNameInputId}>Name</label>
                <input
                  id={loreTypeNameInputId}
                  className="lore-input"
                  value={selectedLoreType.name}
                  onChange={(event) => onUpdateLoreType(selectedLoreType.id, { name: event.target.value })}
                />
                <label className="lore-label" htmlFor={loreTypeSlugInputId}>Slug</label>
                <input
                  id={loreTypeSlugInputId}
                  className="lore-input"
                  value={selectedLoreType.slug}
                  onChange={(event) => onUpdateLoreType(selectedLoreType.id, { slug: event.target.value })}
                />
                <div className="trait-row-actions" style={{ marginTop: 16 }}>
                  <button
                    className="tb-btn"
                    type="button"
                    disabled={selectedIndex <= 0}
                    onClick={() => onMoveLoreType(selectedLoreType.id, -1)}
                  >
                    Move Up
                  </button>
                  <button
                    className="tb-btn"
                    type="button"
                    disabled={selectedIndex === loreTypes.length - 1}
                    onClick={() => onMoveLoreType(selectedLoreType.id, 1)}
                  >
                    Move Down
                  </button>
                </div>
              </div>

              <div className="lore-panel">
                <div className="lore-panel-header">
                  <div className="linked-lore-label">Usage</div>
                </div>
                <div className="rp-empty">
                  {loreItemCount} lore items use this type. {templateCount} templates use this type.
                </div>
                {!canDelete ? (
                  <div className="advanced-json-note">
                    {selectedLoreType.isSystem
                      ? "System lore types cannot be deleted."
                      : "This lore type cannot be deleted while lore items or templates still use it."}
                  </div>
                ) : null}
                {!selectedLoreType.isSystem && !canDelete && replacementOptions.length > 0 ? (
                  <>
                    <label className="lore-label" htmlFor={loreTypeReassignInputId}>Reassign To</label>
                    <select id={loreTypeReassignInputId} className="lore-input" value={replacementLoreTypeId} onChange={(event) => setReplacementLoreTypeId(event.target.value)}>
                      {replacementOptions.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                    <div className="trait-row-actions" style={{ marginTop: 16 }}>
                      <button
                        className="tb-btn tb-save"
                        type="button"
                        disabled={!replacementLoreTypeId}
                        onClick={() => onReassignAndDeleteLoreType(selectedLoreType.id, replacementLoreTypeId)}
                      >
                        Reassign And Delete
                      </button>
                    </div>
                  </>
                ) : null}
              </div>

              <div className="lore-panel">
                <div className="lore-panel-header">
                  <div className="linked-lore-label">Custom Field Definitions</div>
                  <button className="tb-btn" type="button" onClick={addFieldDefinition}>
                    Add Field
                  </button>
                </div>
                {selectedLoreType.fieldDefinitions.length === 0 ? (
                  <div className="rp-empty">No reusable fields yet. Add fields like Age, Species, Faction, or First appearance.</div>
                ) : (
                  <div className="trait-list">
                    {selectedLoreType.fieldDefinitions.map((field) => (
                      <div key={field.id} className="field-definition-row">
                        <input
                          aria-label="Field name"
                          className="lore-input trait-name-input"
                          value={field.name}
                          onChange={(event) => updateFieldDefinition(field.id, { name: event.target.value })}
                          placeholder="Field label"
                        />
                        <input
                          aria-label="Field key"
                          className="lore-input trait-name-input"
                          value={field.key}
                          onChange={(event) => updateFieldDefinition(field.id, { key: event.target.value })}
                          placeholder="field_key"
                        />
                        <select
                          aria-label="Field type"
                          className="lore-input"
                          value={field.type}
                          onChange={(event) => updateFieldDefinition(field.id, { type: event.target.value as CustomFieldDefinitionType })}
                        >
                          {FIELD_TYPES.map((fieldType) => (
                            <option key={fieldType} value={fieldType}>
                              {fieldType}
                            </option>
                          ))}
                        </select>
                        {field.type === "select" ? (
                          <input
                            aria-label="Select options"
                            className="lore-input"
                            value={field.options.join(", ")}
                            onChange={(event) =>
                              updateFieldDefinition(field.id, {
                                options: event.target.value
                                  .split(",")
                                  .map((option) => option.trim())
                                  .filter(Boolean),
                              })
                            }
                            placeholder="Option A, Option B"
                          />
                        ) : (
                          <div></div>
                        )}
                        <label className="meta-tag">
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(event) => updateFieldDefinition(field.id, { required: event.target.checked })}
                          />
                          Required
                        </label>
                        <button className="tb-btn" type="button" onClick={() => deleteFieldDefinition(field.id)}>
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="lore-panel">
                <div className="lore-panel-header">
                  <div className="linked-lore-label">Templates Using This Type</div>
                </div>
                {(templatesByLoreTypeId.get(selectedLoreType.id) ?? []).length === 0 ? (
                  <div className="rp-empty">No templates use this lore type yet.</div>
                ) : (
                  <div className="trait-list">
                    {(templatesByLoreTypeId.get(selectedLoreType.id) ?? []).map((template) => (
                        <div key={template.id} className="trait-row">
                          <div>{template.name}</div>
                          <div>{template.traitDefinitions.length} traits</div>
                          <div></div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="lore-panel">
              <div className="rp-empty">Select a lore type to edit it, or create a new one.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
