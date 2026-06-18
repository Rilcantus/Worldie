# Worldie Chronicle + Atlas Roadmap

## Purpose

This roadmap adds two identity-defining workspaces to Worldie:

- **Chronicle**: a deeper timeline editor for eras, events, tracks, and story history.
- **Atlas**: a small map maker for placing lore, locations, routes, regions, and events on a visual world canvas.

The goal is not to turn Worldie into a full art tool. The goal is to make Worldie feel like a connected offline worldbuilding studio where writing, lore, relationships, timeline events, and maps all reinforce each other.

## Product Vision

Worldie should become:

> An offline-first worldbuilding studio where writers, dungeon masters, and narrative game designers can write stories, build lore, connect relationships, track history, and place their world on maps inside one portable `.worldie` project file.

The core pillars become:

1. **Write** - documents, chapters, notes, scenes.
2. **Codex** - lore pages, custom fields, lore types, templates, and tables.
3. **Threads** - relationships, networks, factions, and connection previews.
4. **Chronicle** - timelines, eras, tracks, historical events, and story arcs.
5. **Atlas** - maps, markers, routes, regions, location pins, and event placement.

## Naming Recommendation

Use branded workspace names in the UI later, but keep code names simple.

| User-facing name | Code/workspace concept | Purpose |
|---|---|---|
| Write | documents/editor | Story and notes |
| Codex | lore | Lore database |
| Threads | relationships | Connections and relationship graph |
| Chronicle | timeline | Timeline editor |
| Atlas | maps | Small map maker |
| Workbench | dashboard | Project overview |

## Guiding Principles

- Preserve offline-first behavior.
- Store project data in the `.worldie` SQLite file.
- Do not depend on cloud sync or web services.
- Keep browser/local storage limited to UI/session state.
- Start with simple linked data before complex visuals.
- Prefer marker-based mapping before freeform drawing.
- Avoid becoming Inkarnate, Wonderdraft, or a full GIS tool.
- Build features in small, testable slices.

## Chronicle: Timeline Editor Direction

Worldie already has timeline event CRUD and a timeline workspace. Chronicle should deepen that into a writer-friendly timeline system.

### Chronicle MVP Goals

- Create, edit, delete timeline events.
- Group events by era.
- Assign events to tracks/lanes.
- Link events to lore pages and documents.
- Filter events by era, type, track, linked lore, and search text.
- Display events in multiple views.

### Timeline Event Fields

Recommended event shape:

```ts
type TimelineEvent = {
  id: string
  worldId: string
  title: string
  description?: string
  dateLabel?: string
  sortKey?: number
  eraId?: string
  trackId?: string
  type?: string
  importance?: 'minor' | 'normal' | 'major' | 'world_shaking'
  linkedLoreIds?: string[]
  linkedDocumentIds?: string[]
  linkedMapMarkerIds?: string[]
  createdAt: string
  updatedAt: string
}
```

### Era Fields

```ts
type TimelineEra = {
  id: string
  worldId: string
  name: string
  description?: string
  sortOrder: number
  startLabel?: string
  endLabel?: string
  color?: string
  createdAt: string
  updatedAt: string
}
```

### Track Fields

```ts
type TimelineTrack = {
  id: string
  worldId: string
  name: string
  description?: string
  sortOrder: number
  color?: string
  createdAt: string
  updatedAt: string
}
```

Example tracks:

- Main History
- Character Arcs
- Wars
- Kingdom Politics
- Religion
- Magic/Technology
- Story Plot
- Secret History

### Chronicle Views

Start with four views:

1. **Chronological Outline**
   - Simple sorted event list.
   - Best for writing and reviewing.

2. **Era View**
   - Events grouped under eras.
   - Best for world history.

3. **Track View**
   - Events grouped by track/lane.
   - Best for character arcs and faction histories.

4. **Event Detail Panel**
   - Edit title, date label, era, track, type, description, links.
   - Show linked lore, docs, relationships, and map markers.

### Chronicle First Slice

The safest first implementation slice:

1. Add `eraId`, `trackId`, `importance`, `linkedDocumentIds`, and `linkedMapMarkerIds` support to timeline event JSON/persistence if not already present.
2. Add local frontend model helpers for grouping events by era and track.
3. Add a simple track selector to the timeline event editor.
4. Add grouped Track View.
5. Add tests for grouping, filtering, and persistence.

## Atlas: Small Map Maker Direction

Atlas should begin as a simple marker-based map board. The first version does not need terrain painting, tile editing, image brushes, or complex drawing.

### Atlas MVP Goals

- Create one or more maps per world.
- Add map markers/pins.
- Move markers on a canvas.
- Link markers to lore pages.
- Link markers to timeline events.
- Add simple routes between markers.
- Add simple region labels/shapes later.
- Filter markers by lore type, tag, or era/event links.

### Map Fields

```ts
type WorldMap = {
  id: string
  worldId: string
  name: string
  description?: string
  width: number
  height: number
  backgroundType: 'blank' | 'grid' | 'image'
  backgroundAssetId?: string
  createdAt: string
  updatedAt: string
}
```

### Marker Fields

```ts
type MapMarker = {
  id: string
  worldId: string
  mapId: string
  title: string
  description?: string
  x: number
  y: number
  markerType?: 'location' | 'city' | 'dungeon' | 'landmark' | 'battle' | 'resource' | 'custom'
  linkedLoreIds?: string[]
  linkedTimelineEventIds?: string[]
  createdAt: string
  updatedAt: string
}
```

### Route Fields

```ts
type MapRoute = {
  id: string
  worldId: string
  mapId: string
  title: string
  description?: string
  points: Array<{ x: number; y: number }>
  linkedLoreIds?: string[]
  linkedTimelineEventIds?: string[]
  createdAt: string
  updatedAt: string
}
```

### Region Fields

Regions can wait until after markers and routes.

```ts
type MapRegion = {
  id: string
  worldId: string
  mapId: string
  title: string
  description?: string
  points: Array<{ x: number; y: number }>
  linkedLoreIds?: string[]
  linkedTimelineEventIds?: string[]
  createdAt: string
  updatedAt: string
}
```

### Atlas First Slice

The safest first implementation slice:

1. Add map persistence tables for maps and markers only.
2. Add a simple `MapsView`/`AtlasView` route in the sidebar.
3. Add a blank canvas with fixed dimensions.
4. Add marker creation by clicking the canvas.
5. Allow selecting and moving markers.
6. Add marker detail panel with title, description, and linked lore IDs.
7. Add tests for map/marker CRUD and persistence.

Do not add routes, regions, background images, or era filtering until marker CRUD is stable.

## Chronicle + Atlas Integration

The long-term differentiator is connecting timeline events to places.

### Integration Examples

A timeline event can link to a map marker:

- Event: The Fall of Eastmere
- Era: Third Age
- Track: Wars
- Map marker: Eastmere Capital
- Linked lore: King Vaelor, Hollow Banner, Eastmere

A map marker can show related events:

- Marker: Eastmere Capital
- Related events:
  - Founding of Eastmere
  - Siege of Eastmere
  - Fall of Eastmere
  - Refugees Leave North

### First Integration Slice

After Atlas markers exist:

1. Add `linkedMapMarkerIds` to timeline events.
2. Add `linkedTimelineEventIds` to map markers.
3. Show linked events inside marker detail panel.
4. Show linked markers inside event detail panel.
5. Add “Open in Atlas” action from timeline event.
6. Add “View in Chronicle” action from map marker.

## Database/Persistence Direction

Recommended tables:

```sql
CREATE TABLE maps (
  id TEXT PRIMARY KEY,
  world_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  background_type TEXT NOT NULL,
  background_asset_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE map_markers (
  id TEXT PRIMARY KEY,
  world_id TEXT NOT NULL,
  map_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  x REAL NOT NULL,
  y REAL NOT NULL,
  marker_type TEXT,
  linked_lore_ids_json TEXT,
  linked_timeline_event_ids_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

Routes and regions can be added later:

```sql
CREATE TABLE map_routes (...);
CREATE TABLE map_regions (...);
```

Keep JSON link fields simple for the first slice. A full join-table graph can come later if needed.

## Frontend Component Direction

Suggested components:

```text
src/components/AtlasView.tsx
src/components/AtlasCanvas.tsx
src/components/AtlasMarkerPanel.tsx
src/components/AtlasToolbar.tsx
src/lib/maps.ts
src/hooks/useMaps.ts
```

Chronicle enhancements can stay in or near:

```text
src/components/TimelineView.tsx
src/lib/timeline.ts
src/hooks/useWorldStructures.ts
```

## Testing Plan

### Backend Tests

- Creates map in `.worldie` project file.
- Reopens project and map persists.
- Creates marker inside map.
- Updates marker position.
- Updates marker linked lore IDs.
- Deletes marker without deleting linked lore.
- Deletes map and removes or handles child markers deliberately.
- Blocks map creation without active world/project.

### Frontend Tests

- Atlas model creates default blank map.
- Marker placement stores canvas coordinates.
- Marker move updates coordinates.
- Marker selection opens detail panel.
- Linked lore IDs are preserved when editing marker title/position.
- Timeline track grouping remains stable after event edits.
- Timeline linked marker IDs are preserved across event updates.

### Manual QA

- Create project, world, map, and markers.
- Reopen project and verify markers persist.
- Link marker to lore page.
- Rename linked lore page and verify marker still links by ID.
- Move marker and save/reopen.
- Add timeline event and link to marker.
- Open marker from event and event from marker.

## Phased Build Plan

### Phase 1: Chronicle Upgrade

- Add event tracks.
- Add event importance.
- Improve event editor panel.
- Add Track View.
- Add tests.

### Phase 2: Atlas Storage Design + Backend

- Add maps table.
- Add map markers table.
- Add sidecar operations.
- Add Python persistence tests.

### Phase 3: Atlas Frontend MVP

- Add Atlas workspace navigation.
- Add blank canvas.
- Add marker create/select/move/edit.
- Add lore linking.
- Add frontend tests.

### Phase 4: Chronicle + Atlas Link

- Link events to markers.
- Link markers to events.
- Add open-cross-workspace actions.
- Add integration tests.

### Phase 5: Routes, Regions, and Era Filters

- Add map routes.
- Add polygon/region labels.
- Add filters by event era/track/type.
- Add simple “show this era on map” mode.

## Non-Goals For First Slice

- No full drawing/painting tools.
- No procedural map generation.
- No cloud map sync.
- No public sharing.
- No huge media support before media storage design is settled.
- No complex GIS-style coordinate systems.
- No tilemap editor.
- No export bundle changes until Spaci export boundaries are designed.

## Suggested Codex Prompt

```text
We are adding the first Chronicle + Atlas roadmap slice to Worldie, an offline-first React + Tauri desktop app using a Python sidecar and SQLite-backed `.worldie` project files. Preserve the rule that project data belongs in `.worldie` files and browser/local storage is only for UI/session state.

Start by reading README.md, CONTINUATION_BRIEF.md, CHANGELOG.md, PROJECT_FILE_SAFETY.md, and this Chronicle + Atlas roadmap. Check git status before changing files.

First implementation target: upgrade the existing Timeline workspace toward Chronicle without building Atlas yet. Add lightweight event track support and a grouped Track View using existing timeline event patterns. Keep the change small, add focused frontend tests, and do not introduce map tables yet. If backend schema changes are needed, add Python persistence tests first.
```
