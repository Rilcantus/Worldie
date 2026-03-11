import type { LoreTemplate } from "../lib/loreTemplates";
import type { LoreType } from "../lib/loreTypes";
import { useEffect, useMemo, useState } from "react";

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

export function LoreTypesView({
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
  const selectedLoreType = loreTypes.find((type) => type.id === selectedLoreTypeId) ?? loreTypes[0] ?? null;
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

      <input className="doc-title-input" value="Lore Types" readOnly />
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
          {loreTypes.map((type) => (
            <button
              key={type.id}
              className={`template-list-item ${type.id === selectedLoreType?.id ? "active" : ""}`}
              type="button"
              onClick={() => onSelectLoreType(type.id)}
            >
              <span>{type.name}</span>
              <span className="template-list-meta">{type.isSystem ? "System" : "User"}</span>
            </button>
          ))}
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
                  <div className="linked-lore-label">Templates Using This Type</div>
                </div>
                {templates.filter((template) => template.loreTypeId === selectedLoreType.id).length === 0 ? (
                  <div className="rp-empty">No templates use this lore type yet.</div>
                ) : (
                  <div className="trait-list">
                    {templates
                      .filter((template) => template.loreTypeId === selectedLoreType.id)
                      .map((template) => (
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
          ) : null}
        </div>
      </div>
    </div>
  );
}
