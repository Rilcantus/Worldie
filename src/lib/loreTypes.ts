import { canUseBrowserStorage, readStoredJson } from "./browserStorage";
import { normalizeCustomFieldDefinitions, type CustomFieldDefinition } from "./customFieldDefinitions";
export {
  normalizeCustomFieldDefinitions,
  slugifyCustomFieldKey,
  type CustomFieldDefinition,
  type CustomFieldDefinitionType,
} from "./customFieldDefinitions";

export type LoreType = {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  fieldDefinitions: CustomFieldDefinition[];
  order: number;
  isSystem: boolean;
};

const STORAGE_KEY = "worldie.loreTypes";

export const SYSTEM_LORE_TYPES: LoreType[] = [
  { id: "loretype-character", name: "Character", slug: "character", fieldDefinitions: [], order: 0, isSystem: true },
  { id: "loretype-place", name: "Place", slug: "place", fieldDefinitions: [], order: 1, isSystem: true },
  { id: "loretype-faction", name: "Faction", slug: "faction", fieldDefinitions: [], order: 2, isSystem: true },
  { id: "loretype-creature", name: "Creature", slug: "creature", fieldDefinitions: [], order: 3, isSystem: true },
  { id: "loretype-item", name: "Item", slug: "item", fieldDefinitions: [], order: 4, isSystem: true },
  { id: "loretype-event", name: "Event", slug: "event", fieldDefinitions: [], order: 5, isSystem: true },
  { id: "loretype-concept", name: "Concept", slug: "concept", fieldDefinitions: [], order: 6, isSystem: true },
];

export function slugifyLoreTypeName(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "lore-type";
}

function normalizeLoreType(type: LoreType, index: number): LoreType {
  return {
    ...type,
    name: type.name.trim() || "Untitled Type",
    slug: slugifyLoreTypeName(type.slug || type.name),
    fieldDefinitions: normalizeCustomFieldDefinitions(type.fieldDefinitions),
    order: type.order ?? index,
  };
}

export function sortLoreTypes(types: LoreType[]) {
  return [...types].sort((left, right) => left.order - right.order || left.name.localeCompare(right.name));
}

function getScopedStorageKey(projectId: string | null) {
  return projectId ? `${STORAGE_KEY}:${projectId}` : STORAGE_KEY;
}

export function normalizeLoreTypes(types: LoreType[]) {
  return sortLoreTypes(types.map(normalizeLoreType));
}

export function getSeededLoreTypes() {
  return SYSTEM_LORE_TYPES.map((type) => ({ ...type }));
}

export function loadLegacyLoreTypes(projectId: string | null) {
  if (!canUseBrowserStorage()) return getSeededLoreTypes();
  const scopedKey = getScopedStorageKey(projectId);
  const raw = readStoredJson<LoreType[] | null>(scopedKey, null);
  if (raw) return normalizeLoreTypes(raw);
  const legacy = projectId ? readStoredJson<LoreType[] | null>(STORAGE_KEY, null) : null;
  return legacy ? normalizeLoreTypes(legacy) : getSeededLoreTypes();
}

export function getDefaultLoreTypeId(types: LoreType[]) {
  return sortLoreTypes(types)[0]?.id ?? null;
}

export function getLoreTypeByName(types: LoreType[], name: string) {
  const normalized = name.trim().toLowerCase();
  return (
    types.find((type) => type.name.trim().toLowerCase() === normalized) ??
    types.find((type) => type.slug === slugifyLoreTypeName(name)) ??
    null
  );
}
