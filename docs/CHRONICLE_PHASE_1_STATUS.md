# Chronicle Phase 1 Status

Date: 2026-06-18

## Summary

Chronicle Phase 1 upgrades the existing Timeline workspace without introducing Atlas or map storage. Timeline events now have lightweight track support so a writer can group events into lanes such as Main History, Character Arcs, Wars, Kingdom Politics, Religion, Magic/Technology, Story Plot, or Secret History.

This is still the existing Timeline workspace, not a full final Chronicle system. The goal of this phase was to make timeline events more useful for story/history review while preserving the current `.worldie` project-file architecture.

## Completed Behavior

- Timeline events support a persisted `track` field.
- Track data is stored in the active `.worldie` SQLite project file.
- Track data is exposed through the Python sidecar and frontend project-store boundary.
- Timeline event create, edit, save, duplicate, and reopen flows preserve track values.
- Dirty-state detection includes track edits.
- Timeline has a Track filter.
- Timeline has a grouped Track View.
- Timeline has a focused Chronicle track panel.
- Timeline summary cards include track count.
- Timeline Markdown export includes `Track: ...` when an event has a track.
- Existing Type Tracks, Era Groups, Chronological Outline, linked lore, and timeline canvas behavior remain available.

## Persistence Notes

Chronicle Phase 1 uses a small additive column on `timeline_events`:

```sql
track TEXT
```

No new Chronicle track table exists yet. This keeps the first slice simple and lets track labels behave like lightweight user-authored lanes. A later Chronicle phase can promote tracks into first-class records if users need reusable colors, ordering, descriptions, or track management.

Project data remains in `.worldie` files. Browser/local storage is still only for UI/session state.

## Tests

Coverage added or updated:

- Python persistence test for timeline event track create/update/reopen.
- Python export assertion for track text in timeline Markdown.
- Frontend helper tests for track labels and grouped track behavior.
- Frontend dirty-state test coverage updated so track edits count as unsaved timeline changes.

Recent verification:

- `npm run test:python` passed.
- `npm run test:frontend` passed.
- `npm run typecheck` passed.
- Direct Vite build passed after the known managed-shell Vite access issue appeared with `npm run build`.

## Current Limitations

- Tracks are plain labels, not first-class track records.
- There is no track color, ordering, description, or delete/merge workflow yet.
- There is no dedicated era table yet.
- Timeline events still link to one lore page through the existing `linked_page_id` field.
- Timeline events do not link to map markers yet because Atlas has not been implemented.
- There is no Atlas, map canvas, marker storage, media storage, or drawing tool in this phase.

## Recommended Next Chronicle Steps

Keep the next Chronicle steps small:

1. Add event importance as another lightweight field if needed.
2. Improve the event detail panel labels toward Chronicle language.
3. Consider first-class track records only after the lightweight label flow feels useful.
4. Add linked document IDs before linked map marker IDs, unless Atlas marker storage lands first.

