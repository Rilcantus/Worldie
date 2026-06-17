# Worldie

Worldie is an offline-first desktop app for building fictional worlds.

It is aimed at writers, dungeon masters, and narrative game designers who want a fast local workspace for lore, characters, documents, timelines, relationships, and story planning.

The product goal is:

> Obsidian and Scrivener built specifically for fantasy world-building.

## Current Status

Worldie is a working desktop MVP, not just a static scaffold. It has real `.worldie` project files, project-scoped SQLite persistence, and active writing/worldbuilding workflows.

The current build supports:

- `.worldie` project file creation, opening, and save-as flows
- Recent projects and active project file awareness
- Project CRUD
- World CRUD
- Document CRUD
- Lore item CRUD
- Lore template CRUD
- Lore type CRUD with user-defined lore categories
- Relationship CRUD
- Timeline event CRUD
- Workbench dashboard view
- Dynamic tab bar with project-scoped tab persistence
- Sidebar navigation with active-state handling
- Resizable and collapsible panels
- Search and quick-open across current-world documents and lore
- Demo project generation with seeded sample data
- Wiki-style `[[Lore Links]]` insertion
- Linked lore detection
- Clickable lore links in editor preview
- Document folder organization
- Focus mode and typewriter mode in the editor
- Keyboard-heavy editor workflow with toolbar, slash commands, undo/redo, and block tools
- Save-state feedback across editor and workspace flows
- Relationship workspace with filters, focus panels, summaries, and lightweight network preview
- Timeline workspace with filters, summary cards, visual canvas, chronological outline, type tracks, and era grouping
- Clear persistence boundary: project data lives in `.worldie` files, while UI/session state stays local to the app

## Current Limitations

Worldie is in MVP hardening, not final production shape.

Known gaps:

- The editor uses a custom contenteditable path, not TipTap yet
- The editor needs broader long-session reliability testing
- Relationship visualization is useful but not a full graph editor
- Timeline visualization is useful but not a full multi-track timeline system
- Cover image and broader media support are not implemented yet
- Export and publishing flows are not implemented yet
- Automated QA coverage exists but should be expanded around full app workflows
- Some nullable database fields currently use partial-update behavior that makes explicit clearing harder than it should be

## Architecture

Worldie uses:

- Tauri for the desktop shell
- React for the frontend
- Tailwind CSS for styling
- Python sidecar for project-file and persistence operations
- SQLite-backed `.worldie` files for portable project data

Current storage model:

- Each project is stored as a portable `.worldie` SQLite database
- Project entities persist through the active `.worldie` file
- Browser/local storage is reserved for UI state, session state, and legacy migration helpers

## Data Model

Core project entities:

- `projects`
- `worlds`
- `lore_pages`
- `documents`
- `relationships`
- `timeline_events`
- `lore_types`
- `lore_templates`

Important data principles:

- Keep project files portable
- Use UUIDs for major entities
- Store rich/editor content in JSON-friendly fields where useful
- Keep normal project content out of browser storage
- Preserve offline-first behavior

## Run

After installing dependencies:

1. `npm install`
2. `npm run dev`
3. `npm run tauri dev`

Quick verification:

1. `npm run verify`

If `npm run verify` fails only during the final Vite build because the managed shell cannot access a directory outside the workspace, run the build directly:

```powershell
& 'C:\Program Files\nodejs\node.exe' '.\node_modules\vite\bin\vite.js' build
```

The direct Vite build is the useful check for whether the production bundle itself works in that case.

## Useful Commands

```powershell
npm run test:python
npm run test:frontend
npm run typecheck
npm run build
npm run verify
```

## Recommended Next Work

The next useful development sequence is:

1. Harden the current editor path with more paste, selection, formatting, autosave, and long-session tests
2. Improve persistence semantics for nullable fields so users can explicitly clear optional values
3. Add broader workflow QA around project switching, dirty editor state, missing project files, startup recovery, and tab restore
4. Decide whether to continue hardening the custom editor or migrate deliberately to TipTap
5. Add cover image/media support with portable project-file rules
6. Deepen relationship visualization beyond the current lightweight network preview
7. Deepen timeline visualization beyond the current narrative canvas
8. Define export bundle boundaries for future Spaci integration

## Continuation Brief

For a handoff document that can be pasted into another ChatGPT/Codex thread, see `CONTINUATION_BRIEF.md`.

