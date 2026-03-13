import { useCallback, useEffect, useMemo, useRef, type Dispatch, type SetStateAction } from "react";
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
  openDocumentTab: (doc: Document, options?: { skipGuard?: boolean }) => void;
  openLoreTab: (page: LorePage, options?: { skipGuard?: boolean }) => void;
  openLoreCreateTab: (options?: { skipGuard?: boolean }) => void;
  openNewTab: (options?: { skipGuard?: boolean }) => void;
  canLeaveCurrentView: () => Promise<boolean>;
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
  canLeaveCurrentView,
}: UseWorkspaceNavigationArgs) {
  const pendingOpen = useRef<{ kind: "editor" | "loreRoot" | "loreCategory"; worldId: string; loreTypeId?: string } | null>(
    null,
  );
  const documentsById = useMemo(() => new Map(documents.map((doc) => [doc.id, doc])), [documents]);
  const lorePagesById = useMemo(() => new Map(allLorePages.map((page) => [page.id, page])), [allLorePages]);
  const firstLorePageByWorld = useMemo(() => {
    const map = new Map<string, LorePage>();
    for (const page of allLorePages) {
      if (!map.has(page.worldId)) {
        map.set(page.worldId, page);
      }
    }
    return map;
  }, [allLorePages]);
  const firstLorePageByWorldAndType = useMemo(() => {
    const map = new Map<string, LorePage>();
    for (const page of allLorePages) {
      const loreTypeId = resolveLoreTypeId(page);
      if (!loreTypeId) continue;
      const key = `${page.worldId}:${loreTypeId}`;
      if (!map.has(key)) {
        map.set(key, page);
      }
    }
    return map;
  }, [allLorePages, resolveLoreTypeId]);

  useEffect(() => {
    if (!activeWorldId) {
      pendingOpen.current = null;
    }
  }, [activeWorldId]);

  useEffect(() => {
    if (pendingOpen.current?.kind !== "editor" || pendingOpen.current.worldId !== activeWorldId) return;
    if (documentsLoadedWorldId !== activeWorldId) return;
    pendingOpen.current = null;
    if (documents[0]) void openDocumentTab(documents[0], { skipGuard: true });
    else void openNewTab({ skipGuard: true });
  }, [activeWorldId, documents, documentsLoadedWorldId, openDocumentTab, openNewTab]);

  useEffect(() => {
    if (!pendingOpen.current || (pendingOpen.current.kind !== "loreRoot" && pendingOpen.current.kind !== "loreCategory")) return;
    if (pendingOpen.current.worldId !== activeWorldId) return;
    if (loreLoadedWorldId !== activeWorldId) return;
    const pending = pendingOpen.current;
    pendingOpen.current = null;
    const nextPage =
      pending.kind === "loreRoot"
        ? firstLorePageByWorld.get(activeWorldId) ?? null
        : firstLorePageByWorldAndType.get(`${activeWorldId}:${pending.loreTypeId}`) ?? null;
    if (nextPage) void openLoreTab(nextPage, { skipGuard: true });
    else void openLoreCreateTab({ skipGuard: true });
  }, [activeWorldId, firstLorePageByWorld, firstLorePageByWorldAndType, loreLoadedWorldId, openLoreCreateTab, openLoreTab]);

  const openEditorForWorld = useCallback(async (worldId: string) => {
    if (worldId !== activeWorldId) {
      if (!(await canLeaveCurrentView())) return;
      pendingOpen.current = { kind: "editor", worldId };
      setActiveWorldId(worldId);
      return;
    }
    const nextDoc = (activeDocumentId ? documentsById.get(activeDocumentId) : undefined) ?? documents[0];
    if (nextDoc) void openDocumentTab(nextDoc);
    else void openNewTab();
  }, [activeDocumentId, activeWorldId, canLeaveCurrentView, documents, documentsById, openDocumentTab, openNewTab, setActiveWorldId]);

  const openLoreRootForWorld = useCallback(async (worldId: string) => {
    if (worldId !== activeWorldId) {
      if (!(await canLeaveCurrentView())) return;
      setActiveLoreTypeId((current) => (current ? null : current));
      pendingOpen.current = { kind: "loreRoot", worldId };
      setActiveWorldId(worldId);
      return;
    }
    if (!(await canLeaveCurrentView())) return;
    setActiveLoreTypeId((current) => (current ? null : current));
    const nextPage =
      ((activeLoreId ? lorePagesById.get(activeLoreId) : null)?.worldId === worldId
        ? lorePagesById.get(activeLoreId!)
        : null) ??
      firstLorePageByWorld.get(worldId) ??
      null;
    if (nextPage) void openLoreTab(nextPage, { skipGuard: true });
    else void openLoreCreateTab({ skipGuard: true });
  }, [
    activeLoreId,
    activeWorldId,
    firstLorePageByWorld,
    lorePagesById,
    openLoreCreateTab,
    openLoreTab,
    setActiveLoreTypeId,
    setActiveWorldId,
    canLeaveCurrentView,
  ]);

  const openLoreCategoryForWorld = useCallback(async (worldId: string, loreTypeId: string) => {
    if (worldId !== activeWorldId) {
      if (!(await canLeaveCurrentView())) return;
      setActiveLoreTypeId((current) => (current === loreTypeId ? current : loreTypeId));
      pendingOpen.current = { kind: "loreCategory", worldId, loreTypeId };
      setActiveWorldId(worldId);
      return;
    }
    if (!(await canLeaveCurrentView())) return;
    setActiveLoreTypeId((current) => (current === loreTypeId ? current : loreTypeId));
    const nextPage = firstLorePageByWorldAndType.get(`${worldId}:${loreTypeId}`) ?? null;
    if (nextPage) void openLoreTab(nextPage, { skipGuard: true });
    else void openLoreCreateTab({ skipGuard: true });
  }, [
    activeWorldId,
    firstLorePageByWorldAndType,
    openLoreCreateTab,
    openLoreTab,
    setActiveLoreTypeId,
    setActiveWorldId,
    canLeaveCurrentView,
  ]);

  return useMemo(
    () => ({
      openEditorForWorld,
      openLoreRootForWorld,
      openLoreCategoryForWorld,
    }),
    [openEditorForWorld, openLoreRootForWorld, openLoreCategoryForWorld],
  );
}
