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

`Export Update CSV` creates an update-ready copy of the same visible table with a leading `Worldie ID` column containing each lore page UUID. This ID column is not shown in the normal Lore Table display and is not included in the normal `Export CSV` action.

CSV export is an external copy only. It does not mutate lore pages, saved views, or the `.worldie` project file.

## Lore Table CSV Import

The Lore Table can also preview a selected CSV file against the currently selected lore type. Preview parses the selected file and shows detected headers, row count, mapped columns, unmapped columns, warnings/errors, and sample rows.

Preview mapping rules:

- `Worldie ID` is recognized as stable page matching metadata and is not imported as a custom field.
- `Name`, `Title`, and `Lore Page` map to the lore page title.
- Lore type custom fields map case-insensitively by field display name or field key.
- `Type` and `Updated` are recognized as exported core columns and ignored.
- Unmatched headers are listed as unmapped.
- Missing title/name columns are blocking preview errors.
- Empty rows are ignored with a warning.

When `Worldie ID` is present, preview shows whether each row matches an existing selected-type lore page, is new/no-ID, has an unknown ID, has a malformed ID, targets another lore type, duplicates another CSV row's ID, or conflicts with the matched page title. The preview also shows matched, new/no-ID, blocked, and warning counts. This remains preview-only for updates: `Import as New Pages` still creates new pages and does not update matched existing pages.

Number fields warn and block import when values cannot be parsed as numbers. Checkbox fields recognize `Yes`/`No`, `true`/`false`, and `1`/`0`; invalid checkbox values warn and block import. Text, long text, date, and select fields preview as strings.

If the preview has no blocking errors, Worldie can import the rows as new lore pages for the selected lore type. This first apply slice only creates new pages; it does not update existing pages or match rows by title/ID. Mapped custom field values are stored in `customFields`, lore type defaults are kept when the CSV omits a value, unmapped columns are ignored, and `Type`/`Updated` remain ignored. Empty rows stay ignored. The preview remains visible after success and shows the created count.

CSV import writes to the `.worldie` project only through the existing lore page creation path.

Future update-existing CSV import behavior is designed in `docs/CSV_IMPORT_UPDATE_DESIGN.md`.

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
- Lore Table CSV import creates new pages only.
- Lore Table CSV does not include formulas, bulk edits, update-existing-row apply behavior, title fallback matching, manual mapping UI, an import undo stack, post-import bulk edit review, or a full database workspace.
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
