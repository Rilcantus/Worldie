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
  quote: boolean;
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
  const displayToSource: number[] = [0];
  const openMarkers: string[] = [];
  let visibleOffset = 0;
  let index = 0;

  const ensureDisplaySource = (offset: number, sourceOffset: number) => {
    if (displayToSource[offset] === undefined) {
      displayToSource[offset] = sourceOffset;
    }
  };

  while (index < text.length) {
    sourceToDisplay[index] = visibleOffset;

    if (text[index] === "\n") {
      htmlParts.push("<br>");
      ensureDisplaySource(visibleOffset, index);
      visibleOffset += 1;
      displayToSource[visibleOffset] = index + 1;
      index += 1;
      sourceToDisplay[index] = visibleOffset;
      continue;
    }

    const markerDef = FORMAT_MARKERS.find(({ marker }) => text.startsWith(marker, index));
    if (markerDef) {
      const { marker, tag } = markerDef;
      const lastOpenMarker = openMarkers[openMarkers.length - 1];
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
        ensureDisplaySource(visibleOffset, index);
        sourceToDisplay[index] = visibleOffset;
        continue;
      }
    }

    htmlParts.push(escapeHtml(text[index]));
    ensureDisplaySource(visibleOffset, index);
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

    if (node.tagName === "STRONG" || node.tagName === "B") return `**${content}**`;
    if (node.tagName === "EM" || node.tagName === "I") return `_${content}_`;
    if (node.tagName === "U") return `__${content}__`;
    if (node.classList.contains("editor-format-underline")) return `__${content}__`;

    return content;
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

export function toggleLinePrefix(text: string, selection: SelectionOffsets, prefix: string) {
  const lineStart = text.lastIndexOf("\n", Math.max(0, selection.start - 1)) + 1;
  const lineEndCandidate = text.indexOf("\n", selection.end);
  const lineEnd = lineEndCandidate === -1 ? text.length : lineEndCandidate;
  const segment = text.slice(lineStart, lineEnd);
  const lines = segment.split("\n");
  const everyLineHasPrefix = lines.every((line) => line.startsWith(prefix));

  const updated = lines
    .map((line) => {
      const normalized = ["## ", "# ", "- ", "> "].reduce(
        (current, marker) => (current.startsWith(marker) ? current.slice(marker.length) : current),
        line,
      );
      return everyLineHasPrefix ? normalized : `${prefix}${normalized}`;
    })
    .join("\n");

  const delta = (everyLineHasPrefix ? -prefix.length : prefix.length) * lines.length;
  const nextText = replaceRange(text, lineStart, lineEnd, updated);
  const nextStart = Math.max(lineStart, selection.start + (everyLineHasPrefix ? -prefix.length : prefix.length));
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

  const blockPrefix = ["- ", "> ", "## ", "# "].find((prefix) => currentLine.startsWith(prefix)) ?? "";
  if (!blockPrefix) {
    const nextText = replaceRange(text, selection.start, selection.end, "\n");
    const cursor = selection.start + 1;
    return { text: nextText, selection: { start: cursor, end: cursor } };
  }

  const lineBody = currentLine.slice(blockPrefix.length);
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

export function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function countCharacters(text: string) {
  return text.length;
}

export function getSelectionText(text: string, selection: SelectionOffsets | null) {
  if (!selection || selection.start === selection.end) return "";
  return text.slice(selection.start, selection.end);
}

function isSelectionWrapped(text: string, selection: SelectionOffsets | null, marker: string) {
  if (!selection) return false;
  const before = text.slice(Math.max(0, selection.start - marker.length), selection.start);
  const after = text.slice(selection.end, selection.end + marker.length);
  return before === marker && after === marker;
}

function isSelectionWrappedWithAny(text: string, selection: SelectionOffsets | null, markers: string[]) {
  return markers.some((marker) => isSelectionWrapped(text, selection, marker));
}

function getCurrentLine(text: string, selection: SelectionOffsets | null) {
  if (!selection) return "";
  const lineStart = text.lastIndexOf("\n", Math.max(0, selection.start - 1)) + 1;
  const lineEndCandidate = text.indexOf("\n", selection.start);
  const lineEnd = lineEndCandidate === -1 ? text.length : lineEndCandidate;
  return text.slice(lineStart, lineEnd);
}

export function getFormattingState(text: string, selection: SelectionOffsets | null): EditorFormattingState {
  const line = getCurrentLine(text, selection);
  return {
    bold: isSelectionWrapped(text, selection, "**"),
    italic: isSelectionWrappedWithAny(text, selection, ["_", "*"]),
    underline: isSelectionWrapped(text, selection, "__"),
    heading1: line.startsWith("# "),
    heading2: line.startsWith("## "),
    list: line.startsWith("- "),
    quote: line.startsWith("> "),
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
  const pattern = /(\[\[[^\]]+\]\]|__[^_]+__|\*\*[^*]+\*\*|_[^_]+_|\*[^*]+\*)/g;
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
    } else if (token.startsWith("**")) {
      parts.push(<strong key={`${keyPrefix}-bold-${match.index}`}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("__")) {
      parts.push(
        <span key={`${keyPrefix}-underline-${match.index}`} className="editor-preview-underline">
          {token.slice(2, -2)}
        </span>,
      );
    } else if (token.startsWith("*")) {
      parts.push(<em key={`${keyPrefix}-italic-star-${match.index}`}>{token.slice(1, -1)}</em>);
    } else if (token.startsWith("_")) {
      parts.push(<em key={`${keyPrefix}-italic-${match.index}`}>{token.slice(1, -1)}</em>);
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
  let listBuffer: string[] = [];
  let orderedListBuffer: string[] = [];

  const flushList = () => {
    if (listBuffer.length === 0) return;
    blocks.push(
      <ul key={`list-${blocks.length}`} className="editor-preview-list">
        {listBuffer.map((item, index) => (
          <li key={`list-item-${index}`}>
            {renderInlinePreview(item, linkedLoreByTitle, onOpenLore, `list-${blocks.length}-${index}`)}
          </li>
        ))}
      </ul>,
    );
    listBuffer = [];
  };

  const flushOrderedList = () => {
    if (orderedListBuffer.length === 0) return;
    blocks.push(
      <ol key={`olist-${blocks.length}`} className="editor-preview-list editor-preview-list-ordered">
        {orderedListBuffer.map((item, index) => (
          <li key={`olist-item-${index}`}>
            {renderInlinePreview(item, linkedLoreByTitle, onOpenLore, `olist-${blocks.length}-${index}`)}
          </li>
        ))}
      </ol>,
    );
    orderedListBuffer = [];
  };

  lines.forEach((line, index) => {
    if (line.startsWith("- ")) {
      flushOrderedList();
      listBuffer.push(line.slice(2));
      return;
    }

    const orderedMatch = line.match(/^\d+\.\s+(.*)$/);
    if (orderedMatch) {
      flushList();
      orderedListBuffer.push(orderedMatch[1]);
      return;
    }

    flushList();
    flushOrderedList();

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

    if (line.startsWith("> ")) {
      blocks.push(
        <blockquote key={`quote-${index}`} className="editor-preview-quote">
          {renderInlinePreview(line.slice(2), linkedLoreByTitle, onOpenLore, `quote-${index}`)}
        </blockquote>,
      );
      return;
    }

    if (line.trim() === "* * *") {
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

  flushList();
  flushOrderedList();
  return blocks;
}
