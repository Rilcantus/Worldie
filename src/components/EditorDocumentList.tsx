import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import type { Document } from "../lib/data";

type DocumentFolderGroup = {
  folder: string;
  docs: Document[];
};

type EditorDocumentListProps = {
  isDocListCollapsed: boolean;
  docListWidth: number;
  activeDocumentId: string | null;
  documents: Document[];
  documentsByFolder: DocumentFolderGroup[];
  onCollapseDocList: () => void;
  onAddDocument: () => void;
  onOpenDocument: (doc: Document) => void;
  onRemoveDocument: (docId: string) => void;
};

export function EditorDocumentList({
  isDocListCollapsed,
  docListWidth,
  activeDocumentId,
  documents,
  documentsByFolder,
  onCollapseDocList,
  onAddDocument,
  onOpenDocument,
  onRemoveDocument,
}: EditorDocumentListProps) {
  return (
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
            <div className="doc-list-title">Documents</div>
            <div className="doc-list-actions">
              <button
                className="panel-toggle"
                type="button"
                onClick={onCollapseDocList}
                title="Collapse list (Ctrl+2)"
              >
                &lsaquo;
              </button>
              <button className="doc-add" type="button" onClick={onAddDocument}>
                +
              </button>
            </div>
          </div>
          <div className="doc-list-body">
            {documents.length === 0 ? (
              <div className="doc-empty">No documents yet.</div>
            ) : (
              documentsByFolder.map((group) => (
                <div key={group.folder} className="doc-folder-group">
                  <div className="doc-folder-label">
                    <span>{group.folder}</span>
                    <span className="doc-folder-count">{group.docs.length}</span>
                  </div>
                  {group.docs.map((doc) => (
                    <div
                      key={doc.id}
                      className={`doc-item ${doc.id === activeDocumentId ? "active" : ""}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => onOpenDocument(doc)}
                      onKeyDown={(event: ReactKeyboardEvent<HTMLDivElement>) => {
                        if (event.key === "Enter") onOpenDocument(doc);
                      }}
                    >
                      <div className="doc-item-info">
                        <div className="doc-item-title">{doc.title}</div>
                        <div className="doc-item-meta">{doc.folderPath?.trim() || "No folder"}</div>
                      </div>
                      <button
                        className="doc-item-delete"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onRemoveDocument(doc.id);
                        }}
                      >
                        x
                      </button>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
