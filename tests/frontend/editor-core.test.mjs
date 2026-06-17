import test from "node:test";
import assert from "node:assert/strict";

import {
  appendTypewriterCommit,
  applyNoteBlockPrefix,
  buildEditorDisplayRepresentation,
  buildLoreLinkText,
  clearCurrentLinePrefix,
  continueBlockPrefix,
  displaySelectionToSource,
  duplicateSelectedLineBlock,
  extractEditorTextFromHtml,
  findActiveInlinePairExit,
  findEmptyInlinePairAtCursor,
  findInlinePairAutoInsert,
  findUnlinkedLoreMentions,
  isBoldElement,
  isItalicElement,
  getFormattingState,
  getSlashCommandMatch,
  indentSelectedLines,
  linkUnlinkedLoreMentions,
  isUnderlineElement,
  moveSelectedLineBlock,
  normalizePastedText,
  outdentSelectedLines,
  resolvePastedEditorText,
  serializeFormattedInlineContent,
  sourceSelectionToDisplay,
  toggleLinePrefix,
  trimTypewriterCommit,
  wrapSerializedInlineContent,
  renderPreviewContent,
  replaceSelectionWithLoreLink,
} from "../../.tmp-frontend-tests/src/components/editorCore.js";

function normalizeChildren(children) {
  if (children === undefined || children === null) return [];
  return (Array.isArray(children) ? children : [children]).flatMap((child) =>
    Array.isArray(child) ? normalizeChildren(child) : [child],
  );
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
    constructor(
      tagName,
      nodeChildren = [],
      elementChildren = nodeChildren.filter((child) => child instanceof FakeElement),
      attributes = {},
    ) {
      super();
      this.nodeType = 1;
      this.tagName = tagName;
      this.childNodes = nodeChildren;
      this.children = elementChildren;
      this.attributes = attributes;
    }

    getAttribute(name) {
      return this.attributes[name] ?? null;
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

test("lore link helpers generate wiki links and replace selected text", () => {
  assert.equal(buildLoreLinkText(" Blacktooth clan "), "[[Blacktooth clan]]");

  const updated = replaceSelectionWithLoreLink(
    "The Blacktooth clan crossed the ridge.",
    { start: 4, end: 19 },
    "Blacktooth clan",
  );

  assert.equal(updated.text, "The [[Blacktooth clan]] crossed the ridge.");
  assert.deepEqual(updated.selection, { start: 23, end: 23 });
});

test("findUnlinkedLoreMentions finds plain mentions and skips existing links", () => {
  const text = "Blacktooth clan met [[Blacktooth clan]]. Blacktooth clan returned.";
  const matches = findUnlinkedLoreMentions(text, "Blacktooth clan");
  assert.equal(matches.length, 2);
  assert.deepEqual(matches.map((match) => text.slice(match.start, match.end)), [
    "Blacktooth clan",
    "Blacktooth clan",
  ]);
});

test("linkUnlinkedLoreMentions links plain mentions without double-linking existing links", () => {
  const result = linkUnlinkedLoreMentions(
    "[[Blacktooth clan]] saw Blacktooth clan. Blacktooth clan waited.",
    "Blacktooth clan",
  );
  assert.equal(result.count, 2);
  assert.equal(
    result.text,
    "[[Blacktooth clan]] saw [[Blacktooth clan]]. [[Blacktooth clan]] waited.",
  );
});

test("linkUnlinkedLoreMentions preserves punctuation page breaks and unicode", () => {
  const result = linkUnlinkedLoreMentions(
    "\u201cBlacktooth clan,\u201d Mara said.\n***\nBlacktooth clan \u2014 again.",
    "Blacktooth clan",
  );
  assert.equal(result.count, 2);
  assert.equal(
    result.text,
    "\u201c[[Blacktooth clan]],\u201d Mara said.\n***\n[[Blacktooth clan]] \u2014 again.",
  );
});

test("findUnlinkedLoreMentions avoids matches inside larger words", () => {
  const matches = findUnlinkedLoreMentions(
    "Blacktooth clan. Blacktooth clansmen. OldBlacktooth clan.",
    "Blacktooth clan",
  );
  assert.equal(matches.length, 1);
});

test("linkUnlinkedLoreMentions handles titles with regex-special characters safely", () => {
  const cask = linkUnlinkedLoreMentions("Cask (North), not [[Cask (North)]].", "Cask (North)");
  assert.equal(cask.count, 1);
  assert.equal(cask.text, "[[Cask (North)]], not [[Cask (North)]].");

  const plus = linkUnlinkedLoreMentions("A+B appears near [[A+B]].", "A+B");
  assert.equal(plus.count, 1);
  assert.equal(plus.text, "[[A+B]] appears near [[A+B]].");
});

test("renderPreviewContent can show raw or readable lore link labels without changing source", () => {
  const lore = { id: "lore-1", title: "Blacktooth clan" };
  const linkedLore = new Map([["blacktooth clan", lore]]);
  const source = "The [[Blacktooth clan]] arrived.";
  const rawPreview = renderPreviewContent(source, linkedLore, () => {});
  const readablePreview = renderPreviewContent(source, linkedLore, () => {}, { readableLoreLinks: true });

  assert.equal(summarizePreviewNode(rawPreview[0]).children[1].children[0], "[[Blacktooth clan]]");
  assert.equal(summarizePreviewNode(readablePreview[0]).children[1].children[0], "Blacktooth clan");
  assert.equal(source, "The [[Blacktooth clan]] arrived.");
});

test("renderPreviewContent readable lore links handles multiple links and punctuation", () => {
  const linkedLore = new Map([
    ["blacktooth clan", { id: "lore-1", title: "Blacktooth clan" }],
    ["red harbor", { id: "lore-2", title: "Red Harbor" }],
  ]);
  const preview = renderPreviewContent(
    "[[Blacktooth clan]], meet [[Red Harbor]].",
    linkedLore,
    () => {},
    { readableLoreLinks: true },
  );
  const summary = summarizePreviewNode(preview[0]);
  assert.equal(summary.children[0].children[0], "Blacktooth clan");
  assert.equal(summary.children[1].children[0], ", meet ");
  assert.equal(summary.children[2].children[0], "Red Harbor");
  assert.equal(summary.children[3].children[0], ".");
});

test("renderPreviewContent degrades safely for incomplete and empty lore links", () => {
  const incomplete = renderPreviewContent("[[Unclosed", new Map(), () => {}, { readableLoreLinks: true });
  assert.equal(summarizePreviewNode(incomplete[0]).children[0].children[0], "[[Unclosed");

  const empty = renderPreviewContent("[[]]", new Map(), () => {}, { readableLoreLinks: true });
  assert.equal(summarizePreviewNode(empty[0]).children[0].children[0], "[[]]");
});

test("renderPreviewContent clickable lore links still open the matched lore page", () => {
  const lore = { id: "lore-1", title: "Blacktooth clan" };
  const linkedLore = new Map([["blacktooth clan", lore]]);
  let opened = null;
  const preview = renderPreviewContent("[[Blacktooth clan]]", linkedLore, (page) => {
    opened = page;
  }, { readableLoreLinks: true });
  const button = preview[0].props.children[0];

  button.props.onClick();

  assert.equal(button.props.children, "Blacktooth clan");
  assert.equal(opened, lore);
});

test("toggleLinePrefix adds and removes bullet prefixes across lines", () => {
  const added = toggleLinePrefix("Alpha\nBeta", { start: 0, end: 10 }, "- ");
  assert.equal(added.text, "- Alpha\n- Beta");

  const removed = toggleLinePrefix(added.text, added.selection, "- ");
  assert.equal(removed.text, "Alpha\nBeta");

  const removedAlternate = toggleLinePrefix("* Alpha\n• Beta", { start: 0, end: 14 }, "- ");
  assert.equal(removedAlternate.text, "Alpha\nBeta");

  const removedQuote = toggleLinePrefix(">Quote", { start: 0, end: 6 }, "> ");
  assert.equal(removedQuote.text, "Quote");
  assert.deepEqual(removedQuote.selection, { start: 0, end: 5 });

  const downgradedNote = toggleLinePrefix("> Note: Reminder", { start: 0, end: 16 }, "> ");
  assert.equal(downgradedNote.text, "> Reminder");
  assert.deepEqual(downgradedNote.selection, { start: 0, end: 10 });

  const downgradedMultilineNote = toggleLinePrefix("> Note: Reminder\n> detail\n>\n> Closing", { start: 0, end: 36 }, "> ");
  assert.equal(downgradedMultilineNote.text, "> Reminder\n> detail\n>\n> Closing");

  const preservedNoteContinuationQuote = toggleLinePrefix("> Note: Reminder\n> detail", { start: 18, end: 25 }, "> ");
  assert.equal(preservedNoteContinuationQuote.text, "> Note: Reminder\n> detail");
  assert.deepEqual(preservedNoteContinuationQuote.selection, { start: 18, end: 25 });

  const indentedBullet = toggleLinePrefix("  Child", { start: 2, end: 7 }, "- ");
  assert.equal(indentedBullet.text, "  - Child");

  const removedIndentedBullet = toggleLinePrefix("  * Child", { start: 2, end: 9 }, "- ");
  assert.equal(removedIndentedBullet.text, "  Child");
});

test("toggleLinePrefix normalizes ordered list prefixes", () => {
  const result = toggleLinePrefix("Alpha\nBeta", { start: 0, end: 10 }, "1. ");
  assert.equal(result.text, "1. Alpha\n2. Beta");

  const removedAlternate = toggleLinePrefix("3) Alpha\n4) Beta", { start: 0, end: 15 }, "1. ");
  assert.equal(removedAlternate.text, "Alpha\nBeta");
});

test("applyNoteBlockPrefix converts the current line into a note block", () => {
  const fromQuote = applyNoteBlockPrefix("> Reminder", { start: 2, end: 10 });
  assert.equal(fromQuote.text, "> Note: Reminder");
  assert.deepEqual(fromQuote.selection, { start: 8, end: 16 });

  const fromBullet = applyNoteBlockPrefix("- Reminder", { start: 2, end: 10 });
  assert.equal(fromBullet.text, "> Note: Reminder");
  assert.deepEqual(fromBullet.selection, { start: 8, end: 16 });

  const fromIndentedBullet = applyNoteBlockPrefix("  - Reminder", { start: 4, end: 12 });
  assert.equal(fromIndentedBullet.text, "  > Note: Reminder");
  assert.deepEqual(fromIndentedBullet.selection, { start: 10, end: 18 });

  const alreadyNote = applyNoteBlockPrefix("> Note: Reminder", { start: 8, end: 16 });
  assert.equal(alreadyNote.text, "> Note: Reminder");
  assert.deepEqual(alreadyNote.selection, { start: 8, end: 16 });

  const continuationNoop = applyNoteBlockPrefix("> Note: Reminder\n> detail", { start: 19, end: 25 });
  assert.equal(continuationNoop.text, "> Note: Reminder\n> detail");
  assert.deepEqual(continuationNoop.selection, { start: 19, end: 25 });

  const extendExistingNoteSource = "> Note: Reminder\n> detail\nPlain";
  const extendExistingNote = applyNoteBlockPrefix(extendExistingNoteSource, {
    start: extendExistingNoteSource.indexOf("detail"),
    end: extendExistingNoteSource.length,
  });
  assert.equal(extendExistingNote.text, "> Note: Reminder\n> detail\n> Plain");
  assert.deepEqual(extendExistingNote.selection, {
    start: extendExistingNoteSource.indexOf("detail"),
    end: extendExistingNoteSource.length + 2,
  });

  const mergeExistingNoteSource = "Alpha\n> Note: Reminder\n> detail";
  const mergeExistingNote = applyNoteBlockPrefix(mergeExistingNoteSource, {
    start: 0,
    end: mergeExistingNoteSource.length,
  });
  assert.equal(mergeExistingNote.text, "> Note: Alpha\n> Reminder\n> detail");

  const emptyLine = applyNoteBlockPrefix("", { start: 0, end: 0 });
  assert.equal(emptyLine.text, "> Note: ");
  assert.deepEqual(emptyLine.selection, { start: 8, end: 8 });

  const multiline = applyNoteBlockPrefix("Alpha\n- Beta\n> Gamma", { start: 0, end: 20 });
  assert.equal(multiline.text, "> Note: Alpha\n> Beta\n> Gamma");
});

test("applyNoteBlockPrefix preserves indentation for nested numbered and quote lines", () => {
  const fromIndentedNumbered = applyNoteBlockPrefix("    3) Reminder", { start: 7, end: 15 });
  assert.equal(fromIndentedNumbered.text, "    > Note: Reminder");
  assert.deepEqual(fromIndentedNumbered.selection, { start: 12, end: 20 });

  const fromIndentedQuote = applyNoteBlockPrefix("  > [[Red Harbor]]", { start: 4, end: 18 });
  assert.equal(fromIndentedQuote.text, "  > Note: [[Red Harbor]]");
  assert.deepEqual(fromIndentedQuote.selection, { start: 10, end: 24 });
});

test("applyNoteBlockPrefix handles whitespace-only nested list items without flattening indentation", () => {
  const fromWhitespaceBullet = applyNoteBlockPrefix("  -   ", { start: 6, end: 6 });
  assert.equal(fromWhitespaceBullet.text, "  > Note: ");
  assert.deepEqual(fromWhitespaceBullet.selection, { start: 10, end: 10 });

  const fromWhitespaceOrdered = applyNoteBlockPrefix("    2)   ", { start: 10, end: 10 });
  assert.equal(fromWhitespaceOrdered.text, "    > Note: ");
  assert.deepEqual(fromWhitespaceOrdered.selection, { start: 13, end: 13 });
});

test("indentSelectedLines indents a plain line", () => {
  const indented = indentSelectedLines("Alpha", { start: 2, end: 2 });
  assert.equal(indented.text, "  Alpha");
  assert.deepEqual(indented.selection, { start: 4, end: 4 });
});

test("outdentSelectedLines outdents an indented plain line", () => {
  const outdented = outdentSelectedLines("  Alpha", { start: 4, end: 4 });
  assert.equal(outdented.text, "Alpha");
  assert.deepEqual(outdented.selection, { start: 2, end: 2 });
});

test("indentSelectedLines indents list lines without corrupting markers or lore links", () => {
  const indented = indentSelectedLines("- [[Red Harbor]]", { start: 4, end: 18 });
  assert.equal(indented.text, "  - [[Red Harbor]]");
  assert.deepEqual(indented.selection, { start: 6, end: 20 });
});

test("outdentSelectedLines outdents nested list lines without removing the marker", () => {
  const outdented = outdentSelectedLines("  - [[Red Harbor]]", { start: 6, end: 20 });
  assert.equal(outdented.text, "- [[Red Harbor]]");
  assert.deepEqual(outdented.selection, { start: 4, end: 18 });
});

test("indentSelectedLines and outdentSelectedLines support multiline selections", () => {
  const indented = indentSelectedLines("Alpha\n- Beta\nGamma", { start: 0, end: 14 });
  assert.equal(indented.text, "  Alpha\n  - Beta\n  Gamma");
  assert.deepEqual(indented.selection, { start: 2, end: 20 });

  const outdented = outdentSelectedLines(indented.text, indented.selection);
  assert.equal(outdented.text, "Alpha\n- Beta\nGamma");
  assert.deepEqual(outdented.selection, { start: 0, end: 14 });
});

test("outdentSelectedLines leaves content unchanged when outdent is not possible", () => {
  const outdented = outdentSelectedLines("Alpha", { start: 2, end: 2 });
  assert.equal(outdented.text, "Alpha");
  assert.deepEqual(outdented.selection, { start: 2, end: 2 });
});

test("block prefix conversion preserves nested indentation and lore links", () => {
  const quotedBullet = toggleLinePrefix("  - [[Red Harbor]]", { start: 4, end: 18 }, "> ");
  assert.equal(quotedBullet.text, "  > [[Red Harbor]]");
  assert.deepEqual(quotedBullet.selection, { start: 4, end: 18 });

  const unquoted = toggleLinePrefix(quotedBullet.text, quotedBullet.selection, "> ");
  assert.equal(unquoted.text, "  [[Red Harbor]]");
  assert.deepEqual(unquoted.selection, { start: 2, end: 16 });
});

test("continueBlockPrefix advances lists and clears empty prefixes", () => {
  const ordered = continueBlockPrefix("1. Alpha", { start: 8, end: 8 });
  assert.equal(ordered.text, "1. Alpha\n2. ");
  assert.deepEqual(ordered.selection, { start: 12, end: 12 });

  const alternateOrdered = continueBlockPrefix("3) Alpha", { start: 8, end: 8 });
  assert.equal(alternateOrdered.text, "3) Alpha\n4) ");
  assert.deepEqual(alternateOrdered.selection, { start: 12, end: 12 });

  const indentedOrdered = continueBlockPrefix("  3) Alpha", { start: 10, end: 10 });
  assert.equal(indentedOrdered.text, "  3) Alpha\n  4) ");
  assert.deepEqual(indentedOrdered.selection, { start: 16, end: 16 });

  const alternateBullet = continueBlockPrefix("* Alpha", { start: 7, end: 7 });
  assert.equal(alternateBullet.text, "* Alpha\n* ");
  assert.deepEqual(alternateBullet.selection, { start: 10, end: 10 });

  const compactQuote = continueBlockPrefix(">Quote", { start: 6, end: 6 });
  assert.equal(compactQuote.text, ">Quote\n> ");
  assert.deepEqual(compactQuote.selection, { start: 9, end: 9 });

  const clearedNote = continueBlockPrefix("> Note: ", { start: 8, end: 8 });
  assert.equal(clearedNote.text, "");
  assert.deepEqual(clearedNote.selection, { start: 0, end: 0 });

  const cleared = continueBlockPrefix("- ", { start: 2, end: 2 });
  assert.equal(cleared.text, "");
  assert.deepEqual(cleared.selection, { start: 0, end: 0 });

  const clearedIndentedBullet = continueBlockPrefix("    -   ", { start: 8, end: 8 });
  assert.equal(clearedIndentedBullet.text, "");
  assert.deepEqual(clearedIndentedBullet.selection, { start: 0, end: 0 });
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

  const alternateOrdered = clearCurrentLinePrefix("3) Alpha", { start: 3, end: 8 });
  assert.equal(alternateOrdered?.text, "Alpha");
  assert.deepEqual(alternateOrdered?.selection, { start: 0, end: 5 });
  assert.equal(alternateOrdered?.prefix, "3) ");

  const indentedOrdered = clearCurrentLinePrefix("  3) Alpha", { start: 5, end: 10 });
  assert.equal(indentedOrdered?.text, "  Alpha");
  assert.deepEqual(indentedOrdered?.selection, { start: 2, end: 7 });
  assert.equal(indentedOrdered?.prefix, "  3) ");

  const downgradedNote = clearCurrentLinePrefix("> Note: Reminder", { start: 8, end: 16 });
  assert.equal(downgradedNote?.text, "> Reminder");
  assert.deepEqual(downgradedNote?.selection, { start: 2, end: 10 });
  assert.equal(downgradedNote?.prefix, "> Note: ");

  const preservedNoteContinuation = clearCurrentLinePrefix("> Note: Reminder\n> detail", { start: 19, end: 19 });
  assert.equal(preservedNoteContinuation?.text, "> Note: Reminder\n> detail");
  assert.deepEqual(preservedNoteContinuation?.selection, { start: 19, end: 19 });
  assert.equal(preservedNoteContinuation?.prefix, "> ");
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
  assert.equal(getFormattingState("> Note: Reminder", { start: 8, end: 8 }).quote, false);
  assert.equal(getFormattingState("> Note: Reminder\n> detail", { start: 19, end: 19 }).noteBlock, true);
  assert.equal(getFormattingState("> Note: Reminder\n> detail", { start: 19, end: 19 }).quote, false);
  assert.equal(getFormattingState("> Note: Reminder\n>\n> detail", { start: 20, end: 20 }).noteBlock, true);
  assert.equal(getFormattingState("  > Note: Reminder\n  > detail", { start: 23, end: 23 }).noteBlock, true);
  assert.equal(getFormattingState("  > detail", { start: 4, end: 4 }).quote, true);
  assert.equal(getFormattingState("  # Heading", { start: 4, end: 4 }).heading1, true);
  assert.equal(getFormattingState("  ## Heading", { start: 5, end: 5 }).heading2, true);
  assert.equal(getFormattingState(">Quote", { start: 2, end: 2 }).quote, true);
  assert.equal(getFormattingState(">", { start: 1, end: 1 }).quote, true);
  assert.equal(getFormattingState("* * *", { start: 5, end: 5 }).sceneBreak, true);
  assert.equal(getFormattingState("---", { start: 1, end: 1 }).sceneBreak, true);
  assert.equal(getFormattingState("* Bullet", { start: 3, end: 3 }).list, true);
  assert.equal(getFormattingState("3) Step", { start: 3, end: 3 }).orderedList, true);
});

test("normalizePastedText standardizes quote prefixes and list markers", () => {
  assert.equal(normalizePastedText("│ quoted\n| also quoted"), "> quoted\n> also quoted");
  assert.equal(normalizePastedText("  1) First\n  * Second"), "  1. First\n  - Second");
  assert.equal(normalizePastedText("  * Nested bullet\n    2) Nested step"), "  - Nested bullet\n    2. Nested step");
  assert.equal(
    normalizePastedText("  * **Bold [[Lore]]**\n    • _Nested [[Place]]_\n      3) __Step__"),
    "  - **Bold [[Lore]]**\n    - _Nested [[Place]]_\n      3. __Step__",
  );
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

test("extractEditorTextFromHtml preserves ordered list start and item values", () => {
  withFakeHtmlDocument((FakeElement, FakeTextNode) => [
    new FakeElement("OL", [], [
      new FakeElement("LI", [new FakeTextNode("Third")]),
      new FakeElement("LI", [new FakeTextNode("Seventh")], [], { value: "7" }),
      new FakeElement("LI", [new FakeTextNode("Eighth")]),
    ], { start: "3" }),
  ], () => {
    assert.equal(
      extractEditorTextFromHtml("<ol start=\"3\"><li>Third</li><li value=\"7\">Seventh</li><li>Eighth</li></ol>"),
      "3. Third\n7. Seventh\n8. Eighth",
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

test("extractEditorTextFromHtml preserves nested list formatting and lore-link text", () => {
  withFakeHtmlDocument((FakeElement, FakeTextNode) => [
    new FakeElement("UL", [], [
      new FakeElement("LI", [
        new FakeElement("STRONG", [new FakeTextNode("[[Red Harbor]]")]),
        new FakeElement("UL", [], [
          new FakeElement("LI", [
            new FakeElement("EM", [new FakeTextNode("Nested clue")]),
          ]),
        ]),
      ]),
    ]),
  ], () => {
    assert.equal(
      extractEditorTextFromHtml("<ul><li><strong>[[Red Harbor]]</strong><ul><li><em>Nested clue</em></li></ul></li></ul>"),
      "- **[[Red Harbor]]**\n  - _Nested clue_",
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

test("indented formatted list text round-trips through display selection mapping", () => {
  const text = "  - **[[Red Harbor]]**\n    - _Nested clue_";
  const loreStart = text.indexOf("[[Red Harbor]]");
  const loreEnd = loreStart + "[[Red Harbor]]".length;
  const displaySelection = sourceSelectionToDisplay(text, { start: loreStart, end: loreEnd });
  assert.deepEqual(displaySelectionToSource(text, displaySelection), { start: loreStart, end: loreEnd });

  const nestedStart = text.indexOf("Nested clue");
  const nestedEnd = nestedStart + "Nested clue".length;
  const nestedDisplaySelection = sourceSelectionToDisplay(text, { start: nestedStart, end: nestedEnd });
  assert.deepEqual(displaySelectionToSource(text, nestedDisplaySelection), { start: nestedStart, end: nestedEnd });
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

test("renderPreviewContent preserves explicit ordered list numbering", () => {
  const preview = renderPreviewContent("3. Third\n7. Seventh\n8. Eighth", new Map(), () => {});
  assert.equal(preview[0].type, "ol");
  assert.equal(preview[0].props.start, 3);
  assert.equal(preview[0].props.children[0].props.value, undefined);
  assert.equal(preview[0].props.children[1].props.value, 7);
  assert.equal(preview[0].props.children[2].props.value, undefined);
});

test("renderPreviewContent preserves nested list indentation structure", () => {
  const preview = renderPreviewContent("- Parent\n  - Child bullet\n  3. Child step", new Map(), () => {});
  assert.deepEqual(
    summarizePreviewNode(preview[0]),
    {
      type: "ul",
      className: "editor-preview-list",
      children: [
        {
          type: "li",
          className: null,
          children: [
            {
              type: "span",
              className: null,
              children: [
                {
                  type: "span",
                  className: null,
                  children: ["Parent"],
                },
              ],
            },
            {
              type: "ul",
              className: "editor-preview-list",
              children: [
                {
                  type: "li",
                  className: null,
                  children: [
                    {
                      type: "span",
                      className: null,
                      children: [
                        {
                          type: "span",
                          className: null,
                          children: ["Child bullet"],
                        },
                      ],
                    },
                    null,
                  ],
                },
              ],
            },
            {
              type: "ol",
              className: "editor-preview-list editor-preview-list-ordered",
              children: [
                {
                  type: "li",
                  className: null,
                  children: [
                    {
                      type: "span",
                      className: null,
                      children: [
                        {
                          type: "span",
                          className: null,
                          children: ["Child step"],
                        },
                      ],
                    },
                    null,
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

test("renderPreviewContent preserves nested bullets with formatting and lore links", () => {
  const linkedLore = new Map([
    ["red harbor", { id: "lore-red-harbor", worldId: "world-1", title: "Red Harbor", type: "Place" }],
  ]);
  const preview = renderPreviewContent(
    "- **[[Red Harbor]]**\n  - _Nested clue_\n    - __Underlined detail__",
    linkedLore,
    () => {},
    { readableLoreLinks: true },
  );
  const summary = summarizePreviewNode(preview[0]);

  assert.equal(summary.type, "ul");
  assert.equal(summary.children[0].children[0].children[0].type, "strong");
  assert.equal(summary.children[0].children[0].children[0].children[0].type, "button");
  assert.equal(summary.children[0].children[0].children[0].children[0].className, "editor-inline-link");
  assert.deepEqual(summary.children[0].children[0].children[0].children[0].children, ["Red Harbor"]);
  assert.equal(summary.children[0].children[1].type, "ul");
  assert.equal(summary.children[0].children[1].children[0].children[0].children[0].type, "em");
  assert.equal(summary.children[0].children[1].children[0].children[1].type, "ul");
  assert.equal(
    summary.children[0].children[1].children[0].children[1].children[0].children[0].children[0].className,
    "editor-preview-underline",
  );
});

test("renderPreviewContent accepts alternate typed list markers", () => {
  const preview = renderPreviewContent("* Parent\n  • Child bullet\n  3) Child step", new Map(), () => {});
  assert.deepEqual(
    summarizePreviewNode(preview[0]),
    {
      type: "ul",
      className: "editor-preview-list",
      children: [
        {
          type: "li",
          className: null,
          children: [
            {
              type: "span",
              className: null,
              children: [
                {
                  type: "span",
                  className: null,
                  children: ["Parent"],
                },
              ],
            },
            {
              type: "ul",
              className: "editor-preview-list",
              children: [
                {
                  type: "li",
                  className: null,
                  children: [
                    {
                      type: "span",
                      className: null,
                      children: [
                        {
                          type: "span",
                          className: null,
                          children: ["Child bullet"],
                        },
                      ],
                    },
                    null,
                  ],
                },
              ],
            },
            {
              type: "ol",
              className: "editor-preview-list editor-preview-list-ordered",
              children: [
                {
                  type: "li",
                  className: null,
                  children: [
                    {
                      type: "span",
                      className: null,
                      children: [
                        {
                          type: "span",
                          className: null,
                          children: ["Child step"],
                        },
                      ],
                    },
                    null,
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

test("renderPreviewContent accepts alternate scene break markers", () => {
  const preview = renderPreviewContent("---\n___\n***", new Map(), () => {});
  assert.deepEqual(preview.map((node) => summarizePreviewNode(node)), [
    {
      type: "div",
      className: "editor-preview-scene-break",
      children: [],
    },
    {
      type: "div",
      className: "editor-preview-scene-break",
      children: [],
    },
    {
      type: "div",
      className: "editor-preview-scene-break",
      children: [],
    },
  ]);
});

test("renderPreviewContent preserves multiline quote spacing and indentation", () => {
  const preview = renderPreviewContent("> Quoted line\n>   nested detail\n>\n> Closing line", new Map(), () => {});
  assert.deepEqual(
    summarizePreviewNode(preview[0]),
    {
      type: "blockquote",
      className: "editor-preview-quote",
      children: [
        {
          type: "span",
          className: null,
          children: [
            {
              type: "span",
              className: null,
              children: ["Quoted line"],
            },
          ],
        },
        {
          type: "br",
          className: null,
          children: [],
        },
        {
          type: "span",
          className: null,
          children: [
            {
              type: "span",
              className: null,
              children: ["  nested detail"],
            },
          ],
        },
        {
          type: "br",
          className: null,
          children: [],
        },
        {
          type: "br",
          className: null,
          children: [],
        },
        {
          type: "span",
          className: null,
          children: [
            {
              type: "span",
              className: null,
              children: ["Closing line"],
            },
          ],
        },
      ],
    },
  );
});

test("renderPreviewContent accepts indented quote and note markers", () => {
  const quotePreview = renderPreviewContent("  > Quoted line", new Map(), () => {});
  assert.equal(quotePreview[0].type, "blockquote");

  const notePreview = renderPreviewContent("  > Note: Reminder\n  > detail", new Map(), () => {});
  assert.equal(notePreview[0].props.className, "editor-preview-note");
});

test("renderPreviewContent accepts indented heading markers", () => {
  const preview = renderPreviewContent("  # Heading\n  ## Subheading", new Map(), () => {});
  assert.equal(preview[0].type, "h1");
  assert.equal(preview[1].type, "h2");
});

test("renderPreviewContent preserves multiline note block spacing and indentation", () => {
  const preview = renderPreviewContent("> Note: Reminder\n>   nested detail\n>\n> Closing line", new Map(), () => {});
  assert.deepEqual(
    summarizePreviewNode(preview[0]),
    {
      type: "div",
      className: "editor-preview-note",
      children: [
        {
          type: "div",
          className: "editor-preview-note-label",
          children: ["Note"],
        },
        {
          type: "div",
          className: "editor-preview-note-body",
          children: [
            {
              type: "span",
              className: null,
              children: [
                {
                  type: "span",
                  className: null,
                  children: ["Reminder"],
                },
              ],
            },
            {
              type: "br",
              className: null,
              children: [],
            },
            {
              type: "span",
              className: null,
              children: [
                {
                  type: "span",
                  className: null,
                  children: ["  nested detail"],
                },
              ],
            },
            {
              type: "br",
              className: null,
              children: [],
            },
            {
              type: "br",
              className: null,
              children: [],
            },
            {
              type: "span",
              className: null,
              children: [
                {
                  type: "span",
                  className: null,
                  children: ["Closing line"],
                },
              ],
            },
          ],
        },
      ],
    },
  );
});

test("renderPreviewContent preserves nested note content with lore links and formatting", () => {
  const linkedLore = new Map([
    ["red harbor", { id: "lore-red-harbor", worldId: "world-1", title: "Red Harbor", type: "Place" }],
  ]);
  const preview = renderPreviewContent("  > Note: **[[Red Harbor]]**\n  >   _Nested detail_", linkedLore, () => {}, { readableLoreLinks: true });
  const summary = summarizePreviewNode(preview[0]);

  assert.equal(summary.type, "div");
  assert.equal(summary.className, "editor-preview-note");
  assert.equal(summary.children[1].className, "editor-preview-note-body");
  assert.equal(summary.children[1].children[0].children[0].type, "strong");
  assert.equal(summary.children[1].children[0].children[0].children[0].type, "button");
  assert.deepEqual(summary.children[1].children[0].children[0].children[0].children, ["Red Harbor"]);
  assert.deepEqual(summary.children[1].children[2].children[0].children, ["  "]);
  assert.equal(summary.children[1].children[2].children[1].type, "em");
  assert.deepEqual(summary.children[1].children[2].children[1].children[0].children, ["Nested detail"]);
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
