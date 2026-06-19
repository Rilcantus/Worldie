import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Document, LorePage } from "../lib/data";
import { loadProjectTabs, saveProjectTabs } from "../lib/uiStore";
import type { TabItem, TabKind } from "../types/ui";
import { shouldGuardActiveTabRemoval } from "./dirtyState";
import {
  didNavigationSucceed,
  navigationBlocked,
  navigationSuccess,
  resolveGuardedNavigation,
  type NavigationResult,
} from "./navigationResult";
import {
  WORKBENCH_TAB,
  isWorkbenchOnlyTabState,
  pruneTabsForWorlds,
  removeTabWithFallback,
  resolveDocumentForTabOpen,
  upsertTab,
} from "./tabState";

type UseTabsArgs = {
  activeProjectId: string | null;
  activeWorldId: string | null;
  worldIds: string[];
  documents: Document[];
  allLorePages: LorePage[];
  activeDocumentId: string | null;
  activeDocumentTitle: string;
  activeLoreId: string | null;
  activeLoreTitle: string;
  resolveLoreTypeId: (page: LorePage) => string | null;
  setActiveWorldId: (worldId: string) => void;
  onSelectDocument: (doc: Document) => void;
  onSelectLorePage: (page: LorePage, loreTypeId: string | null) => void;
  canLeaveCurrentView: () => Promise<boolean>;
};

type NavigationOptions = {
  skipGuard?: boolean;
};

type RemoveTabOptions = {
  skipGuard?: boolean;
};

export function useTabs({
  activeProjectId,
  activeWorldId,
  worldIds,
  documents,
  allLorePages,
  activeDocumentId,
  activeDocumentTitle,
  activeLoreId,
  activeLoreTitle,
  resolveLoreTypeId,
  setActiveWorldId,
  onSelectDocument,
  onSelectLorePage,
  canLeaveCurrentView,
}: UseTabsArgs) {
  const [tabs, setTabs] = useState<TabItem[]>([WORKBENCH_TAB]);
  const [activeTabId, setActiveTabId] = useState("workbench");
  const [tabsProjectId, setTabsProjectId] = useState<string | null>(null);
  const pendingTabOpenId = useRef<string | null>(null);
  const pendingWorldScopedTabId = useRef<string | null>(null);
  const tabsById = useMemo(() => new Map(tabs.map((item) => [item.id, item])), [tabs]);
  const worldIdsSet = useMemo(() => new Set(worldIds), [worldIds]);
  const documentsById = useMemo(() => new Map(documents.map((item) => [item.id, item])), [documents]);
  const lorePagesById = useMemo(() => new Map(allLorePages.map((item) => [item.id, item])), [allLorePages]);
  const activeProjectIdRef = useRef(activeProjectId);
  const activeWorldIdRef = useRef(activeWorldId);
  const activeTabIdRef = useRef(activeTabId);
  const documentsByIdRef = useRef(documentsById);
  const lorePagesByIdRef = useRef(lorePagesById);
  const tabsByIdRef = useRef(tabsById);

  const clearPendingTabRefs = useCallback((tabId?: string) => {
    if (!tabId || pendingTabOpenId.current === tabId) {
      pendingTabOpenId.current = null;
    }
    if (!tabId || pendingWorldScopedTabId.current === tabId) {
      pendingWorldScopedTabId.current = null;
    }
  }, []);

  useEffect(() => {
    activeProjectIdRef.current = activeProjectId;
  }, [activeProjectId]);

  useEffect(() => {
    activeWorldIdRef.current = activeWorldId;
  }, [activeWorldId]);

  useEffect(() => {
    activeTabIdRef.current = activeTabId;
  }, [activeTabId]);

  useEffect(() => {
    documentsByIdRef.current = documentsById;
  }, [documentsById]);

  useEffect(() => {
    lorePagesByIdRef.current = lorePagesById;
  }, [lorePagesById]);

  useEffect(() => {
    tabsByIdRef.current = tabsById;
  }, [tabsById]);

  useEffect(() => {
    if (!activeProjectId) {
      pendingTabOpenId.current = null;
      pendingWorldScopedTabId.current = null;
      setTabs((current) => (isWorkbenchOnlyTabState(current) ? current : [WORKBENCH_TAB]));
      setActiveTabId((current) => (current === "workbench" ? current : "workbench"));
      setTabsProjectId((current) => (current === null ? current : null));
      return;
    }
    pendingTabOpenId.current = null;
    pendingWorldScopedTabId.current = null;
    setTabsProjectId((current) => (current === null ? current : null));
    const next = loadProjectTabs(activeProjectId);
    if (next?.tabs?.length) {
      setTabs(next.tabs);
      const nextActiveTabId =
        (next.activeTabId && next.tabs.some((tab) => tab.id === next.activeTabId) ? next.activeTabId : null) ??
        next.tabs[0].id;
      setActiveTabId((current) => (current === nextActiveTabId ? current : nextActiveTabId));
    } else {
      setTabs((current) => (isWorkbenchOnlyTabState(current) ? current : [WORKBENCH_TAB]));
      setActiveTabId((current) => (current === "workbench" ? current : "workbench"));
    }
    setTabsProjectId((current) => (current === activeProjectId ? current : activeProjectId));
  }, [activeProjectId]);

  useEffect(() => {
    if (!activeProjectId || tabsProjectId !== activeProjectId) return;
    saveProjectTabs(activeProjectId, tabs, activeTabId);
  }, [tabs, activeTabId, activeProjectId, tabsProjectId]);

  useEffect(() => {
    if (!tabsById.has(activeTabId)) {
      const fallbackTabId = tabs[0]?.id ?? "workbench";
      setActiveTabId((current) => (current === fallbackTabId ? current : fallbackTabId));
    }
  }, [tabs, activeTabId, tabsById]);

  useEffect(() => {
    if (!activeProjectId || tabsProjectId !== activeProjectId || worldIds.length === 0) return;
    setTabs((prev) => {
      const { activeTabStillPresent, nextTabs, changed } = pruneTabsForWorlds(prev, activeTabId, worldIdsSet);
      if (!activeTabStillPresent) {
        pendingTabOpenId.current = null;
        pendingWorldScopedTabId.current = null;
      }
      return changed ? nextTabs : prev;
    });
  }, [activeProjectId, activeTabId, tabsProjectId, worldIds, worldIdsSet]);

  useEffect(() => {
    const pendingId = pendingTabOpenId.current;
    if (!pendingId) return;
    const tab = tabsById.get(pendingId);
    if (!tab) {
      pendingTabOpenId.current = null;
      return;
    }
    if (tab.kind === "editor" && tab.refId) {
      const doc = documentsById.get(tab.refId);
      if (!doc) return;
      pendingTabOpenId.current = null;
      onSelectDocument(doc);
      return;
    }
    if (tab.kind === "lore" && tab.refId) {
      const page = lorePagesById.get(tab.refId);
      if (!page) return;
      pendingTabOpenId.current = null;
      onSelectLorePage(page, resolveLoreTypeId(page));
      return;
    }
    pendingTabOpenId.current = null;
  }, [activeWorldId, documentsById, lorePagesById, onSelectDocument, onSelectLorePage, resolveLoreTypeId, tabsById]);

  useEffect(() => {
    const pendingId = pendingWorldScopedTabId.current;
    if (!pendingId) return;
    const tab = tabsById.get(pendingId);
    if (!tab) {
      pendingWorldScopedTabId.current = null;
      return;
    }
    if ((tab.kind === "rels" || tab.kind === "timeline" || tab.kind === "atlas") && tab.worldId === activeWorldId) {
      pendingWorldScopedTabId.current = null;
    }
  }, [activeWorldId, tabsById]);

  useEffect(() => {
    if (!activeDocumentId) return;
    const id = `doc:${activeDocumentId}`;
    const label = activeDocumentTitle || "Untitled Document";
    setTabs((prev) => {
      let changed = false;
      const next = prev.map((tab) => {
        if (tab.id !== id || tab.label === label) return tab;
        changed = true;
        return { ...tab, label };
      });
      return changed ? next : prev;
    });
  }, [activeDocumentId, activeDocumentTitle]);

  useEffect(() => {
    if (!activeLoreId) return;
    const id = `lore:${activeLoreId}`;
    const label = activeLoreTitle || "Untitled Lore";
    setTabs((prev) => {
      let changed = false;
      const next = prev.map((tab) => {
        if (tab.id !== id || tab.label === label) return tab;
        changed = true;
        return { ...tab, label };
      });
      return changed ? next : prev;
    });
  }, [activeLoreId, activeLoreTitle]);

  useEffect(() => {
    if (!activeWorldId) return;
    setTabs((prev) => {
      let changed = false;
      const next = prev.map((tab) => {
        if (
          tab.id !== activeTabId ||
          (tab.kind !== "rels" && tab.kind !== "timeline" && tab.kind !== "atlas") ||
          tab.worldId === activeWorldId
        ) {
          return tab;
        }
        changed = true;
        return { ...tab, worldId: activeWorldId };
      });
      return changed ? next : prev;
    });
  }, [activeTabId, activeWorldId]);

  const activeTab = tabsById.get(activeTabId) ?? tabs[0] ?? null;
  const activeNav: TabKind = activeTab?.kind ?? "new";

  useEffect(() => {
    if (!activeTab || tabsProjectId !== activeProjectId) return;
    if (
      (pendingWorldScopedTabId.current === activeTab.id || activeWorldId === null) &&
      (activeTab.kind === "rels" || activeTab.kind === "timeline" || activeTab.kind === "atlas") &&
      activeTab.worldId &&
      activeTab.worldId !== activeWorldId
    ) {
      setActiveWorldId(activeTab.worldId);
      return;
    }
    if (activeTab.kind === "editor" && activeTab.refId) {
      if (activeTab.worldId && activeTab.worldId !== activeWorldId) {
        pendingTabOpenId.current = activeTab.id;
        setActiveWorldId(activeTab.worldId);
        return;
      }
      if (activeDocumentId === activeTab.refId) return;
      const doc = documentsById.get(activeTab.refId);
      if (doc) onSelectDocument(doc);
      return;
    }
    if (activeTab.kind === "lore" && activeTab.refId) {
      if (activeTab.worldId && activeTab.worldId !== activeWorldId) {
        pendingTabOpenId.current = activeTab.id;
        setActiveWorldId(activeTab.worldId);
        return;
      }
      if (activeLoreId === activeTab.refId) return;
      const page = lorePagesById.get(activeTab.refId);
      if (page) onSelectLorePage(page, resolveLoreTypeId(page));
    }
  }, [
    activeDocumentId,
    activeLoreId,
    activeTab,
    activeProjectId,
    activeWorldId,
    documentsById,
    lorePagesById,
    onSelectDocument,
    onSelectLorePage,
    resolveLoreTypeId,
    setActiveWorldId,
    tabsProjectId,
  ]);

  const displayTabs = useMemo(() => {
    const priority: Record<TabKind, number> = {
      workbench: -1,
      editor: 0,
      lore: 1,
      templates: 2,
      ltypes: 3,
      lcreate: 4,
      rels: 5,
      timeline: 6,
      atlas: 7,
      new: 8,
    };
    return [...tabs].sort((a, b) => priority[a.kind] - priority[b.kind]);
  }, [tabs]);

  const openTab = useCallback((tab: TabItem) => {
    setTabs((prev) => {
      const shouldReplaceActiveNew = activeTabId.startsWith("new:");
      return upsertTab(prev, tab, activeTabId, shouldReplaceActiveNew);
    });
    setActiveTabId((current) => (current === tab.id ? current : tab.id));
  }, [activeTabId]);

  const resolveOpenGuard = useCallback(
    async (actionProjectId: string | null, options?: NavigationOptions): Promise<NavigationResult> => {
      const guardResult = await resolveGuardedNavigation({
        skipGuard: options?.skipGuard,
        canLeaveCurrentView,
      });
      if (!didNavigationSucceed(guardResult)) return guardResult;
      if (activeProjectIdRef.current !== actionProjectId) return navigationBlocked("project changed during navigation");
      return guardResult;
    },
    [canLeaveCurrentView],
  );

  const openWorkbenchTab = useCallback(async (options?: NavigationOptions) => {
    const actionProjectId = activeProjectId;
    if (activeTabId === WORKBENCH_TAB.id) return navigationSuccess("already active");
    const guardResult = await resolveOpenGuard(actionProjectId, options);
    if (!didNavigationSucceed(guardResult)) return guardResult;
    openTab(WORKBENCH_TAB);
    return navigationSuccess("opened");
  }, [activeProjectId, activeTabId, openTab, resolveOpenGuard]);

  const openSpecialTab = useCallback(
    async (kind: "rels" | "timeline" | "atlas", worldId = activeWorldId, options?: NavigationOptions) => {
      const actionProjectId = activeProjectId;
      const nextTabId = kind;
      const isAlreadyActive =
        activeTabId === nextTabId &&
        (!worldId || worldId === activeWorldId);
      if (isAlreadyActive) return navigationSuccess("already active");
      const guardResult = await resolveOpenGuard(actionProjectId, options);
      if (!didNavigationSucceed(guardResult)) return guardResult;
      openTab({
        id: kind,
        kind,
        label: kind === "rels" ? "Relationships" : kind === "timeline" ? "Timeline" : "Atlas",
        icon: kind === "rels" ? "R" : kind === "timeline" ? "T" : "A",
        worldId,
      });
      return navigationSuccess("opened");
    },
    [activeProjectId, activeTabId, activeWorldId, openTab, resolveOpenGuard],
  );

  const openTemplatesTab = useCallback(
    async (options?: NavigationOptions) => {
      const actionProjectId = activeProjectId;
      if (activeTabId === "templates") return navigationSuccess("already active");
      const guardResult = await resolveOpenGuard(actionProjectId, options);
      if (!didNavigationSucceed(guardResult)) return guardResult;
      openTab({ id: "templates", kind: "templates", label: "Templates", icon: "S" });
      return navigationSuccess("opened");
    },
    [activeProjectId, activeTabId, openTab, resolveOpenGuard],
  );
  const openLoreTypesTab = useCallback(
    async (options?: NavigationOptions) => {
      const actionProjectId = activeProjectId;
      if (activeTabId === "loretypes") return navigationSuccess("already active");
      const guardResult = await resolveOpenGuard(actionProjectId, options);
      if (!didNavigationSucceed(guardResult)) return guardResult;
      openTab({ id: "loretypes", kind: "ltypes", label: "Lore Types", icon: "Y" });
      return navigationSuccess("opened");
    },
    [activeProjectId, activeTabId, openTab, resolveOpenGuard],
  );
  const openLoreCreateTab = useCallback(
    async (options?: NavigationOptions) => {
      const actionProjectId = activeProjectId;
      if (activeTabId === "lore:create") return navigationSuccess("already active");
      const guardResult = await resolveOpenGuard(actionProjectId, options);
      if (!didNavigationSucceed(guardResult)) return guardResult;
      openTab({ id: "lore:create", kind: "lcreate", label: "New Lore Item", icon: "+" });
      return navigationSuccess("opened");
    },
    [activeProjectId, activeTabId, openTab, resolveOpenGuard],
  );

  const openNewTab = useCallback(
    async (options?: NavigationOptions) => {
      const actionProjectId = activeProjectId;
      const guardResult = await resolveOpenGuard(actionProjectId, options);
      if (!didNavigationSucceed(guardResult)) return guardResult;
      openTab({ id: `new:${crypto.randomUUID()}`, kind: "new", label: "New Tab", icon: "+" });
      return navigationSuccess("opened");
    },
    [activeProjectId, openTab, resolveOpenGuard],
  );

  const openDocumentTab = useCallback(async (doc: Document, options?: NavigationOptions) => {
    const actionProjectId = activeProjectId;
    const nextTabId = `doc:${doc.id}`;
    const isAlreadyActive =
      activeTabId === nextTabId &&
      activeDocumentId === doc.id &&
      (!doc.worldId || doc.worldId === activeWorldId);
    if (isAlreadyActive) return navigationSuccess("already active");
    const guardResult = await resolveOpenGuard(actionProjectId, options);
    if (!didNavigationSucceed(guardResult)) return guardResult;
    const currentDoc = resolveDocumentForTabOpen(doc, documentsByIdRef.current);
    if (!currentDoc) return navigationBlocked("document unavailable");
    onSelectDocument(currentDoc);
    openTab({
      id: nextTabId,
      kind: "editor",
      label: currentDoc.title || "Untitled Document",
      icon: "D",
      refId: currentDoc.id,
      worldId: currentDoc.worldId,
    });
    return navigationSuccess("opened");
  }, [activeDocumentId, activeProjectId, activeTabId, activeWorldId, onSelectDocument, openTab, resolveOpenGuard]);

  const openLoreTab = useCallback(async (page: LorePage, options?: NavigationOptions) => {
    const actionProjectId = activeProjectId;
    const nextTabId = `lore:${page.id}`;
    const isAlreadyActive =
      activeTabId === nextTabId &&
      activeLoreId === page.id &&
      (!page.worldId || page.worldId === activeWorldId);
    if (isAlreadyActive) return navigationSuccess("already active");
    const guardResult = await resolveOpenGuard(actionProjectId, options);
    if (!didNavigationSucceed(guardResult)) return guardResult;
    const currentPage = lorePagesByIdRef.current.get(page.id);
    if (!currentPage) return navigationBlocked("lore page unavailable");
    onSelectLorePage(currentPage, resolveLoreTypeId(currentPage));
    openTab({
      id: nextTabId,
      kind: "lore",
      label: currentPage.title || "Untitled Lore",
      icon: "L",
      refId: currentPage.id,
      worldId: currentPage.worldId,
    });
    return navigationSuccess("opened");
  }, [activeLoreId, activeProjectId, activeTabId, activeWorldId, onSelectLorePage, openTab, resolveLoreTypeId, resolveOpenGuard]);

  const handleTabSelect = useCallback(async (tab: TabItem) => {
    const actionProjectId = activeProjectId;
    const isAlreadyActiveTab = tab.id === activeTabId;
    if (
      isAlreadyActiveTab &&
      (tab.kind === "workbench" ||
        tab.kind === "templates" ||
        tab.kind === "ltypes" ||
        tab.kind === "lcreate" ||
        tab.kind === "new")
    ) {
      return navigationSuccess("already active");
    }
    if (
      isAlreadyActiveTab &&
      tab.kind === "editor" &&
      tab.refId &&
      (!tab.worldId || tab.worldId === activeWorldId) &&
      activeDocumentId === tab.refId
    ) {
      return navigationSuccess("already active");
    }
    if (
      isAlreadyActiveTab &&
      tab.kind === "lore" &&
      tab.refId &&
      (!tab.worldId || tab.worldId === activeWorldId) &&
      activeLoreId === tab.refId
    ) {
      return navigationSuccess("already active");
    }
    if (
      isAlreadyActiveTab &&
      (tab.kind === "rels" || tab.kind === "timeline" || tab.kind === "atlas") &&
      (!tab.worldId || tab.worldId === activeWorldId)
    ) {
      return navigationSuccess("already active");
    }

    const guardResult = await resolveOpenGuard(actionProjectId);
    if (!didNavigationSucceed(guardResult)) return guardResult;
    const currentTab = tabsByIdRef.current.get(tab.id);
    if (!currentTab) return navigationBlocked("tab unavailable");

    setActiveTabId(currentTab.id);
    if (
      (currentTab.kind === "rels" || currentTab.kind === "timeline" || currentTab.kind === "atlas") &&
      currentTab.worldId &&
      currentTab.worldId !== activeWorldIdRef.current
    ) {
      pendingWorldScopedTabId.current = currentTab.id;
      setActiveWorldId(currentTab.worldId);
      return navigationSuccess("opened");
    }
    if (currentTab.kind === "editor" && currentTab.refId) {
      if (currentTab.worldId && currentTab.worldId !== activeWorldIdRef.current) {
        pendingTabOpenId.current = currentTab.id;
        setActiveWorldId(currentTab.worldId);
        return navigationSuccess("opened");
      }
      const doc = documentsByIdRef.current.get(currentTab.refId);
      if (doc) onSelectDocument(doc);
      else return navigationBlocked("document unavailable");
    }
    if (currentTab.kind === "lore" && currentTab.refId) {
      if (currentTab.worldId && currentTab.worldId !== activeWorldIdRef.current) {
        pendingTabOpenId.current = currentTab.id;
        setActiveWorldId(currentTab.worldId);
        return navigationSuccess("opened");
      }
      const page = lorePagesByIdRef.current.get(currentTab.refId);
      if (page) onSelectLorePage(page, resolveLoreTypeId(page));
      else return navigationBlocked("lore page unavailable");
    }
    return navigationSuccess("opened");
  }, [
    activeDocumentId,
    activeLoreId,
    activeProjectId,
    activeTabId,
    activeWorldId,
    onSelectDocument,
    onSelectLorePage,
    resolveLoreTypeId,
    setActiveWorldId,
    resolveOpenGuard,
  ]);

  const handleTabClose = useCallback(async (tab: TabItem, options?: RemoveTabOptions) => {
    if (shouldGuardActiveTabRemoval(activeTabId, tab.id, options?.skipGuard) && !(await canLeaveCurrentView())) {
      return;
    }
    clearPendingTabRefs(tab.id);
    setTabs((prev) => {
      const { closingIndex, normalizedNextTabs } = removeTabWithFallback(prev, tab.id);
      if (tab.id === activeTabId) {
        const fallback =
          normalizedNextTabs[Math.max(0, closingIndex - 1)] ??
          normalizedNextTabs[closingIndex] ??
          normalizedNextTabs[normalizedNextTabs.length - 1];
        setActiveTabId(fallback?.id ?? "workbench");
      }
      return normalizedNextTabs;
    });
  }, [activeTabId, canLeaveCurrentView, clearPendingTabRefs]);

  const removeTabById = useCallback(async (tabId: string, options?: RemoveTabOptions) => {
    if (shouldGuardActiveTabRemoval(activeTabId, tabId, options?.skipGuard) && !(await canLeaveCurrentView())) {
      return;
    }
    clearPendingTabRefs(tabId);
    setTabs((prev) => {
      const { closingIndex, normalizedNextTabs, removed } = removeTabWithFallback(prev, tabId);
      if (!removed) return prev;
      if (tabId === activeTabId) {
        const fallback =
          normalizedNextTabs[Math.max(0, closingIndex - 1)] ??
          normalizedNextTabs[closingIndex] ??
          normalizedNextTabs[normalizedNextTabs.length - 1];
        setActiveTabId(fallback?.id ?? "workbench");
      }
      return normalizedNextTabs;
    });
  }, [activeTabId, canLeaveCurrentView, clearPendingTabRefs]);
  const resetTabs = useCallback(() => {
    clearPendingTabRefs();
    setTabs((current) => (isWorkbenchOnlyTabState(current) ? current : [WORKBENCH_TAB]));
    setActiveTabId((current) => (current === "workbench" ? current : "workbench"));
  }, [clearPendingTabRefs]);

  return useMemo(
    () => ({
      tabs,
      activeTabId,
      activeNav,
      displayTabs,
      openWorkbenchTab,
      openSpecialTab,
      openTemplatesTab,
      openLoreTypesTab,
      openLoreCreateTab,
      openNewTab,
      openDocumentTab,
      openLoreTab,
      handleTabSelect,
      handleTabClose,
      removeTabById,
      resetTabs,
    }),
    [
      tabs,
      activeTabId,
      activeNav,
      displayTabs,
      openWorkbenchTab,
      openSpecialTab,
      openTemplatesTab,
      openLoreTypesTab,
      openLoreCreateTab,
      openNewTab,
      openDocumentTab,
      openLoreTab,
      handleTabSelect,
      handleTabClose,
      removeTabById,
      resetTabs,
    ],
  );
}
