# Pre-Friend-Test Checklist

Date: 2026-06-20

This checklist is the final private-testing gate before handing Worldie to two trusted friends. Use backed-up `.worldie` files only. Do not use this pass to add new product features.

## Goal

Decide whether the current build is safe and clear enough for a small private friend test.

Friend-test ready means:

- Core project-file workflows work.
- Writing, lore, Chronicle, Atlas, and export flows are usable.
- Dirty-state prompts protect unsaved work.
- Close/reopen preserves project content.
- Known beta limitations are documented.

## Manual QA Checklist

### Project Files

- [ ] Create a new `.worldie` project.
- [ ] Open an existing `.worldie` project.
- [ ] Use Save As and confirm the new project file opens.
- [ ] Confirm the recent project list shows the expected project.
- [ ] Close and reopen the app/project.
- [ ] Confirm project, world, documents, lore, relationships, Chronicle events, and Atlas maps/markers persist.

Result:

Notes:

### Writing

- [ ] Create a new document from Workbench or sidebar.
- [ ] Confirm the new document opens immediately.
- [ ] Write or paste several paragraphs.
- [ ] Include smart quotes, apostrophes, em dash, emoji, `***`, and `[[Lore Link]]` syntax.
- [ ] Save, close, reopen, and confirm the text is unchanged.
- [ ] Switch Write/Preview modes.
- [ ] Toggle Readable Links in Preview.

Result:

Notes:

### Lore

- [ ] Create a lore type, such as Character or Faction.
- [ ] Add a lore page with a real title.
- [ ] Edit lore title, details, tags, and custom fields.
- [ ] Create lore from selected document text.
- [ ] Replace selected text with a `[[Lore Link]]`.
- [ ] Link other mentions in the current document.
- [ ] Use Scan Lore, review snippets, uncheck at least one mention, then link selected.
- [ ] Save, close, reopen, and confirm lore pages and links persist.

Result:

Notes:

### Relationships

- [ ] Create a relationship between two lore pages.
- [ ] Edit relationship type/status/notes.
- [ ] Open linked lore pages from the relationship view.
- [ ] Save, close, reopen, and confirm the relationship persists.

Result:

Notes:

### Chronicle Timeline

- [ ] Create a timeline event.
- [ ] Add date/era, type, track, linked lore, and description.
- [ ] Create at least two distinct tracks.
- [ ] Confirm Track View groups events by track.
- [ ] Edit an existing track and save.
- [ ] Save, close, reopen, and confirm tracks persist.

Result:

Notes:

### Atlas Maps

- [ ] Create an Atlas map.
- [ ] Rename the map and add map notes.
- [ ] Add a marker.
- [ ] Edit marker title, type, notes, and optional lore page link.
- [ ] Move the marker on the canvas and confirm it saves after drop.
- [ ] Delete a test marker.
- [ ] Save, close, reopen, and confirm maps, markers, marker notes, marker positions, and marker lore links persist.

Result:

Notes:

### Chronicle + Atlas Links

- [ ] Link a timeline event to an Atlas marker.
- [ ] From Timeline/Chronicle, use Open in Atlas for the linked marker.
- [ ] Confirm Atlas opens with the correct map/marker selected.
- [ ] From Atlas marker details, use Open in Chronicle for a linked timeline event.
- [ ] Confirm Chronicle opens with the correct event selected.
- [ ] Repeat with unsaved marker or timeline edits and cancel the dirty-state prompt.
- [ ] Confirm cancelled navigation does not change hidden Timeline/Atlas selection.
- [ ] Continue navigation after the dirty-state prompt and confirm the selected target opens.

Result:

Notes:

### Dirty-State Protection

- [ ] Make unsaved document changes, then try switching documents.
- [ ] Cancel navigation and confirm the unsaved text remains.
- [ ] Continue navigation and confirm behavior matches the prompt.
- [ ] Repeat with unsaved lore changes.
- [ ] Repeat with unsaved relationship changes.
- [ ] Repeat with unsaved timeline changes.
- [ ] Repeat with unsaved Atlas marker changes.

Result:

Notes:

### Markdown Export

- [ ] Export active-world Markdown.
- [ ] Confirm documents, lore, relationships, Chronicle events, tracks, linked map markers, and Atlas maps/markers appear where expected.
- [ ] Export full-project Markdown.
- [ ] Confirm each world exports its own content and Atlas maps/markers.
- [ ] Confirm exported links remain readable.

Result:

Notes:

## Automated Verification

Run if practical:

- [ ] `npm run test:frontend`
- [ ] `npm run test:python`
- [ ] `npm run typecheck`
- [ ] Direct Vite build:

```powershell
& 'C:\Program Files\nodejs\node.exe' '.\node_modules\vite\bin\vite.js' build
```

- [ ] `git diff --check`

Results:

## Bugs Found

Use severity:

- Blocker: data loss, corruption, save failure, cannot open project.
- High: core writing/lore/Chronicle/Atlas workflow broken.
- Medium: confusing or clumsy but workaround exists.
- Low: visual polish or copy issue.

Bug list:

- None recorded yet.

## Known Beta Limitations

- Atlas is marker-only. No routes, shapes, regions, drawing tools, or map image/media storage.
- Chronicle has tracks and grouped Track View, but no advanced timeline scaling.
- No cloud sync.
- No Spaci publishing/export bundle yet.
- No PDF/DOCX/HTML export in this beta slice.
- Media and cover images are not implemented.
- The custom editor still needs longer real writing sessions.

## Friend-Test Recommendation

Status:

- [ ] Ready for two trusted friends.
- [ ] Not ready yet.

Decision notes:

