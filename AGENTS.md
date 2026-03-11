# Worldie - Codex Project Context

## Project Overview

Worldie is an offline-first desktop application for building fictional worlds.
It is designed for writers, dungeon masters, and game designers who need a structured tool to organize lore, characters, timelines, and story documents.

The application prioritizes:

- Offline functionality
- Fast local performance
- Structured world-building tools
- Simple, distraction-free writing

Worldie is part of a larger ecosystem. The desktop tool is used for creation, while a future web platform called Spaci will allow publishing and sharing worlds.

---

## Current Build Status

The current build is a working offline desktop MVP with real `.worldie` project files, project-scoped persistence, and active writing/worldbuilding workflows.

Implemented now:

- `.worldie` project file creation, open, and save-as flows
- Recent projects and current project file awareness
- Project CRUD
- World CRUD
- Document CRUD
- Lore item CRUD
- Lore template CRUD
- Lore type CRUD with user-defined lore categories
- Relationship CRUD
- Timeline event CRUD
- Workbench tab
- Dynamic tab bar with persistence
- Sidebar navigation with active-state handling
- Resizable and collapsible panels
- Search and quick-open across current-world documents and lore
- Demo project generator with seeded content
- Wiki-style lore link insertion with `[[...]]`
- Linked lore detection and clickable preview links
- Document folder organization
- Project-backed SQLite persistence for core world data, lore types, and templates
- Explicit save-state feedback for editor/workspace flows
- Clear persistence boundary: project data in `.worldie`, UI/session state local to the app

Current technical reality:

- The app runs as a React + Tauri desktop application
- A Python sidecar handles project-file and persistence operations
- `.worldie` files are SQLite-backed project containers
- The writing editor uses a custom contenteditable path today, not TipTap yet
- Project entity persistence is sidecar/project-file backed; local storage is reserved for UI/session state
- Relationship and timeline views are richer workspace views, but not final graph/timeline systems

---

## Core Concepts

Worldie uses a three-level hierarchy:

Project -> World -> Content

Example:

Project: Iron Age Chronicles
World: Duskfen
Content: Characters, Lore Pages, Documents, Timeline Events

Current storage model:

Each Project is stored as a single portable `.worldie` file.

---

## Core Systems

Worldie is organized around five major systems.

### 1. Workbench

The Workbench is the home screen for a project.

Current state:

- Real tab/view exists
- Shows project/world summary information
- Shows recent pages and basic stats
- Acts as a launch point for deeper editing flows

Target state:

- Better dashboard polish
- Stronger project insights
- Faster creation and navigation shortcuts

### 2. Lore Pages

Structured world-building entries.

Current state:

- Lore items are created from templates
- Lore types are first-class entities and can be user-defined
- Lore item editing is separated from template editing
- Pages support title, tags, traits, and long-form lore details
- Wiki-style links connect lore with documents and other content

Still missing:

- cover image support
- stronger media handling
- more advanced layout and presentation options

### 3. Writing Editor

Current state:

- Custom contenteditable editor path
- Document save/update flow works
- `[[Lore Links]]` can be inserted
- Linked lore is detected
- Preview renders clickable lore links
- Document folder organization exists

Still missing:

- TipTap integration
- richer block behavior
- deeper keyboard shortcut support
- broader reliability testing under real writing use

### 4. Relationships

Current state:

- Real world-scoped relationship records
- Create/edit/delete works
- Relationship workspace includes connection summaries
- Lightweight node/edge network preview exists
- Connection pattern and key page views are available

Still missing:

- full graph visualization
- drag-and-arrange node editing
- richer relationship typing/presets

### 5. Timeline

Current state:

- Real world-scoped timeline event records
- Create/edit/delete works
- Timeline workspace includes summary cards
- Visual timeline canvas and chronological outline exist
- Linked lore pages are surfaced in the timeline workspace

Still missing:

- multiple timelines per world
- richer filtering
- advanced chronological scaling and track views

---

## Data Model

Current model:

Project data lives locally in SQLite-backed `.worldie` files.

Current tables/entities include:

- `projects`
- `worlds`
- `lore_pages`
- `documents`
- `relationships`
- `timeline_events`
- `lore_types`
- `lore_templates`

Key notes:

- Each `.worldie` file is a portable SQLite database
- Data must remain portable
- Content should be stored in JSON where useful
- Use UUIDs for all major entities

---

## Tech Stack

Desktop Shell

- Tauri

Frontend

- React
- Tailwind CSS

Backend

- Python sidecar for file operations and persistence/export support

Database

- SQLite

Rich Text Editor

- Current: custom contenteditable editor
- Target: TipTap

Graph Visualization

- Current: lightweight in-app relationship network preview
- Target: React Flow

Timeline

- Current: custom timeline canvas and chronological outline
- Target: richer timeline visualization

Exports

- WeasyPrint (PDF)
- python-docx (DOCX)

---

## Development Priorities

When implementing features, prioritize:

1. Simplicity
2. Offline capability
3. Performance
4. Data portability

Avoid unnecessary complexity.

---

## MVP Scope

The practical MVP now includes:

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

Still acceptable as later-stage work:

- full graph relationship map
- polished multi-track timeline visualization
- export pipeline
- Spaci integration

---

## Coding Guidelines

General rules for development:

- Keep modules small and readable
- Prefer explicit data models
- Avoid tight coupling between systems
- Ensure every feature works offline
- Maintain portable file formats
- Refactor when it makes feature work safer or clearer

---

## Near-Term Roadmap

Next sensible moves, in order:

1. Harden the current editor path and long-term editing model
2. Strengthen project switching and dirty-state behavior further
3. Deepen relationship visualization beyond the current lightweight node/edge workspace
4. Deepen timeline visualization beyond the current narrative canvas
5. Add cover image/media support
6. Strengthen export and publishing boundaries for Spaci integration

---

## Future Integration

Worldie will later export worlds to a web platform called Spaci.

To support this:

- Use UUIDs for entities
- Store editor content as JSON
- Design export bundles early

Export flow:

Worldie -> Export Bundle -> Spaci Import

Spaci will not sync back to Worldie in the MVP.

---

## Target Users

Primary users:

- fantasy writers
- science fiction authors
- dungeon masters
- indie narrative game developers

The product is not intended for enterprise collaboration tools.

---

## Philosophy

Worldie should feel like:

"Obsidian and Scrivener built specifically for fantasy world-building."

Focus on speed, simplicity, and creative flow.
