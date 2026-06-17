# Worldie Continuation Brief

Use this document as context for continuing development on Worldie in another ChatGPT or Codex thread.

## Product Summary

Worldie is an offline-first desktop application for building fictional worlds. It is designed for writers, dungeon masters, and narrative game designers who need a structured local workspace for lore, characters, documents, timelines, relationships, and story planning.

The intended feeling is:

> Obsidian and Scrivener built specifically for fantasy world-building.

Worldie is part of a larger future ecosystem. The desktop app is for creation. A future web platform called Spaci may later support publishing and sharing exported worlds. For now, Worldie should remain offline-first and should not depend on web sync.

## Current Technical State

Worldie is a working desktop MVP.

Stack:

- React frontend
- Tailwind CSS styling
- Tauri desktop shell
- Python sidecar for project-file and persistence operations
- SQLite-backed `.worldie` project files

Storage:

- Each project is a portable `.worldie` SQLite database
- Project data should live in the `.worldie` file
- Browser/local storage is for UI/session state and legacy migration only
- IDs for major entities should remain UUID-based

The project is located at:

```text
C:\Users\admin\Documents\python_work\New folder\Worldie
```

## Implemented Features

Current app features include:

- `.worldie` project file create/open/save-as flows
- Recent project tracking
- Project CRUD
- World CRUD
- Document CRUD
- Lore item CRUD
- Lore type CRUD with user-defined categories
- Lore template CRUD
- Relationship CRUD
- Timeline event CRUD
- Workbench dashboard
- Sidebar navigation
- Dynamic tab bar with project-scoped persistence
- Cross-world tab restore behavior
- Resizable/collapsible panels
- Search and quick-open across current-world documents and lore
- Demo project generator with seeded content
- Wiki-style `[[Lore Links]]`
- Linked lore detection
- Clickable lore links in document preview
- Document folder organization
- Focus mode and typewriter mode
- Keyboard-heavy editor workflow with toolbar, slash commands, undo/redo, and block tools
- Save-state feedback for editor and workspace flows
- Dirty-state guard for project switching/navigation
- Relationship workspace with filters, focus panels, summaries, linked-page actions, and lightweight network preview
- Timeline workspace with filters, summary cards, linked lore visibility, visual canvas, chronological outline, type tracks, and era grouping

## Important Files

Start here:

- `README.md` - current project overview
- `AGENTS.md` - project instructions and product context
- `CHANGELOG.md` - recent feature history
- `package.json` - scripts and dependencies

Frontend:

- `src/App.tsx` - top-level app composition
- `src/hooks/useAppController.ts` - central orchestration hook
- `src/lib/data.ts` - frontend project-store API boundary
- `src/components/editorCore.tsx` - editor parsing/formatting helpers
- `src/components/EditorView.tsx` - editor view
- `src/components/RelationshipsView.tsx` - relationship workspace
- `src/components/TimelineView.tsx` - timeline workspace
- `src/components/WorkbenchView.tsx` - project dashboard

State/domain hooks:

- `src/hooks/useProjectWorlds.ts`
- `src/hooks/useContentManager.ts`
- `src/hooks/useWorldStructures.ts`
- `src/hooks/useTabs.ts`
- `src/hooks/useSearch.ts`
- `src/hooks/useWorkspaceNavigation.ts`
- `src/hooks/useLoreTypes.ts`
- `src/hooks/useLoreTemplates.ts`

Backend:

- `backend/sidecar.py` - sidecar request dispatcher
- `db/db_manager.py` - SQLite schema and persistence operations
- `src-tauri/src/main.rs` - Tauri commands and sidecar bridge

Tests:

- `tests/test_project_store.py` - Python persistence/sidecar tests
- `tests/frontend/*.test.mjs` - frontend state/editor tests

## Current Verification Status

Recent checks:

- Python tests passed
- Frontend tests passed
- TypeScript passed
- Direct Vite production build passed

One environment-specific note:

`npm run verify` may fail only at the final `npm run build` step in the managed shell because esbuild tries to inspect a directory outside the workspace and receives `Access is denied`. When that happens, run:

```powershell
& 'C:\Program Files\nodejs\node.exe' '.\node_modules\vite\bin\vite.js' build
```

If the direct build passes, treat the production bundle as healthy and the `npm run verify` failure as an invocation/environment issue.

## Existing Dirty Worktree Note

At the time this brief was created, there were existing modified files:

- `src/components/editorCore.tsx`
- `tests/frontend/editor-core.test.mjs`

The change appears to preserve indentation when converting an indented bullet into a note block, with a matching frontend editor test. Treat these as user/in-progress changes unless asked to commit or modify them.

## Main Risks And Gaps

Highest-priority risks:

- The custom contenteditable editor needs more reliability testing
- Project switching and navigation with dirty state need more full-flow QA
- Nullable fields in the database are updated with `COALESCE`, which means `null` currently means "leave unchanged" instead of "clear this value"
- Media/cover image support has schema hints but no complete portable-file design
- Export/Spaci boundaries are not implemented

Known product gaps:

- No TipTap integration yet
- No full graph editor for relationships yet
- No full multi-track timeline system yet
- No cover image/media workflow yet
- No export bundle pipeline yet

## Recommended Next Development Plan

Best next sequence:

1. Finish the current editor indentation fix if it is still pending
2. Add more editor-core tests around indentation, nested blocks, paste, selection offsets, undo/redo assumptions, and formatting round trips
3. Replace backend `COALESCE` update semantics with explicit partial-update handling so optional fields can be cleared
4. Add tests for clearing optional document/lore/relationship/timeline fields
5. Add workflow tests for dirty editor state during project switching, world switching, tab switching, and file recovery
6. Decide whether to keep hardening the custom contenteditable path or migrate to TipTap
7. Design media support before implementation: whether files are embedded in `.worldie`, copied into a sidecar assets folder, or referenced externally
8. Start export bundle design for future Spaci import

## Development Principles

Follow these principles:

- Preserve offline-first behavior
- Keep project data portable
- Avoid unnecessary complexity
- Prefer existing patterns in the repo
- Keep modules small and readable
- Add focused tests for persistence and navigation changes
- Do not move project data back into browser storage
- Do not introduce cloud dependencies for MVP features
- Keep normal worlds from being automatically reseeded after user deletion

## Good First Tasks For The Next Thread

Suggested tasks that would move the project forward:

1. Add backend tests proving optional fields can be cleared, then fix the update methods
2. Add editor tests for nested indentation and note/list/quote conversions
3. Add frontend state tests for dirty navigation across tabs and project switching
4. Write a media storage design note before implementing cover images
5. Add a small export-boundary design doc for future Spaci bundles

## Prompt To Paste Into ChatGPT

```text
You are helping continue development on Worldie, an offline-first React + Tauri desktop app for fictional world-building. Read README.md, AGENTS.md, CHANGELOG.md, and CONTINUATION_BRIEF.md first. Preserve the offline-first `.worldie` SQLite project-file architecture. Project data belongs in `.worldie` files; browser storage is only for UI/session state. Current priorities are editor hardening, better QA around project switching and dirty state, fixing nullable-field persistence semantics, planning media support, and defining future export boundaries for Spaci. Start by checking git status and existing modified files before making changes.
```

