import { useEffect, useMemo, useState } from "react";
import type { Document, LorePage } from "../lib/data";
import { loadProjectTabs, saveProjectTabs } from "../lib/uiStore";
import type { TabItem, TabKind } from "../types/ui";

type UseTabsArgs = {
  activeProjectId: string | null;
  documents: Document[];
  allLorePages: LorePage[];
  activeDocumentId: string | null;
  activeDocumentTitle: string;
  activeLoreId: string | null;
  activeLoreTitle: string;
  resolveLoreTypeId: (page: LorePage) => string | null;
  onSelectDocument: (doc: Document) => void;
  onSelectLorePage: (page: LorePage, loreTypeId: string | null) => void;
};

const WORKBENCH_TAB: TabItem = { id: "workbench", kind: "workbench", label: "Workbench", icon: "W" };

export function useTabs({
  activeProjectId,
  documents,
  allLorePages,
  activeDocumentId,
  activeDocumentTitle,
  activeLoreId,
  activeLoreTitle,
  resolveLoreTypeId,
  onSelectDocument,
  onSelectLorePage,
}: UseTabsArgs) {
  const [tabs, setTabs] = useState<TabItem[]>([WORKBENCH_TAB]);
  const [activeTabId, setActiveTabId] = useState("workbench");

  useEffect(() => {
    if (!activeProjectId) {
      setTabs([WORKBENCH_TAB]);
      setActiveTabId("workbench");
      return;
    }
    const next = loadProjectTabs(activeProjectId);
    if (next?.tabs?.length) {
      setTabs(next.tabs);
      setActiveTabId(next.activeTabId ?? next.tabs[0].id);
    } else {
      setTabs([WORKBENCH_TAB]);
      setActiveTabId("workbench");
    }
  }, [activeProjectId]);

  useEffect(() => {
    if (!activeProjectId) return;
    saveProjectTabs(activeProjectId, tabs, activeTabId);
  }, [tabs, activeTabId, activeProjectId]);

  useEffect(() => {
    setTabs((prev) => {
      const next = prev.filter((tab) => {
        if (!tab.refId) return true;
        if (tab.kind === "editor") return documents.some((doc) => doc.id === tab.refId);
        if (tab.kind === "lore") return allLorePages.some((page) => page.id === tab.refId);
        return true;
      });
      return next.length > 0 ? next : [WORKBENCH_TAB];
    });
  }, [documents, allLorePages]);

  useEffect(() => {
    if (!tabs.some((tab) => tab.id === activeTabId)) {
      setActiveTabId(tabs[0]?.id ?? "workbench");
    }
  }, [tabs, activeTabId]);

  useEffect(() => {
    if (!activeDocumentId) return;
    const id = `doc:${activeDocumentId}`;
    const label = activeDocumentTitle || "Untitled Document";
    setTabs((prev) => prev.map((tab) => (tab.id === id ? { ...tab, label } : tab)));
  }, [activeDocumentId, activeDocumentTitle]);

  useEffect(() => {
    if (!activeLoreId) return;
    const id = `lore:${activeLoreId}`;
    const label = activeLoreTitle || "Untitled Lore";
    setTabs((prev) => prev.map((tab) => (tab.id === id ? { ...tab, label } : tab)));
  }, [activeLoreId, activeLoreTitle]);

  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0] ?? null;
  const activeNav: TabKind = activeTab?.kind ?? "new";

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

  const openTab = (tab: TabItem) => {
    setTabs((prev) => {
      const shouldReplaceActiveNew = activeTabId.startsWith("new:");
      const exists = prev.some((item) => item.id === tab.id);
      if (exists) {
        return prev
          .filter((item) => !(shouldReplaceActiveNew && item.id === activeTabId))
          .map((item) => (item.id === tab.id ? { ...item, ...tab } : item));
      }
      const base = shouldReplaceActiveNew ? prev.filter((item) => item.id !== activeTabId) : prev;
      return [...base, tab];
    });
    setActiveTabId(tab.id);
  };

  const openWorkbenchTab = () => openTab(WORKBENCH_TAB);

  const openSpecialTab = (kind: "rels" | "timeline") =>
    openTab({ id: kind, kind, label: kind === "rels" ? "Relationships" : "Timeline", icon: kind === "rels" ? "R" : "T" });

  const openTemplatesTab = () => openTab({ id: "templates", kind: "templates", label: "Templates", icon: "S" });
  const openLoreTypesTab = () => openTab({ id: "loretypes", kind: "ltypes", label: "Lore Types", icon: "Y" });
  const openLoreCreateTab = () => openTab({ id: "lore:create", kind: "lcreate", label: "New Lore Item", icon: "+" });

  const openNewTab = () => openTab({ id: `new:${crypto.randomUUID()}`, kind: "new", label: "New Tab", icon: "+" });

  const openDocumentTab = (doc: Document) => {
    onSelectDocument(doc);
    openTab({ id: `doc:${doc.id}`, kind: "editor", label: doc.title || "Untitled Document", icon: "D", refId: doc.id });
  };

  const openLoreTab = (page: LorePage) => {
    onSelectLorePage(page, resolveLoreTypeId(page));
    openTab({ id: `lore:${page.id}`, kind: "lore", label: page.title || "Untitled Lore", icon: "L", refId: page.id });
  };

  const handleTabSelect = (tab: TabItem) => {
    setActiveTabId(tab.id);
    if (tab.kind === "editor" && tab.refId) {
      const doc = documents.find((item) => item.id === tab.refId);
      if (doc) onSelectDocument(doc);
    }
    if (tab.kind === "lore" && tab.refId) {
      const page = allLorePages.find((item) => item.id === tab.refId);
      if (page) onSelectLorePage(page, resolveLoreTypeId(page));
    }
  };

  const handleTabClose = (tab: TabItem) => {
    setTabs((prev) => {
      const closingIndex = prev.findIndex((item) => item.id === tab.id);
      const next = prev.filter((item) => item.id !== tab.id);
      if (tab.id === activeTabId) {
        const fallback = next[Math.max(0, closingIndex - 1)] ?? next[closingIndex] ?? next[next.length - 1];
        setActiveTabId(fallback?.id ?? "");
      }
      return next;
    });
  };

  const removeTabById = (tabId: string) => setTabs((prev) => prev.filter((tab) => tab.id !== tabId));
  const resetTabs = () => {
    setTabs([WORKBENCH_TAB]);
    setActiveTabId("workbench");
  };

  return {
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
  };
}
