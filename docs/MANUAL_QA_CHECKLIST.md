# Worldie Manual QA Checklist

Use this checklist before tagging or sharing a release build. Prefer a fresh test `.worldie` file and one existing real-ish project file.

## App Launch And Build Smoke

Steps:

1. Start the app in desktop mode.
2. Confirm the start screen appears without console errors.
3. Open an existing `.worldie` project.
4. Close and reopen the app.

Expected results:

- The app launches to the start screen or last recent project flow.
- Recent projects are listed.
- The reopened project still loads worlds, documents, lore, relationships, and timeline items.
- No project data is created in browser/local storage as the source of truth.

## Project Create, Open, And Save As

Steps:

1. Create a new project file.
2. Add a world.
3. Close and reopen the project.
4. Use Save As to create a copy at a new path.
5. Use Save As over an existing different `.worldie` file.

Expected results:

- New project creates a portable `.worldie` file.
- Reopening preserves project and world data.
- Save As copy opens as the active project copy.
- Replacing an existing destination creates a timestamped `.bak-YYYYMMDD-HHMMSS` backup.
- Same-path Save As is blocked.

## Dirty Editor Navigation

Steps:

1. Open a document.
2. Edit the title, body, or folder without saving.
3. Try switching documents, tabs, worlds, or projects.
4. Cancel the confirmation.
5. Try again and confirm.
6. Force or simulate a save failure if possible.

Expected results:

- Unsaved changes trigger a confirmation before navigation.
- Cancel keeps the current draft visible.
- Confirm allows navigation.
- Failed saves keep dirty-state protection active and do not show the draft as safely saved.

## Document And Lore Writing

Steps:

1. Create a document with paragraphs, nested lists, note blocks, and `[[Lore Links]]`.
2. Save and reopen it.
3. Create a lore page with traits, details, tags, and `[[Lore Links]]`.
4. Save and reopen it.

Expected results:

- Formatting text remains stable after save/reopen.
- Nested indentation is preserved in editor and preview.
- Lore links stay readable and clickable where previews support them.
- Lore traits and details persist in the `.worldie` file.

## Relationships

Steps:

1. Create at least two lore pages.
2. Create relationships between them with different relationship types and notes.
3. Edit a relationship.
4. Delete a relationship.
5. Switch away and back to the relationship workspace.

Expected results:

- Relationships persist after switching views and reopening the project.
- Source and target lore names display correctly.
- Notes can be edited and cleared.
- Deleted relationships do not reappear.

## Timeline

Steps:

1. Create timeline events with date text, event type, linked lore, and descriptions.
2. Include one event with a partial or unknown date.
3. Edit an event.
4. Delete an event.
5. Switch away and back to the timeline workspace.

Expected results:

- Timeline events persist after switching views and reopening the project.
- Linked lore names display where supported.
- Descriptions can be edited and cleared.
- Unknown or partial dates do not break the timeline view.

## Active-World Markdown Export

Steps:

1. Open a project with an active world containing documents, lore, relationships, and timeline events.
2. Use Workbench > Export Active World.
3. Choose an empty export folder.
4. Inspect the exported folder.

Expected results:

- A `Project Title - World Title` folder is created.
- `index.md`, `Documents/`, `Lore/`, `Relationships/`, and `Timeline/` are present when content exists.
- Document folder paths are mirrored with safe folder names.
- `[[Lore Links]]` remain visible as text.
- Relationship files resolve linked lore names or show readable missing-lore fallbacks.
- Timeline files include date text, event type, linked lore, and details where available.
- Success feedback names active-world export, destination path, and exported item counts.

## Full-Project Markdown Export

Steps:

1. Open a project with two or more worlds.
2. Include duplicate or filesystem-unsafe world names if possible.
3. Use Workbench > Export Full Project.
4. Choose an empty export folder.
5. Inspect the project export folder.

Expected results:

- A project-named root folder is created.
- Root `index.md` links to each exported world folder.
- Duplicate/unsafe world folder names are sanitized and deduped.
- Each world folder has the same structure as active-world export.
- Root counts match totals across all worlds.
- Success feedback names full-project export, destination path, world count, and content counts.

## Missing Project File Behavior

Steps:

1. Create or open a project.
2. Close Worldie.
3. Move or delete the `.worldie` file outside the app.
4. Reopen Worldie and attempt to open the missing recent project.

Expected results:

- The app shows a clear missing-file error or recovery prompt.
- The app does not crash.
- Other recent projects remain available.
- Removing the missing recent entry happens only after confirmation.

## Backup And Recovery Behavior

Steps:

1. Create two `.worldie` files with visibly different content.
2. Use Save As from one project onto the other project's filepath.
3. Inspect the destination folder.
4. Open the backup file manually if needed.

Expected results:

- The destination is replaced by the saved copy.
- A timestamped backup of the previous destination exists.
- Backup contents still match the previous destination project.
- If backup creation fails, replacement should not occur.

## Final Release Notes

Before shipping:

1. Run Python tests.
2. Run frontend tests.
3. Run TypeScript typecheck.
4. Run production build, using the direct Vite command if the managed-shell access issue appears.
5. Run `cargo check` if Tauri/Rust files changed.

Expected results:

- All required checks pass.
- Known managed-shell Vite failure is documented with a passing direct Vite build.
- Any skipped checks are recorded with the reason.
