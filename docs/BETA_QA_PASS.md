# Worldie Beta QA Pass

Date: 2026-06-18

## Environment

- Windows development workspace in the Codex desktop managed shell.
- Branch: `72hrbranch`, ahead of `origin/72hrbranch` by 3 commits at start of pass.
- App stack: React + Vite frontend, Python sidecar/project store, SQLite-backed `.worldie` files.
- Test project: `C:\Users\admin\Documents\python_work\New folder\Worldie\tests\.tmp\beta-qa-efbb1b4e\Beta QA Project.worldie`
- Backup made before QA writes: `C:\Users\admin\Documents\python_work\New folder\Worldie\tests\.tmp\beta-qa-efbb1b4e\Beta QA Project.worldie.bak-before-qa`
- Note: this pass used a disposable backed-up `.worldie` project plus the frontend/backend regression suites. It did not run destructive recovery tools.

## Test Project Shape

The disposable project included:

- Two worlds: `White Touch World` and `Outer Archive`.
- Two documents: `White Touch` and `New Document 1`.
- Current-world lore pages: `Urzoth`, `Valral`, `Karzug`, and duplicate `Mirror Gate` pages for ambiguity checks.
- Other-world lore pages: globally unique `Starfall Gate` and colliding `Valral`.
- One relationship and one timeline event in the current world.
- A document body containing smart quotes, curly apostrophes, em dash, emoji, `[[Urzoth]]`, and `***` page breaks.

## Checklist Results

### Project Open/Save Safety

Status: Pass with one UI limitation.

Notes:

- Created a fresh `.worldie` project file.
- Created a backup copy before QA writes.
- Created two worlds, two documents, lore pages, relationship, and timeline event.
- Reopened the project file through the project store and confirmed the same project UUID and saved data.
- Confirmed newly created document content persisted after reopen.
- Recent-project UI was not manually clicked in this shell, but project open/reopen behavior and missing-file behavior remain covered by existing tests.

### Large Paste Safety

Status: Pass.

Notes:

- Saved and reopened text containing:

```text
“Send Valral,” he said. “You’re not pale.”
I’d rather keep this — even if it’s strange.
[[Urzoth]] watched.

🔥
***
Starfall Gate waits beyond Valral.
Karzug heard Urzoth speak.
```

- Confirmed the reopened document matched the source text exactly.
- Confirmed no mojibake markers appeared in the clean test text: `â€œ`, `â€™`, `â€`, `Ã¢`.
- Confirmed `[[Urzoth]]`, emoji, newlines, and `***` were preserved.

### Write/Preview Mode

Status: Pass via frontend workflow coverage.

Notes:

- Frontend tests verify Write mode source, Preview mode rendering, same active document across mode switches, Preview using unsaved draft text, document switching while in Preview, and Readable Links affecting Preview only.
- Mode switching tests verify source text is not mutated.
- No desktop screenshot capture was performed in this managed shell.

### Create Lore From Selection

Status: Pass via frontend workflow coverage.

Notes:

- Tests cover selected text trimming, blank selection blocking, editable title before creation, selected lore type/template/details/tags payloads, default custom fields, in-flight duplicate prevention, floating selection action state, and optional `[[Lore Link]]` replacement helpers.
- Existing New Lore Item create flow coverage remains green.

### Link Other Mentions

Status: Pass via frontend workflow coverage.

Notes:

- Tests cover finding other unlinked exact mentions, skipping already-linked `[[Lore]]`, preserving punctuation/Unicode/page breaks, handling regex-special titles, and preserving surrounding text.
- Link-all applies through normal editor text update helpers and avoids double-linking the selected occurrence.

### Current-World Scan Lore

Status: Pass via frontend workflow coverage and seeded QA data.

Notes:

- Tests cover current-world-only default scanning, snippets, individual mention selection, selected mention counts, unchecked items/mentions remaining plain, ambiguous duplicate titles skipped, larger-word avoidance, longer-title precedence, and safe replacement from stable positions.
- Seeded project included current-world titles `Urzoth`, `Valral`, `Karzug`, and duplicate `Mirror Gate` pages for ambiguity.

### Include Other Worlds

Status: Pass via frontend workflow coverage and seeded QA data.

Notes:

- Tests cover explicit Include Other Worlds behavior, other-world matches defaulting unchecked, source world metadata, globally unique other-world titles being selectable, collisions with current-world titles being ambiguous/skipped, duplicate other-world titles being ambiguous/skipped, snippets, and unchecked other-world matches not being linked.
- Seeded project included unique other-world `Starfall Gate` and colliding `Valral`.
- No relationship or cross-world metadata is created in this phase, by design.

### Preview Link Behavior

Status: Pass via frontend workflow coverage.

Notes:

- Tests cover raw Preview showing `[[Lore]]`, readable Preview showing clean clickable link text, incomplete/empty links degrading safely, and readable clickable links passing matched lore pages to the open handler.
- Plain-title cross-world links remain intentionally ambiguous when titles collide because ID-backed link syntax is not implemented yet.

### Dirty-State Safety

Status: Pass via frontend workflow coverage.

Notes:

- Tests cover dirty editor navigation blocking, cancel behavior preserving edits, tab close guards, save-state feedback, failed save state staying dirty, stale save completions, and newly created document open behavior.
- No new dirty-state bug was found during this pass.

### Export Sanity

Status: Pass.

Notes:

- Exported active-world Markdown to:
  `C:\Users\admin\Documents\python_work\New folder\Worldie\tests\.tmp\beta-qa-efbb1b4e\exports\Beta QA Project - White Touch World`
- Exported full-project Markdown to:
  `C:\Users\admin\Documents\python_work\New folder\Worldie\tests\.tmp\beta-qa-efbb1b4e\exports\Beta QA Project`
- Confirmed Markdown files were created.
- Confirmed exported Markdown retained `[[Urzoth]]`, `Starfall Gate`, and `***`.
- Active-world export produced 10 Markdown files; full-project export produced 14 Markdown files.

## Bugs Found

None found that met blocker/high severity during this pass.

## Bugs Fixed

None. This was a QA/documentation pass only.

## Deferred Issues

- Full click-by-click Tauri desktop QA was not performed in this managed shell.
- Recent-project UI behavior was not manually clicked; existing tests cover recent/missing project helper behavior.
- Cross-world Scan Lore still uses plain `[[Title]]` links only when globally unambiguous. ID-backed links and cross-world relationship metadata remain future work.
- Existing already-saved mojibake documents still require explicit user-approved recovery. No automatic repair was attempted.
- Normal `npm run build` still hits the known managed-shell Vite access issue; direct Vite build passes.

## Verification Commands

- Disposable `.worldie` QA script - passed.
- `npm run test:python` - passed, 55 tests.
- `npm run test:frontend` - passed, 240 tests.
- `npm run typecheck` - passed.
- `npm run build` - failed with the documented managed-shell Vite access issue: `Cannot read directory "../../../..": Access is denied.`
- `& 'C:\Program Files\nodejs\node.exe' '.\node_modules\vite\bin\vite.js' build` - passed.
- `git diff --check` - passed with a line-ending warning for `.gitignore`.

## Recommendation

Worldie is ready for a longer real writing session with beta precautions:

- Work from a backed-up `.worldie` file.
- Export full-project Markdown after each real session.
- Keep the existing mojibake recovery utility as a manual, preview-first tool only.
- Do one short human desktop smoke pass outside the managed shell before relying on a long live session, especially for recent-project clicks and visual toolbar interactions.
