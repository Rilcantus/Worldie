import type { Document, LorePage } from "../lib/data";

export function getFirstLorePageByWorld(allLorePages: LorePage[]) {
  const map = new Map<string, LorePage>();
  for (const page of allLorePages) {
    if (!map.has(page.worldId)) {
      map.set(page.worldId, page);
    }
  }
  return map;
}

export function getFirstLorePageByWorldAndType(
  allLorePages: LorePage[],
  resolveLoreTypeId: (page: LorePage) => string | null,
) {
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
}

export function getEditorTargetForWorld(
  worldId: string,
  activeDocumentId: string | null,
  documents: Document[],
  documentsById: Map<string, Document>,
) {
  const activeDocument = activeDocumentId ? documentsById.get(activeDocumentId) : undefined;
  if (activeDocument?.worldId === worldId) {
    return activeDocument;
  }
  return documents.find((doc) => doc.worldId === worldId) ?? null;
}

export function getLoreRootTargetForWorld(
  worldId: string,
  activeLoreId: string | null,
  lorePagesById: Map<string, LorePage>,
  firstLorePageByWorld: Map<string, LorePage>,
) {
  const activeLore = activeLoreId ? lorePagesById.get(activeLoreId) : null;
  if (activeLore?.worldId === worldId) {
    return activeLore;
  }
  return firstLorePageByWorld.get(worldId) ?? null;
}

export function getLoreCategoryTargetForWorld(
  worldId: string,
  loreTypeId: string,
  firstLorePageByWorldAndType: Map<string, LorePage>,
) {
  return firstLorePageByWorldAndType.get(`${worldId}:${loreTypeId}`) ?? null;
}
