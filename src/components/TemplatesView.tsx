import { useMemo } from "react";
import type { LoreTemplate } from "../lib/loreTemplates";
import type { LoreType } from "../lib/loreTypes";

type TemplatesViewProps = {
  isSidebarCollapsed: boolean;
  isRightPanelCollapsed: boolean;
  templates: LoreTemplate[];
  loreTypes: LoreType[];
  selectedTemplateId: string | null;
  onExpandSidebar: () => void;
  onExpandRightPanel: () => void;
  onOpenLoreTypes: () => void;
  onSelectTemplate: (templateId: string) => void;
  onCreateTemplate: () => void;
  onDeleteTemplate: (templateId: string) => void;
  onTemplateChange: (templateId: string, updates: Partial<Omit<LoreTemplate, "id">>) => void;
  onAddTraitDefinition: (templateId: string) => void;
  onUpdateTraitDefinition: (
    templateId: string,
    traitId: string,
    updates: { label?: string; placeholder?: string; order?: number },
  ) => void;
  onDeleteTraitDefinition: (templateId: string, traitId: string) => void;
  onMoveTraitDefinition: (templateId: string, traitId: string, direction: -1 | 1) => void;
};

export function TemplatesView({
  isSidebarCollapsed,
  isRightPanelCollapsed,
  templates,
  loreTypes,
  selectedTemplateId,
  onExpandSidebar,
  onExpandRightPanel,
  onOpenLoreTypes,
  onSelectTemplate,
  onCreateTemplate,
  onDeleteTemplate,
  onTemplateChange,
  onAddTraitDefinition,
  onUpdateTraitDefinition,
  onDeleteTraitDefinition,
  onMoveTraitDefinition,
}: TemplatesViewProps) {
  const templateNameInputId = "template-name";
  const templateLoreTypeInputId = "template-lore-type";
  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? templates[0] ?? null,
    [selectedTemplateId, templates],
  );

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
        <button className="tb-btn" type="button" onClick={onOpenLoreTypes}>
          Lore Types
        </button>
        <button className="tb-btn tb-save" type="button" onClick={onCreateTemplate}>
          New Template
        </button>
      </div>

      <input className="doc-title-input" value="Template Management" readOnly />
      <div className="doc-meta">
        <div className="meta-tag">
          <div className="meta-dot"></div> Templates are reusable blueprints
        </div>
      </div>

      <div className="templates-layout">
        <div className="templates-list">
          <div className="lore-panel-header">
            <div className="linked-lore-label">Templates</div>
          </div>
          {templates.map((template) => (
            <button
              key={template.id}
              className={`template-list-item ${template.id === selectedTemplate?.id ? "active" : ""}`}
              type="button"
              onClick={() => onSelectTemplate(template.id)}
            >
              <span>{template.name}</span>
              <span className="template-list-meta">
                {loreTypes.find((type) => type.id === template.loreTypeId)?.name ?? "Unknown"}
              </span>
            </button>
          ))}
        </div>

        <div className="templates-editor">
          {selectedTemplate ? (
            <>
              <div className="lore-panel">
                <div className="lore-panel-header">
                  <div className="linked-lore-label">Template Info</div>
                  <button className="tb-btn" type="button" onClick={() => onDeleteTemplate(selectedTemplate.id)}>
                    Delete
                  </button>
                </div>
                <label className="lore-label" htmlFor={templateNameInputId}>Template Name</label>
                <input
                  id={templateNameInputId}
                  className="lore-input"
                  value={selectedTemplate.name}
                  onChange={(event) => onTemplateChange(selectedTemplate.id, { name: event.target.value })}
                />
                <label className="lore-label" htmlFor={templateLoreTypeInputId}>Lore Type</label>
                <select
                  id={templateLoreTypeInputId}
                  className="lore-input"
                  value={selectedTemplate.loreTypeId}
                  onChange={(event) => onTemplateChange(selectedTemplate.id, { loreTypeId: event.target.value })}
                >
                  {loreTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="lore-panel">
                <div className="lore-panel-header">
                  <div className="linked-lore-label">Trait Definitions</div>
                  <button className="tb-btn" type="button" onClick={() => onAddTraitDefinition(selectedTemplate.id)}>
                    Add Trait
                  </button>
                </div>
                {selectedTemplate.traitDefinitions.length === 0 ? (
                  <div className="rp-empty">No traits yet. Add the default fields new lore items should start with.</div>
                ) : (
                  <div className="trait-list">
                    {[...selectedTemplate.traitDefinitions]
                      .sort((left, right) => left.order - right.order)
                      .map((trait, index, traits) => (
                        <div key={trait.id} className="trait-row trait-row-template">
                          <input
                            aria-label="Trait definition label"
                            className="lore-input trait-name-input"
                            value={trait.label}
                            onChange={(event) =>
                              onUpdateTraitDefinition(selectedTemplate.id, trait.id, { label: event.target.value })
                            }
                            placeholder="Trait label"
                          />
                          <input
                            aria-label="Trait definition placeholder"
                            className="lore-input"
                            value={trait.placeholder}
                            onChange={(event) =>
                              onUpdateTraitDefinition(selectedTemplate.id, trait.id, { placeholder: event.target.value })
                            }
                            placeholder="Placeholder / help text"
                          />
                          <div className="trait-row-actions">
                            <button
                              className="tb-btn"
                              type="button"
                              disabled={index === 0}
                              onClick={() => onMoveTraitDefinition(selectedTemplate.id, trait.id, -1)}
                            >
                              Up
                            </button>
                            <button
                              className="tb-btn"
                              type="button"
                              disabled={index === traits.length - 1}
                              onClick={() => onMoveTraitDefinition(selectedTemplate.id, trait.id, 1)}
                            >
                              Down
                            </button>
                            <button className="tb-btn" type="button" onClick={() => onDeleteTraitDefinition(selectedTemplate.id, trait.id)}>
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="lore-panel">
              <div className="rp-empty">Select a template to edit it.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
