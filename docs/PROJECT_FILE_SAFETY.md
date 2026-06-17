# Worldie Project File Safety

## Status

Worldie stores project data in portable SQLite-backed `.worldie` files. This note defines the intended safety behavior for creating, opening, saving copies, and recovering from file problems.

## Principles

- Project content belongs in `.worldie` files.
- Browser/local storage may track UI/session state and recent-project affordances, but it must not become the source of truth for project data.
- Failed file operations should be recoverable and should not silently mark work as safe.
- Missing project files should produce clear errors and recovery prompts instead of app crashes.
- Recent-project entries should be removed or pruned only through intentional recovery behavior.

## Intended Behavior

### Creating Project Files

- Creating a new project should require a destination that does not already exist.
- If creation fails, Worldie should not add a recent-project entry for the failed file.
- A partially created project file should not be treated as active unless the project database was initialized successfully.

### Opening Project Files

- Opening a missing `.worldie` file should return a clear error.
- A failed open should preserve the current active project/session whenever possible.
- Opening a valid existing `.worldie` file should register or refresh it in the recent-project list.
- Opening a recent project whose file has been deleted should offer a deliberate recovery path instead of deleting unrelated recents.

### Save As And Replacement

- Same-path Save As should be blocked.
- Save As to a new path should copy through a temporary file, then replace the destination path.
- Save As to an existing different `.worldie` file should first create a timestamped backup next to the destination file.
- Backup names should follow:

```text
ProjectName.worldie.bak-YYYYMMDD-HHMMSS
```

- If backup creation fails, Worldie should not overwrite the existing destination.
- If copying to the temporary file fails, both the source and destination files should remain unchanged.

### Save Failures

- Failed document/lore/relationship/timeline saves should keep dirty-state protection active.
- The app should not show work as safely saved until the sidecar operation succeeds.
- Recovery for missing active project files should keep user confirmation in the loop before removing recents.

## Current Coverage

Backend tests cover:

- Missing project-file open returns a structured sidecar error.
- Missing active project files are recoverable for project deletion and world actions.
- Save As rejects the same filepath.
- Save As to an existing destination creates a backup before replacement.
- Backup failure prevents destination overwrite.
- Copy failure leaves source and destination files intact.

## Remaining Gaps

- There is no full project-file integrity check before opening arbitrary `.worldie` files.
- Save As replacement currently backs up the previous destination but does not expose the backup path in the UI.
- Recovery flows do not yet offer a "locate moved project file" path.
- There is no automatic rotating backup policy for ordinary in-place entity saves.
- There is no compaction or vacuum policy for large future media-heavy project files.
