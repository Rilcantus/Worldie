import test from "node:test";
import assert from "node:assert/strict";

import {
  buildContextSnippet,
  buildQuickOpenResults,
  buildSearchResults,
  compactSnippet,
  normalizeText,
  scoreMatch,
} from "../../.tmp-frontend-tests/src/hooks/searchState.js";

test("normalizeText lowercases nullable values", () => {
  assert.equal(normalizeText("Alpha BETA"), "alpha beta");
  assert.equal(normalizeText(null), "");
});

test("compactSnippet trims whitespace and truncates long content", () => {
  assert.equal(compactSnippet("  Alpha   Beta  ", 20), "Alpha Beta");
  assert.equal(compactSnippet("abcdefghijklmnopqrstuvwxyz", 10), "abcdefghi...");
});

test("buildContextSnippet returns a focused snippet around the query", () => {
  const snippet = buildContextSnippet(
    "The ancient forest holds a hidden shrine beyond the old river crossing.",
    "hidden",
    "fallback",
  );

  assert.match(snippet, /hidden shrine/i);
  assert.equal(buildContextSnippet("", "hidden", "fallback"), "fallback");
});

test("scoreMatch prefers exact and title matches over body-only matches", () => {
  const exact = scoreMatch("Hero", "body", "hero");
  const titleOnly = scoreMatch("Heroic Tale", "body", "hero");
  const bodyOnly = scoreMatch("Unrelated", "the hero returns", "hero");

  assert.ok(exact !== null && titleOnly !== null && bodyOnly !== null);
  assert.ok(exact > titleOnly);
  assert.ok(titleOnly > bodyOnly);
  assert.equal(scoreMatch("Unrelated", "body", "hero"), null);
});

test("buildSearchResults mixes document and lore hits and sorts by score", () => {
  const documents = [
    { id: "doc-1", worldId: "world-1", title: "Hero", contentJson: "A hero rises." },
    { id: "doc-2", worldId: "world-1", title: "Battle", contentJson: "The hero wins the battle." },
  ];
  const lorePages = [
    { id: "lore-1", worldId: "world-1", title: "Hero", type: "Character", tagsJson: "", fieldsJson: "Chosen hero" },
  ];

  const results = buildSearchResults("hero", documents, lorePages);

  assert.equal(results.length, 3);
  assert.equal(results[0].label, "Hero");
  assert.ok(results.some((result) => result.kind === "Lore"));
});

test("buildQuickOpenResults returns recents when there is no search query", () => {
  const documents = [
    { id: "doc-1", worldId: "world-1", title: "One", contentJson: "First" },
    { id: "doc-2", worldId: "world-1", title: "Two", contentJson: "Second" },
  ];
  const lorePages = [
    { id: "lore-1", worldId: "world-1", title: "Hero", type: "Character", tagsJson: "", fieldsJson: "" },
  ];

  const results = buildQuickOpenResults("", documents, lorePages);

  assert.equal(results.length, 3);
  assert.deepEqual(
    results.map((result) => result.meta),
    ["Recent document", "Recent document", "Recent character"],
  );
});
