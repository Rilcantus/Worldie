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
    <div className="tab-bar">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <button
            key={tab.id}
            className={`tab ${isActive ? "active" : ""}`}
            type="button"
            onClick={() => onSelect(tab)}
          >
            <span className="tab-icon">{tab.icon}</span>
            {tab.label}
            {tab.kind !== "new" || tab.refId ? (
              <span
                className="tab-close"
                role="button"
                tabIndex={0}
                onClick={(event) => {
                  event.stopPropagation();
                  onClose(tab);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.stopPropagation();
                    onClose(tab);
                  }
                }}
              >
                ✕
              </span>
            ) : null}
          </button>
        );
      })}
      <button className="tab tab-add" type="button" title="Open a new page" onClick={onAdd}>
        +
      </button>
    </div>
  );
}
