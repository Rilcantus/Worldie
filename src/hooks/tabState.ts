import type { TabItem } from "../types/ui";
import type { Document } from "../lib/data";

export const WORKBENCH_TAB: TabItem = { id: "workbench", kind: "workbench", label: "Workbench", icon: "W" };

export function isWorkbenchOnlyTabState(tabs: TabItem[]) {
  return (
    tabs.length === 1 &&
    tabs[0].id === WORKBENCH_TAB.id &&
    tabs[0].kind === WORKBENCH_TAB.kind &&
    tabs[0].label === WORKBENCH_TAB.label &&
    tabs[0].icon === WORKBENCH_TAB.icon
  );
}

export function removeTabWithFallback(prev: TabItem[], tabId: string) {
  const next: TabItem[] = [];
  let closingIndex = -1;

  for (const tab of prev) {
    if (tab.id === tabId) {
      closingIndex = next.length;
      continue;
    }
    next.push(tab);
  }

  if (closingIndex === -1) {
    return {
      closingIndex,
      nextTabs: prev,
      normalizedNextTabs: prev,
      removed: false,
    };
  }

  const normalizedNextTabs = next.length > 0 ? next : [WORKBENCH_TAB];
  return {
    closingIndex,
    nextTabs: next,
    normalizedNextTabs,
    removed: true,
  };
}

export function upsertTab(prev: TabItem[], tab: TabItem, activeTabId: string, shouldReplaceActiveNew: boolean) {
  const next: TabItem[] = [];
  let changed = false;
  let found = false;

  for (const item of prev) {
    if (shouldReplaceActiveNew && item.id === activeTabId) {
      changed = true;
      continue;
    }
    if (item.id !== tab.id) {
      next.push(item);
      continue;
    }
    found = true;
    const merged = { ...item, ...tab };
    const same =
      item.kind === merged.kind &&
      item.label === merged.label &&
      item.icon === merged.icon &&
      item.refId === merged.refId &&
      item.worldId === merged.worldId;
    next.push(same ? item : merged);
    if (!same) {
      changed = true;
    }
  }

  if (!found) {
    next.push(tab);
    changed = true;
  }

  return changed ? next : prev;
}

export function pruneTabsForWorlds(prev: TabItem[], activeTabId: string, worldIdsSet: Set<string>) {
  const next: TabItem[] = [];
  let changed = false;
  let activeTabStillPresent = false;

  for (const tab of prev) {
    const keep = !tab.worldId || worldIdsSet.has(tab.worldId);
    if (!keep) {
      changed = true;
      continue;
    }
    if (tab.id === activeTabId) {
      activeTabStillPresent = true;
    }
    next.push(tab);
  }

  const normalizedNextTabs = next.length > 0 ? next : [WORKBENCH_TAB];
  if (normalizedNextTabs.length !== prev.length) {
    changed = true;
  }

  return {
    activeTabStillPresent,
    nextTabs: changed ? normalizedNextTabs : prev,
    changed,
  };
}

export function resolveDocumentForTabOpen(doc: Document | null | undefined, documentsById: Map<string, Document>) {
  if (!doc) return null;
  return documentsById.get(doc.id) ?? doc;
}
