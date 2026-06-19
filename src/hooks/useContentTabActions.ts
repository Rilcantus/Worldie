import { useCallback, useMemo } from "react";
import type { Document, LorePage } from "../lib/data";
import type { NavigationResult } from "./navigationResult";

type UseContentTabActionsArgs = {
  activeLore: LorePage | undefined;
  canLeaveCurrentView: () => Promise<boolean>;
  addDocument: () => Promise<Document | null>;
  removeDocument: (docId: string) => Promise<boolean>;
  removeLorePage: (loreId: string) => Promise<boolean>;
  openDocumentTab: (doc: Document) => Promise<NavigationResult>;
  openLoreTab: (page: LorePage) => Promise<NavigationResult>;
  openLoreCreateTab: () => Promise<NavigationResult>;
  openNewTab: () => Promise<NavigationResult>;
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
