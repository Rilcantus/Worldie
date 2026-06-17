type SavedLoreTableViewInput = {
  name?: string;
  loreTypeId?: string | null;
  quickFilter?: string | null;
  sortKey?: string | null;
  sortDirection?: "asc" | "desc" | null;
  visibleColumnsJson?: string | null;
};

function omitUndefined(data: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
}

export function buildLoreTableViewPayload(
  projectId: string,
  worldId: string,
  view: SavedLoreTableViewInput & { name: string },
) {
  return omitUndefined({
    projectId,
    worldId,
    name: view.name,
    loreTypeId: view.loreTypeId,
    quickFilter: view.quickFilter,
    sortKey: view.sortKey,
    sortDirection: view.sortDirection,
    visibleColumnsJson: view.visibleColumnsJson,
  });
}

export function buildLoreTableViewUpdatePayload(
  projectId: string,
  viewId: string,
  updates: SavedLoreTableViewInput,
) {
  return omitUndefined({
    projectId,
    viewId,
    name: updates.name,
    loreTypeId: updates.loreTypeId,
    quickFilter: updates.quickFilter,
    sortKey: updates.sortKey,
    sortDirection: updates.sortDirection,
    visibleColumnsJson: updates.visibleColumnsJson,
  });
}
