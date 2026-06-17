export type CustomFieldDefinitionType = "text" | "long_text" | "number" | "checkbox" | "select" | "date";

export type CustomFieldDefinition = {
  id: string;
  name: string;
  key: string;
  type: CustomFieldDefinitionType;
  options: string[];
  required: boolean;
  order: number;
  defaultValue?: string | number | boolean | null;
};

export function slugifyCustomFieldKey(value: string) {
  const key = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return key || "custom_field";
}

export function normalizeCustomFieldDefinitions(
  definitions: CustomFieldDefinition[] | null | undefined,
): CustomFieldDefinition[] {
  if (!Array.isArray(definitions)) return [];
  return [...definitions]
    .map((definition, index) => {
      const name = definition.name?.trim() || "Custom Field";
      const key = slugifyCustomFieldKey(definition.key || name);
      const type: CustomFieldDefinitionType = isCustomFieldDefinitionType(definition.type) ? definition.type : "text";
      return {
        id: definition.id || crypto.randomUUID(),
        name,
        key,
        type,
        options: Array.isArray(definition.options)
          ? definition.options.map((option) => String(option).trim()).filter(Boolean)
          : [],
        required: Boolean(definition.required),
        order: definition.order ?? index,
        defaultValue: normalizeDefaultValue(definition.defaultValue),
      };
    })
    .sort((left, right) => left.order - right.order || left.name.localeCompare(right.name))
    .map((definition, order) => ({ ...definition, order }));
}

function isCustomFieldDefinitionType(value: unknown): value is CustomFieldDefinitionType {
  return typeof value === "string" && ["text", "long_text", "number", "checkbox", "select", "date"].includes(value);
}

function normalizeDefaultValue(value: unknown) {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null) {
    return value;
  }
  return undefined;
}
