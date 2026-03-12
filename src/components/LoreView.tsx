import { useMemo, type MouseEvent as ReactMouseEvent } from "react";
import type { LorePage } from "../lib/data";
import { parseLoreItemFields, stringifyLoreItemFields, type LoreTrait } from "../lib/loreItems";
import type { LoreTemplate } from "../lib/loreTemplates";
import type { LoreType } from "../lib/loreTypes";
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

export function LoreView({
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
  onSave,
  onTitleChange,
  onTagsChange,
  onFieldsChange,
  onPageTypeChange,
}: LoreViewProps) {
  const loreTypeInputId = "lore-view-type";
  const templateUsedInputId = "lore-view-template-used";
  const tagsInputId = "lore-view-tags";
  const detailsInputId = "lore-view-details";
  const activeLoreType = useMemo(
    () => loreTypes.find((type) => type.id === activeLoreTypeId) ?? loreTypes[0] ?? null,
    [activeLoreTypeId, loreTypes],
  );
  const loreItemFields = useMemo(() => parseLoreItemFields(loreFields), [loreFields]);
  const templateUsed = useMemo(
    () => templates.find((template) => template.id === loreItemFields.templateId) ?? null,
    [loreItemFields.templateId, templates],
  );
  const { linked: linkedLorePages, unresolved: unresolvedLoreLinks } = useMemo(
    () => resolveLoreLinks(`${loreTags}\n${loreItemFields.details}`, availableLorePages),
    [availableLorePages, loreItemFields.details, loreTags],
  );
  const filteredLinkedLorePages = linkedLorePages.filter((page) => page.id !== activeLoreId);

  const persistTraits = (traits: LoreTrait[], details = loreItemFields.details) => {
    onFieldsChange(
      stringifyLoreItemFields({
        loreTypeId: lorePageTypeId,
        templateId: loreItemFields.templateId,
        traits,
        details,
      }),
    );
  };

  const updateTrait = (traitId: string, updates: Partial<LoreTrait>) => {
    persistTraits(
      loreItemFields.traits.map((trait) => (trait.id === traitId ? { ...trait, ...updates } : trait)),
    );
  };

  const removeTrait = (traitId: string) => {
    persistTraits(loreItemFields.traits.filter((trait) => trait.id !== traitId));
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
}
