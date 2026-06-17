# Worldie Custom Fields Design

## Status

This note describes the first small custom-fields slices for lore pages. Worldie now has portable page-level custom field values, reusable lore-type field definitions, a simple lore table, saved lore table views, and a narrow inline-editing path for custom field cells. It does not implement formulas, complex filtering, bulk editing, or advanced validation.

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

Lore types now store reusable custom field definitions in `lore_types.field_definitions_json`. This keeps definitions project-file scoped and portable inside the `.worldie` SQLite database.

Definitions are tied to lore types first:

- Lore type: defines reusable fields for all pages of that type, such as Character fields or Location fields.
- Lore template: can later provide starter values, ordering, and recommended fields when creating a page.
- Lore page: stores the actual values in `customFields`.

Definition shape:

```json
{
  "id": "field-age",
  "name": "Age",
  "key": "age",
  "type": "number",
  "options": [],
  "required": false,
  "order": 0,
  "defaultValue": null
}
```

Rules:

- `id` is stable and UUID-friendly.
- `name` is the display label.
- `key` is the stable machine key used by lore page `customFields`.
- `type` is one of the supported MVP field types.
- `options` is used for select fields.
- `required`, `order`, and `defaultValue` are stored for future validation/table views.
- Existing lore types without definitions load with an empty list.

The existing `custom_field_schemas` table can be revisited if Worldie later needs world-scoped or cross-type schema presets. It is not used for the current lore-type definition slice.

## MVP Field Types

The stored value shape supports JSON-friendly scalar values:

- `text`
- `long_text`
- `number`
- `checkbox`
- `select`
- `date`

The lore type editor can add, rename, re-key, type, and delete definitions. It supports basic select options as comma-separated text.

The lore page editor shows fields from the selected lore type first and renders simple controls by type:

- text/date/number use inputs.
- long text uses a textarea.
- checkbox uses a checkbox.
- select uses a dropdown.

Manual page-specific custom fields remain supported and are shown after definition-backed fields. Worldie does not delete existing values just because a definition changes.

`lore_link` fields are a likely later addition. For now, users can still type `[[Lore Links]]` into text values, traits, and details.

## Clear And Partial Update Semantics

Worldie already treats lore page updates as partial updates:

- Omitted `fieldsJson` leaves existing lore fields unchanged.
- Explicit `fieldsJson: null` clears the whole lore fields payload.
- A `customFields` entry with a JSON `null` value represents a cleared value for that field.

This matches the nullable-field persistence semantics used elsewhere in the project store.

Lore type definitions follow the same intent:

- Omitted `fieldDefinitions` during backend lore type replacement preserves existing definitions for that lore type.
- Explicit `fieldDefinitions: null` clears definitions.
- Existing lore types without definitions load as `[]`.

## Export Behavior

Markdown export includes non-empty custom field values in each lore page under:

```markdown
## Custom Fields

- **Age:** 31
- **Species:** Human
```

When lore type definitions are available, export uses definition order and display labels. Extra page-specific fields are exported after definition-backed fields. Null and empty-string values are skipped in Markdown export so cleared fields do not appear as filled data. Wiki-style links inside field values remain readable as text.

## Future Table Views

Worldie now includes a simple lore table inside the lore area. It reads the same `customFields` object across lore pages:

- Rows: lore pages.
- Columns: lore-type field definitions, plus title/type/updated metadata.
- Cells: values from each page's `customFields`.
- Filtering: the selected lore type.
- Quick filtering: case-insensitive text search across page titles and visible custom field values.
- Sorting: click table headers to sort ascending or descending by title, updated date text, or visible custom field values.
- Row action: clicking a page title opens the existing lore editor for that page.
- Row creation: when a lore type is selected, the table shows a compact title input and an `Add <Type>` action that creates a normal lore page in the active world using the selected lore type.
- Inline editing: custom field definition cells can be edited directly in the table.
- CSV export: when a lore type is selected, `Export CSV` writes the currently visible table to a user-selected folder.
- CSV import: when a lore type is selected, `Import CSV Preview` reads a selected CSV file and shows how columns and sample rows would map before anything is written. A valid preview can then be imported as new lore pages.

Saved lore table views are stored in the `.worldie` SQLite project file in the world-scoped `lore_table_views` table. A saved view currently remembers:

- view name
- selected lore type
- quick filter text
- sort column
- sort direction
- visible custom field columns
- created/updated timestamps

Selecting a saved view applies those table controls without mutating lore pages. Saving, updating, or deleting a saved view writes only the saved view record.

Column visibility applies to lore-type custom field definition columns. Core table columns remain visible:

- Name
- Type
- Updated

Existing saved views without column visibility data default to showing all custom field columns. Explicitly clearing a saved view's column visibility also returns it to the all-visible default. If a saved view references a stale custom field column that no longer exists, the table ignores that key. If the active sort column is hidden, the UI clears the sort rather than silently sorting by an invisible column.

Field definitions already use stable IDs. Lore page values are currently keyed by definition `key`, not by definition ID. A future table view can use definition IDs for column identity while continuing to read/write page values through stable keys.

Inline table editing is intentionally limited to lore-type custom field definition columns. Core columns remain read-only:

- Name
- Type
- Updated

Supported inline controls:

- text, long text, date: compact text/date inputs
- number: number input, saved as a number when the value is numeric
- checkbox: checkbox, saved as a boolean
- select: dropdown, saved as the selected option text

Edits update the lore page's existing `customFields` object through the normal lore page update path. Unrelated custom fields, manual extra fields, traits, details, and template metadata are preserved. Empty text-like values are stored as empty strings, which render as blank table cells and are skipped by Markdown export.

Creating from the table reuses the existing lore page creation and update path, so the page is persisted inside the active `.worldie` project file. Table-created pages start with empty traits and details, no template, and a `customFields` object seeded only from lore-type field definitions that have a non-null `defaultValue`. Field definitions without defaults are left absent/blank, matching existing custom-field behavior. The created page opens in the existing lore editor after creation; the table's current filter, sort, saved-view selection, and column visibility state are not reset.

CSV export uses the rendered table model, so it respects the selected lore type, quick filter, sort column/direction, saved view state, and custom column visibility. Exported CSV files include a header row with core columns (`Name`, `Type`, `Updated`) plus the currently visible custom field columns in display order. Hidden custom columns and filtered-out rows are not exported. Missing values export as blank cells, checkbox values export as `Yes`/`No`, and values with commas, quotes, or newlines are quoted using standard CSV escaping. If the selected table has no visible rows, Worldie exports headers only. CSV export writes an external UTF-8 copy and does not mutate lore pages or `.worldie` project data.

CSV import preview reads UTF-8 CSV text in the frontend after the user chooses a file. The preview supports standard CSV quoting, including commas inside quoted fields, doubled quotes, CRLF/LF line endings, and newlines inside quoted values.

Preview mapping rules:

- `Name`, `Title`, and `Lore Page` map to the future lore page title.
- Lore type custom fields map case-insensitively by display name or field key.
- Exported core columns `Type` and `Updated` are ignored.
- Unmatched columns are listed as unmapped.
- Missing title/name columns are treated as blocking preview errors.
- Empty rows are ignored with a warning.

Preview validation checks number fields for numeric values and checkbox fields for `Yes`/`No`, `true`/`false`, or `1`/`0`. Text, long text, date, and select fields preview as strings in this first slice. Checkbox preview values are normalized to `Yes` or `No`; invalid number and checkbox values are reported as row warnings and blocking errors.

CSV import apply is intentionally narrow. If the preview has no blocking errors, `Import as New Pages` creates one new lore page per valid CSV row in the active world using the selected lore type. The import uses the existing lore page create/update persistence path, stores mapped custom field values in `customFields`, keeps lore type default custom field values when the CSV does not provide a value, ignores unmapped columns, and ignores exported core columns such as `Type` and `Updated`. Empty rows remain ignored. If any row has a blocking validation error, the whole import is blocked rather than partially applied. After a successful import, the preview stays visible and shows a success count, while the table updates with the newly created pages.

Future update-existing CSV import rules are designed in `docs/CSV_IMPORT_UPDATE_DESIGN.md`.

Current table limitations:

- Only custom field cells are editable.
- Table creation is single-row only.
- CSV import creates new pages only.
- It does not support formulas.
- It does not support bulk editing.
- It does not update existing rows from CSV.
- It does not match CSV rows to existing pages by title or ID.
- It does not have manual CSV column mapping UI yet.
- It does not have an import undo stack or post-import bulk edit review.
- It does not export media files.
- It does not edit core columns from the table.
- It does not have advanced validation or a table-specific undo stack.
- It does not have advanced filters yet.
- It is not a full database workspace yet.
- It does not have saved view sharing, duplication, or per-view descriptions yet.
- Manual extra fields are not promoted into columns in this first table slice.
- Definition renames or key changes do not migrate existing page values automatically.

## Migration Concerns

- Existing legacy lore JSON without `traits` is still interpreted as traits, not custom fields.
- Existing modern lore JSON without `customFields` loads with `{}`.
- Existing lore types without `field_definitions_json` load with `[]`.
- If future page values become keyed by field ID instead of definition key, Worldie needs a migration that preserves user-visible labels and avoids merging unrelated fields with the same name.
- Export and table views should tolerate missing definitions because `.worldie` files may contain older pages.

## Open Questions

- Should field values eventually be keyed by stable field ID instead of field key?
- How should field ordering be represented before a full table view exists?
- Should select options live on lore types, templates, or both?
- How should `lore_link` fields store links: title text, lore page UUID, or both?
- How should bulk editing handle manual extra fields that are not part of a lore type definition?
- What validation UI should required fields use without interrupting writing flow?
