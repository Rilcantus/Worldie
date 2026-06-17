# QA Run Notes

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
