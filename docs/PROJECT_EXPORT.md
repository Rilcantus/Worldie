# Worldie Project Export

## Current Markdown Export

Worldie now has a first export path for writing content. The MVP export reads from the active `.worldie` SQLite project file and writes Markdown copies to a user-selected folder.

The `.worldie` file remains the source of truth. Exported files are external copies only.

## Export Shape

When exporting a world, Worldie creates a folder named from the project and world:

```text
Project Title - World Title/
```

Inside that folder, Worldie writes:

```text
index.md
Documents/
Lore/
```

Documents are exported as Markdown files under `Documents/`. If a document has a folder path, Worldie mirrors that path with safe folder names.

Lore pages are exported as Markdown files under `Lore/<type>/`.

The generated `index.md` includes:

- project title
- world title
- document count
- lore page count
- links to exported document files
- links to exported lore files

## Content Rules

- Document body text is exported as-is.
- Lore details are exported as Markdown text.
- Lore traits are exported as a simple Markdown list.
- Wiki-style links such as `[[Some Lore]]` are preserved as text.
- Filenames are made safe for Windows and common filesystems.
- Duplicate titles receive numeric suffixes, such as `Scene.md` and `Scene-2.md`.

## Limitations

- Export is Markdown only.
- Media is not exported yet.
- Relationships and timeline events are not exported yet.
- Exported files are not synced back into the `.worldie` project.
- The current UI exports the active world, not the entire project.

## Future Direction

Likely next export steps:

1. Add full-project Markdown export across all worlds.
2. Include relationships and timeline events.
3. Add optional HTML export.
4. Add PDF and DOCX export through dedicated export tooling.
5. Add media export after embedded media support exists.
6. Define a structured Spaci export bundle with manifests, stable UUIDs, content files, and media assets.
