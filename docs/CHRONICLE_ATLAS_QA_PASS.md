# Chronicle + Atlas QA Pass

Date: 2026-06-19

## Scope

Focused stabilization pass for the connected Chronicle + Atlas workflow after:

- Chronicle timeline tracks.
- Atlas maps and markers.
- Atlas marker dirty-state protection.
- Atlas Markdown export.
- Timeline-event-to-Atlas-marker links.
- Guarded navigation result handling for safe deep links.

This pass did not add routes, shapes, regions, drawing tools, media/image storage, new storage tables, or new `.worldie` storage architecture.

## Environment

- Workspace: `C:\Users\admin\Documents\python_work\New folder\Worldie`
- App stack: React + Tauri frontend, Python sidecar, SQLite-backed `.worldie` project files.
- Verification style: focused automated frontend/backend/type/build verification plus review of existing coverage for the requested flows.
- Desktop click-through QA was not run in this managed shell.

## Flow Coverage

### Atlas Map CRUD

Status: Pass via Python persistence coverage.

Covered behavior:

- Create map.
- Update/rename map.
- Delete map.
- Reopen `.worldie` and confirm map persistence.
- Delete map removes associated markers.

Relevant coverage:

- `test_atlas_map_and_marker_crud_persists_in_project_file`
- `test_deleting_map_removes_its_markers`

### Atlas Marker CRUD and Organization

Status: Pass via Python persistence and frontend helper coverage.

Covered behavior:

- Create marker.
- Edit marker title/type/notes/lore link.
- Move marker coordinates.
- Delete marker.
- Reopen `.worldie` and confirm marker persistence.
- Filter/search markers by type, linked/unlinked state, title, and notes.

Relevant coverage:

- `test_atlas_map_and_marker_crud_persists_in_project_file`
- `atlas marker draft helpers preserve lore links and normalize empty values`
- `atlas marker filtering supports type linked unlinked and search`

### Marker Lore Linking

Status: Pass via Python persistence and frontend helper coverage.

Covered behavior:

- Marker stores optional linked lore page ID.
- Linked lore is preserved across reopen.
- Atlas marker draft normalization preserves empty/no-lore state.

Relevant coverage:

- `test_atlas_map_and_marker_crud_persists_in_project_file`
- `atlas marker dirty detection watches title type notes and lore links`

### Marker Dirty-State Guard

Status: Pass via frontend helper coverage.

Covered behavior:

- Marker draft edits become dirty for title, type, notes, and lore page link changes.
- Save-state helper keeps dirty/error/saving states visible.
- Existing Atlas state uses dirty guard before switching maps/markers or deleting selected marker/map.

Relevant coverage:

- `atlas marker dirty detection watches title type notes and lore links`
- `atlas marker save state keeps dirty and error states visible`

### Marker Save Failure Behavior

Status: Pass at helper/state level; direct backend failure injection not run in this pass.

Covered behavior:

- Save-state helper keeps failed marker saves visible.
- Atlas state preserves dirty/error state on failed marker draft save.

Deferred manual QA:

- Force sidecar marker update failure in the running desktop app and confirm the marker form keeps unsaved values plus retry feedback.

### Chronicle Track Editing

Status: Pass via Python persistence/export and frontend dirty-state coverage.

Covered behavior:

- Timeline event track field persists.
- Track updates survive reopen.
- Track edits count as unsaved timeline draft changes.
- Timeline Markdown export includes track text.

Relevant coverage:

- `test_timeline_event_track_persists_and_updates`
- `hasUnsavedTimelineChanges detects edits against the active event`
- `test_export_world_markdown_writes_relationships_and_timeline`

### Timeline Event Marker Linking

Status: Pass via Python persistence/export and frontend dirty-state coverage.

Covered behavior:

- Timeline event stores optional `map_marker_id`.
- Marker link persists through create/update/reopen.
- Marker link can be cleared with nullable update behavior.
- Marker link edits count as dirty timeline draft changes.
- Timeline Markdown export includes linked marker title.

Relevant coverage:

- `test_timeline_event_map_marker_link_persists_and_updates`
- `test_project_entity_updates_can_clear_optional_fields`
- `test_sidecar_nullable_updates_preserve_explicit_nulls`
- `hasUnsavedTimelineChanges detects edits against the active event`
- `test_export_world_markdown_writes_relationships_and_timeline`

### Timeline Open in Atlas

Status: Pass by implementation review and frontend navigation-result coverage.

Covered behavior:

- Timeline linked marker action uses the existing Atlas selection/open path.
- Atlas `focusMarker` selects the marker's map and marker.
- Existing workspace navigation guards remain in place.

Manual QA still recommended:

- In desktop app, open a timeline event linked to a marker, click Open in Atlas, confirm Atlas opens with the marker selected.

### Atlas Open in Chronicle

Status: Pass by implementation review and guarded navigation-result coverage.

Covered behavior:

- Atlas marker details show timeline events linked to selected marker.
- Open in Chronicle asks the guarded Timeline navigation to open first.
- Timeline event selection only runs after a successful navigation result.

Relevant coverage:

- `successful guarded navigation returns success`
- `cancelled dirty-state navigation returns cancelled`
- `callers do not run follow-up selection when navigation is blocked`
- `callers may run follow-up selection after successful navigation`

### Cancelled Dirty Navigation Does Not Change Hidden Selection

Status: Pass via frontend navigation-result helper coverage.

Covered behavior:

- Guard cancellation returns `cancelled`.
- Guard failure returns `failed`.
- Project/context mismatch can be represented as `blocked`.
- Follow-up selection actions are gated behind successful navigation only.

Relevant coverage:

- `cancelled dirty-state navigation returns cancelled`
- `failed dirty-state guard returns failed`
- `callers do not run follow-up selection when navigation is blocked`

### Active-World Markdown Export

Status: Pass via Python export coverage.

Covered behavior:

- Active-world Markdown export includes timeline events.
- Timeline event Markdown includes `Track: ...`.
- Timeline event Markdown includes `Map marker: ...` when linked.
- Active-world export includes Atlas maps and markers for the selected world.

Relevant coverage:

- `test_export_world_markdown_writes_relationships_and_timeline`
- `test_export_world_markdown_writes_atlas_maps_and_markers`

### Full-Project Markdown Export

Status: Pass via Python export coverage.

Covered behavior:

- Full-project Markdown export includes per-world Atlas folders.
- Project index includes Atlas map and marker counts.
- Exported maps are scoped to their worlds.

Relevant coverage:

- `test_export_project_markdown_writes_world_folders_and_atlas_content`

### Reopen `.worldie` Persistence

Status: Pass via Python persistence coverage.

Covered behavior:

- Maps persist.
- Markers persist.
- Marker lore links persist.
- Timeline marker links persist.
- Timeline tracks persist.

Relevant coverage:

- `test_atlas_map_and_marker_crud_persists_in_project_file`
- `test_timeline_event_track_persists_and_updates`
- `test_timeline_event_map_marker_link_persists_and_updates`

## Bugs Found

None during this pass.

## Bugs Fixed

None. This was a QA/documentation pass over the current implementation.

## Deferred Issues

- Full desktop click-through QA for Timeline Open in Atlas and Atlas Open in Chronicle.
- Forced sidecar save failure for Atlas marker draft save in the running desktop app.
- Reverse deep-link behavior could eventually use component-level tests if a UI test harness is added.

## Verification Commands

Run during this pass:

- `npm run test:frontend` - Pass, 253 frontend tests.
- `npm run test:python` - Pass, 60 Python tests.
- `npm run typecheck` - Pass.
- Direct Vite build:

```powershell
& 'C:\Program Files\nodejs\node.exe' '.\node_modules\vite\bin\vite.js' build
```

- Direct Vite build result: Pass when run outside the managed-shell sandbox. The first sandboxed attempt hit the known Vite/esbuild access issue.
- `git diff --check` - Pass.

## Recommendation

The connected Chronicle + Atlas workflow is ready for a longer real writing session, with the caveat that desktop click-through QA should still be run for the two cross-workspace buttons and marker save-failure retry behavior.
