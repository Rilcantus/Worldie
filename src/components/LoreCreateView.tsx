import { memo, useEffect, useMemo, useState } from "react";
import type { LoreTemplate } from "../lib/loreTemplates";
import type { LoreType } from "../lib/loreTypes";
import type { WorldUI } from "../types/ui";

type LoreCreateViewProps = {
  isSidebarCollapsed: boolean;
  isRightPanelCollapsed: boolean;
  activeWorld?: WorldUI;
  templates: LoreTemplate[];
  loreTypes: LoreType[];
  onExpandSidebar: () => void;
  onExpandRightPanel: () => void;
  onCreateLoreItem: (payload: { title: string; loreTypeId: string; templateId: string | null; tags: string }) => void;
  onOpenTemplates: () => void;
  onOpenLoreTypes: () => void;
};

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
  const [templateId, setTemplateId] = useState<string | null>(null);

  useEffect(() => {
    if (loreTypeId && loreTypes.some((type) => type.id === loreTypeId)) return;
    setLoreTypeId(loreTypes[0]?.id ?? "");
  }, [loreTypeId, loreTypes]);

  const filteredTemplates = useMemo(
    () => templates.filter((template) => template.loreTypeId === loreTypeId),
    [templates, loreTypeId],
  );
  const hasLoreTypes = loreTypes.length > 0;

  useEffect(() => {
    if (templateId && filteredTemplates.some((template) => template.id === templateId)) return;
    setTemplateId(filteredTemplates[0]?.id ?? null);
  }, [filteredTemplates, templateId]);

  const handleCreate = () => {
    if (!loreTypeId) return;
    onCreateLoreItem({
      title,
      loreTypeId,
      templateId,
      tags,
    });
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
        <button className="tb-btn tb-save" type="button" onClick={handleCreate} disabled={!hasLoreTypes}>
          Create Lore Item
        </button>
      </div>

      <input
        className="doc-title-input"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="New lore item title"
      />
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
        <label className="lore-label" htmlFor={loreTypeInputId}>Lore Type</label>
        <select
          id={loreTypeInputId}
          className="lore-input"
          value={loreTypeId}
          onChange={(event) => setLoreTypeId(event.target.value)}
          disabled={!hasLoreTypes}
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
          disabled={!hasLoreTypes}
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
        />
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
