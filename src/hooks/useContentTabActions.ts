import { useCallback, useMemo } from "react";
import type { Document, LorePage } from "../lib/data";

type UseContentTabActionsArgs = {
  activeLore: LorePage | undefined;
  canLeaveCurrentView: () => Promise<boolean>;
  addDocument: () => Promise<Document | null>;
  removeDocument: (docId: string) => Promise<boolean>;
  removeLorePage: (loreId: string) => Promise<boolean>;
  openDocumentTab: (doc: Document) => void;
  openLoreTab: (page: LorePage) => void;
  openLoreCreateTab: () => void;
  openNewTab: () => void;
  removeTabById: (tabId: string, options?: { skipGuard?: boolean }) => void;
};

export function useContentTabActions({
  activeLore,
  canLeaveCurrentView,
  addDocument,
  removeDocument,
  removeLorePage,
  openDocumentTab,
  openLoreTab,
  openLoreCreateTab,
  openNewTab,
  removeTabById,
}: UseContentTabActionsArgs) {
  const handleAddDocument = useCallback(async () => {
    if (!(await canLeaveCurrentView())) return;
    const created = await addDocument();
    if (created) {
      openDocumentTab(created);
    }
  }, [addDocument, canLeaveCurrentView, openDocumentTab]);

  const handleRemoveDocument = useCallback(async (docId: string) => {
    const removed = await removeDocument(docId);
    if (removed) {
      removeTabById(`doc:${docId}`, { skipGuard: true });
    }
  }, [removeDocument, removeTabById]);

  const handleOpenLoreCreate = useCallback(async () => {
    openLoreCreateTab();
  }, [openLoreCreateTab]);

  const handleRemoveLorePage = useCallback(async (loreId: string) => {
    const removed = await removeLorePage(loreId);
    if (removed) {
      removeTabById(`lore:${loreId}`, { skipGuard: true });
    }
  }, [removeLorePage, removeTabById]);

  const openLoreEntryPoint = useCallback(() => {
    if (activeLore) {
      openLoreTab(activeLore);
    } else {
      openLoreCreateTab();
    }
  }, [activeLore, openLoreCreateTab, openLoreTab]);

  return useMemo(
    () => ({
      handleAddDocument,
      handleRemoveDocument,
      handleOpenLoreCreate,
      handleRemoveLorePage,
      openLoreEntryPoint,
    }),
    [handleAddDocument, handleOpenLoreCreate, handleRemoveDocument, handleRemoveLorePage, openLoreEntryPoint],
  );
}
