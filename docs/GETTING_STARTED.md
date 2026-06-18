# Getting Started With Worldie

Worldie is an offline-first desktop workspace for fictional world-building. It is meant for writers, dungeon masters, and narrative game designers who want one portable `.worldie` project file for worlds, lore pages, documents, timelines, relationships, table tracking, and exports.

Worldie is now useful for personal beta work, but it should not be the only copy of important writing yet. Start with a small test world, learn the flows, and keep regular exports and backups.

## What Worldie Is For

Use Worldie to:

- Keep worlds, documents, lore pages, relationships, and timeline events together.
- Build custom lore types such as Character, Location, Faction, and Item.
- Track structured details with custom fields and Lore Table views.
- Write scenes or notes with `[[Lore Links]]` back to your lore pages.
- Export Markdown and CSV copies that can be read outside Worldie.

Worldie stores project content in portable SQLite-backed `.worldie` files. Browser and local storage are only for UI/session state and legacy migration helpers.

## First 30-Minute Setup

1. Create a new `.worldie` project.
2. Create your first world.
3. Add a small set of lore types: Character, Location, Faction, and Item.
4. Add Character custom fields for Species, Age, Faction, Status, and First Appearance.
5. Open the Lore Table for Character.
6. Create 3 to 5 character pages from the Lore Table.
7. Edit those custom fields inline from the table.
8. Save a table view such as Main Characters.
9. Write one short document.
10. Highlight an important name in the document and click the floating Create Lore action to turn it into a lore page.
11. Link lore in the document with `[[Lore Links]]`.
12. Export full-project Markdown.
13. Export an update-ready CSV for your main table.
14. Back up the `.worldie` file.

Keep the first project small. A test world with a few characters and one location is enough to learn the workflow without risking important writing.

## Suggested First Lore Types

Start with a few broad types instead of modeling every category immediately:

- Character
- Location
- Faction
- Item

Add more types later when a repeated pattern appears in your work. For example, if you have many species, spells, gods, or eras, those may deserve their own lore types after the first pass.

## Suggested Character Fields

A practical Character setup:

- Species: text
- Age: number or text, depending on how precise your ages are
- Faction: text or select
- Status: select, such as Alive, Missing, Dead, Unknown
- First Appearance: text or date

Use defaults sparingly. Defaults are helpful when every new page should start with the same value, but they can also hide missing data if used too broadly.

## How To Use Lore Table As A Tracker

The Lore Table is best for repeatable structured work:

- Select a lore type, such as Character.
- Create new pages directly from the table.
- Show only the fields that matter for the current task.
- Sort by Status, Faction, Updated, or another useful column.
- Use quick filtering for a focused pass.
- Save a view for a recurring workflow, such as Main Characters or Open Questions.
- Edit simple custom field values inline.

Use the lore editor for longer notes, traits, details, tags, and writing that needs more context.

## How To Create Lore While Writing

When a name, place, faction, creature, or object appears naturally in a document, highlight the text and click the floating Create Lore action that appears near the selection. The editor toolbar keeps a Create Lore button as a fallback. Worldie opens a small draft form with the highlighted text as the title. Choose the lore type, optionally choose a template, add starter notes or tags, and create the page.

If the link option is enabled, the highlighted text is replaced with a `[[Lore Link]]` after the lore page is created. When Worldie finds other exact, unlinked mentions of the same title in the current document, it offers a small follow-up action to link those too. This first slice works inside the main document editor and only scans the current document; global operating-system context menus and project-wide auto-linking are not implemented yet.

The editor has two document modes. Write mode is the editable source view and shows the saved wiki-style `[[Lore Link]]` text. Preview mode is the rendered reading view. In Preview, use Readable Links to switch between raw `[[Lore Link]]` text and cleaner linked title text for easier reading. This display option does not change the saved document content.

## Scan Existing Lore In A Document

When you are writing a new document after lore pages already exist, use Scan Lore from the document editor toolbar. Worldie scans the active document for exact, unlinked mentions of lore pages in the current world and shows a review prompt before changing anything.

The first version is intentionally conservative:

- It scans current-world lore only.
- It skips text that is already inside `[[Lore Links]]`.
- It avoids matching inside larger words.
- It matches longer lore titles before shorter ones.
- It skips duplicate lore titles as ambiguous instead of guessing.

Use Link all when the review counts look right, or Dismiss to leave the document unchanged. Future project-wide scanning should be opt-in, separate current-world matches from other-world matches, require explicit confirmation for cross-world lore links, and eventually report any cross-world connection metadata.

## How To Use CSV Export And Import Safely

Worldie supports CSV as a bridge to spreadsheet tools, not as a replacement database.

Recommended safe flow:

1. Export a normal CSV when you want a readable spreadsheet copy of the current table.
2. Export an update-ready CSV when you may later update existing pages from the spreadsheet.
3. Keep the `Worldie ID` column unchanged in update-ready CSV files.
4. Use Import CSV Preview before applying anything.
5. Review matched, new, warning, and blocked rows.
6. Use Import as New Pages only when the rows should become new pages.
7. Use Update Existing Pages only when rows match existing pages by `Worldie ID`.

Current CSV update behavior is intentionally narrow:

- Updates match by `Worldie ID` only.
- Title fallback matching is not implemented.
- Blank cells in update mode leave existing values unchanged.
- Unmapped columns are not imported.
- Type and Updated columns are ignored during import.
- Update mode changes mapped custom fields only.

Make a backup before any large import or update pass.

## How To Export And Back Up Work

While Worldie is in beta, use both exports and file backups:

- Export full-project Markdown after each real writing or worldbuilding session.
- Export active-world Markdown when you want a focused copy of one world.
- Keep dated copies of the `.worldie` file.
- Store backups somewhere outside the active project folder when possible.
- Keep spreadsheet exports for table-heavy review passes.

The `.worldie` file is the project source of truth. Markdown and CSV exports are safety copies and review formats.

## What Not To Rely On Yet

Do not rely on Worldie for:

- Cloud sync or collaboration.
- Media libraries or cover image workflows.
- PDF, DOCX, or HTML export.
- A final graph editor for relationships.
- A final multi-track timeline system.
- CSV import undo.
- Formula-driven tables.
- Bulk table editing.

Those areas are either planned for later or intentionally outside the current personal-use beta.

## Current Beta Cautions

- Use a small test world first.
- Do not make Worldie the only copy of important writing yet.
- Export full-project Markdown after each real session.
- Back up the `.worldie` file before heavy edits, imports, or updates.
- Review CSV previews carefully before applying imports.
- Keep custom field definitions simple until your project structure settles.
