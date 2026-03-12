import type { TabItem } from "../types/ui";

type TabBarProps = {
  tabs: TabItem[];
  activeTabId: string;
  onSelect: (tab: TabItem) => void;
  onClose: (tab: TabItem) => void;
  onAdd: () => void;
};

export function TabBar({ tabs, activeTabId, onSelect, onClose, onAdd }: TabBarProps) {
  return (
    <div className="tab-bar" role="tablist" aria-label="Open pages">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        const canClose = tab.kind !== "workbench" && (tab.kind !== "new" || Boolean(tab.refId));
        return (
          <div key={tab.id} className={`tab ${isActive ? "active" : ""}`} role="presentation">
            <button
              className="tab-select"
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onSelect(tab)}
            >
              <span className="tab-icon">{tab.icon}</span>
              {tab.label}
            </button>
            {canClose ? (
              <button
                className="tab-close"
                type="button"
                aria-label={`Close ${tab.label}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onClose(tab);
                }}
              >
                x
              </button>
            ) : null}
          </div>
        );
      })}
      <button className="tab tab-add" type="button" title="Open a new page" onClick={onAdd}>
        +
      </button>
    </div>
  );
}
