# Worldie Friend Test Guide

Worldie is an offline-first desktop app for writers and worldbuilders. It keeps projects in portable `.worldie` files on your computer and helps organize documents, lore pages, relationships, timelines, and maps.

This guide is for early friend testing. Please use a small test project first, keep backups, and do not make Worldie the only copy of important writing yet.

## What To Try

- Create or open a `.worldie` project.
- Create a world and switch between worlds.
- Write a short document with names, places, factions, and events.
- Highlight text in the editor and create lore from the selection.
- Use Scan Lore to find existing lore mentions in the current document.
- Switch between Write and Preview, then try Readable Links.
- Create lore types such as Character, Location, Faction, Item, and Creature.
- Add custom fields to a lore type and edit those fields in Lore Table.
- Export normal CSV and update-ready CSV from Lore Table.
- Try CSV import preview before creating pages from CSV.
- Create timeline events in Chronicle, then organize them with tracks.
- Create an Atlas map, add markers, link a marker to lore, and move the marker.
- Link a timeline event to an Atlas marker.
- Try Timeline -> Atlas and Atlas -> Chronicle navigation.
- Export active-world Markdown and full-project Markdown.
- Close and reopen the project to confirm your work persisted.

## Small Test Script

1. Create a project named `Friend Test`.
2. Create a world named `Duskfen`.
3. Create lore types: Character, Location, Faction, Item.
4. Add Character fields: Species, Age, Faction, Status.
5. Write a one-page scene with three repeated lore names.
6. Highlight one name and create lore from selection.
7. Choose to replace the selection with a `[[Lore Link]]`.
8. Link other mentions in the current document.
9. Create two more lore pages from Lore Table.
10. Edit custom fields inline in Lore Table.
11. Save a Lore Table view.
12. Create three Chronicle timeline events and assign tracks such as Main Plot and Faction War.
13. Create one Atlas map and three markers.
14. Link one marker to a lore page.
15. Link one Chronicle event to that marker.
16. Use Open in Atlas from Chronicle, then Open in Chronicle from Atlas.
17. Export full-project Markdown.
18. Close and reopen the `.worldie` file.

## Known Beta Limitations

- Atlas is marker-only right now. There are no routes, shapes, regions, drawing tools, or map image backgrounds yet.
- Chronicle has tracks and grouped Track View, but not advanced timeline scaling.
- Cross-world Scan Lore is explicit and cautious. Current-world linking is the default.
- Readable Links currently apply in Preview mode; Write mode still shows raw `[[Lore Title]]` source.
- Media, cover images, PDF/DOCX/HTML export, cloud sync, and Spaci publishing are not part of this beta slice.
- The editor is a custom contenteditable editor and still needs long-session testing.
- Keep regular backups of `.worldie` files while testing.

## What To Report

Please report anything that breaks trust:

- Work that does not save.
- Text corruption, missing text, or unexpected character changes.
- Dirty-state prompts that fail to protect unsaved edits.
- Navigation that opens the wrong document, lore page, timeline event, or map marker.
- Exports that omit important project content.
- Any action that feels like it could accidentally destroy work.

## Bug Report Template

```text
Worldie version/build:
Project file used:
Operating system:

What I was trying to do:

What happened:

What I expected:

Can you reproduce it? If yes, steps:
1.
2.
3.

Was any work lost or at risk?

Screenshots or exported Markdown/CSV snippets:

Anything unusual about the text? Smart quotes, emoji, copied web text, CSV import, large paste, etc.:
```

## Safety Notes

- Test with copied/backed-up `.worldie` files.
- Export full-project Markdown after each serious test session.
- Do not run repair utilities unless specifically instructed and after reviewing a dry run.
- Browser/local storage is only for UI/session state. Project content should stay in the `.worldie` file.
