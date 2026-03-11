import type { LoreTemplate, TraitDefinition } from "./loreTemplates";

export type LoreTrait = {
  id: string;
  name: string;
  value: string;
};

export type LoreItemFields = {
  loreTypeId: string | null;
  templateId: string | null;
  traits: LoreTrait[];
  details: string;
};

function normalizeTraitName(value: string) {
  return value.trim() || "Trait";
}

export function createTraitsFromTemplate(template: LoreTemplate | null) {
  if (!template) return [] as LoreTrait[];
  return template.traitDefinitions.map((trait: TraitDefinition) => ({
    id: crypto.randomUUID(),
    name: trait.label,
    value: "",
  }));
}

export function parseLoreItemFields(fieldsJson: string | null | undefined): LoreItemFields {
  if (!fieldsJson?.trim()) {
    return { loreTypeId: null, templateId: null, traits: [], details: "" };
  }

  try {
    const parsed = JSON.parse(fieldsJson) as
      | {
          loreTypeId?: string | null;
          templateId?: string | null;
          traits?: Array<{ id?: string; name?: string; value?: string }>;
          details?: string;
        }
      | Record<string, unknown>;

    if (Array.isArray((parsed as { traits?: unknown }).traits)) {
      const item = parsed as {
        loreTypeId?: string | null;
        templateId?: string | null;
        traits?: Array<{ id?: string; name?: string; value?: string }>;
        details?: string;
      };
      return {
        loreTypeId: item.loreTypeId ?? null,
        templateId: item.templateId ?? null,
        traits:
          item.traits?.map((trait) => ({
            id: trait.id ?? crypto.randomUUID(),
            name: normalizeTraitName(trait.name ?? ""),
            value: trait.value ?? "",
          })) ?? [],
        details: item.details ?? "",
      };
    }

    const legacy = parsed as Record<string, unknown>;
    const details = typeof legacy._details === "string" ? legacy._details : "";
    const traits = Object.entries(legacy)
      .filter(([key]) => key !== "_details")
      .map(([key, value]) => ({
        id: crypto.randomUUID(),
        name: key,
        value: value == null ? "" : String(value),
      }));

    return {
      loreTypeId: null,
      templateId: null,
      traits,
      details,
    };
  } catch {
    return { loreTypeId: null, templateId: null, traits: [], details: "" };
  }
}

export function stringifyLoreItemFields(fields: LoreItemFields) {
  return JSON.stringify(
    {
      loreTypeId: fields.loreTypeId,
      templateId: fields.templateId,
      traits: fields.traits.map((trait) => ({
        id: trait.id,
        name: normalizeTraitName(trait.name),
        value: trait.value,
      })),
      details: fields.details,
    },
    null,
    2,
  );
}
