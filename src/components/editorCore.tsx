import type { ReactNode } from "react";
import type { LorePage } from "../lib/data";

export type SelectionOffsets = {
  start: number;
  end: number;
};

export type EditorFormattingState = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  heading1: boolean;
  heading2: boolean;
  list: boolean;
  orderedList: boolean;
  quote: boolean;
  noteBlock: boolean;
  sceneBreak: boolean;
};

export type SlashCommandMatch = {
  start: number;
  end: number;
  query: string;
};

type InlinePairDefinition = {
  open: string;
  close: string;
};

const LORE_LINK_PAIR: InlinePairDefinition = { open: "[[", close: "]]" };
const PRE_LINE_PROTECTOR = "__WORLDIE_PRE_LINE__";
const QUOTE_LINE_PROTECTOR = "__WORLDIE_QUOTE_LINE__";
const FORMAT_MARKERS = [
  { marker: "**", tag: "strong" },
  { marker: "__", tag: "u" },
  { marker: "_", tag: "em" },
  { marker: "*", tag: "em" },
] as const;

type EditorDisplayRepresentation = {
  html: string;
  sourceToDisplay: number[];
  displayToSource: number[];
};

type UnderlineElementLike = {
  tagName: string;
  classList?: { contains: (className: string) => boolean };
  style?: {
    fontStyle?: string;
    fontWeight?: string;
    textDecoration?: string;
    textDecorationLine?: string;
  };
};

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function buildEditorDisplayRepresentation(text: string): EditorDisplayRepresentation {
  if (!text) {
    return {
      html: "",
      sourceToDisplay: [0],
      displayToSource: [0],
    };
  }

  const htmlParts: string[] = [];
  const sourceToDisplay = new Array<number>(text.length + 1).fill(0);
  const displayToSource: number[] = [];
  const openMarkers: string[] = [];
  let visibleOffset = 0;
  let index = 0;

  const setDisplaySource = (offset: number, sourceOffset: number, options?: { preferLater?: boolean }) => {
    const current = displayToSource[offset];
    if (current === undefined || (options?.preferLater && sourceOffset > current)) {
      displayToSource[offset] = sourceOffset;
    }
  };

  while (index < text.length) {
    sourceToDisplay[index] = visibleOffset;

    if (text[index] === "\n") {
      htmlParts.push("<br>");
      setDisplaySource(visibleOffset, index);
      visibleOffset += 1;
      displayToSource[visibleOffset] = index + 1;
      index += 1;
      sourceToDisplay[index] = visibleOffset;
      continue;
    }

    const lastOpenMarker = openMarkers[openMarkers.length - 1];
    const closingMarkerDef = lastOpenMarker
      ? FORMAT_MARKERS.find(({ marker }) => marker === lastOpenMarker && text.startsWith(marker, index))
      : undefined;
    const markerDef = closingMarkerDef ?? FORMAT_MARKERS.find(({ marker }) => text.startsWith(marker, index));
    if (markerDef) {
      const { marker, tag } = markerDef;
      const hasClosingMarkerAhead = text.indexOf(marker, index + marker.length) !== -1;

      if (lastOpenMarker === marker) {
        htmlParts.push(`</${tag}>`);
        openMarkers.pop();
        index += marker.length;
        sourceToDisplay[index] = visibleOffset;
        continue;
      }

      if (hasClosingMarkerAhead) {
        htmlParts.push(`<${tag}>`);
        openMarkers.push(marker);
        index += marker.length;
        setDisplaySource(visibleOffset, index, { preferLater: true });
        sourceToDisplay[index] = visibleOffset;
        continue;
      }
    }

    htmlParts.push(escapeHtml(text[index]));
    setDisplaySource(visibleOffset, index);
    visibleOffset += 1;
    displayToSource[visibleOffset] = index + 1;
    index += 1;
    sourceToDisplay[index] = visibleOffset;
  }

  while (openMarkers.length > 0) {
    const marker = openMarkers.pop();
    const tag = FORMAT_MARKERS.find((item) => item.marker === marker)?.tag;
    if (tag) {
      htmlParts.push(`</${tag}>`);
    }
  }

  if (displayToSource[visibleOffset] === undefined) {
    displayToSource[visibleOffset] = text.length;
  }

  return {
    html: htmlParts.join(""),
    sourceToDisplay,
    displayToSource,
  };
}

export function displaySelectionToSource(
  text: string,
  selection: SelectionOffsets | null,
): SelectionOffsets | null {
  if (!selection) return null;
  const representation = buildEditorDisplayRepresentation(text);
  const clampDisplayOffset = (offset: number) =>
    Math.max(0, Math.min(offset, representation.displayToSource.length - 1));

  return {
    start: representation.displayToSource[clampDisplayOffset(selection.start)] ?? text.length,
    end: representation.displayToSource[clampDisplayOffset(selection.end)] ?? text.length,
  };
}

export function sourceSelectionToDisplay(
  text: string,
  selection: SelectionOffsets,
): SelectionOffsets {
  const representation = buildEditorDisplayRepresentation(text);
  const clampSourceOffset = (offset: number) =>
    Math.max(0, Math.min(offset, representation.sourceToDisplay.length - 1));

  return {
    start: representation.sourceToDisplay[clampSourceOffset(selection.start)] ?? 0,
    end: representation.sourceToDisplay[clampSourceOffset(selection.end)] ?? 0,
  };
}

export function normalizeEditorText(text: string) {
  return text.replace(/\r\n/g, "\n").replace(/\u00a0/g, " ");
}

export function isBoldElement(node: UnderlineElementLike) {
  if (node.tagName === "STRONG" || node.tagName === "B") return true;
  const fontWeight = `${node.style?.fontWeight ?? ""}`.toLowerCase();
  if (!fontWeight) return false;
  if (fontWeight === "bold" || fontWeight === "bolder") return true;
  const numericWeight = Number.parseInt(fontWeight, 10);
  return Number.isFinite(numericWeight) && numericWeight >= 600;
}

export function isItalicElement(node: UnderlineElementLike) {
  if (node.tagName === "EM" || node.tagName === "I") return true;
  return `${node.style?.fontStyle ?? ""}`.toLowerCase().includes("italic");
}

export function isUnderlineElement(node: UnderlineElementLike) {
  if (node.tagName === "U") return true;
  if (node.classList?.contains("editor-format-underline")) return true;
  const textDecoration = `${node.style?.textDecoration ?? ""} ${node.style?.textDecorationLine ?? ""}`.toLowerCase();
  return textDecoration.includes("underline");
}

export function wrapSerializedInlineContent(
  content: string,
  options: { bold?: boolean; italic?: boolean; underline?: boolean },
) {
  let nextContent = content;
  if (options.underline) nextContent = `__${nextContent}__`;
  if (options.italic) {
    const italicMarker = options.underline ? "*" : "_";
    nextContent = `${italicMarker}${nextContent}${italicMarker}`;
  }
  if (options.bold) nextContent = `**${nextContent}**`;
  return nextContent;
}

export function serializeFormattedInlineContent(content: string, node: UnderlineElementLike) {
  const bold = isBoldElement(node);
  const italic = isItalicElement(node);
  const underline = isUnderlineElement(node);
  if (bold || italic || underline) {
    return wrapSerializedInlineContent(content, { bold, italic, underline });
  }
  return content;
}

export function serializeEditorDom(root: HTMLElement): string {
  const serializeNode = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return normalizeEditorText(node.textContent ?? "");
    }

    if (node.nodeName === "BR") {
      return "\n";
    }

    if (!(node instanceof HTMLElement)) {
      return "";
    }

    const content = Array.from(node.childNodes).map(serializeNode).join("");
    return serializeFormattedInlineContent(content, node);
  };

  return normalizeEditorText(Array.from(root.childNodes).map(serializeNode).join(""));
}

export function trimTypewriterCommit(text: string) {
  return normalizeEditorText(text).replace(/\n+$/, "");
}

export function appendTypewriterCommit(base: string, draft: string) {
  const nextDraft = trimTypewriterCommit(draft);
  if (!nextDraft) return normalizeEditorText(base);

  const nextBase = normalizeEditorText(base);
  if (!nextBase) return nextDraft;
  if (nextBase.endsWith("\n")) return `${nextBase}${nextDraft}`;
  return `${nextBase}\n${nextDraft}`;
}

function getChildIndex(node: Node) {
  let index = 0;
  let current = node.previousSibling;
  while (current) {
    index += 1;
    current = current.previousSibling;
  }
  return index;
}

export function getSelectionOffsets(root: HTMLElement): SelectionOffsets | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) {
    return null;
  }

  const startRange = range.cloneRange();
  startRange.selectNodeContents(root);
  startRange.setEnd(range.startContainer, range.startOffset);

  const endRange = range.cloneRange();
  endRange.selectNodeContents(root);
  endRange.setEnd(range.endContainer, range.endOffset);

  return {
    start: normalizeEditorText(startRange.toString()).length,
    end: normalizeEditorText(endRange.toString()).length,
  };
}

function resolveCaretPosition(root: HTMLElement, offset: number) {
  let remaining = offset;

  for (const node of Array.from(root.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      const length = node.textContent?.length ?? 0;
      if (remaining <= length) {
        return { node, offset: remaining };
      }
      remaining -= length;
      continue;
    }

    if (node.nodeName === "BR") {
      if (remaining === 0) {
        const index = getChildIndex(node);
        return { node: root, offset: index };
      }
      remaining -= 1;
      if (remaining === 0) {
        const index = getChildIndex(node);
        return { node: root, offset: index + 1 };
      }
    }
  }

  return { node: root, offset: root.childNodes.length };
}

export function setSelectionOffsets(root: HTMLElement, start: number, end: number) {
  const selection = window.getSelection();
  if (!selection) return;

  const range = document.createRange();
  const startPosition = resolveCaretPosition(root, start);
  const endPosition = resolveCaretPosition(root, end);

  range.setStart(startPosition.node, startPosition.offset);
  range.setEnd(endPosition.node, endPosition.offset);
  selection.removeAllRanges();
  selection.addRange(range);
}

export function replaceRange(text: string, start: number, end: number, replacement: string) {
  return text.slice(0, start) + replacement + text.slice(end);
}

function getSelectedLineBlockRange(text: string, selection: SelectionOffsets) {
  const start = text.lastIndexOf("\n", Math.max(0, selection.start - 1)) + 1;
  const endSearchFrom = Math.max(selection.end - 1, start);
  const endIndex = text.indexOf("\n", endSearchFrom);
  const end = endIndex === -1 ? text.length : endIndex + 1;

  return { start, end };
}

function stripKnownLinePrefix(line: string) {
  return line
    .replace(/^>\s*Note:\s*/i, "")
    .replace(/^\d+[\.\)]\s+/, "")
    .replace(/^##\s+/, "")
    .replace(/^#\s+/, "")
    .replace(/^(?:-|[*\u2022\u25cf\u25e6])\s+/, "")
    .replace(/^>\s?/, "");
}

function getCurrentLinePrefix(line: string) {
  const noteMatch = line.match(/^>\s*Note:\s*/i);
  if (noteMatch) return noteMatch[0];

  const orderedMatch = line.match(/^\d+[\.\)]\s+/);
  if (orderedMatch) return orderedMatch[0];

  const bulletMatch = line.match(/^(?:-|[*\u2022\u25cf\u25e6])\s+/);
  if (bulletMatch) return bulletMatch[0];

  const quoteMatch = line.match(/^>\s?/);
  if (quoteMatch) return quoteMatch[0];

  return ["## ", "# "].find((prefix) => line.startsWith(prefix)) ?? "";
}

export function toggleLinePrefix(text: string, selection: SelectionOffsets, prefix: string) {
  const lineStart = text.lastIndexOf("\n", Math.max(0, selection.start - 1)) + 1;
  const lineEndCandidate = text.indexOf("\n", selection.end);
  const lineEnd = lineEndCandidate === -1 ? text.length : lineEndCandidate;
  const segment = text.slice(lineStart, lineEnd);
  const lines = segment.split("\n");
  const isOrderedPrefix = prefix === "1. ";
  const isBulletPrefix = prefix === "- ";
  const isQuotePrefix = prefix === "> ";
  const firstNoteLineIndex = isQuotePrefix ? lines.findIndex((line) => /^>\s*Note:\s*/i.test(line)) : -1;
  const everyLineHasPrefix = lines.every((line, index) =>
    isOrderedPrefix
      ? isOrderedListLine(line)
      : isBulletPrefix
        ? isBulletListLine(line)
        : isQuotePrefix
          ? isQuoteLine(line)
          : line.startsWith(prefix),
  );

  const updatedLines = lines
    .map((line, index) => {
      const normalized = stripKnownLinePrefix(line);
      if (everyLineHasPrefix) {
        if (isQuotePrefix && firstNoteLineIndex !== -1 && index >= firstNoteLineIndex) {
          return normalized.length > 0 ? `> ${normalized}` : ">";
        }
        if (isQuotePrefix && /^>\s*Note:\s*/i.test(line)) {
          return normalized.length > 0 ? `> ${normalized}` : ">";
        }
        return normalized;
      }
      if (isOrderedPrefix) {
        return `${index + 1}. ${normalized}`;
      }
      return `${prefix}${normalized}`;
    });
  const updated = updatedLines.join("\n");

  const firstLineDelta = (updatedLines[0]?.length ?? 0) - (lines[0]?.length ?? 0);
  const delta = updated.length - segment.length;
  const nextText = replaceRange(text, lineStart, lineEnd, updated);
  const nextStart = Math.max(lineStart, selection.start + firstLineDelta);
  const nextEnd = Math.max(nextStart, selection.end + delta);

  return {
    text: nextText,
    selection: {
      start: nextStart,
      end: nextEnd,
    },
  };
}

export function continueBlockPrefix(text: string, selection: SelectionOffsets) {
  const lineStart = text.lastIndexOf("\n", Math.max(0, selection.start - 1)) + 1;
  const lineEndCandidate = text.indexOf("\n", selection.start);
  const lineEnd = lineEndCandidate === -1 ? text.length : lineEndCandidate;
  const currentLine = text.slice(lineStart, lineEnd);
  const currentPrefix = getCurrentLinePrefix(currentLine);

  const orderedMatch = currentLine.match(/^(\d+)([\.\)])\s+/);
  const blockPrefix = orderedMatch
    ? `${Number.parseInt(orderedMatch[1], 10) + 1}${orderedMatch[2]} `
    : /^>\s*Note:\s*/i.test(currentLine)
      ? "> "
      : isQuoteLine(currentLine)
        ? "> "
      : getCurrentLinePrefix(currentLine);
  if (!blockPrefix) {
    const nextText = replaceRange(text, selection.start, selection.end, "\n");
    const cursor = selection.start + 1;
    return { text: nextText, selection: { start: cursor, end: cursor } };
  }

  const currentPrefixLength = orderedMatch ? orderedMatch[0].length : currentPrefix.length;
  const lineBody = currentLine.slice(currentPrefixLength);
  if (lineBody.trim().length === 0) {
    const nextText = replaceRange(text, lineStart, lineEnd, "");
    const cursor = lineStart;
    return { text: nextText, selection: { start: cursor, end: cursor } };
  }

  const insertion = `\n${blockPrefix}`;
  const nextText = replaceRange(text, selection.start, selection.end, insertion);
  const cursor = selection.start + insertion.length;
  return { text: nextText, selection: { start: cursor, end: cursor } };
}

export function clearCurrentLinePrefix(text: string, selection: SelectionOffsets) {
  const lineStart = text.lastIndexOf("\n", Math.max(0, selection.start - 1)) + 1;
  const lineEndCandidate = text.indexOf("\n", selection.end);
  const lineEnd = lineEndCandidate === -1 ? text.length : lineEndCandidate;
  const currentLine = text.slice(lineStart, lineEnd);
  const currentPrefix = getCurrentLinePrefix(currentLine);
  const isNotePrefix = /^>\s*Note:\s*/i.test(currentLine);

  if (!currentPrefix) {
    return null;
  }

  const normalized = currentLine.slice(currentPrefix.length);
  const nextLine = isNotePrefix ? (normalized.length > 0 ? `> ${normalized}` : ">") : normalized;
  const nextText = replaceRange(text, lineStart, lineEnd, nextLine);
  const delta = nextLine.length - currentLine.length;
  const nextStart = Math.max(lineStart, selection.start + delta);
  const nextEnd = Math.max(nextStart, selection.end + delta);

  return {
    text: nextText,
    selection: {
      start: nextStart,
      end: nextEnd,
    },
    lineStart,
    contentStart: lineStart + currentPrefix.length,
    prefix: currentPrefix,
  };
}

export function duplicateSelectedLineBlock(text: string, selection: SelectionOffsets) {
  const block = getSelectedLineBlockRange(text, selection);
  const blockText = text.slice(block.start, block.end);
  const insertion = block.end === text.length && !blockText.endsWith("\n") ? `\n${blockText}` : blockText;
  const nextText = replaceRange(text, block.end, block.end, insertion);
  const offset = insertion.length;

  return {
    text: nextText,
    selection: {
      start: selection.start + offset,
      end: selection.end + offset,
    },
  };
}

export function moveSelectedLineBlock(text: string, selection: SelectionOffsets, direction: -1 | 1) {
  const block = getSelectedLineBlockRange(text, selection);
  const currentBlock = text.slice(block.start, block.end);

  if (direction < 0) {
    if (block.start === 0) return null;
    const previousEnd = block.start;
    const previousStart = text.lastIndexOf("\n", Math.max(0, previousEnd - 2)) + 1;
    const previousBlock = text.slice(previousStart, previousEnd);
    const nextText = text.slice(0, previousStart) + currentBlock + previousBlock + text.slice(block.end);
    const offset = -previousBlock.length;
    return {
      text: nextText,
      selection: {
        start: selection.start + offset,
        end: selection.end + offset,
      },
    };
  }

  if (block.end >= text.length) return null;
  const nextStart = block.end;
  const nextEndIndex = text.indexOf("\n", nextStart);
  const nextEnd = nextEndIndex === -1 ? text.length : nextEndIndex + 1;
  const nextBlock = text.slice(nextStart, nextEnd);
  const nextText = text.slice(0, block.start) + nextBlock + currentBlock + text.slice(nextEnd);
  const offset = nextBlock.length;
  return {
    text: nextText,
    selection: {
      start: selection.start + offset,
      end: selection.end + offset,
    },
  };
}

export function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function countCharacters(text: string) {
  return text.length;
}

export function normalizePastedText(text: string) {
  const normalized = normalizeEditorText(text)
    .replace(/\t/g, "  ")
    .replace(/\u200b/g, "")
    .replace(/\u2022|\u25cf|\u25e6/g, "- ")
    .replace(/^([ \t]*)[-*][ \t]+/gm, "$1- ")
    .replace(/^([ \t]*)(\d+)[\.\)][ \t]+/gm, "$1$2. ")
    .replace(/^([ \t]*)\u00e2(?!\u201d\u201a)/gm, "$1__WORLDIE_PASTE_PROTECT_A__")
    .replace(/^([ \t]*)\u201d(?!\u201a)/gm, "$1__WORLDIE_PASTE_PROTECT_RDQUOTE__")
    .replace(/^([ \t]*)\u201a/gm, "$1__WORLDIE_PASTE_PROTECT_SQUOTE__")
    .replace(/^[ \t]*[>│|][ \t]?/gm, "> ")
    .replace(/^[ \t]*(?:---|___|\*\*\*)[ \t]*$/gm, "* * *")
    .replace(/\u00a0/g, " ")
    .replace(/^[ \t]*(?:>|\||\u2502|â”‚)[ \t]*/gm, "> ");

  const repaired = normalized
    .replace(/^[ \t]*\u2503[ \t]*/gm, "> ")
    .replace(/__WORLDIE_PASTE_PROTECT_A__/gm, "\u00e2")
    .replace(/__WORLDIE_PASTE_PROTECT_RDQUOTE__/gm, "\u201d")
    .replace(/__WORLDIE_PASTE_PROTECT_SQUOTE__/gm, "\u201a");

  return repaired
    .split("\n")
    .map((line) => line.replace(/\s+$/g, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
}

function serializeInlinePasteNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return normalizeEditorText(node.textContent ?? "");
  }

  if (!(node instanceof HTMLElement)) {
    return "";
  }

  if (node.tagName === "BR") {
    return "\n";
  }

  const content = Array.from(node.childNodes).map(serializeInlinePasteNode).join("");
  return serializeFormattedInlineContent(content, node);
}

function serializeBlockPasteNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return normalizeEditorText(node.textContent ?? "");
  }

  if (!(node instanceof HTMLElement)) {
    return "";
  }

  const tag = node.tagName;
  const inlineContent = () => Array.from(node.childNodes).map(serializeInlinePasteNode).join("");
  const childBlocks = () => Array.from(node.childNodes).map(serializeBlockPasteNode).join("");
  const clean = (text: string) =>
    normalizePastedText(text)
      .split("\n")
      .map((line) => line.trim())
      .join("\n")
      .trim();
  const cleanQuoted = (text: string) =>
    normalizeEditorText(text)
      .replace(/\t/g, "  ")
      .replace(/\u200b/g, "")
      .replace(/\u00a0/g, " ")
      .split("\n")
      .map((line) => line.replace(/\s+$/g, ""))
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  const isBlockPasteElement = (child: Node) =>
    child instanceof HTMLElement &&
    ["UL", "OL", "BLOCKQUOTE", "PRE", "P", "DIV", "SECTION", "ARTICLE", "HEADER", "FOOTER", "H1", "H2", "H3", "HR"].includes(
      child.tagName,
    );
  const buildListItemContent = (child: Element) => {
    const inlineParts: string[] = [];
    const blockParts: string[] = [];

    for (const nestedChild of Array.from(child.childNodes)) {
      if (isBlockPasteElement(nestedChild)) {
        blockParts.push(serializeBlockPasteNode(nestedChild));
      } else {
        inlineParts.push(serializeInlinePasteNode(nestedChild));
      }
    }

    const head = clean(inlineParts.join(""));
    const tail = blockParts
      .map((part) => part.trim())
      .filter(Boolean)
      .join("\n");
    if (head && tail) return `${head}\n${tail}`;
    return head || tail;
  };
  const formatListItem = (prefix: string, content: string) => {
    const normalized = content.trimEnd();
    if (!normalized) return prefix.trimEnd();
    const [firstLine, ...rest] = normalized.split("\n");
    return `${prefix}${firstLine}${rest.map((line) => `\n  ${line}`).join("")}`;
  };
  const getNumericAttribute = (element: Element, name: string) => {
    const value = element.getAttribute(name);
    if (!value) return null;
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  };

  if (tag === "BR") return "\n";
  if (tag === "HR") return "* * *\n\n";
  if (tag === "H1") return `# ${clean(inlineContent())}\n\n`;
  if (tag === "H2" || tag === "H3") return `## ${clean(inlineContent())}\n\n`;
  if (tag === "PRE") {
    const content = normalizeEditorText(inlineContent()).replace(/\s+$/g, "");
    if (!content) return "";
    const protectedContent = content
      .split("\n")
      .map((line) => `${PRE_LINE_PROTECTOR}${line}`)
      .join("\n");
    return `${protectedContent}\n\n`;
  }

  if (tag === "UL") {
    const items = Array.from(node.children)
      .filter((child) => child.tagName === "LI")
      .map((child) => formatListItem("- ", buildListItemContent(child)));
    return items.join("\n") + (items.length > 0 ? "\n\n" : "");
  }

  if (tag === "OL") {
    let nextIndex = getNumericAttribute(node, "start") ?? 1;
    const items = Array.from(node.children)
      .filter((child) => child.tagName === "LI")
      .map((child) => {
        const explicitValue = getNumericAttribute(child, "value");
        const currentIndex = explicitValue ?? nextIndex;
        nextIndex = currentIndex + 1;
        return formatListItem(`${currentIndex}. `, buildListItemContent(child));
      });
    return items.join("\n") + (items.length > 0 ? "\n\n" : "");
  }

  if (tag === "BLOCKQUOTE") {
    const quoted = cleanQuoted(childBlocks());
    if (!quoted) return "";
    return (
      quoted
        .split("\n")
        .map((line) => (line.length > 0 ? `${QUOTE_LINE_PROTECTOR}> ${line}` : `${QUOTE_LINE_PROTECTOR}>`))
        .join("\n") + "\n\n"
    );
  }

  if (["P", "DIV", "SECTION", "ARTICLE", "HEADER", "FOOTER"].includes(tag)) {
    const content = clean(childBlocks());
    return content ? `${content}\n\n` : "";
  }

  if (tag === "LI") {
    return clean(childBlocks());
  }

  return serializeInlinePasteNode(node);
}

export function extractEditorTextFromHtml(html: string) {
  const container = document.createElement("div");
  container.innerHTML = html;
  const serialized = Array.from(container.childNodes).map(serializeBlockPasteNode).join("");
  return normalizePastedText(serialized)
    .replace(new RegExp(`^${PRE_LINE_PROTECTOR}`, "gm"), "")
    .replace(new RegExp(`^${QUOTE_LINE_PROTECTOR}`, "gm"), "")
    .trimEnd();
}

export function resolvePastedEditorText(options: {
  html?: string;
  plainText?: string;
  fallbackPlainText?: string;
}) {
  if (options.html) {
    const extracted = extractEditorTextFromHtml(options.html);
    if (extracted) {
      return extracted;
    }
  }

  const fallbackText = options.plainText || options.fallbackPlainText || "";
  return normalizePastedText(fallbackText);
}

export function getSelectionText(text: string, selection: SelectionOffsets | null) {
  if (!selection || selection.start === selection.end) return "";
  return text.slice(selection.start, selection.end);
}

function getInlineMarkersAtOffset(text: string, offset: number) {
  const openMarkers: string[] = [];
  let index = 0;

  while (index < text.length) {
    if (index === offset) {
      return new Set(openMarkers);
    }

    if (text[index] === "\n") {
      index += 1;
      continue;
    }

    const lastOpenMarker = openMarkers[openMarkers.length - 1];
    const closingMarkerDef = lastOpenMarker
      ? FORMAT_MARKERS.find(({ marker }) => marker === lastOpenMarker && text.startsWith(marker, index))
      : undefined;
    const markerDef = closingMarkerDef ?? FORMAT_MARKERS.find(({ marker }) => text.startsWith(marker, index));
    if (markerDef) {
      const { marker } = markerDef;
      const hasClosingMarkerAhead = text.indexOf(marker, index + marker.length) !== -1;

      if (lastOpenMarker === marker) {
        openMarkers.pop();
        index += marker.length;
        continue;
      }

      if (hasClosingMarkerAhead) {
        openMarkers.push(marker);
        index += marker.length;
        continue;
      }
    }

    index += 1;
  }

  return new Set(openMarkers);
}

function isMarkerActiveAcrossSelection(text: string, selection: SelectionOffsets | null, marker: string) {
  if (!selection) return false;
  const startMarkers = getInlineMarkersAtOffset(text, selection.start);
  const endMarkers = getInlineMarkersAtOffset(text, selection.end);
  return startMarkers.has(marker) && endMarkers.has(marker);
}

function getCurrentLine(text: string, selection: SelectionOffsets | null) {
  if (!selection) return "";
  const lineStart = text.lastIndexOf("\n", Math.max(0, selection.start - 1)) + 1;
  const lineEndCandidate = text.indexOf("\n", selection.start);
  const lineEnd = lineEndCandidate === -1 ? text.length : lineEndCandidate;
  return text.slice(lineStart, lineEnd);
}

function isLineWithinNoteBlock(text: string, selection: SelectionOffsets | null) {
  if (!selection) return false;

  const lineStart = text.lastIndexOf("\n", Math.max(0, selection.start - 1)) + 1;
  const lineEndCandidate = text.indexOf("\n", selection.start);
  const lineEnd = lineEndCandidate === -1 ? text.length : lineEndCandidate;
  const currentLine = text.slice(lineStart, lineEnd);

  if (!isQuoteLine(currentLine)) return false;
  if (/^>\s*Note:\s*/i.test(currentLine)) return true;

  let previousLineEnd = Math.max(0, lineStart - 1);
  while (previousLineEnd >= 0) {
    const previousLineStart = text.lastIndexOf("\n", Math.max(0, previousLineEnd - 1)) + 1;
    const previousLine = text.slice(previousLineStart, previousLineEnd);
    if (!isQuoteLine(previousLine)) return false;
    if (/^>\s*Note:\s*/i.test(previousLine)) return true;
    if (previousLineStart === 0) return false;
    previousLineEnd = previousLineStart - 1;
  }

  return false;
}

function isBulletListLine(line: string) {
  return /^[-*\u2022\u25cf\u25e6]\s+/.test(line.trimStart());
}

function isOrderedListLine(line: string) {
  return /^\d+[\.\)]\s+/.test(line.trimStart());
}

function isQuoteLine(line: string) {
  return /^>\s?.*$/.test(line);
}

function isSceneBreakLine(line: string) {
  return /^(\* \* \*|---|___|\*\*\*)$/.test(line.trim());
}

export function getFormattingState(text: string, selection: SelectionOffsets | null): EditorFormattingState {
  const line = getCurrentLine(text, selection);
  const noteBlock = isLineWithinNoteBlock(text, selection);
  return {
    bold: isMarkerActiveAcrossSelection(text, selection, "**"),
    italic:
      isMarkerActiveAcrossSelection(text, selection, "_") ||
      isMarkerActiveAcrossSelection(text, selection, "*"),
    underline: isMarkerActiveAcrossSelection(text, selection, "__"),
    heading1: line.startsWith("# "),
    heading2: line.startsWith("## "),
    list: isBulletListLine(line),
    orderedList: isOrderedListLine(line),
    quote: isQuoteLine(line) && !noteBlock,
    noteBlock,
    sceneBreak: isSceneBreakLine(line),
  };
}

export function getSlashCommandMatch(text: string, selection: SelectionOffsets | null): SlashCommandMatch | null {
  if (!selection || selection.start !== selection.end) return null;
  const cursor = selection.start;
  const beforeCursor = text.slice(0, cursor);
  const slashIndex = beforeCursor.lastIndexOf("/");
  if (slashIndex === -1) return null;

  const between = beforeCursor.slice(slashIndex + 1);
  const prevChar = slashIndex > 0 ? beforeCursor[slashIndex - 1] : "";
  if (prevChar && !/\s/.test(prevChar)) return null;
  if (/\s/.test(between)) return null;

  return {
    start: slashIndex,
    end: cursor,
    query: between.toLowerCase(),
  };
}

function isStandaloneInlineMarker(text: string, index: number, marker: string) {
  if (marker.length !== 1) return true;
  const prevChar = text[index - 1] ?? "";
  const nextChar = text[index + 1] ?? "";
  return prevChar !== marker && nextChar !== marker;
}

function findInlinePairContext(text: string, cursor: number, pair: InlinePairDefinition) {
  if (text.slice(cursor, cursor + pair.close.length) !== pair.close) return null;

  if (pair.open === pair.close) {
    let activeOpenIndex = -1;
    let searchIndex = 0;

    while (true) {
      const markerIndex = text.indexOf(pair.open, searchIndex);
      if (markerIndex === -1 || markerIndex >= cursor) break;
      if (!isStandaloneInlineMarker(text, markerIndex, pair.open)) {
        searchIndex = markerIndex + 1;
        continue;
      }

      activeOpenIndex = activeOpenIndex === -1 ? markerIndex : -1;
      searchIndex = markerIndex + pair.open.length;
    }

    if (activeOpenIndex !== -1 && cursor > activeOpenIndex + pair.open.length) {
      return {
        openStart: activeOpenIndex,
        openEnd: activeOpenIndex + pair.open.length,
        closeStart: cursor,
        closeEnd: cursor + pair.close.length,
      };
    }

    return null;
  }

  const beforeCursor = text.slice(0, cursor);
  const openIndex = beforeCursor.lastIndexOf(pair.open);
  if (openIndex === -1) return null;

  const closeBeforeCursor = beforeCursor.lastIndexOf(pair.close);
  if (closeBeforeCursor > openIndex) return null;
  if (cursor <= openIndex + pair.open.length) return null;

  return {
    openStart: openIndex,
    openEnd: openIndex + pair.open.length,
    closeStart: cursor,
    closeEnd: cursor + pair.close.length,
  };
}

export function findActiveInlinePairExit(text: string, cursor: number) {
  const context = findInlinePairContext(text, cursor, LORE_LINK_PAIR);
  if (!context) return null;
  return {
    pair: LORE_LINK_PAIR,
    nextCursor: context.closeEnd,
  };
}

export function findEmptyInlinePairAtCursor(text: string, cursor: number) {
  if (text.slice(cursor - LORE_LINK_PAIR.open.length, cursor) !== LORE_LINK_PAIR.open) return null;
  if (text.slice(cursor, cursor + LORE_LINK_PAIR.close.length) !== LORE_LINK_PAIR.close) return null;

  return {
    pair: LORE_LINK_PAIR,
    start: cursor - LORE_LINK_PAIR.open.length,
    end: cursor + LORE_LINK_PAIR.close.length,
  };
}

export function findInlinePairAutoInsert(text: string, selection: SelectionOffsets, key: string) {
  if (selection.start !== selection.end) return null;
  if (key !== "[") return null;

  const prevChar = text.slice(selection.start - 1, selection.start);
  const nextChars = text.slice(selection.start, selection.start + 2);
  if (prevChar === "[" && nextChars !== "]]") {
    return {
      replaceStart: Math.max(0, selection.start - 1),
      replaceEnd: selection.end,
      insertion: "[[]]",
      cursor: selection.start + 1,
    };
  }

  return null;
}

function renderInlinePreview(
  text: string,
  linkedLoreByTitle: Map<string, LorePage>,
  onOpenLore: (page: LorePage) => void,
  keyPrefix: string,
): ReactNode[] {
  const parts: ReactNode[] = [];
  const pattern = /(\[\[[^\]]+\]\]|__\*\*_[^*]+_\*\*__|_\*\*__[^*]+__\*\*_|\*\*__\*[^*]+\*__\*\*|\*__\*\*[^*]+\*\*__\*|___[^_]+___|\*\*\*__[^*]+__\*\*\*|\*\*\*[^*]+\*\*\*|\*\*__[^*]+__\*\*|\*\*_[^*]+_\*\*|\*__[^*]+__\*|__[^_]+__|\*\*[^*]+\*\*|_[^_]+_|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={`${keyPrefix}-text-${lastIndex}`}>{text.slice(lastIndex, match.index)}</span>);
    }

    const token = match[0];
    if (token.startsWith("[[")) {
      const label = token.slice(2, -2);
      const page = linkedLoreByTitle.get(label.trim().toLowerCase());
      parts.push(
        page ? (
          <button
            key={`${keyPrefix}-lore-${match.index}`}
            className="editor-inline-link"
            type="button"
            onClick={() => onOpenLore(page)}
          >
            {label}
          </button>
        ) : (
          <span key={`${keyPrefix}-missing-${match.index}`} className="editor-inline-link unresolved">
            {label}
          </span>
        ),
      );
    } else if (token.startsWith("__**_") && token.endsWith("_**__")) {
      parts.push(
        <span key={`${keyPrefix}-underline-bold-italic-${match.index}`} className="editor-preview-underline">
          {renderInlinePreview(token.slice(2, -2), linkedLoreByTitle, onOpenLore, `${keyPrefix}-ubi-${match.index}`)}
        </span>,
      );
    } else if (token.startsWith("_**__") && token.endsWith("__**_")) {
      parts.push(
        <em key={`${keyPrefix}-italic-bold-underline-${match.index}`}>
          {renderInlinePreview(token.slice(1, -1), linkedLoreByTitle, onOpenLore, `${keyPrefix}-ibu-${match.index}`)}
        </em>,
      );
    } else if (token.startsWith("**__*") && token.endsWith("*__**")) {
      parts.push(
        <strong key={`${keyPrefix}-bold-underline-italic-${match.index}`}>
          <span className="editor-preview-underline">
            <em>
              {renderInlinePreview(token.slice(5, -5), linkedLoreByTitle, onOpenLore, `${keyPrefix}-bui-${match.index}`)}
            </em>
          </span>
        </strong>,
      );
    } else if (token.startsWith("*__**") && token.endsWith("**__*")) {
      parts.push(
        <em key={`${keyPrefix}-italic-underline-bold-${match.index}`}>
          <span className="editor-preview-underline">
            <strong>
              {renderInlinePreview(token.slice(5, -5), linkedLoreByTitle, onOpenLore, `${keyPrefix}-iub-${match.index}`)}
            </strong>
          </span>
        </em>,
      );
    } else if (token.startsWith("___") && token.endsWith("___")) {
      parts.push(
        <span key={`${keyPrefix}-italic-underline-underscore-${match.index}`} className="editor-preview-underline">
          <em>{renderInlinePreview(token.slice(3, -3), linkedLoreByTitle, onOpenLore, `${keyPrefix}-iuu-${match.index}`)}</em>
        </span>,
      );
    } else if (token.startsWith("***__") && token.endsWith("__***")) {
      parts.push(
        <strong key={`${keyPrefix}-bold-italic-underline-${match.index}`}>
          <em>
            <span className="editor-preview-underline">
              {renderInlinePreview(token.slice(5, -5), linkedLoreByTitle, onOpenLore, `${keyPrefix}-biu-${match.index}`)}
            </span>
          </em>
        </strong>,
      );
    } else if (token.startsWith("***") && token.endsWith("***")) {
      parts.push(
        <strong key={`${keyPrefix}-bold-italic-star-${match.index}`}>
          <em>{renderInlinePreview(token.slice(3, -3), linkedLoreByTitle, onOpenLore, `${keyPrefix}-bis-${match.index}`)}</em>
        </strong>,
      );
    } else if (token.startsWith("**__") && token.endsWith("__**")) {
      parts.push(
        <strong key={`${keyPrefix}-bold-underline-${match.index}`}>
          <span className="editor-preview-underline">
            {renderInlinePreview(token.slice(4, -4), linkedLoreByTitle, onOpenLore, `${keyPrefix}-bu-${match.index}`)}
          </span>
        </strong>,
      );
    } else if (token.startsWith("**_") && token.endsWith("_**")) {
      parts.push(
        <strong key={`${keyPrefix}-bold-italic-${match.index}`}>
          <em>{renderInlinePreview(token.slice(3, -3), linkedLoreByTitle, onOpenLore, `${keyPrefix}-bi-${match.index}`)}</em>
        </strong>,
      );
    } else if (token.startsWith("*__") && token.endsWith("__*")) {
      parts.push(
        <em key={`${keyPrefix}-italic-underline-${match.index}`}>
          <span className="editor-preview-underline">
            {renderInlinePreview(token.slice(3, -3), linkedLoreByTitle, onOpenLore, `${keyPrefix}-iu-${match.index}`)}
          </span>
        </em>,
      );
    } else if (token.startsWith("**")) {
      parts.push(
        <strong key={`${keyPrefix}-bold-${match.index}`}>
          {renderInlinePreview(token.slice(2, -2), linkedLoreByTitle, onOpenLore, `${keyPrefix}-bold-${match.index}`)}
        </strong>,
      );
    } else if (token.startsWith("__")) {
      parts.push(
        <span key={`${keyPrefix}-underline-${match.index}`} className="editor-preview-underline">
          {renderInlinePreview(token.slice(2, -2), linkedLoreByTitle, onOpenLore, `${keyPrefix}-underline-${match.index}`)}
        </span>,
      );
    } else if (token.startsWith("*")) {
      parts.push(
        <em key={`${keyPrefix}-italic-star-${match.index}`}>
          {renderInlinePreview(token.slice(1, -1), linkedLoreByTitle, onOpenLore, `${keyPrefix}-italic-star-${match.index}`)}
        </em>,
      );
    } else if (token.startsWith("_")) {
      parts.push(
        <em key={`${keyPrefix}-italic-${match.index}`}>
          {renderInlinePreview(token.slice(1, -1), linkedLoreByTitle, onOpenLore, `${keyPrefix}-italic-${match.index}`)}
        </em>,
      );
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(<span key={`${keyPrefix}-tail-${lastIndex}`}>{text.slice(lastIndex)}</span>);
  }

  return parts;
}

export function renderPreviewContent(
  text: string,
  linkedLoreByTitle: Map<string, LorePage>,
  onOpenLore: (page: LorePage) => void,
) {
  const lines = text.split("\n");
  const blocks: ReactNode[] = [];
  let listLineBuffer: Array<{ kind: "ul" | "ol"; indent: number; text: string; value?: number }> = [];
  let quoteLineBuffer: string[] = [];
  let noteLineBuffer: string[] = [];

  const renderPreviewListNodes = (
    nodes: Array<{ kind: "ul" | "ol"; text: string; value?: number; children: Array<any> }>,
    keyPrefix: string,
  ): ReactNode[] => {
    const groups: Array<{ kind: "ul" | "ol"; items: Array<{ kind: "ul" | "ol"; text: string; value?: number; children: Array<any> }> }> = [];

    for (const node of nodes) {
      const currentGroup = groups[groups.length - 1];
      if (!currentGroup || currentGroup.kind !== node.kind) {
        groups.push({ kind: node.kind, items: [node] });
      } else {
        currentGroup.items.push(node);
      }
    }

    return groups.map((group, groupIndex) => {
      if (group.kind === "ol") {
        const listStart = group.items[0]?.value ?? 1;
        return (
          <ol
            key={`${keyPrefix}-ol-${groupIndex}`}
            className="editor-preview-list editor-preview-list-ordered"
            start={listStart}
          >
            {group.items.map((item, itemIndex) => (
              <li
                key={`${keyPrefix}-ol-item-${groupIndex}-${itemIndex}`}
                value={
                  itemIndex === 0 || item.value === undefined
                    ? undefined
                    : item.value === (group.items[itemIndex - 1]?.value ?? item.value - 1) + 1
                    ? undefined
                    : item.value
                }
              >
                <span>
                  {renderInlinePreview(item.text, linkedLoreByTitle, onOpenLore, `${keyPrefix}-ol-${groupIndex}-${itemIndex}`)}
                </span>
                {item.children.length > 0
                  ? renderPreviewListNodes(item.children, `${keyPrefix}-ol-${groupIndex}-${itemIndex}-children`)
                  : null}
              </li>
            ))}
          </ol>
        );
      }

      return (
        <ul key={`${keyPrefix}-ul-${groupIndex}`} className="editor-preview-list">
          {group.items.map((item, itemIndex) => (
            <li key={`${keyPrefix}-ul-item-${groupIndex}-${itemIndex}`}>
              <span>
                {renderInlinePreview(item.text, linkedLoreByTitle, onOpenLore, `${keyPrefix}-ul-${groupIndex}-${itemIndex}`)}
              </span>
              {item.children.length > 0
                ? renderPreviewListNodes(item.children, `${keyPrefix}-ul-${groupIndex}-${itemIndex}-children`)
                : null}
            </li>
          ))}
        </ul>
      );
    });
  };

  const flushLists = () => {
    if (listLineBuffer.length === 0) return;

    const roots: Array<{ kind: "ul" | "ol"; text: string; value?: number; children: Array<any> }> = [];
    const stack: Array<{ indent: number; nodes: Array<any> }> = [];

    for (const entry of listLineBuffer) {
      while (stack.length > 0 && entry.indent < stack[stack.length - 1].indent) {
        stack.pop();
      }

      if (stack.length === 0) {
        stack.push({ indent: entry.indent, nodes: roots });
      } else if (entry.indent > stack[stack.length - 1].indent) {
        const parent = stack[stack.length - 1].nodes[stack[stack.length - 1].nodes.length - 1];
        if (parent) {
          stack.push({ indent: entry.indent, nodes: parent.children });
        }
      }

      const targetNodes = stack[stack.length - 1]?.nodes ?? roots;
      targetNodes.push({
        kind: entry.kind,
        text: entry.text,
        value: entry.value,
        children: [],
      });
    }

    blocks.push(...renderPreviewListNodes(roots, `list-${blocks.length}`));
    listLineBuffer = [];
  };

  const flushQuotes = () => {
    if (quoteLineBuffer.length === 0) return;

    const quoteChildren: ReactNode[] = [];
    quoteLineBuffer.forEach((line, index) => {
      if (index > 0) {
        quoteChildren.push(<br key={`quote-${blocks.length}-break-${index}`} />);
      }
      if (line.length > 0) {
        quoteChildren.push(
          <span key={`quote-${blocks.length}-line-${index}`}>
            {renderInlinePreview(line, linkedLoreByTitle, onOpenLore, `quote-${blocks.length}-${index}`)}
          </span>,
        );
      }
    });

    blocks.push(
      <blockquote key={`quote-${blocks.length}`} className="editor-preview-quote">
        {quoteChildren}
      </blockquote>,
    );
    quoteLineBuffer = [];
  };

  const flushNote = () => {
    if (noteLineBuffer.length === 0) return;

    const noteChildren: ReactNode[] = [];
    noteLineBuffer.forEach((line, index) => {
      if (index > 0) {
        noteChildren.push(<br key={`note-${blocks.length}-break-${index}`} />);
      }
      if (line.length > 0) {
        noteChildren.push(
          <span key={`note-${blocks.length}-line-${index}`}>
            {renderInlinePreview(line, linkedLoreByTitle, onOpenLore, `note-${blocks.length}-${index}`)}
          </span>,
        );
      }
    });

    blocks.push(
      <div key={`note-${blocks.length}`} className="editor-preview-note">
        <div className="editor-preview-note-label">Note</div>
        <div className="editor-preview-note-body">{noteChildren}</div>
      </div>,
    );
    noteLineBuffer = [];
  };

  lines.forEach((line, index) => {
    const noteMatch = line.match(/^>\s*Note:\s*(.*)$/i);
    if (noteMatch) {
      flushLists();
      flushQuotes();
      flushNote();
      noteLineBuffer.push(noteMatch[1]);
      return;
    }

    const quoteMatch = line.match(/^>\s?(.*)$/);
    if (quoteMatch) {
      flushLists();
      if (noteLineBuffer.length > 0) {
        noteLineBuffer.push(quoteMatch[1]);
      } else {
        quoteLineBuffer.push(quoteMatch[1]);
      }
      return;
    }

    flushNote();
    const bulletMatch = line.match(/^(\s*)(?:-|[*\u2022\u25cf\u25e6])\s+(.*)$/);
    if (bulletMatch) {
      flushQuotes();
      listLineBuffer.push({
        kind: "ul",
        indent: bulletMatch[1].length,
        text: bulletMatch[2],
      });
      return;
    }

    const orderedMatch = line.match(/^(\s*)(\d+)[\.\)]\s+(.*)$/);
    if (orderedMatch) {
      flushQuotes();
      listLineBuffer.push({
        kind: "ol",
        indent: orderedMatch[1].length,
        value: Number.parseInt(orderedMatch[2], 10),
        text: orderedMatch[3],
      });
      return;
    }

    flushNote();
    flushQuotes();
    flushLists();

    if (line.startsWith("## ")) {
      blocks.push(
        <h2 key={`h2-${index}`} className="editor-preview-heading editor-preview-heading-secondary">
          {renderInlinePreview(line.slice(3), linkedLoreByTitle, onOpenLore, `h2-${index}`)}
        </h2>,
      );
      return;
    }

    if (line.startsWith("# ")) {
      blocks.push(
        <h1 key={`h1-${index}`} className="editor-preview-heading">
          {renderInlinePreview(line.slice(2), linkedLoreByTitle, onOpenLore, `h1-${index}`)}
        </h1>,
      );
      return;
    }

    if (isSceneBreakLine(line)) {
      blocks.push(<div key={`break-${index}`} className="editor-preview-scene-break" />);
      return;
    }

    if (!line.trim()) {
      blocks.push(<div key={`space-${index}`} className="editor-preview-spacer" />);
      return;
    }

    blocks.push(
      <p key={`p-${index}`} className="editor-preview-paragraph">
        {renderInlinePreview(line, linkedLoreByTitle, onOpenLore, `p-${index}`)}
      </p>,
    );
  });

  flushNote();
  flushQuotes();
  flushLists();
  return blocks;
}
