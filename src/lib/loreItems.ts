import type { LoreTemplate, TraitDefinition } from "./loreTemplates";

export type LoreTrait = {
  id: string;
  name: string;
  value: string;
};

export type LoreCustomFieldValue = string | number | boolean | null;
export type LoreCustomFields = Record<string, LoreCustomFieldValue>;

export type LoreItemFields = {
  loreTypeId: string | null;
  templateId: string | null;
  traits: LoreTrait[];
  details: string;
  customFields: LoreCustomFields;
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
    return { loreTypeId: null, templateId: null, traits: [], details: "", customFields: {} };
  }

  try {
    const parsed = JSON.parse(fieldsJson) as
      | {
          loreTypeId?: string | null;
          templateId?: string | null;
          traits?: Array<{ id?: string; name?: string; value?: string }>;
          details?: string;
          customFields?: Record<string, unknown>;
        }
      | Record<string, unknown>;

    if (Array.isArray((parsed as { traits?: unknown }).traits)) {
      const item = parsed as {
        loreTypeId?: string | null;
        templateId?: string | null;
        traits?: Array<{ id?: string; name?: string; value?: string }>;
        details?: string;
        customFields?: Record<string, unknown>;
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
        customFields: normalizeCustomFields(item.customFields),
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
      customFields: {},
    };
  } catch {
    return { loreTypeId: null, templateId: null, traits: [], details: "", customFields: {} };
  }
}

function normalizeCustomFields(fields: Record<string, unknown> | null | undefined): LoreCustomFields {
  if (!fields || typeof fields !== "object" || Array.isArray(fields)) return {};
  return Object.fromEntries(
    Object.entries(fields)
      .map(([key, value]) => [key.trim(), normalizeCustomFieldValue(value)] as const)
      .filter(([key]) => key.length > 0),
  );
}

function normalizeCustomFieldValue(value: unknown): LoreCustomFieldValue {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null) {
    return value;
  }
  return String(value);
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
      customFields: normalizeCustomFields(fields.customFields),
    },
    null,
    2,
  );
}

export function renameLoreCustomField(
  customFields: LoreCustomFields,
  previousName: string,
  nextName: string,
): LoreCustomFields {
  const normalizedName = nextName.trim() || "Custom field";
  const nextFields: LoreCustomFields = {};

  for (const [name, value] of Object.entries(customFields)) {
    if (name === previousName) {
      nextFields[normalizedName] = value;
    } else if (name !== normalizedName) {
      nextFields[name] = value;
    }
  }

  return nextFields;
}
