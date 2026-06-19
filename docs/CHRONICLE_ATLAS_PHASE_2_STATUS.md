# Chronicle + Atlas Phase 2 Status

Date: 2026-06-19

## Summary

Chronicle + Atlas Phase 2 connects timeline events to Atlas markers without adding new Atlas tables or changing Worldie's `.worldie` project-file architecture.

Timeline events now support an optional Atlas marker link. This lets a writer attach a Chronicle event to a specific point on a map, then move between the event context and the Atlas marker when reviewing a world.

This phase keeps the relationship intentionally narrow:

- Timeline events may link to one map marker.
- Markers may show timeline events that point at them.
- Markdown export includes the linked marker title.
- No routes, shapes, regions, drawing tools, media/image storage, or timeline-marker relationship metadata were added.

## Completed Behavior

- Added optional `map_marker_id` to `timeline_events`.
- Existing `.worldie` files migrate safely through the additive nullable column.
- Python project-store create, list, update, reopen, and export flows preserve marker links.
- Sidecar timeline payloads expose `mapMarkerId`.
- Frontend timeline data/state supports marker links.
- Timeline event dirty detection includes marker-link changes.
- Timeline Event Details includes a Map Marker field scoped to Atlas markers in the active world.
- Timeline marker labels include marker title, marker type, and map name when available.
- Timeline snapshot shows the linked map marker.
- Timeline offers Open in Atlas for a linked marker.
- Atlas marker details show timeline events linked to the selected marker.
- Atlas linked event rows include date/era, track, and event type when available.
- Timeline Markdown export includes `Map marker: ...` for linked marker titles.

## Persistence Notes

Chronicle + Atlas Phase 2 uses one additive column:

```sql
map_marker_id TEXT
```

The column lives on `timeline_events` because the first relationship is event-to-marker. Atlas marker storage remains marker-only. No marker-side timeline link table or JSON array was added in this phase.

Project data remains in `.worldie` SQLite files. Browser/local storage remains limited to UI/session state.

## UI Notes

The Timeline Map Marker selector uses markers from the active world, including markers on maps other than the currently selected Atlas map.

Open in Atlas uses existing workspace navigation and Atlas selection behavior. It selects the marker's map and marker, then opens the Atlas workspace.

Open in Chronicle from Atlas marker details was not added in this checkpoint. Existing workspace navigation does not currently return a clean guarded success/failure signal, so adding a reverse deep-link action could silently change hidden Timeline selection if navigation were cancelled by a dirty-state guard. A later navigation helper can make this safe.

## Export Behavior

Timeline event Markdown includes the linked marker title when present:

```md
Map marker: Arrival Dock
```

Exports do not create relationship metadata or change wiki-link syntax.

## Verification

Recent verification for Phase 2:

- `npm run test:frontend` passed.
- `npm run test:python` passed.
- `npm run typecheck` passed.
- `npm run build` hit the known managed-shell Vite access issue.
- Direct Vite build passed with:

```powershell
& 'C:\Program Files\nodejs\node.exe' '.\node_modules\vite\bin\vite.js' build
```

Phase 2 status-check polish verification:

- `npm run test:frontend`
- `npm run typecheck`
- Direct Vite build

## Current Limitations

- Timeline events link to one marker, not multiple markers.
- Atlas markers do not store reverse timeline references.
- There is no Open in Chronicle reverse action yet.
- There is no route, shape, region, drawing, or media support.
- There is no timeline event link from markers to routes or regions because those Atlas entities do not exist yet.
- There is no cross-world marker linking.

## Recommended Next Steps

Keep the next Chronicle + Atlas step small:

1. Add a clean guarded navigation result helper if reverse Open in Chronicle is needed.
2. Add optional marker-link filtering in Timeline if linked marker usage grows.
3. Consider marker groups/layers only after marker-event linking feels stable.
4. Defer routes, shapes, regions, and media until the marker-only map workflow is reliable.
