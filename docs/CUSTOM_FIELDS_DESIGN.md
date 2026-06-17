# Worldie Custom Fields Design

## Status

This note describes the first small custom-fields slice for lore pages. It establishes a portable storage shape and a basic editing/export path. It does not implement a spreadsheet view, formulas, filtering, sorting, or a full field-definition manager.

## Goals

- Let lore pages store structured values such as age, species, role, faction, status, power level, and first appearance.
- Keep project data inside the `.worldie` SQLite file.
- Reuse the existing lore page persistence path where it is safe.
- Keep field values JSON-friendly so future table/database views can read the same data.
- Preserve existing lore pages and legacy fields.

## Storage Model

Lore pages already store flexible page data in `lore_pages.fields_json`. The MVP custom-fields slice keeps using that column and adds a stable `customFields` object inside the existing lore item JSON:

```json
{
  "loreTypeId": "character",
  "templateId": "character-sheet",
  "traits": [],
  "details": "",
  "customFields": {
    "Age": 31,
    "Species": "Human",
    "Active": true,
    "Faction": null
  }
}
```

This avoids a migration-heavy first step and keeps each lore page portable in the existing `.worldie` SQLite database. Existing lore pages without `customFields` continue to load with an empty custom-fields map.

## Field Definitions

The first slice stores field values but does not introduce first-class field definition records in the UI.

Future field definitions should likely be tied to lore types first, with optional template defaults:

- Lore type: defines reusable fields for all pages of that type, such as Character fields or Location fields.
- Lore template: can provide starter values, ordering, and recommended fields when creating a page.
- Lore page: stores the actual values in `customFields`.

The existing `custom_field_schemas` table can be revisited when Worldie adds a full definition manager. Until then, stable field names are enough for the MVP editor and export path.

## MVP Field Types

The stored value shape supports JSON-friendly scalar values:

- `text`
- `long_text`
- `number`
- `checkbox`
- `select`
- `date`

The MVP editor writes simple text values. Backend and frontend parsing preserve string, number, boolean, and null values when they already exist in `fields_json`, so future typed controls can be added without changing the storage format.

`lore_link` fields are a likely later addition. For now, users can still type `[[Lore Links]]` into text values, traits, and details.

## Clear And Partial Update Semantics

Worldie already treats lore page updates as partial updates:

- Omitted `fieldsJson` leaves existing lore fields unchanged.
- Explicit `fieldsJson: null` clears the whole lore fields payload.
- A `customFields` entry with a JSON `null` value represents a cleared value for that field.

This matches the nullable-field persistence semantics used elsewhere in the project store.

## Export Behavior

Markdown export includes non-empty custom field values in each lore page under:

```markdown
## Custom Fields

- **Age:** 31
- **Species:** Human
```

Null and empty-string values are skipped in Markdown export so cleared fields do not appear as filled data. Wiki-style links inside field values remain readable as text.

## Future Table Views

A future table/database view can read the same `customFields` object across lore pages:

- Rows: lore pages.
- Columns: field names or lore-type field definitions.
- Cells: values from each page's `customFields`.
- Filters and sorting: derived from scalar value types.

When field definitions are added, they should use stable IDs for field identity. The storage can then evolve from name-keyed values to ID-keyed values, or store both a stable ID and display label during migration.

## Migration Concerns

- Existing legacy lore JSON without `traits` is still interpreted as traits, not custom fields.
- Existing modern lore JSON without `customFields` loads with `{}`.
- If future field IDs replace display-name keys, Worldie needs a migration that preserves user-visible labels and avoids merging unrelated fields with the same name.
- Export and table views should tolerate missing definitions because `.worldie` files may contain older pages.

## Open Questions

- Should lore type field definitions be stored in the existing `custom_field_schemas` table or a new lore-type-scoped table?
- Should field values eventually be keyed by stable field ID instead of display name?
- How should field ordering be represented before a full table view exists?
- Which typed controls should ship first: number, checkbox, select, or date?
- Should select options live on lore types, templates, or both?
- How should `lore_link` fields store links: title text, lore page UUID, or both?
