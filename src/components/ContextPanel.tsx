import type { Document, LorePage } from "../lib/data";
import type { SearchResult } from "../hooks/useSearch";

type LinkedPageItem =
  | {
      key: string;
      label: string;
      meta: string;
      kind: "document";
      doc: Document;
      icon: string;
      style: { background: string; color: string };
    }
  | {
      key: string;
      label: string;
      meta: string;
      kind: "lore";
      page: LorePage | null;
      icon: string;
      style: { background: string; color: string };
    };

type TagItem = {
  key: string;
  label: string;
  style: { background: string; color: string; border: string };
};

type ContextPanelModel = {
  searchQuery: string;
  searchResults: SearchResult[];
  activePageTitle: string;
  activePageType: string;
  activeWordCount: number;
  projectTotalWordCount: number;
  openTabsCount: number;
  linkedPages: LinkedPageItem[];
  tags: TagItem[];
  summary: string;
  activeWorldName: string;
};

type ContextPanelProps = {
  isCollapsed: boolean;
  width: number;
  model: ContextPanelModel;
  onCollapse: () => void;
  onSelectSearchResult: (result: SearchResult) => void;
  onOpenDocument: (doc: Document) => void;
  onOpenLore: (page: LorePage) => void;
};

export function ContextPanel({
  isCollapsed,
  width,
  model,
  onCollapse,
  onSelectSearchResult,
  onOpenDocument,
  onOpenLore,
}: ContextPanelProps) {
  return (
    <div className={`right-panel ${isCollapsed ? "collapsed" : ""}`} style={{ width: isCollapsed ? 0 : width }}>
      {!isCollapsed ? (
        <>
          <div className="rp-header">
            <span>Context</span>
            <button className="panel-toggle" type="button" onClick={onCollapse} title="Collapse panel (Ctrl+3)">
              &rsaquo;
            </button>
          </div>
          <div className="rp-scroll">
            {model.searchQuery.trim() ? (
              <div className="rp-section">
                <div className="rp-section-title">Search Results</div>
                {model.searchResults.length === 0 ? (
                  <div className="rp-empty">No matches.</div>
                ) : (
                  model.searchResults.map((result) => (
                    <button
                      key={`${result.kind}-${result.id}`}
                      className="rp-result"
                      type="button"
                      onClick={() => onSelectSearchResult(result)}
                    >
                      <div className="rp-result-title">{result.label}</div>
                      <div className="rp-result-meta">{result.typeLabel} - {model.activeWorldName}</div>
                      <div className="rp-result-snippet">{result.snippet}</div>
                    </button>
                  ))
                )}
              </div>
            ) : null}

            <div className="rp-section">
              <div className="rp-section-title">Active Page</div>
              <div className="word-count-box">
                <div className="wc-row">
                  <span className="wc-label">Type</span>
                  <span className="wc-value">{model.activePageType}</span>
                </div>
                <div className="wc-row">
                  <span className="wc-label">Title</span>
                  <span className="wc-value">{model.activePageTitle}</span>
                </div>
                <div className="wc-row">
                  <span className="wc-label">World</span>
                  <span className="wc-value">{model.activeWorldName}</span>
                </div>
              </div>
            </div>

            <div className="rp-section">
              <div className="rp-section-title">Linked Pages</div>
              {model.linkedPages.length === 0 ? (
                <div className="rp-empty">No related entries for this page yet.</div>
              ) : (
                model.linkedPages.map((item) => (
                  <button
                    key={item.key}
                    className="linked-page"
                    type="button"
                    onClick={() => {
                      if (item.kind === "document") {
                        onOpenDocument(item.doc);
                      } else if (item.page) {
                        onOpenLore(item.page);
                      }
                    }}
                    disabled={item.kind === "lore" && !item.page}
                  >
                    <div className="lp-icon" style={item.style}>
                      {item.icon}
                    </div>
                    <div className="lp-info">
                      <div className="lp-name">{item.label}</div>
                      <div className="lp-type">{item.meta}</div>
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="rp-section">
              <div className="rp-section-title">Tags</div>
              <div className="tag-list">
                {model.tags.length === 0 ? (
                  <div className="rp-empty">No tags for this page.</div>
                ) : (
                  model.tags.map((tag) => (
                    <span key={tag.key} className="tag" style={tag.style}>
                      {tag.label}
                    </span>
                  ))
                )}
              </div>
            </div>

            <div className="rp-section">
              <div className="rp-section-title">Word Count</div>
              <div className="word-count-box">
                <div className="wc-row">
                  <span className="wc-label">This doc</span>
                  <span className="wc-value">{model.activeWordCount}</span>
                </div>
                <div className="wc-row">
                  <span className="wc-label">Project total</span>
                  <span className="wc-value">{model.projectTotalWordCount}</span>
                </div>
                <div className="wc-row">
                  <span className="wc-label">Open tabs</span>
                  <span className="wc-value">{model.openTabsCount}</span>
                </div>
                <div className="wc-bar">
                  <div className="wc-fill" style={{ width: `${Math.min(100, Math.max(10, model.openTabsCount * 12))}%` }}></div>
                </div>
              </div>
            </div>

            <div className="rp-section">
              <div className="rp-section-title">Timeline</div>
              <div
                style={{
                  padding: "8px",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    color: "var(--text-muted)",
                    fontFamily: "'JetBrains Mono', monospace",
                    marginBottom: "6px",
                  }}
                >
                  Active summary
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "var(--text-secondary)",
                  }}
                >
                  {model.summary}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
