# Worldie Media Storage Design

## Status

This is a design note only. It does not implement database migrations, sidecar commands, frontend UI, media import, media rendering, or export behavior.

Worldie already has a small media hint in the current schema and API:

- `lore_pages.cover_image_path` exists in the SQLite schema.
- The Python sidecar reads and updates `coverImagePath` for lore pages.
- The frontend `LorePage` type includes `coverImagePath`.
- Product docs list cover image and broader media support as a known gap.

That existing path-shaped field is not enough for portable media support. Before cover images or attachments are implemented, Worldie needs a storage model that protects the offline-first promise and keeps project content portable.

## Goals

- Keep Worldie offline-first.
- Keep project content and project media portable.
- Store MVP media inside the `.worldie` project file, not in browser/local storage.
- Avoid cloud sync or web dependencies.
- Support future export bundles for Spaci.
- Keep the first implementation small enough for cover images, portraits, maps, icons, and lore/document attachments.

## Non-Goals

- No cloud storage or sync.
- No implementation in this design task.
- No rich media editor.
- No video/audio workflow for MVP.
- No arbitrary external media references as the default storage behavior.

## Storage Models Compared

### A. Embed media directly inside the `.worldie` SQLite file as BLOBs

In this model, imported media is copied into SQLite tables inside the active `.worldie` file. Entity records link to media records by UUID.

Portability:

- Strongest option. A single `.worldie` file contains both project data and project media.
- Moving, sharing, backing up, or saving a copy of the project preserves media automatically.

Backup and restore:

- Simple for users. Backing up the `.worldie` file backs up the whole project.
- Save-as behavior remains straightforward because the copied SQLite file includes media.

File size impact:

- Project files can grow quickly with large images or many attachments.
- SQLite can handle BLOBs, but Worldie should avoid loading full media BLOBs during normal list/detail queries.
- MVP should include size warnings and sensible limits.

User expectations:

- Best match for an offline-first portable project file.
- Users can reasonably expect "my world file contains my world."
- Less surprising than needing to remember a separate assets folder.

Broken-link risk:

- Low. Imported media is no longer dependent on the original source file path.
- Existing source paths can be recorded as metadata, but should not be required for display.

Export and Spaci compatibility:

- Good. Export can write media assets from SQLite into an export bundle with stable UUIDs and manifest links.
- Spaci import can preserve media IDs, MIME types, filenames, captions, and entity links.

Implementation complexity:

- Medium. Requires schema additions, media import commands, BLOB read/write paths, metadata, and UI display plumbing.
- Needs care to avoid returning large media payloads in list calls.

Tauri/Python sidecar implications:

- Tauri file pickers can select source files.
- The Python sidecar can read the selected file, validate it, and write bytes plus metadata into SQLite.
- Frontend list calls should receive metadata and media IDs, not raw bytes.
- Dedicated sidecar actions should fetch a thumbnail or full asset by ID only when needed.

### B. Store media in a sidecar assets folder next to the `.worldie` file

In this model, media files are copied into a folder such as `MyWorld.worldie-assets/` beside `MyWorld.worldie`, and database records store relative asset paths.

Portability:

- Moderate. It can be portable if the `.worldie` file and asset folder are always moved together.
- Users can accidentally move or share only the `.worldie` file and lose media.

Backup and restore:

- More fragile than a single-file project. Backup tools and users must include both the database and folder.
- Save-as must decide whether to copy the whole asset folder, relink it, or create a new folder.

File size impact:

- Keeps the SQLite file smaller.
- Large media files remain normal files and can be handled by the OS efficiently.

User expectations:

- Some creative tools use package folders, so this is understandable.
- It weakens the current "portable `.worldie` file" mental model unless Worldie presents the pair as one package.

Broken-link risk:

- Medium. Relative paths are safer than absolute paths, but the folder can still be renamed, moved, partially copied, or deleted.

Export and Spaci compatibility:

- Good if the folder is intact.
- Export needs to walk the assets folder, validate all referenced files, and report missing assets.

Implementation complexity:

- Medium to high. Worldie must manage folder creation, naming, save-as copying, deletion, cleanup, and missing-folder recovery.
- Cross-platform path handling and user file operations become part of the media system.

Tauri/Python sidecar implications:

- The sidecar must own asset-folder lifecycle and ensure filenames are safe and unique.
- Project move/save-as flows need explicit asset-folder behavior.
- Frontend display may use resolved local asset paths, but those paths must remain scoped to the active project.

### C. Store external file references or paths only

In this model, Worldie stores file paths or URIs pointing to media elsewhere on the user's machine.

Portability:

- Weak. The project file does not contain the media.
- Moving the project to another machine, folder, or backup often breaks media.

Backup and restore:

- Unreliable. Users must separately know which external files are referenced and where they live.
- Restoring a `.worldie` file alone is not enough.

File size impact:

- Smallest `.worldie` file.
- No duplicated media storage.

User expectations:

- Likely surprising for MVP. A user may expect imported cover images to travel with the project.
- Better suited for a later advanced "linked external file" feature where the risk is explicit.

Broken-link risk:

- Highest. Absolute paths break across machines and often across local reorganizations.
- Relative paths still break if the referenced files are moved.

Export and Spaci compatibility:

- Weak unless export copies referenced files into the bundle.
- Export would need missing-file detection, permissions handling, and user repair flows.

Implementation complexity:

- Simple at first, expensive later.
- The easy implementation pushes complexity into broken-link repair, export validation, and user support.

Tauri/Python sidecar implications:

- The sidecar only needs to validate or store paths initially.
- Later, it must handle missing files, permission failures, and user-driven relinking.

## MVP Recommendation

For MVP media support, Worldie should embed imported media records directly inside the `.worldie` SQLite file as BLOBs.

This is the best fit for Worldie's current product promise:

- Worldie is offline-first.
- A project is a portable `.worldie` file.
- Project data should not depend on browser storage, cloud storage, or fragile external paths.
- Future export to Spaci can treat media as first-class project assets with stable UUIDs.

Sidecar asset folders should not be the MVP default because they make backup and sharing easier to get wrong. External file references should remain a possible later advanced option, but only when the UI clearly tells users that the file is linked rather than imported.

## Guardrails

MVP media records should include enough metadata to keep files understandable, exportable, and maintainable:

- UUID media ID.
- Original filename.
- MIME type.
- Byte size.
- Created and updated timestamps.
- Media kind or purpose, such as `cover`, `portrait`, `map`, `icon`, `attachment`, or `inline`.
- Optional width and height for images.
- Optional checksum for deduplication and integrity checks.
- Optional caption and alt text on entity links.
- Optional source path as informational metadata only, never as the required display path.

Operational guardrails:

- Accept a small, explicit set of image MIME types first, such as PNG, JPEG, WebP, and GIF.
- Add warnings for very large images before import.
- Consider a soft warning threshold before adding a hard limit. Exact limits should be decided during implementation after testing realistic project sizes.
- Do not load full BLOBs in list queries.
- Add thumbnails later or during the first UI implementation if full-size rendering is visibly slow.
- Avoid arbitrary external references as the default.
- Keep all media writes project-file scoped through the Python sidecar.

## Proposed Future Schema

One practical schema shape is a media table plus a link table:

```sql
CREATE TABLE media_assets (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    original_filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    byte_size INTEGER NOT NULL,
    checksum_sha256 TEXT,
    kind TEXT NOT NULL,
    data BLOB NOT NULL,
    width INTEGER,
    height INTEGER,
    thumbnail_blob BLOB,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE entity_media_links (
    id TEXT PRIMARY KEY,
    media_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    purpose TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    caption TEXT,
    alt_text TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (media_id) REFERENCES media_assets(id)
);
```

Entity link examples:

- `entity_type = 'project'`, `purpose = 'cover'`
- `entity_type = 'world'`, `purpose = 'cover'`
- `entity_type = 'lore_page'`, `purpose = 'portrait'`
- `entity_type = 'document'`, `purpose = 'attachment'`
- `entity_type = 'lore_page'`, `purpose = 'map'`

An alternative is to add `cover_media_id` columns directly to `projects`, `worlds`, `lore_pages`, and `documents`. That is simple for covers, but a link table scales better to galleries, attachments, maps, portraits, captions, ordering, and future export manifests.

The likely best path is:

- Use `entity_media_links` for all media relationships.
- Enforce one active `purpose = 'cover'` link per entity in application logic for MVP.
- Consider direct `cover_media_id` columns only if cover lookups become a proven performance problem.

## Migration Plan

Because `lore_pages.cover_image_path` already exists, implementation should avoid abruptly removing it.

Suggested migration path:

1. Add `media_assets` and `entity_media_links`.
2. Keep `cover_image_path` as a legacy field during the first media release.
3. New imports write embedded media records and entity links.
4. If a legacy `cover_image_path` value exists and points to a readable local file, offer to import it into the `.worldie` file.
5. After embedded covers are stable, stop writing new path values.
6. Later, remove or ignore `cover_image_path` after compatibility is no longer needed.

## Delete And Cleanup Behavior

Recommended behavior:

- Deleting an entity deletes its media links.
- Deleting an entity should not immediately delete shared media assets if they are linked elsewhere.
- Media assets with no links should be considered orphaned.
- MVP can leave orphaned assets in place and add a later cleanup tool.
- A later cleanup flow can show orphaned media and ask users before removal.

This avoids surprising data loss when the same image is reused as a portrait, cover, or attachment.

## Sidecar And Frontend API Shape

Future sidecar actions could look like:

- `import_media_asset(projectId, sourcePath, kind)`
- `list_media_assets(projectId, filters)`
- `get_media_asset(projectId, mediaId)`
- `get_media_thumbnail(projectId, mediaId)`
- `link_media_to_entity(projectId, mediaId, entityType, entityId, purpose)`
- `unlink_media_from_entity(projectId, linkId)`
- `replace_entity_cover(projectId, entityType, entityId, mediaId)`
- `delete_media_asset(projectId, mediaId)`

Frontend behavior should keep large media out of routine data loads:

- List screens receive media IDs and metadata.
- Detail screens request thumbnails or display URLs only when needed.
- Full-size media is fetched only for preview, zoom, export, or editing flows.
- Browser/local storage may cache UI state, but should not be the source of truth for project media.

## Export And Spaci Compatibility

Embedded media maps cleanly to a future export bundle:

- Export writes media files from `media_assets` into a bundle directory.
- Export writes a manifest containing media IDs, MIME types, original filenames, checksums, captions, purposes, and entity links.
- Spaci import can preserve UUIDs when possible.
- Missing media should be rare because the `.worldie` file contains the bytes.
- External references, if added later, should be resolved and copied into export bundles or reported as missing.

## Implementation Roadmap

### Phase 1: Cover Images

- Add `media_assets` and `entity_media_links`.
- Import image files into the `.worldie` file.
- Support cover images for projects, worlds, lore pages, and documents.
- Display cover images in the relevant views.
- Replace or remove cover images.
- Avoid loading full image bytes in normal project list calls.

### Phase 2: Attachments And Galleries

- Add image galleries and attachments for lore pages and documents.
- Add thumbnail generation and thumbnail display.
- Add orphaned media cleanup.
- Add deduplication by checksum if repeated imports become common.
- Add captions and alt text editing.

### Phase 3: Export And Advanced Links

- Add export bundle mapping for Spaci.
- Include media manifest files and copied media outputs.
- Add validation for missing or unsupported media before export.
- Consider optional external references as an advanced feature only if users need them for huge maps or files that should not be embedded.

## Risks

- Large images can make `.worldie` files much bigger.
- SQLite BLOB reads must be kept out of hot list queries.
- Thumbnail generation adds complexity but may be needed for smooth browsing.
- Users may import very large maps or many high-resolution images.
- Save-as and backup behavior are simplest with embedded media, but very large project files may feel slower to copy.
- Existing `cover_image_path` values may need a careful migration or import prompt.
- Image metadata, including EXIF, can contain private location/device information. Worldie should consider stripping metadata later, especially before export.

## Open Questions

- What soft warning size should Worldie use for the first image import flow?
- Should Worldie store thumbnails in SQLite from phase 1, or generate them lazily in phase 2?
- Which image formats should be accepted for MVP?
- Should SVG be allowed, sanitized, or excluded at first?
- Should media assets belong to the project globally, or should the schema omit `project_id` because each `.worldie` file already represents one project?
- Should duplicate imports create separate media records or reuse existing records by checksum?
- How should inline document images be represented if the editor later moves to TipTap?
- Should export strip metadata by default?
