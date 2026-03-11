import { getLoreTypeByName, type LoreType } from "./loreTypes";
import { canUseBrowserStorage, readStoredJson } from "./browserStorage";

export type TraitDefinition = {
  id: string;
  label: string;
  placeholder: string;
  order: number;
};

export type LoreTemplate = {
  id: string;
  name: string;
  loreTypeId: string;
  traitDefinitions: TraitDefinition[];
};

const STORAGE_KEY = "worldie.loreTemplates";

const seededTemplateSeeds = [
  {
    id: "template-character-default",
    name: "Character Core",
    loreTypeName: "Character",
    traitDefinitions: [
      { id: "character-role", label: "Role", placeholder: "Scout, ruler, mage...", order: 0 },
      { id: "character-goal", label: "Goal", placeholder: "What do they want?", order: 1 },
      { id: "character-status", label: "Status", placeholder: "Active, missing, dead...", order: 2 },
      { id: "character-origin", label: "Origin", placeholder: "Homeland or faction", order: 3 },
    ],
  },
  {
    id: "template-creature-default",
    name: "Creature Core",
    loreTypeName: "Creature",
    traitDefinitions: [
      { id: "creature-nature", label: "Nature", placeholder: "Predator, spirit, hybrid...", order: 0 },
      { id: "creature-habitat", label: "Habitat", placeholder: "Forest, sea, ruins...", order: 1 },
      { id: "creature-threat", label: "Threat", placeholder: "Low, severe, mythic...", order: 2 },
      { id: "creature-origin", label: "Origin", placeholder: "Known birthplace or legend", order: 3 },
    ],
  },
  {
    id: "template-place-default",
    name: "Location Core",
    loreTypeName: "Place",
    traitDefinitions: [
      { id: "place-region", label: "Region", placeholder: "Northern coast, undercity...", order: 0 },
      { id: "place-climate", label: "Climate", placeholder: "Frozen, humid, volcanic...", order: 1 },
      { id: "place-condition", label: "Condition", placeholder: "Prosperous, ruined, contested...", order: 2 },
      { id: "place-mood", label: "Mood", placeholder: "Bleak, bustling, sacred...", order: 3 },
    ],
  },
];

function sortTraitDefinitions(traits: TraitDefinition[]) {
  return [...traits].sort((left, right) => left.order - right.order);
}

function normalizeTemplate(template: LoreTemplate): LoreTemplate {
  return {
    ...template,
    name: template.name.trim() || "Untitled Template",
    loreTypeId: template.loreTypeId,
    traitDefinitions: sortTraitDefinitions(
      template.traitDefinitions.map((trait, index) => ({
        ...trait,
        label: trait.label.trim() || "Trait",
        placeholder: trait.placeholder ?? "",
        order: trait.order ?? index,
      })),
    ),
  };
}

function createSeededTemplates(loreTypes: LoreType[]) {
  return seededTemplateSeeds
    .map((seed) => {
      const loreType = getLoreTypeByName(loreTypes, seed.loreTypeName);
      if (!loreType) return null;
      return normalizeTemplate({
        id: seed.id,
        name: seed.name,
        loreTypeId: loreType.id,
        traitDefinitions: seed.traitDefinitions,
      });
    })
    .filter((template): template is LoreTemplate => Boolean(template));
}

function getScopedStorageKey(projectId: string | null) {
  return projectId ? `${STORAGE_KEY}:${projectId}` : STORAGE_KEY;
}

export function normalizeLoreTemplate(
  template: LoreTemplate | (Omit<LoreTemplate, "loreTypeId"> & { loreType?: string }),
  loreTypes: LoreType[],
) {
  if ("loreTypeId" in template && template.loreTypeId) {
    return normalizeTemplate(template);
  }
  const legacyLoreType = "loreType" in template ? template.loreType ?? "" : "";
  const loreType = getLoreTypeByName(loreTypes, legacyLoreType);
  if (!loreType) return null;
  return normalizeTemplate({
    id: template.id,
    name: template.name,
    loreTypeId: loreType.id,
    traitDefinitions: template.traitDefinitions,
  });
}

export function getSeededLoreTemplates(loreTypes: LoreType[]) {
  return createSeededTemplates(loreTypes);
}

export function loadLegacyLoreTemplates(projectId: string | null, loreTypes: LoreType[]) {
  const seededTemplates = getSeededLoreTemplates(loreTypes);
  if (!canUseBrowserStorage()) return seededTemplates;
  const scopedKey = getScopedStorageKey(projectId);
  const raw = readStoredJson<Array<LoreTemplate | (Omit<LoreTemplate, "loreTypeId"> & { loreType?: string })> | null>(
    scopedKey,
    null,
  );
  if (raw) {
    return raw
      .map((template) => normalizeLoreTemplate(template, loreTypes))
      .filter((template): template is LoreTemplate => Boolean(template));
  }

  const legacy = projectId
    ? readStoredJson<Array<LoreTemplate | (Omit<LoreTemplate, "loreTypeId"> & { loreType?: string })> | null>(
        STORAGE_KEY,
        null,
      )
    : null;
  return (legacy ?? seededTemplates)
    .map((template) => normalizeLoreTemplate(template, loreTypes))
    .filter((template): template is LoreTemplate => Boolean(template));
}
