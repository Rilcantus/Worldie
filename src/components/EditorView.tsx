import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent as ReactClipboardEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import type { Document, LorePage } from "../lib/data";
import { resolveLoreLinks } from "../lib/loreLinks";
import type { WorldUI } from "../types/ui";
import { EditorDocumentList } from "./EditorDocumentList";
import { EditorDetailsDrawer } from "./EditorDetailsDrawer";
import { EditorSlashMenu } from "./EditorSlashMenu";
import { EditorSurface } from "./EditorSurface";
import { EditorToolbar } from "./EditorToolbar";
import {
  appendTypewriterCommit,
  buildEditorDisplayRepresentation,
  continueBlockPrefix,
  countCharacters,
  countWords,
  displaySelectionToSource,
  findActiveInlinePairExit,
  findEmptyInlinePairAtCursor,
  findInlinePairAutoInsert,
  getFormattingState,
  getSelectionOffsets,
  getSelectionText,
  getSlashCommandMatch,
  normalizeEditorText,
  renderPreviewContent,
  replaceRange,
  serializeEditorDom,
  setSelectionOffsets,
  sourceSelectionToDisplay,
  toggleLinePrefix,
  trimTypewriterCommit,
  type EditorFormattingState,
  type SelectionOffsets,
  type SlashCommandMatch,
} from "./editorCore";

type EditorViewProps = {
  isDocListCollapsed: boolean;
  isSidebarCollapsed: boolean;
  isRightPanelCollapsed: boolean;
  docListWidth: number;
  documents: Document[];
  availableLorePages: LorePage[];
  activeDocumentId: string | null;
  documentTitle: string;
  documentContent: string;
  documentFolderPath: string;
  documentSaveState: "idle" | "dirty" | "saving" | "saved" | "error";
  activeWorld?: WorldUI;
  onCollapseDocList: () => void;
  onCollapseSidebar: () => void;
  onExpandDocList: () => void;
  onExpandSidebar: () => void;
  onExpandRightPanel: () => void;
  onCollapseRightPanel: () => void;
  onResizeStart: (event: ReactMouseEvent<HTMLDivElement>) => void;
  onAddDocument: () => void;
  onDuplicateDocument: () => void;
  onOpenDocument: (doc: Document) => void;
  onOpenLore: (page: LorePage) => void;
  onRemoveDocument: (docId: string) => void;
  onSave: () => void;
  onTitleChange: (value: string) => void;
  onContentChange: (value: string) => void;
  onFolderPathChange: (value: string) => void;
};

type EditorWidth = "narrow" | "standard" | "wide";
type EditorPresentationMode = "standard" | "typewriter";

type SlashCommandOption = {
  id: string;
  label: string;
  description: string;
  keywords: string[];
};

export function EditorView({
  isDocListCollapsed,
  isSidebarCollapsed,
  isRightPanelCollapsed,
  docListWidth,
  documents,
  availableLorePages,
  activeDocumentId,
  documentTitle,
  documentContent,
  documentFolderPath,
  documentSaveState,
  activeWorld,
  onCollapseDocList,
  onCollapseSidebar,
  onExpandDocList,
  onExpandSidebar,
  onExpandRightPanel,
  onCollapseRightPanel,
  onResizeStart,
  onAddDocument,
  onDuplicateDocument,
  onOpenDocument,
  onOpenLore,
  onRemoveDocument,
  onSave,
  onTitleChange,
  onContentChange,
  onFolderPathChange,
}: EditorViewProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const slashMenuRef = useRef<HTMLDivElement | null>(null);
  const pendingSelectionRef = useRef<SelectionOffsets | null>(null);
  const focusStateRef = useRef<{
    sidebarCollapsed: boolean;
    docListCollapsed: boolean;
    rightPanelCollapsed: boolean;
  } | null>(null);
  const previousFocusModeRef = useRef(false);
  const previousEditorWidthRef = useRef<EditorWidth>("standard");
  const [selectedLorePageId, setSelectedLorePageId] = useState("");
  const [selectionSnapshot, setSelectionSnapshot] = useState<SelectionOffsets | null>(null);
  const [selectedSlashIndex, setSelectedSlashIndex] = useState(0);
  const [dismissedSlashStart, setDismissedSlashStart] = useState<number | null>(null);
  const [slashMenuPosition, setSlashMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [isDocumentMenuOpen, setIsDocumentMenuOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [editorWidth, setEditorWidth] = useState<EditorWidth>("standard");
  const [editorMode, setEditorMode] = useState<EditorPresentationMode>("standard");
  const [typewriterDraft, setTypewriterDraft] = useState("");
  const isTypewriterMode = editorMode === "typewriter";
  const activeEditorText = isTypewriterMode ? typewriterDraft : documentContent;
  const editorDisplay = useMemo(() => buildEditorDisplayRepresentation(activeEditorText), [activeEditorText]);

  const clearSlashSession = (dismissStart: number | null = null) => {
    setSelectedSlashIndex(0);
    setSlashMenuPosition(null);
    setDismissedSlashStart(dismissStart);
  };

  useEffect(() => {
    if (!availableLorePages.some((page) => page.id === selectedLorePageId)) {
      setSelectedLorePageId(availableLorePages[0]?.id ?? "");
    }
  }, [availableLorePages, selectedLorePageId]);

  useEffect(() => {
    setIsDocumentMenuOpen(false);
  }, [activeDocumentId]);

  useEffect(() => {
    setTypewriterDraft("");
    setSelectionSnapshot(null);
    clearSlashSession();
  }, [activeDocumentId]);

  useEffect(() => {
    setSelectionSnapshot(null);
    clearSlashSession();
  }, [editorMode]);

  useEffect(() => {
    const wasFocusMode = previousFocusModeRef.current;

    if (isFocusMode && !wasFocusMode) {
      previousEditorWidthRef.current = editorWidth;
      focusStateRef.current = {
        sidebarCollapsed: isSidebarCollapsed,
        docListCollapsed: isDocListCollapsed,
        rightPanelCollapsed: isRightPanelCollapsed,
      };
      setEditorWidth("wide");
      onCollapseSidebar();
      onCollapseDocList();
      onCollapseRightPanel();
      setIsDetailsOpen(false);
      setIsPreviewOpen(false);
      setIsDocumentMenuOpen(false);
    }

    if (!isFocusMode && wasFocusMode && focusStateRef.current) {
      const previous = focusStateRef.current;
      setEditorWidth(previousEditorWidthRef.current);
      if (!previous.sidebarCollapsed) onExpandSidebar();
      if (!previous.docListCollapsed) onExpandDocList();
      if (!previous.rightPanelCollapsed) onExpandRightPanel();
      focusStateRef.current = null;
    }

    previousFocusModeRef.current = isFocusMode;
  }, [
    isDocListCollapsed,
    editorWidth,
    isFocusMode,
    isRightPanelCollapsed,
    isSidebarCollapsed,
    onCollapseDocList,
    onCollapseRightPanel,
    onCollapseSidebar,
    onExpandDocList,
    onExpandRightPanel,
    onExpandSidebar,
  ]);

  useLayoutEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const currentText = serializeEditorDom(editor);
    const nextText = normalizeEditorText(activeEditorText);
    if (currentText !== nextText) {
      editor.innerHTML = editorDisplay.html;
    }

    const pendingSelection = pendingSelectionRef.current;
    if (pendingSelection) {
      const displaySelection = sourceSelectionToDisplay(nextText, pendingSelection);
      setSelectionOffsets(editor, displaySelection.start, displaySelection.end);
      pendingSelectionRef.current = null;
    }
  }, [activeDocumentId, activeEditorText, editorDisplay.html]);

  useEffect(() => {
    const syncSelection = () => {
      const editor = editorRef.current;
      if (!editor) return;
      const displaySelection = getSelectionOffsets(editor);
      setSelectionSnapshot(displaySelectionToSource(activeEditorText, displaySelection));
    };

    document.addEventListener("selectionchange", syncSelection);
    return () => document.removeEventListener("selectionchange", syncSelection);
  }, [activeEditorText]);

  const { linked: linkedLorePages, unresolved: unresolvedLoreLinks } = useMemo(
    () => resolveLoreLinks(documentContent, availableLorePages),
    [availableLorePages, documentContent],
  );
  const linkedLoreByTitle = useMemo(
    () => new Map(availableLorePages.map((page) => [page.title.trim().toLowerCase(), page])),
    [availableLorePages],
  );
  const editorFormattingState = useMemo(
    () => getFormattingState(activeEditorText, selectionSnapshot),
    [activeEditorText, selectionSnapshot],
  );
  const wordCount = useMemo(() => countWords(documentContent), [documentContent]);
  const characterCount = useMemo(() => countCharacters(documentContent), [documentContent]);
  const selectedText = useMemo(
    () => getSelectionText(activeEditorText, selectionSnapshot),
    [activeEditorText, selectionSnapshot],
  );
  const selectedWordCount = useMemo(() => countWords(selectedText), [selectedText]);
  const readingMinutes = useMemo(() => Math.max(1, Math.ceil(wordCount / 200)), [wordCount]);
  const slashCommandMatch = useMemo(() => {
    const match = getSlashCommandMatch(activeEditorText, selectionSnapshot);
    if (!match) return null;
    if (dismissedSlashStart === match.start) return null;
    return match;
  }, [activeEditorText, dismissedSlashStart, selectionSnapshot]);
  const slashCommands = useMemo<SlashCommandOption[]>(
    () => [
      {
        id: "heading1",
        label: "Heading 1",
        description: "Large section heading",
        keywords: ["h1", "heading", "title", "large"],
      },
      {
        id: "heading2",
        label: "Heading 2",
        description: "Medium section heading",
        keywords: ["h2", "heading", "subtitle", "medium"],
      },
      {
        id: "list",
        label: "Bullet List",
        description: "Start a bullet list",
        keywords: ["list", "bullet", "items"],
      },
      {
        id: "quote",
        label: "Quote",
        description: "Insert a quote block",
        keywords: ["quote", "blockquote", "callout"],
      },
      {
        id: "lore-link",
        label: "Lore Link",
        description: "Insert a wiki-style lore link",
        keywords: ["link", "lore", "wiki"],
      },
      {
        id: "scene-break",
        label: "Scene Break",
        description: "Insert a centered scene break",
        keywords: ["scene", "break", "divider"],
      },
    ],
    [],
  );
  const filteredSlashCommands = useMemo(() => {
    if (!slashCommandMatch) return [];
    const query = slashCommandMatch.query.trim();
    if (!query) return slashCommands;
    return slashCommands.filter((command) =>
      [command.label, command.description, ...command.keywords].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  }, [slashCommandMatch, slashCommands]);
  const renderedPreview = useMemo(
    () => renderPreviewContent(documentContent, linkedLoreByTitle, onOpenLore),
    [documentContent, linkedLoreByTitle, onOpenLore],
  );
  const typewriterRenderedPreview = useMemo(() => {
    const composedText = appendTypewriterCommit(documentContent, typewriterDraft);
    return renderPreviewContent(composedText, linkedLoreByTitle, onOpenLore);
  }, [documentContent, linkedLoreByTitle, onOpenLore, typewriterDraft]);

  useEffect(() => {
    if (!slashCommandMatch) {
      setSelectedSlashIndex(0);
      setSlashMenuPosition(null);
      setDismissedSlashStart(null);
      return;
    }
    setSelectedSlashIndex(0);
  }, [slashCommandMatch?.query]);

  useEffect(() => {
    const match = getSlashCommandMatch(activeEditorText, selectionSnapshot);
    if (!match || match.start !== dismissedSlashStart) return;
    if (match.query.length > 0) {
      setDismissedSlashStart(null);
    }
  }, [activeEditorText, dismissedSlashStart, selectionSnapshot]);

  useLayoutEffect(() => {
    if (!slashCommandMatch || !editorRef.current) {
      setSlashMenuPosition(null);
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      setSlashMenuPosition(null);
      return;
    }

    const range = selection.getRangeAt(0).cloneRange();
    let rect = range.getBoundingClientRect();
    if (!rect.width && !rect.height) {
      const rects = range.getClientRects();
      if (rects.length > 0) {
        rect = rects[0];
      }
    }

    const editorRect = editorRef.current.getBoundingClientRect();
    const fallbackTop = editorRect.top + 20;
    const fallbackLeft = editorRect.left + 20;
    const caretTop = rect.top || fallbackTop;
    const caretBottom = rect.bottom || fallbackTop;
    const rawLeft = rect.left || fallbackLeft;
    const menuWidth = 320;
    const menuHeight =
      slashMenuRef.current?.offsetHeight ?? Math.min(320, 16 + filteredSlashCommands.length * 56);
    const viewportPadding = 12;
    const offset = 8;
    const clampedLeft = Math.min(
      Math.max(viewportPadding, rawLeft),
      window.innerWidth - menuWidth - viewportPadding,
    );
    const spaceBelow = window.innerHeight - caretBottom - viewportPadding;
    const spaceAbove = caretTop - viewportPadding;
    const canOpenBelow = menuHeight <= spaceBelow;
    const canOpenAbove = menuHeight <= spaceAbove;

    let nextTop = caretBottom + offset;
    if (!canOpenBelow && canOpenAbove) {
      nextTop = caretTop - menuHeight - offset;
    } else if (!canOpenBelow && !canOpenAbove) {
      nextTop =
        spaceBelow >= spaceAbove
          ? window.innerHeight - menuHeight - viewportPadding
          : viewportPadding;
    }

    setSlashMenuPosition({
      top: Math.max(viewportPadding, nextTop),
      left: clampedLeft,
    });
  }, [activeEditorText, filteredSlashCommands.length, slashCommandMatch]);

  useEffect(() => {
    if (!slashCommandMatch) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (slashMenuRef.current?.contains(target)) return;
      if (editorRef.current?.contains(target)) return;
      clearSlashSession(slashCommandMatch.start);
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [slashCommandMatch]);

  const applyEditorUpdate = (
    transform: (content: string, selection: SelectionOffsets) => { text: string; selection: SelectionOffsets },
  ) => {
    const editor = editorRef.current;
    if (!editor) return;

    const selection =
      displaySelectionToSource(activeEditorText, getSelectionOffsets(editor)) ?? {
      start: activeEditorText.length,
      end: activeEditorText.length,
    };
    const next = transform(activeEditorText, selection);
    pendingSelectionRef.current = next.selection;
    setSelectionSnapshot(next.selection);
    if (isTypewriterMode) {
      setTypewriterDraft(next.text);
    } else {
      onContentChange(next.text);
    }
    window.requestAnimationFrame(() => {
      editor.focus();
    });
  };

  const commitTypewriterDraft = () => {
    if (!isTypewriterMode) return;

    const editor = editorRef.current;
    if (!editor) return;

    const currentDraft = trimTypewriterCommit(serializeEditorDom(editor));
    clearSlashSession();

    if (!currentDraft) {
      setTypewriterDraft("");
      pendingSelectionRef.current = { start: 0, end: 0 };
      setSelectionSnapshot({ start: 0, end: 0 });
      editor.innerHTML = "";
      window.requestAnimationFrame(() => {
        editor.focus();
        setSelectionOffsets(editor, 0, 0);
      });
      return;
    }

    onContentChange(appendTypewriterCommit(documentContent, currentDraft));
    setTypewriterDraft("");
    pendingSelectionRef.current = { start: 0, end: 0 };
    setSelectionSnapshot({ start: 0, end: 0 });
    editor.innerHTML = "";
    window.requestAnimationFrame(() => {
      editor.focus();
      setSelectionOffsets(editor, 0, 0);
    });
  };

  const applySlashCommand = (commandId: string) => {
    if (!slashCommandMatch) return;
    const dismissStart = slashCommandMatch.start;

    const selectedLorePage =
      availableLorePages.find((page) => page.id === selectedLorePageId) ?? availableLorePages[0] ?? null;

    applyEditorUpdate((content) => {
      let insertion = "";
      let cursorOffset = 0;

      switch (commandId) {
        case "heading1":
          insertion = "# ";
          cursorOffset = insertion.length;
          break;
        case "heading2":
          insertion = "## ";
          cursorOffset = insertion.length;
          break;
        case "list":
          insertion = "- ";
          cursorOffset = insertion.length;
          break;
        case "quote":
          insertion = "> ";
          cursorOffset = insertion.length;
          break;
        case "lore-link": {
          const linkText = `[[${selectedLorePage?.title ?? "Lore Page"}]]`;
          insertion = linkText;
          cursorOffset = linkText.length - 2;
          break;
        }
        case "scene-break":
          insertion = "\n* * *\n";
          cursorOffset = insertion.length;
          break;
        default:
          insertion = "";
      }

      const nextText = replaceRange(content, slashCommandMatch.start, slashCommandMatch.end, insertion);
      const cursor = slashCommandMatch.start + cursorOffset;
      return { text: nextText, selection: { start: cursor, end: cursor } };
    });
    clearSlashSession(dismissStart);
  };

  const handleEditorInput = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const nextText = serializeEditorDom(editor);
    const displaySelection = getSelectionOffsets(editor);
    setSelectionSnapshot(displaySelectionToSource(nextText, displaySelection));
    if (isTypewriterMode) {
      setTypewriterDraft(nextText);
    } else {
      onContentChange(nextText);
    }
  };

  const handleEditorPaste = (event: ReactClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const text = event.clipboardData.getData("text/plain");
    applyEditorUpdate((content, selection) => {
      const nextText = replaceRange(content, selection.start, selection.end, text);
      const cursor = selection.start + text.length;
      return { text: nextText, selection: { start: cursor, end: cursor } };
    });
  };

  const applyRichFormat = (command: "bold" | "italic" | "underline") => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();
    document.execCommand(command);

    const nextText = serializeEditorDom(editor);
    const nextSelection = displaySelectionToSource(nextText, getSelectionOffsets(editor));
    setSelectionSnapshot(nextSelection);
    if (isTypewriterMode) {
      setTypewriterDraft(nextText);
    } else {
      onContentChange(nextText);
    }
  };

  const handleEditorKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const editor = editorRef.current;
    if (!editor) return;

    const selection =
      displaySelectionToSource(activeEditorText, getSelectionOffsets(editor)) ?? {
      start: activeEditorText.length,
      end: activeEditorText.length,
    };

    if ((event.ctrlKey || event.metaKey) && !event.altKey) {
      const key = event.key.toLowerCase();
      if (key === "b") {
        event.preventDefault();
        applyRichFormat("bold");
        return;
      }
      if (key === "i") {
        event.preventDefault();
        applyRichFormat("italic");
        return;
      }
      if (key === "u") {
        event.preventDefault();
        applyRichFormat("underline");
        return;
      }
      if (key === "s") {
        event.preventDefault();
        onSave();
        return;
      }
      if (key === "k") {
        event.preventDefault();
        insertLoreLink();
        return;
      }
    }

    if (slashCommandMatch) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedSlashIndex((current) =>
          filteredSlashCommands.length === 0 ? 0 : (current + 1) % filteredSlashCommands.length,
        );
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedSlashIndex((current) =>
          filteredSlashCommands.length === 0
            ? 0
            : (current - 1 + filteredSlashCommands.length) % filteredSlashCommands.length,
        );
        return;
      }
      if (event.key === "Enter" && filteredSlashCommands[selectedSlashIndex]) {
        event.preventDefault();
        applySlashCommand(filteredSlashCommands[selectedSlashIndex].id);
        return;
      }
      if (event.key === "Tab" && filteredSlashCommands[selectedSlashIndex]) {
        event.preventDefault();
        applySlashCommand(filteredSlashCommands[selectedSlashIndex].id);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        clearSlashSession(slashCommandMatch.start);
        return;
      }
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (isTypewriterMode) {
        if (event.shiftKey) {
          applyEditorUpdate((content, currentSelection) => {
            const nextText = replaceRange(content, currentSelection.start, currentSelection.end, "\n");
            const cursor = currentSelection.start + 1;
            return { text: nextText, selection: { start: cursor, end: cursor } };
          });
          return;
        }
        commitTypewriterDraft();
        return;
      }
      applyEditorUpdate((content, currentSelection) => continueBlockPrefix(content, currentSelection));
      return;
    }

    if (event.key === "Backspace" && selection.start === selection.end) {
      const emptyPair = findEmptyInlinePairAtCursor(activeEditorText, selection.start);
      if (emptyPair) {
        event.preventDefault();
        applyEditorUpdate((content) => ({
          text: replaceRange(content, emptyPair.start, emptyPair.end, ""),
          selection: { start: emptyPair.start, end: emptyPair.start },
        }));
        return;
      }
    }

    if (!event.ctrlKey && !event.metaKey && !event.altKey && event.key === "[") {
      const autoInsert = findInlinePairAutoInsert(activeEditorText, selection, event.key);
      if (autoInsert) {
        event.preventDefault();
        applyEditorUpdate((content) => {
          const nextText = replaceRange(
            content,
            autoInsert.replaceStart,
            autoInsert.replaceEnd,
            autoInsert.insertion,
          );
          return {
            text: nextText,
            selection: { start: autoInsert.cursor, end: autoInsert.cursor },
          };
        });
        return;
      }
    }

    if ((event.key === "Tab" && !event.shiftKey) || event.key === "ArrowRight") {
      const inlinePairExit = findActiveInlinePairExit(activeEditorText, selection.start);
      if (selection.start === selection.end && inlinePairExit) {
        event.preventDefault();
        const cursor = inlinePairExit.nextCursor;
        pendingSelectionRef.current = { start: cursor, end: cursor };
        window.requestAnimationFrame(() => {
          editor.focus();
          setSelectionOffsets(editor, cursor, cursor);
        });
        return;
      }
    }

    if (event.key === "Tab" && !event.shiftKey) {
      const nextTwo = activeEditorText.slice(selection.start, selection.start + 2);
      if (selection.start === selection.end && nextTwo === "]]") {
        event.preventDefault();
        const cursor = selection.start + 2;
        pendingSelectionRef.current = { start: cursor, end: cursor };
        window.requestAnimationFrame(() => {
          editor.focus();
          setSelectionOffsets(editor, cursor, cursor);
        });
      }
    }
  };

  const insertLoreLink = () => {
    const page = availableLorePages.find((item) => item.id === selectedLorePageId) ?? availableLorePages[0];

    applyEditorUpdate((content, selection) => {
      const selectedText = content.slice(selection.start, selection.end);
      const linkBody = selectedText || page?.title || "";
      const linkText = `[[${linkBody}]]`;
      const nextText = replaceRange(content, selection.start, selection.end, linkText);
      const cursor = selection.start + 2 + linkBody.length;
      return { text: nextText, selection: { start: cursor, end: cursor } };
    });
  };

  const applyLinePrefix = (prefix: string) => {
    applyEditorUpdate((content, selection) => toggleLinePrefix(content, selection, prefix));
  };

  const documentsByFolder = useMemo(() => {
    const groups = new Map<string, Document[]>();
    for (const doc of documents) {
      const folder = doc.folderPath?.trim() || "Ungrouped";
      const existing = groups.get(folder) ?? [];
      existing.push(doc);
      groups.set(folder, existing);
    }

    return Array.from(groups.entries())
      .sort(([left], [right]) => {
        if (left === "Ungrouped") return 1;
        if (right === "Ungrouped") return -1;
        return left.localeCompare(right);
      })
      .map(([folder, groupedDocs]) => ({
        folder,
        docs: groupedDocs.sort((left, right) => left.title.localeCompare(right.title)),
      }));
  }, [documents]);

  const orderedDocuments = useMemo(
    () => [...documents].sort((left, right) => left.title.localeCompare(right.title)),
    [documents],
  );

  const syncEditorSelection = () => {
    const editor = editorRef.current;
    if (!editor) return;
    setSelectionSnapshot(displaySelectionToSource(activeEditorText, getSelectionOffsets(editor)));
  };

  return (
    <>
      <EditorDocumentList
        isDocListCollapsed={isDocListCollapsed}
        docListWidth={docListWidth}
        activeDocumentId={activeDocumentId}
        documents={documents}
        documentsByFolder={documentsByFolder}
        onCollapseDocList={onCollapseDocList}
        onAddDocument={onAddDocument}
        onOpenDocument={onOpenDocument}
        onRemoveDocument={onRemoveDocument}
      />

      {!isDocListCollapsed ? <div className="resizer resizer-vertical" onMouseDown={onResizeStart} /> : null}

      <div
        className={[
          "editor-pane",
          isFocusMode ? "editor-pane-focus" : "",
          editorMode === "typewriter" ? "editor-pane-typewriter" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <EditorToolbar
          editorFormattingState={editorFormattingState}
          saveState={documentSaveState}
          onSave={onSave}
          onApplyRichFormat={applyRichFormat}
          onApplyLinePrefix={applyLinePrefix}
          onInsertLoreLink={insertLoreLink}
          selectedLorePageId={selectedLorePageId}
          availableLorePages={availableLorePages}
          onSelectLorePageId={setSelectedLorePageId}
          activeDocumentId={activeDocumentId}
          orderedDocuments={orderedDocuments}
          onOpenDocument={onOpenDocument}
          isPreviewOpen={isPreviewOpen}
          onTogglePreview={() => setIsPreviewOpen((current) => !current)}
          isDetailsOpen={isDetailsOpen}
          onToggleDetails={() => setIsDetailsOpen((current) => !current)}
          isFocusMode={isFocusMode}
          onToggleFocusMode={() => setIsFocusMode((current) => !current)}
          isDocumentMenuOpen={isDocumentMenuOpen}
          onToggleDocumentMenu={() => setIsDocumentMenuOpen((current) => !current)}
          onAddDocument={onAddDocument}
          onRenameDocument={() => {
            setIsDocumentMenuOpen(false);
            window.requestAnimationFrame(() => titleInputRef.current?.focus());
          }}
          onDuplicateDocument={onDuplicateDocument}
          editorWidth={editorWidth}
          onSetEditorWidth={setEditorWidth}
          editorMode={editorMode}
          onSetEditorMode={setEditorMode}
        />

        <div
          className={[
            "editor-workspace-frame",
            isSidebarCollapsed || isDocListCollapsed ? "editor-workspace-frame-left-rail" : "",
            isRightPanelCollapsed ? "editor-workspace-frame-right-rail" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <div className="editor-collapsed-rail editor-collapsed-rail-left">
            {isSidebarCollapsed ? (
              <button
                className="editor-edge-toggle"
                type="button"
                onClick={onExpandSidebar}
                title="Expand project panel (Ctrl+1)"
              >
                <span className="editor-edge-toggle-label">Project</span>
                <span className="editor-edge-toggle-icon">&rsaquo;</span>
              </button>
            ) : null}
            {isDocListCollapsed ? (
              <button
                className="editor-edge-toggle"
                type="button"
                onClick={onExpandDocList}
                title="Expand documents panel (Ctrl+2)"
              >
                <span className="editor-edge-toggle-label">Documents</span>
                <span className="editor-edge-toggle-icon">&rsaquo;</span>
              </button>
            ) : null}
          </div>

          <EditorSurface
            titleInputRef={titleInputRef}
            editorRef={editorRef}
            documentTitle={documentTitle}
            onTitleChange={onTitleChange}
            activeWorld={activeWorld}
            documentFolderPath={documentFolderPath}
            isFocusMode={isFocusMode}
            editorMode={editorMode}
            editorWidth={editorWidth}
            typewriterRenderedPreview={typewriterRenderedPreview}
            renderedPreview={renderedPreview}
            onEditorInput={handleEditorInput}
            onEditorKeyDown={handleEditorKeyDown}
            onEditorPaste={handleEditorPaste}
            onSyncSelection={syncEditorSelection}
            isPreviewOpen={isPreviewOpen}
            isDetailsOpen={isDetailsOpen}
            onFolderPathChange={onFolderPathChange}
            linkedLorePages={linkedLorePages}
            unresolvedLoreLinks={unresolvedLoreLinks}
            onOpenLore={onOpenLore}
            wordCount={wordCount}
            characterCount={characterCount}
            readingMinutes={readingMinutes}
            selectedWordCount={selectedWordCount}
          />

          <div className="editor-collapsed-rail editor-collapsed-rail-right">
            {isRightPanelCollapsed ? (
              <button
                className="editor-edge-toggle editor-edge-toggle-right"
                type="button"
                onClick={onExpandRightPanel}
                title="Expand context panel (Ctrl+3)"
              >
                <span className="editor-edge-toggle-icon">&lsaquo;</span>
                <span className="editor-edge-toggle-label">Context</span>
              </button>
            ) : null}
          </div>

          {slashCommandMatch && slashMenuPosition ? (
            <EditorSlashMenu
              slashMenuRef={slashMenuRef}
              slashMenuPosition={slashMenuPosition}
              filteredSlashCommands={filteredSlashCommands}
              selectedSlashIndex={selectedSlashIndex}
              onApplySlashCommand={applySlashCommand}
            />
          ) : null}
        </div>
      </div>
    </>
  );
}
