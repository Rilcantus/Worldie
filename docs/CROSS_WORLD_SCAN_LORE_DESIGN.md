# Cross-World Scan Lore Design

## Purpose

Worldie now supports safe current-world bulk lore linking from the document editor. The next step is project-wide and cross-world Scan Lore, but that feature needs stricter rules before implementation because linking a document in one world to lore from another world creates a stronger project-level connection.

This note defines a recommended design for future project-wide Scan Lore without changing the current `.worldie` storage format or implementing the feature yet.

## Current Behavior

Scan Lore currently works only against lore pages in the active document's current world.

Current behavior:

- Scans the active document body only.
- Matches exact lore page titles.
- Uses case-sensitive matching.
- Skips text already inside `[[Lore Links]]`.
- Avoids matching inside larger words.
- Matches longer lore titles before shorter overlapping titles.
- Skips duplicate lore titles as ambiguous instead of guessing.
- Shows a review panel with lore items, counts, snippets, and individual mention checkboxes.
- Links only selected mentions.
- Does not create lore pages.
- Does not modify lore pages.
- Does not create relationship or cross-world metadata.

This is the correct default because most lore references should stay inside the active world unless the writer intentionally chooses otherwise.

## Product Principle

Current-world linking should be the default and low-risk path.

Cross-world linking should be opt-in, explicit, and reviewable. Worldie should never silently connect worlds. A cross-world link can imply shared mythology, multiverse overlap, reference, crossover, canon bridge, or some other important creative relationship. The UI should treat that as meaningful rather than as a routine auto-link.

## Proposed UI Flow

The document editor keeps the existing Scan Lore action as the default current-world scan.

After the current-world scan, the review panel can offer a secondary action:

- `Search Whole Project`
- or `Include Other Worlds`

The safer label is `Include Other Worlds` because it makes the scope change clear.

Project-wide results should be grouped:

- Current World Matches
- Other World Matches
- Ambiguous Matches
- Already Linked / Ignored, if useful later

Current-world matches should keep current behavior:

- selected by default
- individual mention selection
- snippets
- Link selected

Other-world matches should show:

- lore title
- lore type, when available
- source world name
- mention count
- snippets
- individual mention checkboxes

Other-world matches should default unchecked. The writer must explicitly select other-world lore items or mentions before linking.

## Matching Rules

Current-world matching rules remain unchanged.

Project-wide scan should search lore pages outside the active world only after the writer chooses `Include Other Worlds`.

Recommended rules:

- Keep case-sensitive exact title matching for the first project-wide slice.
- Skip existing `[[Lore Links]]`.
- Avoid matches inside larger words.
- Preserve punctuation, Unicode, emoji, newlines, and `***` page breaks.
- Continue matching longer titles before shorter overlapping titles.
- Do not include blank titles or very short titles that current Scan Lore already skips.

Duplicate and collision rules:

- Duplicate title in the same world: ambiguous and skipped.
- Same title in current world and another world: current-world lore wins by default; other-world match is not auto-selected.
- Same title in multiple other worlds: ambiguous until the user chooses an exact lore item.
- Same title in current world and multiple other worlds: current-world result remains available; other-world results stay ambiguous or require explicit item choice.
- Longer title still wins over shorter overlapping title within the same result group.

## Link Syntax And Storage Issue

Existing document source stores lore links as:

```text
[[Title]]
```

That syntax is readable and portable, but it is title-based. Cross-world linking introduces ambiguity when multiple worlds contain the same title.

### Option A: Keep `[[Title]]` For All Links

Pros:

- Simple.
- Preserves existing readable source format.
- Keeps Markdown export easy to understand.
- No parser or storage migration.

Cons:

- Ambiguous when the same title exists in more than one world.
- Rename/update tooling is harder.
- Preview link resolution may prefer current-world lore and lose the cross-world target.

### Option B: Add Targeted Link Syntax Later

Possible future syntax:

```text
[[world:lore-id|Title]]
```

or:

```text
[[Title]]
```

with a hidden target map stored separately.

Pros:

- Precise target identity.
- Handles duplicate titles safely.
- Supports future rename/update tools.
- Enables reliable graph and export behavior.

Cons:

- Changes parser and export design.
- Adds storage and migration questions.
- Makes source text less simple if the ID is inline.
- Hidden metadata can drift from visible source unless carefully maintained.

### Option C: MVP Global-Uniqueness Rule

For the first cross-world implementation, keep stored `[[Title]]` links and allow other-world linking only when the title is globally unambiguous across the project.

Recommended first-slice rule:

- If a title exists in the current world, current-world match wins.
- If a title exists in exactly one other world and not in the current world, it can appear in Other World Matches, unchecked by default.
- If a title exists in more than one other world, mark it ambiguous and do not allow linking yet.
- If the writer selects an other-world match, insert the same `[[Title]]` syntax for now.

This avoids changing storage while keeping the first project-wide scan honest about ambiguity.

## Relationship And Metadata Design

Eventually, when a document in World A links lore from World B, Worldie may record that as a cross-world reference.

Possible metadata types:

- `cross_world_reference`
- `shared_entity`
- `canon_bridge`
- `inspired_by`

This should not happen silently. Metadata creation should be explicit and reviewable, possibly with a checkbox:

```text
Create cross-world references for selected links
```

The first project-wide implementation should not create relationship metadata. The link itself is enough for the first slice. Metadata should wait until the project has a clear model for cross-world connections, export behavior, and user review.

## Recommended First Implementation Phase

Phase 1 should add project-wide scan as an opt-in extension of the current review flow:

- Keep the default Scan Lore action current-world only.
- Add `Include Other Worlds` from the Scan Lore review panel.
- Search only lore pages outside the current world.
- Group other-world results separately.
- Show source world name on every other-world result.
- Default all other-world matches to unchecked.
- Allow linking only globally unambiguous other-world titles.
- Keep current `[[Title]]` syntax.
- Do not create relationship metadata.
- Do not add background scanning.
- Do not change `.worldie` storage.

The review UI should make the scope obvious:

```text
Current World Matches
Urzoth - 3 mentions

Other World Matches
Starfall Gate - World: The Outer Archive - 2 mentions
```

## Later Phases

### Phase 2: Cross-World Reference Metadata

Add an explicit review option to create cross-world reference records after linking. Do not infer metadata silently.

### Phase 3: ID-Backed Link Targets

Design and implement precise link targets using either a visible target syntax or a source-plus-target-map model.

### Phase 4: Cross-World Graph View

Show cross-world references in relationship or project graph views. Separate ordinary current-world links from deliberate cross-world bridges.

### Phase 5: Rename And Update Tools

Add project-wide tools for renaming lore pages and updating link text or link targets safely.

## Risks And Open Questions

Risks:

- Title collisions can make `[[Title]]` links ambiguous.
- Export readability may suffer if future syntax exposes IDs.
- Hidden link metadata can drift from visible source text.
- Rename workflows need a reliable target model.
- Moving lore pages between worlds can change link meaning.
- Users may lose trust if Worldie auto-links too aggressively.
- Review panels may become cluttered on large projects.
- Relationship metadata can become noisy if created automatically.

Open questions before implementation:

- Should Phase 1 allow globally unique other-world titles to link with plain `[[Title]]`, or should all cross-world linking wait for ID-backed syntax?
- Should other-world results appear only after a current-world scan, or should there be a separate toolbar action?
- Should current-world title collisions with other-world titles fully hide other-world matches, or show them as blocked/ambiguous for education?
- What source label is best: world name only, or project/world/lore type?
- When metadata arrives, should the default be no metadata, or a checked-by-default "record cross-world reference" option?

## Non-Goals

This design does not implement:

- Project-wide scanning.
- Cross-world link insertion.
- New link syntax.
- Relationship metadata.
- Background auto-linking.
- Lore page creation.
- Storage changes.
- Editor rewrite.
