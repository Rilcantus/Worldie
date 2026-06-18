# QA Run Notes

## 2026-06-17 - Scan Lore Individual Mention Selection

Environment:

- Windows desktop development workspace
- Branch: `72hrbranch`
- App stack: React + Vite frontend, Python sidecar, SQLite-backed `.worldie` files

Pass/fail notes:

- Scan Lore snippets now have individual mention checkboxes.
- All mentions for non-ambiguous matched lore items start selected.
- The lore-item checkbox selects or clears all snippets for that item.
- If only some snippets are selected, the lore-item checkbox shows an indeterminate state.
- Link selected now links only checked mentions and keeps unchecked mentions as plain text.

Bugs found:

- None during implementation.

Bugs fixed:

- Added mention-level review control so normal prose uses of a lore title can be skipped before linking.

Deferred issues:

- Project-wide and cross-world scanning remain deferred and should be explicit later.
- Relationship metadata creation from linked mentions remains deferred.
- Per-mention relationship or note metadata is not implemented.

Manual QA checklist:

- Create lore items `Urzoth`, `Valral`, and `Karzug`.
- Write a document with several repeated mentions of each, plus an existing `[[Urzoth]]` link.
- Click Scan Lore and confirm all lore items and snippets are selected by default.
- Uncheck one `Urzoth` snippet while leaving the other `Urzoth` snippets checked.
- Uncheck an entire lore item and confirm its snippets are cleared/disabled.
- Recheck that lore item and confirm its snippets are selected again.
- Link selected and confirm only checked snippets become `[[Lore Links]]`.
- Save, close/reopen, and confirm linked document text persists.

Verification commands:

- `npm run test:frontend` - passed, 234 frontend tests.
- `npm run test` - not available; `package.json` does not define a top-level `test` script.
- `npm run typecheck` - passed.
- `npm run build` - hit the known managed-shell Vite access issue.
- Direct Vite build with `C:\Program Files\nodejs\node.exe` - passed.

## 2026-06-17 - Scan Lore Snippet Review

Environment:

- Windows desktop development workspace
- Branch: `72hrbranch`
- App stack: React + Vite frontend, Python sidecar, SQLite-backed `.worldie` files

Pass/fail notes:

- Scan Lore review now includes context snippets under each matched lore item.
- Snippets are generated from unlinked current-document matches only and do not mutate source text.
- Snippet rendering is plain React text with a highlighted match segment; it does not use raw HTML injection.
- The first three snippets show by default, with a compact expand/collapse control for additional matches.
- Lore-item checkbox selection remains independent from snippet expand/collapse.

Bugs found:

- None during implementation.

Bugs fixed:

- Added safer review context so writers can verify matched mentions before linking selected lore items.

Deferred issues:

- Individual mention selection is still deferred.
- Project-wide and cross-world scanning remain deferred and should be explicit later.
- Relationship metadata creation from linked mentions remains deferred.

Manual QA checklist:

- Create lore items `Urzoth`, `Valral`, and `Karzug`.
- Write a document with several plain mentions, punctuation, Unicode, emoji, and `***` page breaks.
- Include an existing `[[Urzoth]]` link and confirm Scan Lore does not show it as a snippet match.
- Click Scan Lore and confirm each matched lore item shows context snippets with the matched phrase highlighted.
- Expand/collapse an item with more than three snippets.
- Uncheck one item, then Link selected.
- Confirm only checked lore items are linked and unchecked item text remains plain.
- Save, close/reopen, and confirm linked document text persists.

Verification commands:

- `npm run test:frontend` - passed, 229 frontend tests.
- `npm run test` - not available; `package.json` does not define a top-level `test` script.
- `npm run typecheck` - passed.
- `npm run build` - hit the known managed-shell Vite access issue.
- Direct Vite build with `C:\Program Files\nodejs\node.exe` - passed.
- `git diff --check` - passed with line-ending warnings only.

## 2026-06-17 - Bulk Link Existing Lore

Environment:

- Windows desktop development workspace
- Branch: `72hrbranch`
- App stack: React + Vite frontend, Python sidecar, SQLite-backed `.worldie` files

Pass/fail notes:

- Added a current-world-only Scan Lore action for the document editor.
- Scan results are review-first and do not mutate the active document until Link all is clicked.
- Existing `[[Lore Links]]` are skipped so they are not double-linked.
- Longer lore titles are matched before shorter overlapping titles.
- Duplicate lore page titles in the same world are reported as ambiguous and skipped.

Bugs found:

- None during implementation; this was a new workflow slice.

Bugs fixed:

- None.

Deferred issues:

- Project-wide and cross-world lore scanning are not implemented yet.
- Future cross-world scanning should be opt-in, separate current-world matches from other-world matches, require explicit confirmation, and eventually report cross-world connection metadata.
- No per-item checkbox review UI yet; first slice provides Link all or Dismiss.

Manual QA checklist:

- Create lore items `Urzoth`, `Valral`, and `Karzug` in the active world.
- Write a document with plain mentions of each title.
- Include an existing `[[Urzoth]]` link and confirm Scan Lore does not count it.
- Add overlapping titles such as `Blacktooth` and `Blacktooth clan`; confirm `Blacktooth clan` links as the longer phrase.
- Add duplicate lore titles and confirm that title is reported as ambiguous/skipped.
- Click Scan Lore, review counts, then Link all.
- Confirm punctuation, Unicode, emoji, `***` page breaks, and existing links are preserved.
- Save, close/reopen, and confirm linked document text persists.

Verification commands:

- `npm run test:frontend` - passed, 219 frontend tests.
- `npm run test` - not defined in `package.json`; returned `Missing script: "test"`.
- `npm run typecheck` - passed.
- `npm run build` - failed with the documented managed-shell Vite access issue.
- `& 'C:\Program Files\nodejs\node.exe' '.\node_modules\vite\bin\vite.js' build` - passed.
- `git diff --check` - passed with line-ending warnings only.

## 2026-06-17 - Selectable Scan Lore Review

Environment:

- Windows desktop development workspace
- Branch: `72hrbranch`
- App stack: React + Vite frontend, Python sidecar, SQLite-backed `.worldie` files

Pass/fail notes:

- Scan Lore review now shows selectable matched lore items.
- Matched non-ambiguous items default to selected.
- Link selected only links checked lore items.
- Dismiss still clears the review without changing document text.
- Ambiguous duplicate titles remain skipped and are not selectable.

Bugs found:

- None during implementation; this was a focused review UX improvement.

Bugs fixed:

- None.

Deferred issues:

- Project-wide and cross-world lore scanning are still not implemented.
- No automatic relationship creation or background auto-linking.
- The review prompt has simple per-item checkboxes, not a full modal with snippets.

Manual QA checklist:

- Create lore items `Urzoth`, `Valral`, and `Karzug`.
- Write a document with plain mentions of each.
- Click Scan Lore and confirm all three are checked by default.
- Uncheck `Valral`, then Link selected.
- Confirm `Urzoth` and `Karzug` are linked while `Valral` remains plain text.
- Rescan and confirm only remaining unlinked matches are offered.
- Uncheck every item and confirm Link selected is disabled.
- Add duplicate lore titles and confirm they appear as skipped ambiguous titles, not checkboxes.
- Confirm punctuation, Unicode, emoji, `***` page breaks, and existing links remain intact.

Verification commands:

- `npm run test:frontend` - passed, 225 frontend tests.
- `npm run test` - not defined in `package.json`; returned `Missing script: "test"`.
- `npm run typecheck` - passed.
- `npm run build` - failed with the documented managed-shell Vite access issue.
- `& 'C:\Program Files\nodejs\node.exe' '.\node_modules\vite\bin\vite.js' build` - passed.
- `git diff --check` - passed with line-ending warnings only.

## 2026-06-17 Write/Preview Unicode Display Regression

Environment:

- Windows managed Codex desktop shell
- Branch: `72hrbranch`
- App stack: React + Vite frontend, Python sidecar, SQLite-backed `.worldie` files

Observed regression:

- After the Write/Preview mode polish, smart punctuation could display as mojibake in the document editor, such as `â€œ` for smart quotes and `â€™` for curly apostrophes.
- The suspected trigger was switching editor modes after the editable surface started unmounting/remounting between Write and Preview.

Data-safety notes:

- No cleanup or migration was added.
- A read-only check of `C:\Users\admin\Documents\Cosmidol.worldie` found mojibake sequences already present in the saved `documents.content_json` for `White Touch`.
- The fix avoids a mode-switch HTML remount round trip; it does not rewrite saved document content.
- Repairing already-saved mojibake should be a separate, user-confirmed recovery action, not an automatic migration.

Fix:

- Kept the Write-mode contenteditable mounted while Preview is open, hiding it visually instead of unmounting it.
- Removed the mode-toggle resync dependency that rebuilt the editor DOM when switching modes.
- Added regression coverage for smart quotes, curly apostrophes, em dashes, emoji, `***` scene breaks, and `[[Lore Links]]` in Write-mode representation and Preview rendering.

Verification:

- Frontend tests verify that Unicode text renders directly and is not converted into mojibake sequences such as `â€œ` or `â€™`.
- Manual target text: `“Send Valral,” he said.`, `you’re, I’d, you’d`, `word — word`, `[[Urzoth]]`, `***`, and `🔥`.

## 2026-06-17 Invalid Unicode Paste Save Failure

Environment:

- Windows managed Codex desktop shell
- Branch: `72hrbranch`
- App stack: React + Vite frontend, Python sidecar, SQLite-backed `.worldie` files

Observed failure:

- A large pasted story remained visible in the document editor, but save failed with `Worldie could not update document in the active project file. Detail: 'utf-8' codec can't encode character '\udc9d' in position 167: surrogates not allowed`.
- The original text used `***` page breaks, but the actual root cause was a lone invalid Unicode surrogate code point from pasted external text.

Pass/fail notes:

- Pass: invalid lone surrogate characters are now replaced with the Unicode replacement character before project-store writes.
- Pass: backend persistence defensively sanitizes text before SQLite writes for document updates and related text fields.
- Pass: document saves with smart quotes, em dashes, apostrophes, emoji, newlines, and `***` page breaks preserve those characters.
- Pass: large pasted document text containing `***` page breaks and an invalid surrogate saves and reopens from a temporary `.worldie` file.

Bugs found:

- Lone surrogate code points from pasted content could reach Python/SQLite and trigger a UTF-8 encoding failure, leaving the document dirty and unsaved.

Bugs fixed:

- Added replacement-based invalid Unicode surrogate sanitization at the frontend project-store boundary and editor paste/input paths.
- Added backend storage sanitization before SQLite writes so sidecar persistence does not crash on lone surrogates.

Deferred issues:

- Worldie does not yet show a non-blocking UI warning when invalid pasted characters are replaced.
- Other external import paths should continue to use project-store/sidecar boundaries so they benefit from the same sanitization.

Verification commands run:

- `npm run test:frontend` - first run exposed a frontend test-bundle import issue after adding the sanitizer; rerun passed, 185 frontend tests.
- `npm run test:python` - passed, 48 Python tests.
- `npm run typecheck` - passed.
- `npm run build` - failed with the documented managed-shell Vite access issue.
- `& 'C:\Program Files\nodejs\node.exe' '.\node_modules\vite\bin\vite.js' build` - passed.
- `cargo check` - not run; no Tauri/Rust files changed.

## 2026-06-17 Usage-Readiness QA Pass

Environment:

- Windows managed Codex desktop shell
- Branch: `72hrbranch`
- App stack: React + Vite frontend, Python sidecar, SQLite-backed `.worldie` files
- Native Tauri window interaction was not directly controllable from this session. The in-app browser can exercise a local web build, but real project-file create/open/save flows require the Tauri desktop runtime. To stay outside the Vite managed-shell limitation while still testing real persistence, this pass used the Python sidecar/database layer against a temporary `.worldie` project file and temporary registry path.

Checklist sections tested:

- Project file creation: created a new temporary `.worldie` file.
- World creation: created one world inside the project file.
- Document writing: created and updated a document containing wiki-style lore links.
- Lore page writing: created multiple Character lore pages with tags, traits, details, and custom field JSON.
- Lore type custom field definitions: saved a Character lore type with text, number, checkbox, and select definitions.
- Create lore page from Lore Table behavior: simulated a table-created page with lore type defaults.
- Inline table custom field editing: updated custom field values through the normal lore page update path.
- Saved Lore Table views: created and reopened a saved table view with lore type, filter, sort, and visible column state.
- Normal CSV export: exported a visible-table CSV without `Worldie ID`.
- Update-ready CSV export: exported a CSV with leading `Worldie ID`.
- CSV import as new pages: created a new lore page using the same persisted fields shape used by CSV import drafts.
- CSV update by Worldie ID: updated matched existing pages, preserving blank-cell age, manual extra fields, traits, details, template metadata, tags, and title.
- Active-world Markdown export: exported the active world and verified document/lore counts.
- Full-project Markdown export: exported the full project and verified world/lore counts.
- Close/reopen persistence: reopened the temporary `.worldie` file and verified documents, lore pages, lore type definitions, table views, and custom field updates persisted.

Pass/fail notes:

- Pass: temporary `.worldie` project file was created and reopened successfully.
- Pass: world, document, lore pages, lore type definitions, and saved table view persisted after reopen.
- Pass: normal CSV and update-ready CSV files were written.
- Pass: CSV-style create-new-page flow produced a new persisted lore page.
- Pass: update-by-`Worldie ID` changed only nonblank mapped custom field values and preserved unrelated/manual fields and lore metadata.
- Pass: active-world and full-project Markdown exports wrote expected files and counts.
- Not fully exercised interactively: native Tauri desktop buttons, file dialogs, and close/reopen UI flow could not be directly driven from this managed session.

Bugs found:

- None in this pass.

Bugs fixed:

- None; no small bugs were found during the pass.

Deferred issues:

- Full native desktop usage QA remains deferred until the Tauri window and native file dialogs can be interactively controlled outside this managed session.
- Browser-only localhost QA is not sufficient for project-file workflows because the frontend intentionally requires the Tauri runtime for `.worldie` persistence.

Verification commands run:

- Inline Python project-file QA script - passed. Covered temporary `.worldie` create/reopen, world/document/lore CRUD, lore type definitions, saved table views, CSV export, CSV-style create/update flows, and Markdown exports.
- `npm run test:frontend` - passed, 168 frontend tests.
- `npm run test:python` - first parallel attempt hit a sandbox helper read issue; rerun passed, 42 Python tests.
- `npm run typecheck` - passed.
- `npm run build` - failed with the documented managed-shell Vite access issue.
- `& 'C:\Program Files\nodejs\node.exe' '.\node_modules\vite\bin\vite.js' build` - passed.
- `cargo check` - not run; no Tauri/Rust files changed.

## 2026-06-17 Manual QA And Stabilization Pass

Environment:

- Windows managed Codex desktop shell
- Branch: `72hrbranch`
- App stack: React + Vite frontend, Python sidecar, SQLite-backed `.worldie` files
- Interactive browser/dev-server launch was blocked by the managed-shell Vite parent-directory access issue until broader read access was granted; `npm run build` still reproduced the documented managed-shell failure, while the direct Vite production build passed.

Checklist sections tested:

- App launch/build smoke: partially tested. Standard Vite dev/build startup initially failed in the managed shell with `Cannot read directory "../../../..": Access is denied`; direct production Vite build passed after read permission was granted.
- Project create/open/save-as: covered by Python project-store and sidecar tests, including same-path Save As rejection and Save As backup behavior.
- Recent project and missing project file behavior: covered by project recovery/frontend tests and Python sidecar missing-file tests.
- Dirty editor navigation: covered by frontend dirty-state tests for document edits, tab close, world/project navigation, failed save states, and stale save completions.
- Document writing: covered by editor-core tests for nested lists, note blocks, paste normalization, preview rendering, formatting round trips, and lore-link text.
- Lore page writing: covered by lore item/custom field parsing tests and Python persistence tests.
- Lore custom fields: inspected in `LoreView`; found and fixed one manual-field rename data-loss bug.
- Lore type field definitions: covered by frontend normalization tests and Python project-file persistence tests.
- Lore Table filtering/sorting: covered by frontend Lore Table model tests.
- Saved Lore Table views: covered by frontend payload/view-state tests and Python persistence/sidecar tests.
- Saved column visibility: covered by frontend Lore Table tests and Python saved-view persistence tests.
- Inline table custom field editing: covered by frontend Lore Table edit tests.
- Relationships: covered by Python persistence/export tests and frontend relationship draft-state tests.
- Timeline: covered by Python persistence/export tests and frontend timeline draft-state tests.
- Active-world Markdown export: covered by Python export tests and frontend export feedback tests.
- Full-project Markdown export: covered by Python export tests and frontend export feedback tests.
- Backup behavior: covered by Python Save As backup and failure tests.
- Close/reopen persistence: covered by Python project reopen tests for worlds, lore, lore table views, and project file data.

Pass/fail notes:

- Pass: frontend regression suite passed after the fix.
- Pass: Python project-store/sidecar suite passed after the fix.
- Pass: TypeScript typecheck passed.
- Pass: direct Vite production build passed.
- Environment note: `npm run build` failed with the known managed-shell Vite access issue. The direct Vite build command passed and was used as the production bundle check.
- Not fully exercised interactively: Tauri desktop file dialogs and full close/reopen desktop UI flow were not completed in this shell because dev startup hit the managed-shell Vite access issue during the QA window.

Bugs found:

- Renaming a manual lore custom field could drop definition-backed custom field values from the same page because the rename path rebuilt the saved custom field map from only manual custom fields.

Bugs fixed:

- Added `renameLoreCustomField` to preserve the full custom field map while renaming the target manual field.
- Updated `LoreView` manual custom-field rename handling to use the preserving helper.

Bugs deferred:

- Full interactive Tauri desktop QA remains deferred until the app can be launched outside the managed-shell Vite parent-directory access limitation.

Tests added:

- `renameLoreCustomField preserves definition-backed values while renaming manual fields` in `tests/frontend/lore-items.test.mjs`.

Verification commands run:

- `npm run test:frontend` - passed, 139 frontend tests.
- `python -m unittest discover -s tests -p "test_*.py"` - passed, 40 Python tests.
- `npm run typecheck` - passed.
- `npm run build` - failed with documented managed-shell Vite access issue.
- `& 'C:\Program Files\nodejs\node.exe' '.\node_modules\vite\bin\vite.js' build` - passed.
- `cargo check` - not run; no Tauri/Rust files changed.
## 2026-06-17 - Emergency Unicode/Mojibake Regression Follow-Up

Environment: Windows desktop development workspace, React frontend tests, Python project-store tests.

Pass/fail notes:
- Investigating a repeated data-safety report where smart punctuation such as `“`, `’`, and `—` can appear as mojibake like `â€œ`, `â€™`, and `â€”` after editor/preview/lore-link workflows.
- Added the exact known-good sample to frontend and backend regression coverage:

```text
“Send Valral,” he said. “You’re not pale.”
I’d rather keep this — even if it’s strange.
[[Urzoth]] watched.

🔥
```

Bugs found:
- The paste flow preferred extracted clipboard HTML before clean `text/plain`. If the HTML lane already contained mojibake while the plain-text lane was valid Unicode, Worldie could import the corrupted text into the editor body.

Bugs fixed:
- Paste normalization now prefers clean plain text when extracted clipboard HTML contains suspicious mojibake sequences.
- Document save payloads now emit a developer warning if mojibake-like text is about to be saved. This is diagnostic only and does not auto-repair or block user content.

Deferred issues:
- Already-corrupted saved documents still need a separate, user-approved recovery workflow. No automatic cleanup or migration was added.
- Full manual desktop verification against the active user project should only be done after backing up the `.worldie` file.

Manual reproduction checklist:
- Back up the active `.worldie` file first.
- Paste the known-good sample into a document.
- Save.
- Switch Write/Preview repeatedly.
- Toggle Readable Links on/off.
- Create Lore from `Urzoth`.
- Link other mentions in the current document.
- Save and close/reopen.
- Confirm the exact Unicode sample survives and no `â€œ`, `â€™`, `â€”`, or unexpected `�` appears.

Verification commands:
- `npm run test:frontend` - first run exposed a frontend test-bundle import issue for the new sanitizer dependency; rerun passed, 210 frontend tests.
- `npm run test:python` - passed, 49 Python tests.
- `npm run test` - not defined in `package.json`; ran twice per request and both returned `Missing script: "test"`.
- `npm run typecheck` - passed.
- `npm run build` - failed with the documented managed-shell Vite access issue.
- `& 'C:\Program Files\nodejs\node.exe' '.\node_modules\vite\bin\vite.js' build` - passed.
- `git diff --check` - passed with line-ending warnings only.

## 2026-06-17 - Preview Layout/Document Context Regression

Environment: Windows desktop development workspace, React frontend tests.

Pass/fail notes:
- User reported Preview mode still did not show the active document properly even though the same document was visible in Write mode.
- This pass intentionally did not attempt mojibake recovery. Existing corrupted text remains a separate, user-approved recovery concern.

Bugs found:
- The editable document body was hidden with `display: none` and the Preview surface was inserted as a sibling without a stable shared document-body slot. That kept the React node mounted but let Preview lose the same body layout behavior as Write mode.

Bugs fixed:
- Added a stable editor body stack so the document header/title/meta remains visible in both Write and Preview.
- Preview now renders inside the same document body slot with the same active document body snapshot.
- The contenteditable body stays mounted, but in Preview it is visually hidden and non-interactive instead of being removed from layout.

Deferred issues:
- Manual desktop QA should use a backed-up `.worldie` file before testing the active user project.
- Already-saved mojibake still needs a separate recovery workflow if the user wants it.

Manual QA checklist:
- Open `White Touch` in Write; confirm title/header/body visible.
- Switch to Preview; confirm title/header/body still visible.
- Toggle Readable Links; confirm body remains visible.
- Switch to `New Document 1` while still in Preview; confirm title/header/body update.
- Switch back to Write; confirm `New Document 1` editable body visible.
- Switch back to `White Touch`; confirm it is visible.
- Confirm mode switches alone do not trigger a save.

Verification commands:
- `npm run test` - not defined in `package.json`; returned `Missing script: "test"`.
- `npm run test:frontend` - passed, 211 frontend tests.
- `npm run typecheck` - passed.
- `npm run build` - failed with the documented managed-shell Vite access issue.
- `& 'C:\Program Files\nodejs\node.exe' '.\node_modules\vite\bin\vite.js' build` - passed.
- `git diff --check` - passed with line-ending warnings only.

## 2026-06-17 - Preview Toolbar Document Selector Regression

Environment: Windows desktop development workspace, React frontend tests.

Pass/fail notes:
- User clarified that the visible Preview regression was the active document selector/title control disappearing from the toolbar, not only the Preview body surface.
- The earlier body-stack fix was insufficient because the document selector was still placed at the end of the overflowing write-tool group.

Bugs found:
- The document selector was rendered unconditionally, but it lived after the write-only formatting/lore controls in the horizontally scrolling toolbar main group. In Preview, the persistent mode controls could visually occupy the document selector's expected area while the selector was pushed out of sight.

Bugs fixed:
- Moved the active document selector into the persistent toolbar-side group immediately before the Write/Preview segmented control.
- Kept the selector functional in both Write and Preview so users can switch documents while previewing.
- Added toolbar state coverage for preserving the active document identity across mode changes and document switches.

Deferred issues:
- Manual desktop QA should still use a backed-up `.worldie` file before testing the active user project.
- Existing mojibake content was not repaired or modified.

Manual QA checklist:
- Open `White Touch` in Write; confirm selector shows `White Touch`.
- Switch to Preview; confirm selector still shows `White Touch`.
- In Preview, use the selector to choose `New Document 2`; confirm Preview updates.
- Switch back to Write; confirm selector still shows `New Document 2` and editable body appears.
- Switch back to `White Touch`; confirm selector remains visible.
- Confirm Readable Links appears only in Preview.
- Confirm mode switches alone do not trigger a save.

Verification commands:
- `npm run test` - not defined in `package.json`; returned `Missing script: "test"`.
- `npm run test:frontend` - passed, 212 frontend tests.
- `npm run typecheck` - passed.
- `npm run build` - failed with the documented managed-shell Vite access issue.
- `& 'C:\Program Files\nodejs\node.exe' '.\node_modules\vite\bin\vite.js' build` - passed.
- `git diff --check` - passed with line-ending warnings only.

## 2026-06-17 - Mojibake Recovery Utility

Environment: Windows desktop development workspace, Python project-store tests.

Pass/fail notes:
- Existing saved mojibake in the active `White Touch` document is treated as a separate recovery problem from the future paste-path fix.
- Added a standalone recovery utility that previews and repairs one selected document only.

Bugs found:
- Earlier corruption can already be saved inside a document's `content_json`; preventing future paste corruption does not repair those existing bytes.

Bugs fixed:
- Added a dry-run-first mojibake recovery utility for one document.
- Apply mode creates a timestamped backup beside the `.worldie` file before writing.
- Apply mode updates only the selected document's body content and leaves unrelated project data alone.

Deferred issues:
- The utility is not integrated into the app UI.
- The active user project has not been repaired. Apply requires explicit user confirmation after reviewing dry-run samples.

Verification commands:
- `npm run test:python` - passed, 55 Python tests.
- `python scripts\repair_mojibake.py "C:\Users\admin\Documents\Cosmidol.worldie" --title "White Touch"` - dry-run only, found 5,150 suspicious sequences, would change the selected document, and printed before/after samples.
- `git diff --check` - pending final run.

Dry-run sample highlights:
- `Ãƒ...Ã…â€œfucking filthy...Ã‚Â½` -> `“fucking filthy”`
- `[[Urzoth]]` stayed intact in repaired preview samples.
- No apply command was run.
