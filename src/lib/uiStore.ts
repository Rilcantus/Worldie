/*
Local browser storage is reserved for UI state only.
Project entities are persisted through the active `.worldie` file.
*/
import { readStoredJson, writeStoredJson } from "./browserStorage";
import type { TabItem } from "../types/ui";

const TABS_STORAGE_KEY = "worldie.tabs";

type ProjectTabsState = Record<string, { tabs: TabItem[]; activeTabId: string }>;

export function loadProjectTabs(projectId: string | null) {
  if (!projectId) return null;
  const parsed = readStoredJson<ProjectTabsState>(TABS_STORAGE_KEY, {});
  return parsed[projectId] ?? null;
}

export function saveProjectTabs(projectId: string | null, tabs: TabItem[], activeTabId: string) {
  if (!projectId) return;
  const parsed = readStoredJson<ProjectTabsState>(TABS_STORAGE_KEY, {});
  parsed[projectId] = { tabs, activeTabId };
  writeStoredJson(TABS_STORAGE_KEY, parsed);
}
