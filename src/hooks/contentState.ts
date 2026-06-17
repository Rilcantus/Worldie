import type { LorePage } from "../lib/data";
import type { LoreTemplate } from "../lib/loreTemplates";
import type { LoreType } from "../lib/loreTypes";

export function countNonEmptyWords(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export function buildInitialLoreFields(loreTypeId: string | null, template: LoreTemplate | null) {
  return JSON.stringify(
    {
      loreTypeId,
      templateId: template?.id ?? null,
      traits:
        template?.traitDefinitions.map((trait) => ({
          id: crypto.randomUUID(),
          name: trait.label.trim() || "Trait",
          value: "",
        })) ?? [],
      details: "",
      customFields: {},
    },
    null,
    2,
  );
}

export function buildLoreTypeCounts(
  pages: LorePage[],
  orderedLoreTypes: LoreType[],
  resolveLoreTypeId: (page: LorePage) => string | null,
) {
  const counts = Object.fromEntries(orderedLoreTypes.map((type) => [type.id, 0]));
  for (const page of pages) {
    const loreTypeId = resolveLoreTypeId(page);
    if (!loreTypeId || !(loreTypeId in counts)) continue;
    counts[loreTypeId] += 1;
  }
  return counts;
}

export function collectLoreStats(
  pages: LorePage[],
  activeTypeId: string | null,
  orderedLoreTypes: LoreType[],
  resolveLoreTypeId: (page: LorePage) => string | null,
) {
  const counts = Object.fromEntries(orderedLoreTypes.map((type) => [type.id, 0]));
  const pagesForActiveType: LorePage[] = [];
  for (const page of pages) {
    const loreTypeId = resolveLoreTypeId(page);
    if (!loreTypeId || !(loreTypeId in counts)) continue;
    counts[loreTypeId] += 1;
    if (activeTypeId && loreTypeId === activeTypeId) {
      pagesForActiveType.push(page);
    }
  }
  return { counts, pagesForActiveType };
}
