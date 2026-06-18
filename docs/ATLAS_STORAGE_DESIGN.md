# Atlas Storage Design

Date: 2026-06-18

## Purpose

Atlas is the planned map workspace for Worldie. It should let writers place lore on a simple world canvas and eventually connect places, routes, regions, and timeline events.

This note defines the storage direction before implementation. It is design-only: no Atlas tables or app code are added by this document.

## Principles

- Atlas must preserve Worldie's offline-first design.
- Atlas project data belongs in the `.worldie` SQLite project file.
- Browser/local storage may only hold UI/session state, such as selected marker or zoom level.
- The first Atlas slice should be marker-only.
- Atlas should link to lore pages first.
- Atlas should link to timeline events second, after marker CRUD is stable.
- Atlas should start with blank/grid maps, not media/image storage.
- Atlas should not include drawing tools in the first slice.
- Atlas should avoid becoming a full GIS, terrain painter, tilemap editor, Inkarnate, or Wonderdraft.

## MVP Data Model

### `maps`

Stores one map board inside a world.

```sql
CREATE TABLE maps (
  id TEXT PRIMARY KEY,
  world_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  background_type TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

Initial `background_type` values should be limited to:

- `blank`
- `grid`

Do not add image backgrounds in the first Atlas slice. A later media-storage design should decide whether images are embedded in `.worldie`, copied into an asset bundle, or referenced externally.

### `map_layers`

Layers are useful, but should be optional after marker basics work. If included early, keep them simple and non-visual beyond visibility/order.

```sql
CREATE TABLE map_layers (
  id TEXT PRIMARY KEY,
  world_id TEXT NOT NULL,
  map_id TEXT NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  is_visible INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

Recommendation: defer `map_layers` unless the first marker UI needs a default layer for future compatibility. A marker-only first slice can use nullable `layer_id` later, or add layers in a follow-up migration.

### `map_markers`

Markers are the first real Atlas entity.

```sql
CREATE TABLE map_markers (
  id TEXT PRIMARY KEY,
  world_id TEXT NOT NULL,
  map_id TEXT NOT NULL,
  layer_id TEXT,
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

First-slice marker behavior:

- Create marker on a map.
- Store marker coordinates as map-local `x`/`y`.
- Edit title and description.
- Link marker to one or more lore pages by lore page ID.
- Move marker and persist coordinates.
- Delete marker without deleting linked lore.

`linked_timeline_event_ids_json` can be nullable or absent until the Chronicle integration slice. If the column is included early, the UI should not expose timeline linking until marker/lore linking is stable.

## Future Optional Tables

### `map_routes`

Routes should wait until map/marker CRUD is stable.

```sql
CREATE TABLE map_routes (
  id TEXT PRIMARY KEY,
  world_id TEXT NOT NULL,
  map_id TEXT NOT NULL,
  layer_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  points_json TEXT NOT NULL,
  linked_lore_ids_json TEXT,
  linked_timeline_event_ids_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### `map_shapes`

Shapes can cover regions, borders, zones, and labels later. They should not be part of the first Atlas slice.

```sql
CREATE TABLE map_shapes (
  id TEXT PRIMARY KEY,
  world_id TEXT NOT NULL,
  map_id TEXT NOT NULL,
  layer_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  shape_type TEXT NOT NULL,
  points_json TEXT NOT NULL,
  style_json TEXT,
  linked_lore_ids_json TEXT,
  linked_timeline_event_ids_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

## First Implementation Slice

Recommended first Atlas implementation:

1. Add `maps` and `map_markers` only.
2. Add Python persistence tests before wiring frontend UI.
3. Add sidecar operations for map and marker CRUD.
4. Add a small Atlas workspace with a blank/grid canvas.
5. Support marker create, select, move, edit, delete.
6. Link markers to lore pages by ID.
7. Save/reopen and verify markers persist in the `.worldie` file.

Do not include:

- Routes.
- Regions/shapes.
- Background image upload.
- Media storage.
- Drawing tools.
- Timeline-event linking UI.
- Relationship metadata.
- Project-wide graph behavior.

## Linking Priority

### Phase 1: Lore Links

Markers should link to lore pages first. This fits Worldie's current strongest data model and lets a map marker represent a known place, character, faction base, artifact location, or landmark.

Store linked lore IDs as JSON:

```json
["lore-id-1", "lore-id-2"]
```

The UI should show linked lore titles by resolving IDs from existing lore pages. Renaming a lore page should not break marker links.

### Phase 2: Timeline Links

Timeline event links should come after marker CRUD and lore linking are stable. The first Chronicle + Atlas integration can let a marker show related events and an event show related markers.

Do not add this UI in the marker-only Atlas slice unless it is already backed by tests and does not complicate marker CRUD.

## Open Questions

- Should first-slice maps have fixed dimensions or user-selected dimensions?
- Should there be exactly one default map per world, or should users create maps manually?
- Should layers be deferred entirely or added as a hidden default layer for future compatibility?
- Should marker positions use raw pixels, normalized percentages, or both?
- Should linked lore IDs use JSON fields first or join tables from the beginning?
- How should map export work later, especially if image/media backgrounds are added?

## Recommended Tests Before Implementation

Backend:

- Create map in `.worldie`.
- Reopen project and confirm map persists.
- Create marker in map.
- Update marker title, description, coordinates, type, and linked lore IDs.
- Delete marker without deleting linked lore.
- Delete map and deliberately handle child markers.
- Confirm no Atlas data is stored in browser/local storage.

Frontend:

- Build default blank/grid map model.
- Convert click coordinates to map-local marker coordinates.
- Select marker and show detail panel.
- Move marker and produce update payload.
- Edit marker linked lore IDs without dropping other marker fields.
- Render empty map state safely.

