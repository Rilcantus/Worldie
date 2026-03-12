import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Document, LorePage } from "../lib/data";
import { loadProjectTabs, saveProjectTabs } from "../lib/uiStore";
import type { TabItem, TabKind } from "../types/ui";

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
};

const WORKBENCH_TAB: TabItem = { id: "workbench", kind: "workbench", label: "Workbench", icon: "W" };

function isWorkbenchOnlyTabState(tabs: TabItem[]) {
  return (
    tabs.length === 1 &&
    tabs[0].id === WORKBENCH_TAB.id &&
    tabs[0].kind === WORKBENCH_TAB.kind &&
    tabs[0].label === WORKBENCH_TAB.label &&
    tabs[0].icon === WORKBENCH_TAB.icon
  );
}

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
}: UseTabsArgs) {
  const [tabs, setTabs] = useState<TabItem[]>([WORKBENCH_TAB]);
  const [activeTabId, setActiveTabId] = useState("workbench");
  const [tabsProjectId, setTabsProjectId] = useState<string | null>(null);
  const pendingTabOpenId = useRef<string | null>(null);
  const pendingWorldScopedTabId = useRef<string | null>(null);

  const clearPendingTabRefs = useCallback((tabId?: string) => {
    if (!tabId || pendingTabOpenId.current === tabId) {
      pendingTabOpenId.current = null;
    }
    if (!tabId || pendingWorldScopedTabId.current === tabId) {
      pendingWorldScopedTabId.current = null;
    }
  }, []);

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
      const nextActiveTabId = next.activeTabId ?? next.tabs[0].id;
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
    if (!tabs.some((tab) => tab.id === activeTabId)) {
      const fallbackTabId = tabs[0]?.id ?? "workbench";
      setActiveTabId((current) => (current === fallbackTabId ? current : fallbackTabId));
    }
  }, [tabs, activeTabId]);

  useEffect(() => {
    if (!activeProjectId || tabsProjectId !== activeProjectId || worldIds.length === 0) return;
    setTabs((prev) => {
      const next = prev.filter((tab) => !tab.worldId || worldIds.includes(tab.worldId));
      const nextTabs = next.length > 0 ? next : [WORKBENCH_TAB];
      if (!next.some((tab) => tab.id === activeTabId)) {
        pendingTabOpenId.current = null;
        pendingWorldScopedTabId.current = null;
      }
      if (
        nextTabs.length === prev.length &&
        nextTabs.every((tab, index) => tab === prev[index])
      ) {
        return prev;
      }
      return nextTabs;
    });
  }, [activeProjectId, activeTabId, tabsProjectId, worldIds]);

  useEffect(() => {
    const pendingId = pendingTabOpenId.current;
    if (!pendingId) return;
    const tab = tabs.find((item) => item.id === pendingId);
    if (!tab) {
      pendingTabOpenId.current = null;
      return;
    }
    if (tab.kind === "editor" && tab.refId) {
      const doc = documents.find((item) => item.id === tab.refId);
      if (!doc) return;
      pendingTabOpenId.current = null;
      onSelectDocument(doc);
      return;
    }
    if (tab.kind === "lore" && tab.refId) {
      const page = allLorePages.find((item) => item.id === tab.refId);
      if (!page) return;
      pendingTabOpenId.current = null;
      onSelectLorePage(page, resolveLoreTypeId(page));
      return;
    }
    pendingTabOpenId.current = null;
  }, [activeWorldId, allLorePages, documents, onSelectDocument, onSelectLorePage, resolveLoreTypeId, tabs]);

  useEffect(() => {
    const pendingId = pendingWorldScopedTabId.current;
    if (!pendingId) return;
    const tab = tabs.find((item) => item.id === pendingId);
    if (!tab) {
      pendingWorldScopedTabId.current = null;
      return;
    }
    if ((tab.kind === "rels" || tab.kind === "timeline") && tab.worldId === activeWorldId) {
      pendingWorldScopedTabId.current = null;
    }
  }, [activeWorldId, tabs]);

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
          (tab.kind !== "rels" && tab.kind !== "timeline") ||
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

  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0] ?? null;
  const activeNav: TabKind = activeTab?.kind ?? "new";

  useEffect(() => {
    if (!activeTab || tabsProjectId !== activeProjectId) return;
    if (
      (pendingWorldScopedTabId.current === activeTab.id || activeWorldId === null) &&
      (activeTab.kind === "rels" || activeTab.kind === "timeline") &&
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
      const doc = documents.find((item) => item.id === activeTab.refId);
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
      const page = allLorePages.find((item) => item.id === activeTab.refId);
      if (page) onSelectLorePage(page, resolveLoreTypeId(page));
    }
  }, [
    activeDocumentId,
    activeLoreId,
    activeTab,
    activeProjectId,
    activeWorldId,
    allLorePages,
    documents,
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
      new: 7,
    };
    return [...tabs].sort((a, b) => priority[a.kind] - priority[b.kind]);
  }, [tabs]);

  const openTab = useCallback((tab: TabItem) => {
    setTabs((prev) => {
      const shouldReplaceActiveNew = activeTabId.startsWith("new:");
      const exists = prev.some((item) => item.id === tab.id);
      if (exists) {
        const filtered = prev.filter((item) => !(shouldReplaceActiveNew && item.id === activeTabId));
        let changed = filtered.length !== prev.length;
        const next = filtered.map((item) => {
          if (item.id !== tab.id) return item;
          const merged = { ...item, ...tab };
          const same =
            item.kind === merged.kind &&
            item.label === merged.label &&
            item.icon === merged.icon &&
            item.refId === merged.refId &&
            item.worldId === merged.worldId;
          if (same) return item;
          changed = true;
          return merged;
        });
        return changed ? next : prev;
      }
      const base = shouldReplaceActiveNew ? prev.filter((item) => item.id !== activeTabId) : prev;
      return [...base, tab];
    });
    setActiveTabId((current) => (current === tab.id ? current : tab.id));
  }, [activeTabId]);

  const openWorkbenchTab = useCallback(() => openTab(WORKBENCH_TAB), [openTab]);

  const openSpecialTab = useCallback(
    (kind: "rels" | "timeline", worldId = activeWorldId) =>
      openTab({
        id: kind,
        kind,
        label: kind === "rels" ? "Relationships" : "Timeline",
        icon: kind === "rels" ? "R" : "T",
        worldId,
      }),
    [activeWorldId, openTab],
  );

  const openTemplatesTab = useCallback(
    () => openTab({ id: "templates", kind: "templates", label: "Templates", icon: "S" }),
    [openTab],
  );
  const openLoreTypesTab = useCallback(
    () => openTab({ id: "loretypes", kind: "ltypes", label: "Lore Types", icon: "Y" }),
    [openTab],
  );
  const openLoreCreateTab = useCallback(
    () => openTab({ id: "lore:create", kind: "lcreate", label: "New Lore Item", icon: "+" }),
    [openTab],
  );

  const openNewTab = useCallback(
    () => openTab({ id: `new:${crypto.randomUUID()}`, kind: "new", label: "New Tab", icon: "+" }),
    [openTab],
  );

  const openDocumentTab = useCallback((doc: Document) => {
    onSelectDocument(doc);
    openTab({
      id: `doc:${doc.id}`,
      kind: "editor",
      label: doc.title || "Untitled Document",
      icon: "D",
      refId: doc.id,
      worldId: doc.worldId,
    });
  }, [onSelectDocument, openTab]);

  const openLoreTab = useCallback((page: LorePage) => {
    onSelectLorePage(page, resolveLoreTypeId(page));
    openTab({
      id: `lore:${page.id}`,
      kind: "lore",
      label: page.title || "Untitled Lore",
      icon: "L",
      refId: page.id,
      worldId: page.worldId,
    });
  }, [onSelectLorePage, openTab, resolveLoreTypeId]);

  const handleTabSelect = useCallback((tab: TabItem) => {
    const isAlreadyActiveTab = tab.id === activeTabId;
    if (
      isAlreadyActiveTab &&
      (tab.kind === "workbench" ||
        tab.kind === "templates" ||
        tab.kind === "ltypes" ||
        tab.kind === "lcreate" ||
        tab.kind === "new")
    ) {
      return;
    }
    if (
      isAlreadyActiveTab &&
      tab.kind === "editor" &&
      tab.refId &&
      (!tab.worldId || tab.worldId === activeWorldId) &&
      activeDocumentId === tab.refId
    ) {
      return;
    }
    if (
      isAlreadyActiveTab &&
      tab.kind === "lore" &&
      tab.refId &&
      (!tab.worldId || tab.worldId === activeWorldId) &&
      activeLoreId === tab.refId
    ) {
      return;
    }
    if (
      isAlreadyActiveTab &&
      (tab.kind === "rels" || tab.kind === "timeline") &&
      (!tab.worldId || tab.worldId === activeWorldId)
    ) {
      return;
    }

    setActiveTabId(tab.id);
    if ((tab.kind === "rels" || tab.kind === "timeline") && tab.worldId && tab.worldId !== activeWorldId) {
      pendingWorldScopedTabId.current = tab.id;
      setActiveWorldId(tab.worldId);
      return;
    }
    if (tab.kind === "editor" && tab.refId) {
      if (tab.worldId && tab.worldId !== activeWorldId) {
        pendingTabOpenId.current = tab.id;
        setActiveWorldId(tab.worldId);
        return;
      }
      const doc = documents.find((item) => item.id === tab.refId);
      if (doc) onSelectDocument(doc);
    }
    if (tab.kind === "lore" && tab.refId) {
      if (tab.worldId && tab.worldId !== activeWorldId) {
        pendingTabOpenId.current = tab.id;
        setActiveWorldId(tab.worldId);
        return;
      }
      const page = allLorePages.find((item) => item.id === tab.refId);
      if (page) onSelectLorePage(page, resolveLoreTypeId(page));
    }
  }, [
    activeDocumentId,
    activeLoreId,
    activeTabId,
    activeWorldId,
    allLorePages,
    documents,
    onSelectDocument,
    onSelectLorePage,
    resolveLoreTypeId,
    setActiveWorldId,
  ]);

  const handleTabClose = useCallback((tab: TabItem) => {
    clearPendingTabRefs(tab.id);
    setTabs((prev) => {
      const closingIndex = prev.findIndex((item) => item.id === tab.id);
      const next = prev.filter((item) => item.id !== tab.id);
      const normalizedNext = next.length > 0 ? next : [WORKBENCH_TAB];
      if (tab.id === activeTabId) {
        const fallback =
          normalizedNext[Math.max(0, closingIndex - 1)] ??
          normalizedNext[closingIndex] ??
          normalizedNext[normalizedNext.length - 1];
        setActiveTabId(fallback?.id ?? "workbench");
      }
      return normalizedNext;
    });
  }, [activeTabId, clearPendingTabRefs]);

  const removeTabById = useCallback((tabId: string) => {
    clearPendingTabRefs(tabId);
    setTabs((prev) => {
      const closingIndex = prev.findIndex((item) => item.id === tabId);
      if (closingIndex === -1) return prev;
      const next = prev.filter((tab) => tab.id !== tabId);
      const normalizedNext = next.length > 0 ? next : [WORKBENCH_TAB];
      if (tabId === activeTabId) {
        const fallback =
          normalizedNext[Math.max(0, closingIndex - 1)] ??
          normalizedNext[closingIndex] ??
          normalizedNext[normalizedNext.length - 1];
        setActiveTabId(fallback?.id ?? "workbench");
      }
      return normalizedNext;
    });
  }, [activeTabId, clearPendingTabRefs]);
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
