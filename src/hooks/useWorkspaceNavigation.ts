import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import type { Document, LorePage } from "../lib/data";

type UseWorkspaceNavigationArgs = {
  activeWorldId: string | null;
  documentsLoadedWorldId: string | null;
  loreLoadedWorldId: string | null;
  activeDocumentId: string | null;
  activeLoreId: string | null;
  documents: Document[];
  lorePages: LorePage[];
  allLorePages: LorePage[];
  resolveLoreTypeId: (page: LorePage) => string | null;
  setActiveWorldId: Dispatch<SetStateAction<string | null>>;
  setActiveLoreTypeId: Dispatch<SetStateAction<string | null>>;
  openDocumentTab: (doc: Document) => void;
  openLoreTab: (page: LorePage) => void;
  openLoreCreateTab: () => void;
  openNewTab: () => void;
};

export function useWorkspaceNavigation({
  activeWorldId,
  documentsLoadedWorldId,
  loreLoadedWorldId,
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
  const pendingOpen = useRef<{ kind: "editor" | "loreRoot" | "loreCategory"; worldId: string; loreTypeId?: string } | null>(
    null,
  );

  useEffect(() => {
    if (!activeWorldId) {
      pendingOpen.current = null;
    }
  }, [activeWorldId]);

  useEffect(() => {
    if (pendingOpen.current?.kind !== "editor" || pendingOpen.current.worldId !== activeWorldId) return;
    if (documentsLoadedWorldId !== activeWorldId) return;
    pendingOpen.current = null;
    if (documents[0]) openDocumentTab(documents[0]);
    else openNewTab();
  }, [activeWorldId, documents, documentsLoadedWorldId, openDocumentTab, openNewTab]);

  useEffect(() => {
    if (!pendingOpen.current || (pendingOpen.current.kind !== "loreRoot" && pendingOpen.current.kind !== "loreCategory")) return;
    if (pendingOpen.current.worldId !== activeWorldId) return;
    if (loreLoadedWorldId !== activeWorldId) return;
    const pending = pendingOpen.current;
    pendingOpen.current = null;
    const nextPage =
      pending.kind === "loreRoot"
        ? allLorePages.find((page) => page.worldId === activeWorldId) ?? null
        : allLorePages.find(
            (page) => page.worldId === activeWorldId && resolveLoreTypeId(page) === pending.loreTypeId,
          ) ?? null;
    if (nextPage) openLoreTab(nextPage);
    else openLoreCreateTab();
  }, [activeWorldId, allLorePages, loreLoadedWorldId, openLoreCreateTab, openLoreTab, resolveLoreTypeId]);

  const openEditorForWorld = (worldId: string) => {
    if (worldId !== activeWorldId) {
      pendingOpen.current = { kind: "editor", worldId };
      setActiveWorldId(worldId);
      return;
    }
    const nextDoc = documents.find((doc) => doc.id === activeDocumentId) ?? documents[0];
    if (nextDoc) openDocumentTab(nextDoc);
    else openNewTab();
  };

  const openLoreRootForWorld = (worldId: string) => {
    setActiveLoreTypeId((current) => (current ? null : current));
    if (worldId !== activeWorldId) {
      pendingOpen.current = { kind: "loreRoot", worldId };
      setActiveWorldId(worldId);
      return;
    }
    const nextPage =
      allLorePages.find((page) => page.id === activeLoreId && page.worldId === worldId) ??
      allLorePages.find((page) => page.worldId === worldId) ??
      null;
    if (nextPage) openLoreTab(nextPage);
    else openLoreCreateTab();
  };

  const openLoreCategoryForWorld = (worldId: string, loreTypeId: string) => {
    setActiveLoreTypeId((current) => (current === loreTypeId ? current : loreTypeId));
    if (worldId !== activeWorldId) {
      pendingOpen.current = { kind: "loreCategory", worldId, loreTypeId };
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
