import { useEffect, useRef } from "react";
import type { Document, LorePage } from "../lib/data";

type UseWorkspaceNavigationArgs = {
  activeWorldId: string | null;
  activeDocumentId: string | null;
  activeLoreId: string | null;
  documents: Document[];
  lorePages: LorePage[];
  allLorePages: LorePage[];
  resolveLoreTypeId: (page: LorePage) => string | null;
  setActiveWorldId: (worldId: string) => void;
  setActiveLoreTypeId: (loreTypeId: string | null) => void;
  openDocumentTab: (doc: Document) => void;
  openLoreTab: (page: LorePage) => void;
  openLoreCreateTab: () => void;
  openNewTab: () => void;
};

export function useWorkspaceNavigation({
  activeWorldId,
  activeDocumentId,
  activeLoreId,
  documents,
  lorePages,
  allLorePages,
  resolveLoreTypeId,
  setActiveWorldId,
  setActiveLoreTypeId,
  openDocumentTab,
  openLoreTab,
  openLoreCreateTab,
  openNewTab,
}: UseWorkspaceNavigationArgs) {
  const pendingOpenKind = useRef<"editor" | "lore" | null>(null);

  useEffect(() => {
    if (pendingOpenKind.current !== "editor") return;
    pendingOpenKind.current = null;
    if (documents[0]) openDocumentTab(documents[0]);
    else openNewTab();
  }, [documents, openDocumentTab, openNewTab]);

  useEffect(() => {
    if (pendingOpenKind.current !== "lore") return;
    pendingOpenKind.current = null;
    if (lorePages[0]) openLoreTab(lorePages[0]);
    else openLoreCreateTab();
  }, [lorePages, openLoreCreateTab, openLoreTab]);

  const openEditorForWorld = (worldId: string) => {
    if (worldId !== activeWorldId) {
      pendingOpenKind.current = "editor";
      setActiveWorldId(worldId);
      return;
    }
    const nextDoc = documents.find((doc) => doc.id === activeDocumentId) ?? documents[0];
    if (nextDoc) openDocumentTab(nextDoc);
    else openNewTab();
  };

  const openLoreRootForWorld = (worldId: string) => {
    if (worldId !== activeWorldId) {
      pendingOpenKind.current = "lore";
      setActiveWorldId(worldId);
      return;
    }
    const nextPage = lorePages.find((page) => page.id === activeLoreId) ?? lorePages[0];
    if (nextPage) openLoreTab(nextPage);
    else openLoreCreateTab();
  };

  const openLoreCategoryForWorld = (worldId: string, loreTypeId: string) => {
    setActiveLoreTypeId(loreTypeId);
    if (worldId !== activeWorldId) {
      pendingOpenKind.current = "lore";
      setActiveWorldId(worldId);
      return;
    }
    const nextPage = allLorePages.find((page) => page.worldId === worldId && resolveLoreTypeId(page) === loreTypeId);
    if (nextPage) openLoreTab(nextPage);
    else openLoreCreateTab();
  };

  return {
    openEditorForWorld,
    openLoreRootForWorld,
    openLoreCategoryForWorld,
  };
}
