import test from "node:test";
import assert from "node:assert/strict";

import {
  appendTypewriterCommit,
  buildEditorDisplayRepresentation,
  clearCurrentLinePrefix,
  continueBlockPrefix,
  displaySelectionToSource,
  duplicateSelectedLineBlock,
  findActiveInlinePairExit,
  findEmptyInlinePairAtCursor,
  findInlinePairAutoInsert,
  isBoldElement,
  isItalicElement,
  getFormattingState,
  getSlashCommandMatch,
  isUnderlineElement,
  moveSelectedLineBlock,
  normalizePastedText,
  serializeFormattedInlineContent,
  sourceSelectionToDisplay,
  toggleLinePrefix,
  trimTypewriterCommit,
  wrapSerializedInlineContent,
  renderPreviewContent,
} from "../../.tmp-frontend-tests/src/components/editorCore.js";

function normalizeChildren(children) {
  if (children === undefined || children === null) return [];
  return Array.isArray(children) ? children : [children];
}

function summarizePreviewNode(node) {
  if (typeof node === "string") return node;
  if (!node || typeof node !== "object") return node;
  return {
    type: node.type,
    className: node.props?.className ?? null,
    children: normalizeChildren(node.props?.children).map(summarizePreviewNode),
  };
}

test("trimTypewriterCommit removes trailing blank lines and appendTypewriterCommit joins paragraphs", () => {
  assert.equal(trimTypewriterCommit("Draft line\n\n"), "Draft line");
  assert.equal(appendTypewriterCommit("", "Draft line\n"), "Draft line");
  assert.equal(appendTypewriterCommit("Base paragraph", "Draft line\n"), "Base paragraph\nDraft line");
  assert.equal(appendTypewriterCommit("Base paragraph\n", "Draft line\n"), "Base paragraph\nDraft line");
});

test("toggleLinePrefix adds and removes bullet prefixes across lines", () => {
  const added = toggleLinePrefix("Alpha\nBeta", { start: 0, end: 10 }, "- ");
  assert.equal(added.text, "- Alpha\n- Beta");

  const removed = toggleLinePrefix(added.text, added.selection, "- ");
  assert.equal(removed.text, "Alpha\nBeta");
});

test("toggleLinePrefix normalizes ordered list prefixes", () => {
  const result = toggleLinePrefix("Alpha\nBeta", { start: 0, end: 10 }, "1. ");
  assert.equal(result.text, "1. Alpha\n2. Beta");
});

test("continueBlockPrefix advances lists and clears empty prefixes", () => {
  const ordered = continueBlockPrefix("1. Alpha", { start: 8, end: 8 });
  assert.equal(ordered.text, "1. Alpha\n2. ");
  assert.deepEqual(ordered.selection, { start: 12, end: 12 });

  const cleared = continueBlockPrefix("- ", { start: 2, end: 2 });
  assert.equal(cleared.text, "");
  assert.deepEqual(cleared.selection, { start: 0, end: 0 });
});

test("duplicateSelectedLineBlock duplicates the active line block below the selection", () => {
  const duplicated = duplicateSelectedLineBlock("Alpha\nBeta", { start: 0, end: 5 });
  assert.equal(duplicated.text, "Alpha\nAlpha\nBeta");
  assert.deepEqual(duplicated.selection, { start: 6, end: 11 });
});

test("moveSelectedLineBlock swaps line blocks up and down", () => {
  const movedDown = moveSelectedLineBlock("Alpha\nBeta\nGamma", { start: 0, end: 5 }, 1);
  assert.equal(movedDown?.text, "Beta\nAlpha\nGamma");
  assert.deepEqual(movedDown?.selection, { start: 5, end: 10 });

  const movedUp = moveSelectedLineBlock("Alpha\nBeta\nGamma", { start: 6, end: 10 }, -1);
  assert.equal(movedUp?.text, "Beta\nAlpha\nGamma");
  assert.deepEqual(movedUp?.selection, { start: 0, end: 4 });
});

test("getSlashCommandMatch detects slash commands only at word boundaries", () => {
  assert.deepEqual(getSlashCommandMatch("/hea", { start: 4, end: 4 }), {
    start: 0,
    end: 4,
    query: "hea",
  });
  assert.equal(getSlashCommandMatch("word/hea", { start: 8, end: 8 }), null);
  assert.equal(getSlashCommandMatch("/two words", { start: 10, end: 10 }), null);
});

test("inline pair helpers detect lore-link auto insert, empty pairs, and exit points", () => {
  assert.deepEqual(findInlinePairAutoInsert("[", { start: 1, end: 1 }, "["), {
    replaceStart: 0,
    replaceEnd: 1,
    insertion: "[[]]",
    cursor: 2,
  });

  assert.deepEqual(findEmptyInlinePairAtCursor("[[]]", 2), {
    pair: { open: "[[", close: "]]" },
    start: 0,
    end: 4,
  });

  assert.deepEqual(findActiveInlinePairExit("[[Lore]]", 6), {
    pair: { open: "[[", close: "]]" },
    nextCursor: 8,
  });
});

test("clearCurrentLinePrefix removes active list prefixes and preserves selection", () => {
  const cleared = clearCurrentLinePrefix("1. Alpha", { start: 3, end: 8 });
  assert.equal(cleared?.text, "Alpha");
  assert.deepEqual(cleared?.selection, { start: 0, end: 5 });
  assert.equal(cleared?.contentStart, 3);
});

test("getFormattingState reports inline and block formatting flags", () => {
  assert.equal(getFormattingState("**Bold**", { start: 2, end: 6 }).bold, true);
  assert.equal(getFormattingState("**Bold**", { start: 4, end: 4 }).bold, true);
  assert.equal(getFormattingState("_Italic_", { start: 1, end: 7 }).italic, true);
  assert.equal(getFormattingState("_Italic_", { start: 3, end: 3 }).italic, true);
  assert.equal(getFormattingState("__Under__", { start: 4, end: 4 }).underline, true);
  assert.equal(getFormattingState("> Note: Reminder", { start: 8, end: 8 }).noteBlock, true);
  assert.equal(getFormattingState("* * *", { start: 5, end: 5 }).sceneBreak, true);
});

test("normalizePastedText standardizes quote prefixes and list markers", () => {
  assert.equal(normalizePastedText("│ quoted\n| also quoted"), "> quoted\n> also quoted");
  assert.equal(normalizePastedText("  1) First\n  * Second"), "1. First\n- Second");
});
test("isBoldElement detects semantic and inline-style bold markup", () => {
  assert.equal(isBoldElement({ tagName: "STRONG" }), true);
  assert.equal(isBoldElement({ tagName: "SPAN", style: { fontWeight: "bold" } }), true);
  assert.equal(isBoldElement({ tagName: "SPAN", style: { fontWeight: "700" } }), true);
  assert.equal(isBoldElement({ tagName: "SPAN", style: { fontWeight: "500" } }), false);
});

test("isItalicElement detects semantic and inline-style italic markup", () => {
  assert.equal(isItalicElement({ tagName: "EM" }), true);
  assert.equal(isItalicElement({ tagName: "SPAN", style: { fontStyle: "italic" } }), true);
  assert.equal(isItalicElement({ tagName: "SPAN", style: { fontStyle: "normal" } }), false);
});

test("wrapSerializedInlineContent preserves combined inline formatting markers", () => {
  assert.equal(wrapSerializedInlineContent("Text", { bold: true, italic: true }), "**_Text_**");
  assert.equal(wrapSerializedInlineContent("Text", { bold: true, underline: true }), "**__Text__**");
  assert.equal(wrapSerializedInlineContent("Text", { italic: true, underline: true }), "*__Text__*");
  assert.equal(wrapSerializedInlineContent("Text", { bold: true, italic: true, underline: true }), "***__Text__***");
});

test("combined italic underline markers round-trip through editor display mapping", () => {
  const text = wrapSerializedInlineContent("Text", { italic: true, underline: true });
  const representation = buildEditorDisplayRepresentation(text);
  assert.equal(representation.html, "<em><u>Text</u></em>");
  assert.deepEqual(sourceSelectionToDisplay(text, { start: 3, end: 7 }), { start: 0, end: 4 });
  assert.deepEqual(displaySelectionToSource(text, { start: 0, end: 4 }), { start: 3, end: 7 });
});

test("triple-asterisk bold italic markers round-trip through editor display mapping", () => {
  const representation = buildEditorDisplayRepresentation("***Text***");
  assert.equal(representation.html, "<strong><em>Text</em></strong>");
  assert.deepEqual(sourceSelectionToDisplay("***Text***", { start: 3, end: 7 }), { start: 0, end: 4 });
  assert.deepEqual(displaySelectionToSource("***Text***", { start: 0, end: 4 }), { start: 3, end: 7 });
});

test("serializeFormattedInlineContent preserves semantic and inline-style combinations", () => {
  assert.equal(
    serializeFormattedInlineContent("Text", { tagName: "SPAN", style: { fontWeight: "700", fontStyle: "italic" } }),
    "**_Text_**",
  );
  assert.equal(
    serializeFormattedInlineContent("Text", { tagName: "SPAN", style: { fontStyle: "italic", textDecorationLine: "underline" } }),
    "*__Text__*",
  );
  assert.equal(
    serializeFormattedInlineContent("Text", { tagName: "U" }),
    "__Text__",
  );
});

test("renderPreviewContent preserves nested inline formatting structure", () => {
  const preview = renderPreviewContent("**_Text_**\n*__Lore__*\n***Both***", new Map(), () => {});
  assert.deepEqual(
    summarizePreviewNode(preview[0]),
    {
      type: "p",
      className: "editor-preview-paragraph",
      children: [
        {
          type: "strong",
          className: null,
          children: [
            {
              type: "em",
              className: null,
              children: [
                {
                  type: "span",
                  className: null,
                  children: ["Text"],
                },
              ],
            },
          ],
        },
      ],
    },
  );
  assert.deepEqual(
    summarizePreviewNode(preview[1]),
    {
      type: "p",
      className: "editor-preview-paragraph",
      children: [
        {
          type: "em",
          className: null,
          children: [
            {
              type: "span",
              className: "editor-preview-underline",
              children: [
                {
                  type: "span",
                  className: null,
                  children: ["Lore"],
                },
              ],
            },
          ],
        },
      ],
    },
  );
  assert.deepEqual(
    summarizePreviewNode(preview[2]),
    {
      type: "p",
      className: "editor-preview-paragraph",
      children: [
        {
          type: "strong",
          className: null,
          children: [
            {
              type: "em",
              className: null,
              children: [
                {
                  type: "span",
                  className: null,
                  children: ["Both"],
                },
              ],
            },
          ],
        },
      ],
    },
  );
});

test("isUnderlineElement detects tag, class, and inline-style underline markup", () => {
  assert.equal(isUnderlineElement({ tagName: "U" }), true);
  assert.equal(
    isUnderlineElement({
      tagName: "SPAN",
      classList: { contains: (className) => className === "editor-format-underline" },
    }),
    true,
  );
  assert.equal(
    isUnderlineElement({
      tagName: "SPAN",
      style: { textDecoration: "underline solid rgb(255, 255, 255)" },
    }),
    true,
  );
  assert.equal(
    isUnderlineElement({
      tagName: "SPAN",
      style: { textDecorationLine: "underline" },
    }),
    true,
  );
  assert.equal(isUnderlineElement({ tagName: "SPAN", style: { textDecoration: "none" } }), false);
});
