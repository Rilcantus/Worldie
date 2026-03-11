import type { Document, LorePage } from "../lib/data";

type UseContentTabActionsArgs = {
  activeLore: LorePage | undefined;
  addDocument: () => Promise<Document | null>;
  removeDocument: (docId: string) => Promise<boolean>;
  removeLorePage: (loreId: string) => Promise<boolean>;
  openDocumentTab: (doc: Document) => void;
  openLoreTab: (page: LorePage) => void;
  openLoreCreateTab: () => void;
  openNewTab: () => void;
  removeTabById: (tabId: string) => void;
};

export function useContentTabActions({
  activeLore,
  addDocument,
  removeDocument,
  removeLorePage,
  openDocumentTab,
  openLoreTab,
  openLoreCreateTab,
  openNewTab,
  removeTabById,
}: UseContentTabActionsArgs) {
  const handleAddDocument = async () => {
    const created = await addDocument();
    if (created) {
      openDocumentTab(created);
    }
  };

  const handleRemoveDocument = async (docId: string) => {
    const removed = await removeDocument(docId);
    if (removed) {
      removeTabById(`doc:${docId}`);
    }
  };

  const handleOpenLoreCreate = async () => {
    openLoreCreateTab();
  };

  const handleRemoveLorePage = async (loreId: string) => {
    const removed = await removeLorePage(loreId);
    if (removed) {
      removeTabById(`lore:${loreId}`);
    }
  };

  const openLoreEntryPoint = () => {
    if (activeLore) {
      openLoreTab(activeLore);
    } else {
      openLoreCreateTab();
    }
  };

  return {
    handleAddDocument,
    handleRemoveDocument,
    handleOpenLoreCreate,
    handleRemoveLorePage,
    openLoreEntryPoint,
  };
}
