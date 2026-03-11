# Changelog

## Current Build

Worldie is now a working offline desktop MVP centered on portable `.worldie` project files. The app has moved well beyond the original static shell and now includes real project-file flows, project-scoped persistence, and usable writing/worldbuilding workflows.

### Added

- `.worldie` project file creation, open, and save-as flows
- Recent project tracking and current project file awareness
- Project CRUD
- World CRUD
- Document CRUD
- Lore item CRUD
- Lore template CRUD
- Lore type CRUD with user-defined categories
- Relationship CRUD
- Timeline event CRUD
- Workbench dashboard view
- Dynamic tab bar with tab persistence
- Sidebar-based navigation across worlds and page types
- Resizable and collapsible project, document, and context panels
- Search and quick-open across current-world documents and lore
- Demo project generator with seeded content
- First-run seed content for empty worlds
- Wiki-style lore link insertion with `[[...]]`
- Linked lore detection
- Clickable lore-link preview in the editor
- Context panel models for documents, lore, relationships, and timeline items
- Document folder organization
- Start screen for opening or creating projects
- Project menu with recent-project access
- Lightweight dirty-state guard for project switching

### Changed

- Refactored the app away from a single large `App.tsx`
- Extracted view components:
  - `TabBar`
  - `WorkbenchView`
  - `LauncherView`
  - `EditorView`
  - `LoreView`
  - `LoreCreateView`
  - `TemplatesView`
  - `LoreTypesView`
  - `RelationshipsView`
  - `TimelineView`
  - `ContextPanel`
  - `Sidebar`
  - `ActivityBar`
  - `MainContent`
  - `StartScreen`
- Extracted controller and domain hooks:
  - `useAppController`
  - `useTabs`
  - `usePanelLayout`
  - `useProjectWorlds`
  - `useContentManager`
  - `useWorldStructures`
  - `useWorkspaceNavigation`
  - `useSearch`
  - `useLoreTypes`
  - `useLoreTemplates`
  - `useAppFeedback`
  - `useContextPanelModel`
  - `useStatusBarModel`
- Shifted the app from static tabs to real open-page tabs
- Reworked lore architecture around separate lore types, templates, and lore items
- Moved core persistence into project-backed `.worldie` SQLite files
- Finalized the persistence boundary so project entities persist through `.worldie` files while UI/session state stays local to the app
- Upgraded the document editor from textarea-only editing to a custom contenteditable editing surface
- Upgraded relationship and timeline screens from plain form/list views into richer workspace views
- Added explicit save-state feedback across editor and workspace flows: dirty, saving, saved, and failed
- Added browser unload guarding for unsaved work

### Project File Architecture

- Projects are now opened as portable `.worldie` files
- Project metadata is stored inside each project file
- Lore types and lore templates persist inside the project database
- Recent project state is tracked separately from project content
- Switching projects resets app context more cleanly than earlier builds
- Active project entity CRUD no longer silently falls back to browser entity storage

### Lore System

- Lore templates are now managed separately from lore item editing
- Lore items use a unified `Traits` section instead of mixed field groups
- User-defined lore types replace the old generic `Custom` bucket
- Lore creation now selects a real lore type and an associated template

### Relationship And Timeline UX

- Relationship workspace now includes:
  - summary cards
  - lightweight node/edge network preview
  - connection pattern breakdown
  - key connected page list
  - dedicated relationship composer
- Timeline workspace now includes:
  - summary cards
  - visual timeline canvas
  - chronological outline
  - event type breakdown
  - linked lore visibility

### Seeded Demo Content

The demo project currently includes:

- Demo Project - Emberfall
- Worlds:
  - Emberfall
  - Glass Coast
- Documents:
  - Chapter 01 - Arrival at Red Harbor
  - Scene Notes - Harbor Tension
- Lore:
  - Mara Quill
  - Red Harbor
  - Ashwake Company
  - The Cinder Hound
  - Brass Compass
  - Ashfall Oath
  - Blacktide Mutiny
- Relationships and timeline events tied to those entries

### Current Limitations

- The editor is not TipTap yet
- Relationship visualization is still lightweight, not a full graph editor
- Timeline visualization is still a narrative workspace, not a full multi-track timeline system
- Cover image/media support is not implemented yet
- The editor still needs broader reliability testing under real use
- Export/publishing flows are not implemented yet

### Next Planned Work

1. Harden the editor path and long-term rich-text model further
2. Deepen relationship visualization beyond the current lightweight network view
3. Deepen timeline visualization beyond the current narrative canvas
4. Add cover image/media support
5. Strengthen export and publishing boundaries for Spaci
6. Add broader verification coverage beyond typecheck/build smoke
