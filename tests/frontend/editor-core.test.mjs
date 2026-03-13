import test from "node:test";
import assert from "node:assert/strict";

import {
  appendTypewriterCommit,
  buildEditorDisplayRepresentation,
  clearCurrentLinePrefix,
  continueBlockPrefix,
  displaySelectionToSource,
  duplicateSelectedLineBlock,
  extractEditorTextFromHtml,
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
  resolvePastedEditorText,
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

function withFakeHtmlDocument(childNodes, callback) {
  const originalDocument = globalThis.document;
  const originalNode = globalThis.Node;
  const originalHTMLElement = globalThis.HTMLElement;

  class FakeNode {}
  FakeNode.TEXT_NODE = 3;

  class FakeTextNode extends FakeNode {
    constructor(text) {
      super();
      this.nodeType = FakeNode.TEXT_NODE;
      this.textContent = text;
    }
  }

  class FakeElement extends FakeNode {
    constructor(tagName, nodeChildren = [], elementChildren = nodeChildren.filter((child) => child instanceof FakeElement)) {
      super();
      this.nodeType = 1;
      this.tagName = tagName;
      this.childNodes = nodeChildren;
      this.children = elementChildren;
    }
  }

  globalThis.Node = FakeNode;
  globalThis.HTMLElement = FakeElement;
  globalThis.document = {
    createElement: () => {
      const root = new FakeElement("DIV");
      Object.defineProperty(root, "innerHTML", {
        get() {
          return "";
        },
        set() {
          root.childNodes = childNodes(FakeElement, FakeTextNode);
        },
      });
      return root;
    },
  };

  try {
    callback();
  } finally {
    globalThis.document = originalDocument;
    globalThis.Node = originalNode;
    globalThis.HTMLElement = originalHTMLElement;
  }
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
  assert.equal(getFormattingState("_**Both**_", { start: 5, end: 5 }).bold, true);
  assert.equal(getFormattingState("_**Both**_", { start: 5, end: 5 }).italic, true);
  assert.equal(getFormattingState("__*Both*__", { start: 5, end: 5 }).italic, true);
  assert.equal(getFormattingState("__*Both*__", { start: 5, end: 5 }).underline, true);
  assert.equal(getFormattingState("__***Both***__", { start: 7, end: 7 }).bold, true);
  assert.equal(getFormattingState("__***Both***__", { start: 7, end: 7 }).italic, true);
  assert.equal(getFormattingState("__***Both***__", { start: 7, end: 7 }).underline, true);
  assert.equal(getFormattingState("___Both___", { start: 5, end: 5 }).italic, true);
  assert.equal(getFormattingState("___Both___", { start: 5, end: 5 }).underline, true);
  assert.equal(getFormattingState("***Both***", { start: 5, end: 5 }).bold, true);
  assert.equal(getFormattingState("***Both***", { start: 5, end: 5 }).italic, true);
  assert.equal(getFormattingState("***__Both__***", { start: 7, end: 7 }).italic, true);
  assert.equal(getFormattingState("***__Both__***", { start: 7, end: 7 }).underline, true);
  assert.equal(getFormattingState("__Under__", { start: 4, end: 4 }).underline, true);
  assert.equal(getFormattingState("> Note: Reminder", { start: 8, end: 8 }).noteBlock, true);
  assert.equal(getFormattingState("* * *", { start: 5, end: 5 }).sceneBreak, true);
});

test("normalizePastedText standardizes quote prefixes and list markers", () => {
  assert.equal(normalizePastedText("│ quoted\n| also quoted"), "> quoted\n> also quoted");
  assert.equal(normalizePastedText("  1) First\n  * Second"), "  1. First\n  - Second");
  assert.equal(normalizePastedText("  * Nested bullet\n    2) Nested step"), "  - Nested bullet\n    2. Nested step");
});
test("normalizePastedText avoids false quote matches and supports heavy bars", () => {
  assert.equal(normalizePastedText("\u00e2lpha"), "\u00e2lpha");
  assert.equal(normalizePastedText("  \u00e2lpha"), "  \u00e2lpha");
  assert.equal(normalizePastedText("\u2503 quoted"), "> quoted");
});

test("extractEditorTextFromHtml preserves inline formatting inside pasted blocks", () => {
  withFakeHtmlDocument((FakeElement, FakeTextNode) => [
    new FakeElement("P", [
      new FakeElement("STRONG", [new FakeTextNode("Bold")]),
      new FakeTextNode(" plain"),
    ]),
    new FakeElement("BLOCKQUOTE", [
      new FakeElement("EM", [new FakeTextNode("Quoted")]),
    ]),
    new FakeElement("UL", [], [
      new FakeElement("LI", [
        new FakeElement("U", [new FakeTextNode("Under")]),
      ]),
    ]),
  ], () => {
    assert.equal(
      extractEditorTextFromHtml("<p><strong>Bold</strong> plain</p>"),
      "**Bold** plain\n\n> _Quoted_\n\n- __Under__",
    );
  });
});

test("extractEditorTextFromHtml preserves indentation inside pasted blockquotes", () => {
  withFakeHtmlDocument((FakeElement, FakeTextNode) => [
    new FakeElement("BLOCKQUOTE", [
      new FakeTextNode("Quoted line\n  nested detail\n\nClosing line"),
    ]),
  ], () => {
    assert.equal(
      extractEditorTextFromHtml("<blockquote>Quoted line\n  nested detail\n\nClosing line</blockquote>"),
      "> Quoted line\n>   nested detail\n>\n> Closing line",
    );
  });
});

test("extractEditorTextFromHtml preserves nested html list structure", () => {
  withFakeHtmlDocument((FakeElement, FakeTextNode) => [
    new FakeElement("UL", [], [
      new FakeElement("LI", [
        new FakeTextNode("Parent"),
        new FakeElement("UL", [], [
          new FakeElement("LI", [new FakeTextNode("Child bullet")]),
        ]),
        new FakeElement("OL", [], [
          new FakeElement("LI", [new FakeTextNode("Child step")]),
        ]),
      ]),
    ]),
  ], () => {
    assert.equal(
      extractEditorTextFromHtml("<ul><li>Parent<ul><li>Child bullet</li></ul><ol><li>Child step</li></ol></li></ul>"),
      "- Parent\n  - Child bullet\n  1. Child step",
    );
  });
});

test("extractEditorTextFromHtml preserves indentation inside pasted pre blocks", () => {
  withFakeHtmlDocument((FakeElement, FakeTextNode) => [
    new FakeElement("PRE", [
      new FakeTextNode("  first line\n\n* literal bullet\n> literal quote\n1) literal step\n    second line\n"),
    ]),
  ], () => {
    assert.equal(
      extractEditorTextFromHtml("<pre>  first line\n\n* literal bullet\n> literal quote\n1) literal step\n    second line\n</pre>"),
      "  first line\n\n* literal bullet\n> literal quote\n1) literal step\n    second line",
    );
  });
});

test("resolvePastedEditorText keeps extracted preformatted html from being renormalized", () => {
  withFakeHtmlDocument((FakeElement, FakeTextNode) => [
    new FakeElement("PRE", [
      new FakeTextNode("* literal bullet\n> literal quote\n1) literal step\n"),
    ]),
  ], () => {
    assert.equal(
      resolvePastedEditorText({
        html: "<pre>* literal bullet\n> literal quote\n1) literal step\n</pre>",
        plainText: "* literal bullet\n> literal quote\n1) literal step\n",
      }),
      "* literal bullet\n> literal quote\n1) literal step",
    );
  });
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

test("triple-underscore italic underline markers round-trip through editor display mapping", () => {
  const representation = buildEditorDisplayRepresentation("___Text___");
  assert.equal(representation.html, "<u><em>Text</em></u>");
  assert.deepEqual(sourceSelectionToDisplay("___Text___", { start: 3, end: 7 }), { start: 0, end: 4 });
  assert.deepEqual(displaySelectionToSource("___Text___", { start: 0, end: 4 }), { start: 3, end: 7 });
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
  const preview = renderPreviewContent("**_Text_**\n*__Lore__*\n***Both***\n___Both___", new Map(), () => {});
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
  assert.deepEqual(
    summarizePreviewNode(preview[3]),
    {
      type: "p",
      className: "editor-preview-paragraph",
      children: [
        {
          type: "span",
          className: "editor-preview-underline",
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

test("renderPreviewContent preserves serializer-ordered nested underline and italic wrappers", () => {
  const preview = renderPreviewContent(
    "__**_Text_**__\n_**__Lore__**_\n**__*Glyph*__**\n*__**Rune**__*",
    new Map(),
    () => {},
  );
  assert.deepEqual(
    summarizePreviewNode(preview[0]),
    {
      type: "p",
      className: "editor-preview-paragraph",
      children: [
        {
          type: "span",
          className: "editor-preview-underline",
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
              type: "strong",
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
              type: "span",
              className: "editor-preview-underline",
              children: [
                {
                  type: "em",
                  className: null,
                  children: [
                    {
                      type: "span",
                      className: null,
                      children: ["Glyph"],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  );
  assert.deepEqual(
    summarizePreviewNode(preview[3]),
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
                  type: "strong",
                  className: null,
                  children: [
                    {
                      type: "span",
                      className: null,
                      children: ["Rune"],
                    },
                  ],
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
