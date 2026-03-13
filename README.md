# Worldie

Offline-first desktop app for building fictional worlds.

## Current Status

Worldie is now a working desktop MVP with real `.worldie` project files, project-scoped persistence, and active writing/worldbuilding workflows. The app is no longer a static scaffold or browser-only mockup.

Current implemented features:

- `.worldie` project file creation, opening, and save-as flows
- Recent projects and current project file awareness
- Project CRUD
- World CRUD
- Document CRUD
- Lore item CRUD
- Lore template CRUD
- Lore type CRUD with user-defined categories
- Relationship CRUD
- Timeline event CRUD
- Dynamic tab bar with persisted tabs
- Workbench dashboard view
- Sidebar-driven workspace navigation
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
- Richer relationship and timeline workspace views with filters, focus panels, and linked-page actions
- Project-scoped tab persistence and cross-world tab restore behavior
- Clear persistence boundary: project data in `.worldie`, UI/session state local to the app

## Current Limitations

The app is still in MVP transition, not final production shape.

Known gaps:

- The editor uses a custom contenteditable path, not TipTap yet
- Relationship view is a richer workspace now, but not a full interactive graph editor
- Timeline view is a richer workspace now, but not a full multi-track timeline system
- Cover image and broader media support are still missing
- The editor still needs broader long-session reliability testing
- Export and publishing flows are still not implemented
- Automated QA coverage is still light beyond typecheck/build verification

## MVP Scope

Current MVP direction:

- Project file management
- World management
- Basic writing editor
- Lore item CRUD
- Lore template CRUD
- Lore type management
- Relationship CRUD
- Timeline CRUD
- Local SQLite-backed persistence
- Sidebar navigation
- Workbench
- Search and quick-open

## Architecture Direction

Target product direction:

- Tauri desktop shell
- React frontend
- Python sidecar for file and export operations
- SQLite-backed portable `.worldie` files

Current reality:

- React app with Tauri-oriented structure
- Python sidecar handling project-file and persistence operations
- Portable per-project `.worldie` SQLite files as the main storage boundary
- Project data persists through `.worldie` files, while UI/session state stays local to the app
- The editor, relationship workspace, and timeline workspace are currently custom in-app implementations

## Run

After installing dependencies:

1. `npm install`
2. `npm run dev`
3. `npm run tauri dev`

Quick verification:

1. `npm run verify`

## Data Model

The current data model centers on these entities:

- `projects`
- `worlds`
- `lore_pages`
- `documents`
- `relationships`
- `timeline_events`
- `lore_types`
- `lore_templates`

Notes:

- IDs remain UUID-based
- Rich content stays JSON-friendly where needed
- Each project is intended to live in a single portable `.worldie` SQLite database

## Where The Build Is Going

Near-term roadmap:

1. Harden the current editor path and long-term editing model
2. Add broader QA coverage around startup, switching, and workspace flows
3. Improve relationship visualization beyond the current network workspace
4. Improve timeline visualization beyond the current narrative timeline workspace
5. Add cover image and broader media support
6. Strengthen export and publishing boundaries for future Spaci integration

Longer-term direction:

- Graph-based relationship map
- Richer timeline visualization
- Export bundles for Spaci
- Better publishing and export pipeline

## Philosophy

Worldie should feel like:

"Obsidian and Scrivener built specifically for fantasy world-building."
