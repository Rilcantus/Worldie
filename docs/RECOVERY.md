# Recovery Utilities

Worldie project data lives in portable SQLite-backed `.worldie` files. Recovery utilities are intentionally manual, targeted, and backup-first.

## Mojibake Document Repair

Use `scripts/repair_mojibake.py` when a document already contains saved mojibake text such as `â€œ`, `â€™`, `â€`, or `Ã¢`.

This utility exists because an earlier editor/paste path could save corrupted smart punctuation into a document. It is not an automatic migration and it does not run when Worldie launches.

### Dry Run

Always start with a dry run:

```powershell
python scripts/repair_mojibake.py "C:\Users\admin\Documents\Cosmidol.worldie" --title "White Touch"
```

The dry run:

- opens the project read-only
- repairs only in memory
- prints the document title and ID
- counts suspicious mojibake sequences
- prints before/after samples
- reports whether anything would change
- does not write to the `.worldie` file

Review the samples before applying. Make sure `[[Lore Links]]`, `***` page breaks, newlines, and emoji are preserved.

### Apply

Only apply after reviewing the dry-run samples:

```powershell
python scripts/repair_mojibake.py "C:\Users\admin\Documents\Cosmidol.worldie" --title "White Touch" --apply
```

Apply mode:

- creates a timestamped backup beside the project file first
- aborts if backup creation fails
- updates only the selected document's `content_json`
- preserves unrelated documents, lore, relationships, timeline events, and project data
- preserves document title, folder, created timestamp, and updated timestamp
- prints the backup path

Backup names follow:

```text
Cosmidol.worldie.bak-YYYYMMDD-HHMMSS
```

### Limitations

- The utility repairs common UTF-8/Windows-1252 mojibake patterns.
- It does not infer or rewrite unrelated prose.
- It does not repair every possible encoding failure.
- It does not repair multiple documents at once.
- It does not modify lore pages, relationships, timeline events, or project metadata.
