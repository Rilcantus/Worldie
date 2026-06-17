# Worldie Project Export

## Current Markdown Export

Worldie now has a first export path for writing content. The MVP export reads from the active `.worldie` SQLite project file and writes Markdown copies to a user-selected folder.

The `.worldie` file remains the source of truth. Exported files are external copies only.

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
- Relationships include source lore, target lore, relationship type, and notes when available.
- Timeline events include date text, event type, linked lore, and description when available.
- Wiki-style links such as `[[Some Lore]]` are preserved as text.
- Linked lore IDs are resolved to lore names when possible.
- Missing linked lore is exported with a readable fallback instead of stopping the export.
- Timeline entries in `index.md` are sorted by the first number found in their date text when possible, with unknown dates kept after dated entries.
- Filenames are made safe for Windows and common filesystems.
- Duplicate titles receive numeric suffixes, such as `Scene.md` and `Scene-2.md`.
- Duplicate world folder names receive numeric suffixes, such as `World` and `World-2`.

## Limitations

- Export is Markdown only.
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
