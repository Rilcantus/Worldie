import { memo, useEffect, useMemo, useState } from "react";
import {
  buildLoreCreateDefaultCustomFields,
  buildLoreCreateDraftPayload,
  getLoreCreateDraftState,
  setLoreCreateCustomFieldValue,
} from "../hooks/contentState";
import type { LoreCustomFieldValue, LoreCustomFields } from "../lib/loreItems";
import type { LoreTemplate } from "../lib/loreTemplates";
import type { CustomFieldDefinition, LoreType } from "../lib/loreTypes";
import type { WorldUI } from "../types/ui";

type LoreCreateViewProps = {
  isSidebarCollapsed: boolean;
  isRightPanelCollapsed: boolean;
  activeWorld?: WorldUI;
  templates: LoreTemplate[];
  loreTypes: LoreType[];
  onExpandSidebar: () => void;
  onExpandRightPanel: () => void;
  onCreateLoreItem: (payload: {
    title: string;
    loreTypeId: string;
    templateId: string | null;
    tags: string;
    details: string;
    customFields: LoreCustomFields;
  }) => Promise<unknown> | void;
  onOpenTemplates: () => void;
  onOpenLoreTypes: () => void;
};

function formatDraftCustomFieldValue(value: LoreCustomFieldValue | undefined) {
  return value == null ? "" : String(value);
}

export const LoreCreateView = memo(function LoreCreateView({
  isSidebarCollapsed,
  isRightPanelCollapsed,
  activeWorld,
  templates,
  loreTypes,
  onExpandSidebar,
  onExpandRightPanel,
  onCreateLoreItem,
  onOpenTemplates,
  onOpenLoreTypes,
}: LoreCreateViewProps) {
  const loreTypeInputId = "lore-create-type";
  const templateInputId = "lore-create-template";
  const tagsInputId = "lore-create-tags";
  const [title, setTitle] = useState("");
  const [loreTypeId, setLoreTypeId] = useState(loreTypes[0]?.id ?? "");
  const [tags, setTags] = useState("");
  const [details, setDetails] = useState("");
  const [customFields, setCustomFields] = useState<LoreCustomFields>({});
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [createError, setCreateError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const loreTypeIds = useMemo(() => new Set(loreTypes.map((type) => type.id)), [loreTypes]);
  const selectedLoreType = useMemo(
    () => loreTypes.find((type) => type.id === loreTypeId) ?? null,
    [loreTypeId, loreTypes],
  );
  const templatesByLoreTypeId = useMemo(() => {
    const grouped = new Map<string, LoreTemplate[]>();
    for (const template of templates) {
      const existing = grouped.get(template.loreTypeId) ?? [];
      existing.push(template);
      grouped.set(template.loreTypeId, existing);
    }
    return grouped;
  }, [templates]);

  useEffect(() => {
    if (loreTypeId && loreTypeIds.has(loreTypeId)) return;
    setLoreTypeId(loreTypes[0]?.id ?? "");
  }, [loreTypeId, loreTypeIds, loreTypes]);

  useEffect(() => {
    setCustomFields(buildLoreCreateDefaultCustomFields(selectedLoreType));
  }, [selectedLoreType?.id]);

  const filteredTemplates = useMemo(
    () => templatesByLoreTypeId.get(loreTypeId) ?? [],
    [loreTypeId, templatesByLoreTypeId],
  );
  const hasLoreTypes = loreTypes.length > 0;

  useEffect(() => {
    if (templateId === null) return;
    if (filteredTemplates.some((template) => template.id === templateId)) return;
    setTemplateId(null);
  }, [filteredTemplates, templateId]);

  const createState = getLoreCreateDraftState({ title, loreType: selectedLoreType, isCreating });

  const updateCustomFieldValue = (field: CustomFieldDefinition, value: string | number | boolean | null) => {
    setCustomFields((current) => setLoreCreateCustomFieldValue(current, field, value));
  };

  const renderCustomFieldControl = (field: CustomFieldDefinition) => {
    const value = customFields[field.key] ?? "";
    if (field.type === "long_text") {
      return (
        <textarea
          aria-label={`${field.name} value`}
          className="lore-textarea custom-field-textarea"
          value={formatDraftCustomFieldValue(value)}
          onChange={(event) => updateCustomFieldValue(field, event.target.value)}
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
            onChange={(event) => updateCustomFieldValue(field, event.target.checked)}
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
          value={formatDraftCustomFieldValue(value)}
          onChange={(event) => updateCustomFieldValue(field, event.target.value)}
        >
          <option value="">Select {field.name}</option>
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
        value={formatDraftCustomFieldValue(value)}
        onChange={(event) =>
          updateCustomFieldValue(
            field,
            field.type === "number" && event.target.value !== "" ? Number(event.target.value) : event.target.value,
          )
        }
        placeholder={field.name}
      />
    );
  };

  const handleCreate = async () => {
    if (isCreating) return;
    const payload = buildLoreCreateDraftPayload({
      title,
      loreTypeId,
      templateId,
      tags,
      details,
      customFields,
    });
    if (!payload) {
      setCreateError("Enter a title before creating this lore page.");
      return;
    }
    setCreateError("");
    setIsCreating(true);
    try {
      await onCreateLoreItem(payload);
    } finally {
      setIsCreating(false);
    }
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
        <button className="tb-btn" type="button" onClick={onOpenLoreTypes}>
          Manage Lore Types
        </button>
        <button className="tb-btn" type="button" onClick={onOpenTemplates}>
          Manage Templates
        </button>
        <button className="tb-btn tb-save" type="button" onClick={() => void handleCreate()} disabled={!createState.canCreate}>
          {isCreating ? "Creating..." : createState.buttonLabel}
        </button>
      </div>

      <div className="doc-meta">
        <div className="meta-tag">
          <div className="meta-dot"></div> {activeWorld?.name ?? "World"}
        </div>
        <div className="meta-tag">Lore Creation</div>
      </div>

      <div className="lore-panel">
        <div className="lore-panel-header">
          <div className="linked-lore-label">Basic Info</div>
        </div>
        {!hasLoreTypes ? (
          <div className="rp-empty">
            Create a lore type first. Lore items need a real lore type before they can be created.
          </div>
        ) : null}
        {createError ? <div className="lore-table-error">{createError}</div> : null}
        <label className="lore-label" htmlFor="lore-create-title">Title</label>
        <input
          id="lore-create-title"
          className="lore-input lore-create-title-input"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            if (createError) setCreateError("");
          }}
          placeholder={selectedLoreType ? `${selectedLoreType.name} name` : "Lore item title"}
          aria-label={selectedLoreType ? `${selectedLoreType.name} name` : "Lore item title"}
          disabled={isCreating}
        />

        <label className="lore-label" htmlFor={loreTypeInputId}>Lore Type</label>
        <select
          id={loreTypeInputId}
          className="lore-input"
          value={loreTypeId}
          onChange={(event) => setLoreTypeId(event.target.value)}
          disabled={!hasLoreTypes || isCreating}
        >
          {loreTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>

        <label className="lore-label" htmlFor={templateInputId}>Template</label>
        <select
          id={templateInputId}
          className="lore-input"
          value={templateId ?? ""}
          onChange={(event) => setTemplateId(event.target.value || null)}
          disabled={!hasLoreTypes || isCreating}
        >
          <option value="">No template</option>
          {filteredTemplates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>

        <label className="lore-label" htmlFor={tagsInputId}>Tags (comma-separated)</label>
        <input
          id={tagsInputId}
          className="lore-input"
          value={tags}
          onChange={(event) => setTags(event.target.value)}
          placeholder="ex: rumor, harbor, antagonist"
          disabled={isCreating}
        />

        <label className="lore-label" htmlFor="lore-create-details">Details</label>
        <textarea
          id="lore-create-details"
          className="lore-textarea lore-create-details-editor"
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          placeholder="Add a short description, role, history, or first notes before creating this page..."
          disabled={isCreating}
        />
      </div>

      <div className="lore-panel">
        <div className="lore-panel-header">
          <div className="linked-lore-label">Custom Fields</div>
        </div>
        {selectedLoreType?.fieldDefinitions.length ? (
          <div className="trait-list">
            {selectedLoreType.fieldDefinitions.map((field) => (
              <div key={field.id} className="custom-field-row">
                <div>
                  <div className="linked-lore-label">{field.name}</div>
                  <div className="template-list-meta">{field.key} - {field.type}{field.required ? " - required" : ""}</div>
                </div>
                {renderCustomFieldControl(field)}
              </div>
            ))}
          </div>
        ) : (
          <div className="rp-empty">No custom fields are defined for this lore type yet.</div>
        )}
      </div>

      <div className="lore-panel">
        <div className="lore-panel-header">
          <div className="linked-lore-label">What Happens Next</div>
        </div>
        <div className="rp-empty">
          The selected template copies its trait labels into the new lore item. After creation, the lore item is independent and no longer linked back to the template.
        </div>
      </div>
    </div>
  );
});
