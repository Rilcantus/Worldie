# QA Run Notes

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
