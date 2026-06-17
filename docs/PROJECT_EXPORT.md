# Worldie Project Export

## Current Markdown Export

Worldie now has a first export path for writing content. The MVP export reads from the active `.worldie` SQLite project file and writes Markdown copies to a user-selected folder.

The `.worldie` file remains the source of truth. Exported files are external copies only.

## Lore Table CSV Export

The Lore Table can export the currently selected lore type's visible table to a `.csv` file in a user-selected folder. This export is separate from active-world and full-project Markdown export.

CSV export respects the table controls currently applied in the UI:

- quick filter
- sort column
- sort direction
- saved view state
- visible custom field columns

The CSV includes a header row, core columns (`Name`, `Type`, `Updated`), and the currently visible custom field columns in display order. Hidden columns and filtered-out rows are excluded. Empty filtered tables export headers only. Values are written as UTF-8 CSV text, with commas, quotes, and newlines escaped for spreadsheet tools.

CSV export is an external copy only. It does not mutate lore pages, saved views, or the `.worldie` project file.

## Lore Table CSV Import Preview

The Lore Table can also preview a selected CSV file against the currently selected lore type. Preview is validation-only: it parses the selected file, shows detected headers, row count, mapped columns, unmapped columns, warnings/errors, and sample rows, but it does not create or update lore pages.

Preview mapping rules:

- `Name`, `Title`, and `Lore Page` map to the lore page title.
- Lore type custom fields map case-insensitively by field display name or field key.
- `Type` and `Updated` are recognized as exported core columns and ignored.
- Unmatched headers are listed as unmapped.
- Missing title/name columns are blocking preview errors.
- Empty rows are ignored with a warning.

Number fields warn when values cannot be parsed as numbers. Checkbox fields recognize `Yes`/`No`, `true`/`false`, and `1`/`0`; invalid checkbox values produce row warnings. Text, long text, date, and select fields preview as strings.

Import preview reads the chosen CSV text in the app UI and does not write to the `.worldie` project file.

## Export Shape

Worldie supports two Markdown export scopes:

- active world export
- full project export

When exporting a single world, Worldie creates a folder named from the project and world:

```text
Project Title - World Title/
```

When exporting the full project, Worldie creates a project folder and one subfolder per world:

```text
Project Title/
index.md
World One/
World Two/
```

Inside each world folder, Worldie writes:

```text
index.md
Documents/
Lore/
Relationships/
Timeline/
```

Documents are exported as Markdown files under `Documents/`. If a document has a folder path, Worldie mirrors that path with safe folder names.

Lore pages are exported as Markdown files under `Lore/<type>/`.

Relationships are exported as Markdown files under `Relationships/`.

Timeline events are exported as Markdown files under `Timeline/`.

The generated `index.md` includes:

- project title
- exported world links
- world count
- total document count
- total lore page count
- total relationship count
- total timeline event count

Each generated world `index.md` includes:

- project title
- world title
- document count
- lore page count
- relationship count
- timeline event count
- links to exported document files
- links to exported lore files
- links to exported relationship files
- links to exported timeline files

## Content Rules

- Document body text is exported as-is.
- Lore details are exported as Markdown text.
- Lore traits are exported as a simple Markdown list.
- Lore custom fields are exported as a simple Markdown list under `## Custom Fields`.
- Relationships include source lore, target lore, relationship type, and notes when available.
- Timeline events include date text, event type, linked lore, and description when available.
- Wiki-style links such as `[[Some Lore]]` are preserved as text.
- Empty or cleared lore custom field values are skipped.
- Linked lore IDs are resolved to lore names when possible.
- Missing linked lore is exported with a readable fallback instead of stopping the export.
- Timeline entries in `index.md` are sorted by the first number found in their date text when possible, with unknown dates kept after dated entries.
- Filenames are made safe for Windows and common filesystems.
- Duplicate titles receive numeric suffixes, such as `Scene.md` and `Scene-2.md`.
- Duplicate world folder names receive numeric suffixes, such as `World` and `World-2`.

## Limitations

- Active-world and full-project export are Markdown only.
- Lore Table CSV import is preview-only; applying/importing rows is not implemented yet.
- Lore Table CSV does not include formulas, bulk edits, update-existing-row behavior, manual mapping UI, or a full database workspace.
- Media is not exported yet.
- Exported files are not synced back into the `.worldie` project.
- Timeline date sorting is intentionally simple and does not yet understand full calendars, eras, date ranges, or custom chronology rules.
- Full-project export is a folder export, not a Spaci bundle.

## Future Direction

Likely next export steps:

1. Add richer timeline chronology handling for eras, ranges, and custom calendars.
2. Add optional HTML export.
3. Add PDF and DOCX export through dedicated export tooling.
4. Add media export after embedded media support exists.
5. Define a structured Spaci export bundle with manifests, stable UUIDs, content files, and media assets.
