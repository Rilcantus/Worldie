# CSV Import Update Design

## Purpose

Worldie now supports Lore Table CSV export, CSV import preview, and CSV import apply for creating new lore pages only. The next risky step is updating existing lore pages from CSV. This note defines safe rules before implementation so imports do not accidentally overwrite user-authored lore data.

This is a design note only. It does not implement update-existing imports.

## Recommended MVP Strategy

The first update-capable import should be ID-first and conservative:

- Add an optional `Worldie ID` column to Lore Table CSV export.
- Use `Worldie ID` as the primary and only automatic update key for the first update slice.
- Keep normal table display unchanged; `Worldie ID` should not become a visible table column by default.
- For update-ready CSV exports, include `Worldie ID` by default once the setting exists.
- Allow title/name matching only later as an explicit user-selected fallback.
- Block updates when any row has a blocking match or validation error.
- Preserve unrelated page data, unrelated custom fields, manual extra fields, traits, details, tags, and template metadata.
- Default blank-cell behavior for update modes: leave existing values unchanged.

The safest first update implementation is:

1. Preview recognizes `Worldie ID`.
2. Update apply works by `Worldie ID` only.
3. Blank cells leave existing values unchanged.
4. Mapped nonblank cells update only those mapped custom field keys.
5. Title updates are explicit and visible in preview, not hidden side effects.

## Future Import Modes

### Preview Only

Purpose: inspect CSV shape without writing project data.

- Matching rows: show the would-be target page.
- Rows without matches: show as new or unmatched depending on selected mode.
- Invalid rows: show blocking errors or warnings.
- Duplicate matches: show blocking errors.
- Apply action: hidden or disabled.

### Create New Pages Only

Current implemented behavior.

- Matching existing pages: ignored for matching; rows create new pages.
- Rows without matches: create new pages.
- Invalid rows: block import.
- Duplicate title matches: irrelevant in this mode.
- Mixed create/update results: not applicable.

### Update Existing Pages Only

Recommended first update mode.

- Rows with matching `Worldie ID`: update the matching page.
- Rows without matches: block by default, or mark skipped once the UI has clear skip affordances.
- Unknown IDs: block in the first slice.
- Invalid rows: block import.
- Duplicate matches: block import.
- Mixed create/update results: not applicable.

### Create Missing + Update Existing

Later mode after update-only is stable.

- Rows with matching `Worldie ID`: update existing pages.
- Rows without matches: create new pages.
- Unknown IDs: user chooses whether unknown IDs block or create as new.
- Invalid rows: block import.
- Duplicate matches: block import.
- Mixed create/update results: preview must show create/update/skip counts before apply.

## Matching Rules

### Stable ID Matching

Recommended primary key: `Worldie ID`.

Rules:

- Match exactly against the lore page UUID in the active world.
- If the ID matches a page in another world, block the row with a clear warning.
- If the ID is malformed, block the row.
- If the ID is well-formed but unknown in the active world, behavior depends on mode:
  - Update existing only: block.
  - Create missing + update existing: later user option decides create or block.
  - Create new pages only: ignore the ID for matching and create a new page, unless a later safety option says otherwise.
- If multiple existing pages somehow share the same ID, treat this as a project integrity error and block.

### Title Matching

Title matching should be a later, explicit fallback. It should never silently run just because an ID is missing.

Recommendation:

- Default: title matching off.
- Later option: "Match by title when Worldie ID is missing."
- Matching should be normalized case-insensitive after trimming and whitespace compaction.
- Exact case-sensitive title matching is too brittle for user-edited spreadsheets.
- Loose slug matching is too risky for updates and should not be MVP behavior.

Duplicate title behavior:

- If multiple existing pages in the selected lore type match the normalized title, block that row.
- If duplicate CSV rows point to the same existing title target, block the import unless a later UI supports per-row actions.
- If title and `Worldie ID` are both present and conflict, block the row. ID must not silently win over a contradictory visible title.

## Blank-Cell Rules

Blank cells are the main overwrite risk.

Recommended behavior:

- Update modes default: blank cells mean leave unchanged.
- Create modes: blank cells mean absent/empty values, with lore type defaults applied when available.
- Explicit clearing should be added later through:
  - a special marker such as `[clear]`, or
  - an import option such as "Blank cells clear existing values."

Initial update implementation should not clear values from blank cells.

Future explicit clear rules:

- `[clear]` in a custom field cell clears that custom field value.
- For text-like fields, clear can store an empty string or remove the key; choose one per field semantics before implementation.
- For checkbox fields, `[clear]` should remove the key or restore default rather than guess false.
- For number fields, `[clear]` should clear rather than store `0`.
- Preview must show clears separately from unchanged blanks.

## Field Mapping Rules

Current mapping should continue:

- Match lore type custom fields case-insensitively by display name.
- Match lore type custom fields case-insensitively by field key.
- Ignore exported core columns such as `Type` and `Updated`.
- List stale or unknown columns as unmapped.

Future export improvement:

- Add optional stable field-key metadata to CSV export.
- Keep human-readable labels, but prefer stable keys when available.

Possible column naming pattern:

- Display label only: `Species`
- Stable key option: `Species [species]`
- Dedicated metadata row is more powerful but harder for spreadsheet users.

Changed field definition behavior:

- If a CSV column matches an old display label but no current field key/name, list it as unmapped.
- If a CSV column matches a current field key after a display rename, map it.
- If a field type changed since export, validate according to the current field type.
- If two current fields normalize to the same display name/key, block mapping until the definitions are fixed or manual mapping exists.

Unmapped columns:

- Never import unmapped columns as custom fields in automatic update modes.
- Show them in preview so users know data is not being applied.
- Later manual mapping UI can let users map them intentionally.

## Update Semantics

Update should merge into existing lore page data rather than rebuild it.

Rules:

- Preserve existing `traits`.
- Preserve existing `details`.
- Preserve existing `templateId`.
- Preserve existing manual extra custom fields.
- Preserve unrelated definition-backed custom fields.
- Update only mapped custom field keys with nonblank CSV values.
- Leave blank CSV values unchanged by default.
- Do not drop unknown fields from `customFields`.
- Do not change page type unless a future import mode explicitly supports type reassignment.
- Do not use `Type` from CSV as an update target in the MVP.
- Title updates should be explicit in preview. If supported in the first update slice, the preview should show old title -> new title.

## Safety Rules

Preview must be non-mutating.

Before apply, preview should show:

- selected import mode
- blank-cell behavior
- matched existing rows
- new rows
- skipped rows
- blocking errors
- warnings
- create count
- update count
- skip count
- per-row action: create, update, skip, or blocked

Apply should require:

- no blocking errors
- a selected import mode
- a selected lore type
- user confirmation for update modes

Bulk update safety:

- Recommend users make a project copy or Save As backup before large update imports.
- For future implementation, consider an automatic pre-import backup prompt for update modes.
- Prefer all-or-nothing writes if practical.
- If all-or-nothing is not practical with current sidecar calls, report partial completion clearly and never claim full success.
- If partial failure occurs, show how many rows updated/created before failure and keep the preview visible.

## CSV Export Changes

Recommended future change:

- Add an optional CSV export setting: include `Worldie ID`.
- Name the column exactly `Worldie ID`.
- Keep normal Lore Table visible columns unchanged.
- Do not require `Worldie ID` to be visible in the table to export it.
- For update-ready exports, include `Worldie ID` by default.

Export modes could be:

- Current visible table CSV: no ID unless user enables it.
- Update-ready CSV: includes `Worldie ID` and visible columns.

`Worldie ID` should be treated as an import matching column, not a custom field.

## Future Preview UI

The preview panel should grow into a clear review surface before update apply.

Recommended UI fields:

- import mode selector
- blank-cell behavior selector
- summary counts: create, update, skip, blocked
- matched rows list
- new rows list
- skipped rows list
- blocking errors
- warnings
- unmapped columns
- ignored columns
- per-row action label: create, update, skip, blocked

For later manual control:

- per-row action override
- manual column mapping
- explicit title update toggle
- filter preview rows by status

Do not add manual mapping or per-row action editing until the ID-only update path is stable.

## Test Plan

Frontend tests:

- parses and recognizes `Worldie ID`
- ID matching finds the correct lore page in the active world
- unknown ID blocks in update-only mode
- malformed ID blocks
- ID from another world blocks
- title fallback is disabled by default
- explicit title fallback matches normalized titles
- duplicate title matches block
- ID/title conflict blocks
- duplicate CSV rows targeting the same page block
- blank cells leave existing values unchanged in update modes
- create mode treats blanks as absent/empty and applies defaults
- explicit clear marker behavior, once added
- unmapped columns are ignored and reported
- stale field columns are reported as unmapped
- type-changed field values validate against current field type
- preview reports create/update/skip/blocked counts
- preview does not mutate lore pages
- update draft preserves unrelated fields
- update draft preserves manual extra custom fields
- mixed create/update mode counts rows correctly
- failed apply reports partial completion if all-or-nothing is unavailable

Backend or integration tests:

- update by ID persists to `.worldie`
- unknown ID cannot update another record
- project/world scoping prevents cross-world updates
- update preserves fields not present in CSV
- update preserves manual custom fields
- update preserves traits/details/template metadata
- update can explicitly clear fields when clear support exists
- failed update path returns structured error
- no browser/local storage is used for import data

Manual QA:

- export update-ready CSV, edit values, import update-only, reopen project
- duplicate title project verifies title fallback blocking
- unknown ID verifies block behavior
- blank cells verify leave-unchanged behavior
- unmapped stale columns are visible before apply
- backup recommendation appears before bulk update

## Phased Implementation Plan

### Phase 1: Update-Ready Preview

- Add optional `Worldie ID` to CSV export.
- Add update-ready export option that includes `Worldie ID` by default.
- Update import preview to recognize `Worldie ID`.
- Show match status for each row.
- Show create/update/skip/blocked counts.
- No update apply yet.

### Phase 2: Update Existing By ID Only

- Add update existing pages only mode.
- Apply updates only by `Worldie ID`.
- Blank cells leave unchanged.
- Preserve unrelated custom fields and manual extras.
- Preserve traits, details, template metadata, tags unless explicitly mapped later.
- Block the whole import on blocking errors.

### Phase 3: Mixed Create And Update

- Add create missing + update existing mode.
- Decide unknown ID behavior through a clear user option.
- Add optional title fallback matching.
- Add duplicate-title blocking.
- Add per-row action display.

### Phase 4: Advanced Controls

- Add explicit clearing support through `[clear]` or import options.
- Add manual column mapping UI.
- Add per-row action overrides.
- Add post-import review and possible undo/rollback support.

## Non-Goals

- No update-existing implementation in this design task.
- No title matching implementation yet.
- No ID export implementation yet.
- No formulas.
- No media import/export changes.
- No PDF, DOCX, or HTML export changes.
- No editor rewrite or TipTap migration.
- No change to `.worldie` storage architecture.
