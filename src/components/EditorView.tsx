import {
  memo,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ClipboardEvent as ReactClipboardEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import type { Document, LorePage } from "../lib/data";
import type { LoreCustomFieldValue, LoreCustomFields } from "../lib/loreItems";
import type { LoreTemplate } from "../lib/loreTemplates";
import type { CustomFieldDefinition, LoreType } from "../lib/loreTypes";
import { resolveLoreLinks } from "../lib/loreLinks";
import { sanitizeInvalidUnicodeSurrogates } from "../lib/textSanitizer";
import {
  buildLoreCreateDefaultCustomFields,
  buildLoreCreateDraftPayload,
  getLoreSelectionActionState,
  getLoreSelectionCreateState,
  setLoreCreateCustomFieldValue,
} from "../hooks/contentState";
import type { WorldUI } from "../types/ui";
import { EditorDocumentList } from "./EditorDocumentList";
import { EditorDetailsDrawer } from "./EditorDetailsDrawer";
import { EditorSlashMenu } from "./EditorSlashMenu";
import { EditorSurface } from "./EditorSurface";
import { EditorToolbar } from "./EditorToolbar";
import {
  appendTypewriterCommit,
  applyNoteBlockPrefix,
  buildEditorDisplayRepresentation,
  clearCurrentLinePrefix,
  continueBlockPrefix,
  duplicateSelectedLineBlock,
  countCharacters,
  countWords,
  displaySelectionToSource,
  findActiveInlinePairExit,
  findEmptyInlinePairAtCursor,
  findInlinePairAutoInsert,
  findUnlinkedLoreMentions,
  getFormattingState,
  getSelectionOffsets,
  getSelectionText,
  getSlashCommandMatch,
  indentSelectedLines,
  linkUnlinkedLoreMentions,
  normalizeEditorText,
  moveSelectedLineBlock,
  outdentSelectedLines,
  replaceSelectionWithLoreLink,
  renderPreviewContent,
  replaceRange,
  resolvePastedEditorText,
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
  templates: LoreTemplate[];
  loreTypes: LoreType[];
  activeDocumentId: string | null;
  documentTitle: string;
  documentContent: string;
  documentFolderPath: string;
  documentSaveState: "idle" | "dirty" | "saving" | "saved" | "error";
  documentSaveTimestamp: number | null;
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
  onCreateLoreFromSelection: (payload: {
    title: string;
    loreTypeId: string;
    templateId: string | null;
    tags: string;
    details?: string;
    customFields?: LoreCustomFields;
  }) => Promise<LorePage | null>;
  onOpenDocument: (doc: Document) => void;
  onOpenLore: (page: LorePage) => void;
  onRemoveDocument: (docId: string) => void;
  onSave: () => void;
  onTitleChange: (value: string) => void;
  onContentChange: (value: string) => void;
  onFolderPathChange: (value: string) => void;
  onPendingDraftChange: (hasPendingDraft: boolean) => void;
};

type EditorWidth = "narrow" | "standard" | "wide";
type EditorPresentationMode = "standard" | "typewriter";

type SlashCommandOption = {
  id: string;
  label: string;
  description: string;
  keywords: string[];
};

type SelectionLoreDialogState = {
  selection: SelectionOffsets;
  selectedText: string;
};

type LinkMentionsPromptState = {
  title: string;
  count: number;
};

type FloatingActionPosition = {
  top: number;
  left: number;
};

function formatDraftCustomFieldValue(value: LoreCustomFieldValue | undefined) {
  return value == null ? "" : String(value);
}

function getSelectionFloatingActionPosition(editor: HTMLElement): FloatingActionPosition | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;
  const anchorNode = selection.anchorNode;
  const focusNode = selection.focusNode;
  if (!anchorNode || !focusNode) return null;
  if (!editor.contains(anchorNode) || !editor.contains(focusNode)) return null;

  const range = selection.getRangeAt(0);
  const rangeRect = range.getBoundingClientRect();
  const firstClientRect = Array.from(range.getClientRects()).find((rect) => rect.width > 0 || rect.height > 0);
  const rect = rangeRect.width || rangeRect.height ? rangeRect : firstClientRect;
  const viewportPadding = 12;
  const actionWidth = 132;
  const actionHeight = 34;

  if (rect) {
    const rawTop = rect.top - actionHeight - 8;
    const top = rawTop >= viewportPadding ? rawTop : rect.bottom + 8;
    return {
      top: Math.min(Math.max(viewportPadding, top), window.innerHeight - actionHeight - viewportPadding),
      left: Math.min(
        Math.max(viewportPadding, rect.left + rect.width / 2 - actionWidth / 2),
        window.innerWidth - actionWidth - viewportPadding,
      ),
    };
  }

  const editorRect = editor.getBoundingClientRect();
  return {
    top: Math.min(Math.max(viewportPadding, editorRect.top + 12), window.innerHeight - actionHeight - viewportPadding),
    left: Math.min(
      Math.max(viewportPadding, editorRect.right - actionWidth - 12),
      window.innerWidth - actionWidth - viewportPadding,
    ),
  };
}

export const EditorView = memo(function EditorView({
  isDocListCollapsed,
  isSidebarCollapsed,
  isRightPanelCollapsed,
  docListWidth,
  documents,
  availableLorePages,
  templates,
  loreTypes,
  activeDocumentId,
  documentTitle,
  documentContent,
  documentFolderPath,
  documentSaveState,
  documentSaveTimestamp,
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
  onCreateLoreFromSelection,
  onOpenDocument,
  onOpenLore,
  onRemoveDocument,
  onSave,
  onTitleChange,
  onContentChange,
  onFolderPathChange,
  onPendingDraftChange,
}: EditorViewProps) {
  const areSelectionsEqual = (left: SelectionOffsets | null, right: SelectionOffsets | null) =>
    left?.start === right?.start && left?.end === right?.end;
  const arePositionsEqual = (
    left: { top: number; left: number } | null,
    right: { top: number; left: number } | null,
  ) => left?.top === right?.top && left?.left === right?.left;

  const editorRef = useRef<HTMLDivElement | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const slashMenuRef = useRef<HTMLDivElement | null>(null);
  const documentMenuRef = useRef<HTMLDivElement | null>(null);
  const pendingSelectionRef = useRef<SelectionOffsets | null>(null);
  const lastEditorSelectionRef = useRef<SelectionOffsets | null>(null);
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
  const [selectionLoreDialog, setSelectionLoreDialog] = useState<SelectionLoreDialogState | null>(null);
  const [selectionLoreTitle, setSelectionLoreTitle] = useState("");
  const [selectionLoreTypeId, setSelectionLoreTypeId] = useState(loreTypes[0]?.id ?? "");
  const [selectionLoreTemplateId, setSelectionLoreTemplateId] = useState<string | null>(null);
  const [selectionLoreDetails, setSelectionLoreDetails] = useState("");
  const [selectionLoreTags, setSelectionLoreTags] = useState("");
  const [selectionLoreCustomFields, setSelectionLoreCustomFields] = useState<LoreCustomFields>({});
  const [shouldReplaceSelectionWithLink, setShouldReplaceSelectionWithLink] = useState(true);
  const [selectionLoreError, setSelectionLoreError] = useState("");
  const [isCreatingSelectionLore, setIsCreatingSelectionLore] = useState(false);
  const [selectionLoreActionPosition, setSelectionLoreActionPosition] = useState<FloatingActionPosition | null>(null);
  const [linkMentionsPrompt, setLinkMentionsPrompt] = useState<LinkMentionsPromptState | null>(null);
  const isTypewriterMode = editorMode === "typewriter";
  const hasPendingTypewriterDraft = isTypewriterMode && trimTypewriterCommit(typewriterDraft).length > 0;
  const activeEditorText = isTypewriterMode ? typewriterDraft : documentContent;
  const editorDisplay = useMemo(() => buildEditorDisplayRepresentation(activeEditorText), [activeEditorText]);
  const availableLorePagesById = useMemo(
    () => new Map(availableLorePages.map((page) => [page.id, page])),
    [availableLorePages],
  );
  const firstAvailableLorePage = useMemo(() => availableLorePages[0] ?? null, [availableLorePages]);
  const selectedLorePage = useMemo(
    () => (selectedLorePageId ? availableLorePagesById.get(selectedLorePageId) ?? firstAvailableLorePage : firstAvailableLorePage),
    [availableLorePagesById, firstAvailableLorePage, selectedLorePageId],
  );
  const loreTypesById = useMemo(() => new Map(loreTypes.map((type) => [type.id, type])), [loreTypes]);
  const selectedSelectionLoreType = useMemo(
    () => loreTypesById.get(selectionLoreTypeId) ?? loreTypes[0] ?? null,
    [loreTypes, loreTypesById, selectionLoreTypeId],
  );
  const filteredSelectionLoreTemplates = useMemo(
    () => templates.filter((template) => template.loreTypeId === selectedSelectionLoreType?.id),
    [selectedSelectionLoreType?.id, templates],
  );
  const clearSlashSession = (dismissStart: number | null = null) => {
    setSelectedSlashIndex((current) => (current === 0 ? current : 0));
    setSlashMenuPosition((current) => (current === null ? current : null));
    setDismissedSlashStart((current) => (current === dismissStart ? current : dismissStart));
  };

  const updateSelectionSnapshot = (next: SelectionOffsets | null) => {
    if (next) {
      lastEditorSelectionRef.current = next;
    }
    setSelectionSnapshot((current) => (areSelectionsEqual(current, next) ? current : next));
  };

  const updateSlashMenuPosition = (next: { top: number; left: number } | null) => {
    setSlashMenuPosition((current) => (arePositionsEqual(current, next) ? current : next));
  };

  const updateSelectionLoreActionPosition = (next: FloatingActionPosition | null) => {
    setSelectionLoreActionPosition((current) => (arePositionsEqual(current, next) ? current : next));
  };

  const focusTitleInput = () => {
    window.requestAnimationFrame(() => {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    });
  };

  useEffect(() => {
    const nextSelectedLorePageId = selectedLorePage?.id ?? "";
    if (nextSelectedLorePageId !== selectedLorePageId) {
      setSelectedLorePageId(nextSelectedLorePageId);
    }
  }, [selectedLorePage?.id, selectedLorePageId]);

  useEffect(() => {
    setIsDocumentMenuOpen(false);
    setLinkMentionsPrompt(null);
  }, [activeDocumentId]);

  useEffect(() => {
    if (!isDocumentMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (documentMenuRef.current?.contains(target)) return;
      setIsDocumentMenuOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsDocumentMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDocumentMenuOpen]);

  useEffect(() => {
    if (selectionLoreTypeId && loreTypesById.has(selectionLoreTypeId)) return;
    setSelectionLoreTypeId(loreTypes[0]?.id ?? "");
  }, [loreTypes, loreTypesById, selectionLoreTypeId]);

  useEffect(() => {
    setSelectionLoreCustomFields(buildLoreCreateDefaultCustomFields(selectedSelectionLoreType));
  }, [selectedSelectionLoreType?.id]);

  useEffect(() => {
    if (selectionLoreTemplateId === null) return;
    if (filteredSelectionLoreTemplates.some((template) => template.id === selectionLoreTemplateId)) return;
    setSelectionLoreTemplateId(null);
  }, [filteredSelectionLoreTemplates, selectionLoreTemplateId]);

  useEffect(() => {
    lastEditorSelectionRef.current = null;
    if (typewriterDraft) {
      setTypewriterDraft("");
    }
    if (selectionSnapshot !== null) {
      setSelectionSnapshot(null);
    }
    updateSelectionLoreActionPosition(null);
    if (selectedSlashIndex !== 0 || slashMenuPosition !== null || dismissedSlashStart !== null) {
      clearSlashSession();
    }
  }, [activeDocumentId]);

  useEffect(() => {
    onPendingDraftChange(hasPendingTypewriterDraft);
  }, [hasPendingTypewriterDraft, onPendingDraftChange]);

  useEffect(() => {
    return () => {
      onPendingDraftChange(false);
    };
  }, [onPendingDraftChange]);

  useEffect(() => {
    lastEditorSelectionRef.current = null;
    if (selectionSnapshot !== null) {
      setSelectionSnapshot(null);
    }
    updateSelectionLoreActionPosition(null);
    if (selectedSlashIndex !== 0 || slashMenuPosition !== null || dismissedSlashStart !== null) {
      clearSlashSession();
    }
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
      setEditorWidth((current) => (current === "wide" ? current : "wide"));
      onCollapseSidebar();
      onCollapseDocList();
      onCollapseRightPanel();
      setIsDetailsOpen((current) => (current ? false : current));
      setIsPreviewOpen((current) => (current ? false : current));
      setIsDocumentMenuOpen((current) => (current ? false : current));
    }

    if (!isFocusMode && wasFocusMode && focusStateRef.current) {
      const previous = focusStateRef.current;
      setEditorWidth((current) => (current === previousEditorWidthRef.current ? current : previousEditorWidthRef.current));
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
      updateSelectionSnapshot(displaySelectionToSource(activeEditorText, displaySelection));
      updateSelectionLoreActionPosition(displaySelection ? getSelectionFloatingActionPosition(editor) : null);
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
  const selectionLoreCreateState = getLoreSelectionCreateState({
    selectedText: selectionLoreDialog?.selectedText ?? selectedText,
    title: selectionLoreTitle,
    loreType: selectedSelectionLoreType,
    isCreating: isCreatingSelectionLore,
  });
  const selectionLoreActionState = getLoreSelectionActionState({
    selectedText,
    loreType: selectedSelectionLoreType,
    hasActiveDocument: Boolean(activeDocumentId),
    isDialogOpen: Boolean(selectionLoreDialog),
  });
  const shouldShowSelectionLoreAction = selectionLoreActionState.canShow && Boolean(selectionLoreActionPosition);
  const selectionLoreActionStyle: CSSProperties | undefined = selectionLoreActionPosition
    ? { top: selectionLoreActionPosition.top, left: selectionLoreActionPosition.left }
    : undefined;
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
        id: "ordered-list",
        label: "Numbered List",
        description: "Start a numbered list",
        keywords: ["list", "ordered", "numbered", "steps"],
      },
      {
        id: "quote",
        label: "Quote",
        description: "Insert a quote block",
        keywords: ["quote", "blockquote", "callout"],
      },
      {
        id: "note-block",
        label: "Note Block",
        description: "Insert a highlighted note block",
        keywords: ["note", "callout", "aside", "annotation"],
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
  const slashCommandSearchIndex = useMemo(
    () =>
      slashCommands.map((command) => ({
        command,
        searchText: [command.label, command.description, ...command.keywords].join(" ").toLowerCase(),
      })),
    [slashCommands],
  );
  const filteredSlashCommands = useMemo(() => {
    if (!slashCommandMatch) return [];
    const query = slashCommandMatch.query.trim();
    if (!query) return slashCommands;
    const normalizedQuery = query.toLowerCase();
    return slashCommandSearchIndex
      .filter(({ searchText }) => searchText.includes(normalizedQuery))
      .map(({ command }) => command);
  }, [slashCommandMatch, slashCommandSearchIndex, slashCommands]);
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
      setSelectedSlashIndex((current) => (current === 0 ? current : 0));
      updateSlashMenuPosition(null);
      setDismissedSlashStart((current) => (current === null ? current : null));
      return;
    }
    setSelectedSlashIndex((current) => (current === 0 ? current : 0));
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
      updateSlashMenuPosition(null);
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      updateSlashMenuPosition(null);
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

    updateSlashMenuPosition({
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

    const resolveEditorSelection = () =>
      displaySelectionToSource(activeEditorText, getSelectionOffsets(editor)) ??
      selectionSnapshot ??
      lastEditorSelectionRef.current ?? {
        start: activeEditorText.length,
        end: activeEditorText.length,
      };
    const next = transform(activeEditorText, resolveEditorSelection());
    const sanitizedText = sanitizeInvalidUnicodeSurrogates(next.text);
    pendingSelectionRef.current = next.selection;
    updateSelectionSnapshot(next.selection);
    if (isTypewriterMode) {
      setTypewriterDraft(sanitizedText);
    } else {
      onContentChange(sanitizedText);
    }
    window.requestAnimationFrame(() => {
      editor.focus();
    });
  };

  const commitTypewriterDraft = (options?: { restoreFocus?: boolean }) => {
    if (!isTypewriterMode) return;

    const editor = editorRef.current;
    if (!editor) return;
    const shouldRestoreFocus = options?.restoreFocus ?? true;

    const currentDraft = trimTypewriterCommit(serializeEditorDom(editor));
    clearSlashSession();

    if (!currentDraft) {
      setTypewriterDraft("");
      pendingSelectionRef.current = { start: 0, end: 0 };
      updateSelectionSnapshot({ start: 0, end: 0 });
      editor.innerHTML = "";
      if (shouldRestoreFocus) {
        window.requestAnimationFrame(() => {
          editor.focus();
          setSelectionOffsets(editor, 0, 0);
        });
      }
      return;
    }

    onContentChange(sanitizeInvalidUnicodeSurrogates(appendTypewriterCommit(documentContent, currentDraft)));
    setTypewriterDraft("");
    pendingSelectionRef.current = { start: 0, end: 0 };
    updateSelectionSnapshot({ start: 0, end: 0 });
    editor.innerHTML = "";
    if (shouldRestoreFocus) {
      window.requestAnimationFrame(() => {
        editor.focus();
        setSelectionOffsets(editor, 0, 0);
      });
    }
  };

  const runAfterTypewriterDraftCommit = (action: () => void) => {
    if (!isTypewriterMode) {
      action();
      return;
    }

    const editor = editorRef.current;
    if (!editor) {
      action();
      return;
    }

    const currentDraft = trimTypewriterCommit(serializeEditorDom(editor));
    if (!currentDraft) {
      action();
      return;
    }

    commitTypewriterDraft({ restoreFocus: false });
    window.requestAnimationFrame(action);
  };

  const requestDocumentSave = () => {
    runAfterTypewriterDraftCommit(() => {
      onSave();
    });
  };

  const requestAddDocument = () => {
    runAfterTypewriterDraftCommit(onAddDocument);
  };

  const requestDuplicateDocument = () => {
    runAfterTypewriterDraftCommit(onDuplicateDocument);
  };

  const closeSelectionLoreDialog = () => {
    setSelectionLoreDialog(null);
    setSelectionLoreTitle("");
    setSelectionLoreTemplateId(null);
    setSelectionLoreDetails("");
    setSelectionLoreTags("");
    setSelectionLoreError("");
    setShouldReplaceSelectionWithLink(true);
  };

  const openCreateLoreFromSelectionDialog = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const selection =
      displaySelectionToSource(activeEditorText, getSelectionOffsets(editor)) ??
      selectionSnapshot ??
      lastEditorSelectionRef.current;
    if (!selection || selection.start === selection.end) return;
    const selectionText = getSelectionText(activeEditorText, selection);
    const createState = getLoreSelectionCreateState({
      selectedText: selectionText,
      title: "",
      loreType: selectedSelectionLoreType,
    });
    if (!createState.canOpen) return;
    updateSelectionLoreActionPosition(null);
    setSelectionLoreDialog({ selection, selectedText: selectionText });
    setSelectionLoreTitle(createState.title);
    setSelectionLoreDetails("");
    setSelectionLoreTags("");
    setSelectionLoreError("");
    setShouldReplaceSelectionWithLink(true);
    setSelectionLoreCustomFields(buildLoreCreateDefaultCustomFields(selectedSelectionLoreType));
  };

  const updateSelectionLoreCustomFieldValue = (
    field: CustomFieldDefinition,
    value: string | number | boolean | null,
  ) => {
    setSelectionLoreCustomFields((current) => setLoreCreateCustomFieldValue(current, field, value));
  };

  const renderSelectionLoreCustomFieldControl = (field: CustomFieldDefinition) => {
    const value = selectionLoreCustomFields[field.key] ?? "";
    if (field.type === "long_text") {
      return (
        <textarea
          aria-label={`${field.name} value`}
          className="lore-textarea custom-field-textarea"
          value={formatDraftCustomFieldValue(value)}
          onChange={(event) => updateSelectionLoreCustomFieldValue(field, event.target.value)}
          placeholder={field.name}
          disabled={isCreatingSelectionLore}
        />
      );
    }
    if (field.type === "checkbox") {
      return (
        <label className="meta-tag custom-field-checkbox">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(event) => updateSelectionLoreCustomFieldValue(field, event.target.checked)}
            disabled={isCreatingSelectionLore}
          />
          {Boolean(value) ? "Yes" : "No"}
        </label>
      );
    }
    if (field.type === "select") {
      return (
        <select
          aria-label={`${field.name} value`}
          className="lore-input"
          value={formatDraftCustomFieldValue(value)}
          onChange={(event) => updateSelectionLoreCustomFieldValue(field, event.target.value)}
          disabled={isCreatingSelectionLore}
        >
          <option value="">Select {field.name}</option>
          {field.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }
    return (
      <input
        aria-label={`${field.name} value`}
        className="lore-input"
        type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
        value={formatDraftCustomFieldValue(value)}
        onChange={(event) =>
          updateSelectionLoreCustomFieldValue(
            field,
            field.type === "number" && event.target.value !== "" ? Number(event.target.value) : event.target.value,
          )
        }
        placeholder={field.name}
        disabled={isCreatingSelectionLore}
      />
    );
  };

  const createLoreFromSelection = async () => {
    if (!selectionLoreDialog || isCreatingSelectionLore) return;
    const payload = buildLoreCreateDraftPayload({
      title: selectionLoreTitle,
      loreTypeId: selectedSelectionLoreType?.id,
      templateId: selectionLoreTemplateId,
      tags: selectionLoreTags,
      details: selectionLoreDetails,
      customFields: selectionLoreCustomFields,
    });
    if (!payload) {
      setSelectionLoreError("Enter a title and choose a lore type before creating lore.");
      return;
    }
    setSelectionLoreError("");
    setIsCreatingSelectionLore(true);
    const created = await onCreateLoreFromSelection(payload);
    setIsCreatingSelectionLore(false);
    if (!created) {
      setSelectionLoreError("Worldie could not create lore from that selection.");
      return;
    }
    if (shouldReplaceSelectionWithLink) {
      const capturedSelection = selectionLoreDialog.selection;
      const previewReplacement = replaceSelectionWithLoreLink(activeEditorText, capturedSelection, payload.title);
      const otherMentionCount = findUnlinkedLoreMentions(previewReplacement.text, payload.title).length;
      applyEditorUpdate((content) => replaceSelectionWithLoreLink(content, capturedSelection, payload.title));
      setLinkMentionsPrompt(
        otherMentionCount > 0
          ? {
              title: payload.title,
              count: otherMentionCount,
            }
          : null,
      );
    } else {
      setLinkMentionsPrompt(null);
    }
    closeSelectionLoreDialog();
  };

  const linkAllMentionPromptMatches = () => {
    if (!linkMentionsPrompt) return;
    applyEditorUpdate((content, selection) => {
      const result = linkUnlinkedLoreMentions(content, linkMentionsPrompt.title);
      return {
        text: result.text,
        selection,
      };
    });
    setLinkMentionsPrompt(null);
  };

  const requestOpenDocument = (doc: Document) => {
    if (doc.id === activeDocumentId) {
      onOpenDocument(doc);
      return;
    }
    runAfterTypewriterDraftCommit(() => onOpenDocument(doc));
  };

  const requestRemoveDocument = (docId: string) => {
    if (docId === activeDocumentId) {
      runAfterTypewriterDraftCommit(() => onRemoveDocument(docId));
      return;
    }
    onRemoveDocument(docId);
  };

  const changeEditorMode = (nextMode: EditorPresentationMode) => {
    if (nextMode === editorMode) return;
    if (editorMode === "typewriter" && nextMode === "standard") {
      runAfterTypewriterDraftCommit(() => {
        setEditorMode((current) => (current === nextMode ? current : nextMode));
      });
      return;
    }
    setEditorMode((current) => (current === nextMode ? current : nextMode));
  };

  const applySlashCommand = (commandId: string) => {
    if (!slashCommandMatch) return;
    const dismissStart = slashCommandMatch.start;

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
        case "note-block":
          insertion = "> Note: ";
          cursorOffset = insertion.length;
          break;
        case "ordered-list":
          insertion = "1. ";
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
    const nextText = sanitizeInvalidUnicodeSurrogates(serializeEditorDom(editor));
    const displaySelection = getSelectionOffsets(editor);
    updateSelectionSnapshot(displaySelectionToSource(nextText, displaySelection));
    if (isTypewriterMode) {
      setTypewriterDraft(nextText);
    } else {
      onContentChange(nextText);
    }
  };

  const handleEditorBlur = () => {
    updateSelectionSnapshot(null);
    updateSelectionLoreActionPosition(null);
    clearSlashSession();

    if (isTypewriterMode) {
      const editor = editorRef.current;
      if (!editor) return;
      const currentDraft = trimTypewriterCommit(serializeEditorDom(editor));
      if (currentDraft) {
        commitTypewriterDraft({ restoreFocus: false });
      }
      return;
    }

    if (documentSaveState === "dirty") {
      requestDocumentSave();
    }
  };

  const handleTitleBlur = () => {
    if (documentSaveState === "dirty") {
      requestDocumentSave();
    }
  };

  const handleEditorPaste = (event: ReactClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const html = event.clipboardData.getData("text/html");
    let fallbackPlainText = "";
    if (html) {
      const temp = document.createElement("div");
      temp.innerHTML = html;
      fallbackPlainText = temp.innerText || temp.textContent || "";
    }
    const normalizedText = sanitizeInvalidUnicodeSurrogates(resolvePastedEditorText({
      html,
      plainText: event.clipboardData.getData("text/plain"),
      fallbackPlainText,
    }));
    applyEditorUpdate((content, selection) => {
      const nextText = replaceRange(content, selection.start, selection.end, normalizedText);
      const cursor = selection.start + normalizedText.length;
      return { text: nextText, selection: { start: cursor, end: cursor } };
    });
  };

  const applyEditorCommand = (command: "bold" | "italic" | "underline" | "undo" | "redo") => {
    const editor = editorRef.current;
    if (!editor) return;

    const liveSelection = displaySelectionToSource(activeEditorText, getSelectionOffsets(editor));
    const fallbackSelection = selectionSnapshot ?? lastEditorSelectionRef.current;

    if (!liveSelection && fallbackSelection) {
      const displaySelection = sourceSelectionToDisplay(activeEditorText, fallbackSelection);
      editor.focus();
      setSelectionOffsets(editor, displaySelection.start, displaySelection.end);
    } else {
      editor.focus();
    }

    document.execCommand(command);

    const nextText = sanitizeInvalidUnicodeSurrogates(serializeEditorDom(editor));
    const nextSelection =
      displaySelectionToSource(nextText, getSelectionOffsets(editor)) ??
      fallbackSelection ?? {
        start: nextText.length,
        end: nextText.length,
      };
    updateSelectionSnapshot(nextSelection);
    if (isTypewriterMode) {
      setTypewriterDraft(nextText);
    } else {
      onContentChange(nextText);
    }
  };

  const applyRichFormat = (command: "bold" | "italic" | "underline") => {
    applyEditorCommand(command);
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
        requestDocumentSave();
        return;
      }
      if (key === "z") {
        event.preventDefault();
        applyEditorCommand(event.shiftKey ? "redo" : "undo");
        return;
      }
      if (key === "y") {
        event.preventDefault();
        applyEditorCommand("redo");
        return;
      }
      if (key === "k") {
        event.preventDefault();
        insertLoreLink();
        return;
      }
      if (key === "enter") {
        event.preventDefault();
        applyEditorUpdate((content, currentSelection) => duplicateSelectedLineBlock(content, currentSelection));
        return;
      }
    }

    if ((event.ctrlKey || event.metaKey) && event.altKey) {
      const key = event.key.toLowerCase();
      if (key === "n") {
        event.preventDefault();
        requestAddDocument();
        return;
      }
      if (key === "d") {
        event.preventDefault();
        requestDuplicateDocument();
        return;
      }
      if (key === "r") {
        event.preventDefault();
        focusTitleInput();
        return;
      }
      if (key === "1") {
        event.preventDefault();
        applyLinePrefix("# ");
        return;
      }
      if (key === "2") {
        event.preventDefault();
        applyLinePrefix("## ");
        return;
      }
      if (key === "f") {
        event.preventDefault();
        setIsFocusMode((current) => !current);
        return;
      }
      if (key === "m") {
        event.preventDefault();
        changeEditorMode(editorMode === "standard" ? "typewriter" : "standard");
        return;
      }
    }

    if ((event.ctrlKey || event.metaKey) && event.shiftKey) {
      const key = event.key;
      const normalizedKey = key.toLowerCase();

      if (key === "[") {
        event.preventDefault();
        openDocumentByOffset(-1);
        return;
      }
      if (key === "]") {
        event.preventDefault();
        openDocumentByOffset(1);
        return;
      }
      if (key === "*") {
        event.preventDefault();
        applyLinePrefix("- ");
        return;
      }
      if (key === "&") {
        event.preventDefault();
        applyOrderedList();
        return;
      }
      if (key === "(") {
        event.preventDefault();
        applyLinePrefix("> ");
        return;
      }
      if (normalizedKey === "n") {
        event.preventDefault();
        insertNoteBlock();
        return;
      }
      if (key === "_" || key === "-") {
        event.preventDefault();
        insertSceneBreak();
        return;
      }
      if (normalizedKey === "p") {
        event.preventDefault();
        setIsPreviewOpen((current) => !current);
        return;
      }
      if (normalizedKey === "d" && !isFocusMode) {
        event.preventDefault();
        setIsDetailsOpen((current) => !current);
        return;
      }
    }

    if (event.altKey && event.shiftKey && !event.ctrlKey && !event.metaKey) {
      if (event.key === "ArrowUp") {
        event.preventDefault();
        applyEditorUpdate((content, currentSelection) => moveSelectedLineBlock(content, currentSelection, -1) ?? {
          text: content,
          selection: currentSelection,
        });
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        applyEditorUpdate((content, currentSelection) => moveSelectedLineBlock(content, currentSelection, 1) ?? {
          text: content,
          selection: currentSelection,
        });
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

    if (event.key === "Tab" && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      applyEditorUpdate((content, currentSelection) =>
        event.shiftKey ? outdentSelectedLines(content, currentSelection) : indentSelectedLines(content, currentSelection),
      );
      return;
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

      const clearedLine = clearCurrentLinePrefix(activeEditorText, selection);
      if (clearedLine && selection.start === clearedLine.contentStart) {
        event.preventDefault();
        applyEditorUpdate(() => ({
          text: clearedLine.text,
          selection: clearedLine.selection,
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

    if (event.key === "ArrowRight") {
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

  };

  const insertLoreLink = () => {
    applyEditorUpdate((content, selection) => {
      const selectedText = content.slice(selection.start, selection.end);
      const linkBody = selectedText || selectedLorePage?.title || "";
      const linkText = `[[${linkBody}]]`;
      const nextText = replaceRange(content, selection.start, selection.end, linkText);
      const cursor = selection.start + 2 + linkBody.length;
      return { text: nextText, selection: { start: cursor, end: cursor } };
    });
  };

  const applyLinePrefix = (prefix: string) => {
    applyEditorUpdate((content, selection) => toggleLinePrefix(content, selection, prefix));
  };

  const applyOrderedList = () => {
    applyEditorUpdate((content, selection) => toggleLinePrefix(content, selection, "1. "));
  };

  const insertSceneBreak = () => {
    applyEditorUpdate((content, selection) => {
      const insertion = selection.start > 0 && content[selection.start - 1] !== "\n" ? "\n* * *\n" : "* * *\n";
      const nextText = replaceRange(content, selection.start, selection.end, insertion);
      const cursor = selection.start + insertion.length;
      return { text: nextText, selection: { start: cursor, end: cursor } };
    });
  };

  const insertNoteBlock = () => {
    applyEditorUpdate((content, selection) => applyNoteBlockPrefix(content, selection));
  };

  const openDocumentByOffset = (offset: -1 | 1) => {
    if (orderedDocuments.length === 0) return;
    const currentIndex = orderedDocuments.findIndex((doc) => doc.id === activeDocumentId);
    const baseIndex = currentIndex === -1 ? 0 : currentIndex;
    const nextIndex = (baseIndex + offset + orderedDocuments.length) % orderedDocuments.length;
    const nextDocument = orderedDocuments[nextIndex];
    if (nextDocument) {
      requestOpenDocument(nextDocument);
    }
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
    const displaySelection = getSelectionOffsets(editor);
    updateSelectionSnapshot(displaySelectionToSource(activeEditorText, displaySelection));
    updateSelectionLoreActionPosition(displaySelection ? getSelectionFloatingActionPosition(editor) : null);
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
        onAddDocument={requestAddDocument}
        onOpenDocument={requestOpenDocument}
        onRemoveDocument={requestRemoveDocument}
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
        <div
          className={[
            "editor-toolbar-shell",
            `editor-width-${editorWidth}`,
            isFocusMode ? "editor-toolbar-shell-focus" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {isSidebarCollapsed || isDocListCollapsed || isRightPanelCollapsed ? (
            <div className="editor-panel-controls editor-toolbar-sticky">
              <div className="editor-panel-controls-main">
                {isSidebarCollapsed ? (
                  <button
                    className="editor-panel-toggle"
                    type="button"
                    onClick={onExpandSidebar}
                    title="Expand project panel (Ctrl+1)"
                  >
                    Project
                  </button>
                ) : null}
                {isDocListCollapsed ? (
                  <button
                    className="editor-panel-toggle"
                    type="button"
                    onClick={onExpandDocList}
                    title="Expand documents panel (Ctrl+2)"
                  >
                    Documents
                  </button>
                ) : null}
              </div>
              <div className="editor-panel-controls-side">
                {isRightPanelCollapsed ? (
                  <button
                    className="editor-panel-toggle"
                    type="button"
                    onClick={onExpandRightPanel}
                    title="Expand context panel (Ctrl+3)"
                  >
                    Context
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
          <EditorToolbar
            editorFormattingState={editorFormattingState}
            saveState={hasPendingTypewriterDraft && documentSaveState !== "saving" ? "dirty" : documentSaveState}
            saveTimestamp={documentSaveTimestamp}
            onSave={requestDocumentSave}
            onApplyHistoryCommand={applyEditorCommand}
            onApplyRichFormat={applyRichFormat}
            onApplyLinePrefix={applyLinePrefix}
            onApplyOrderedList={applyOrderedList}
            onInsertSceneBreak={insertSceneBreak}
            onInsertNoteBlock={insertNoteBlock}
            onInsertLoreLink={insertLoreLink}
            onCreateLoreFromSelection={openCreateLoreFromSelectionDialog}
            canCreateLoreFromSelection={selectionLoreCreateState.canOpen && loreTypes.length > 0}
            selectedLorePageId={selectedLorePageId}
            availableLorePages={availableLorePages}
            onSelectLorePageId={setSelectedLorePageId}
            activeDocumentId={activeDocumentId}
            orderedDocuments={orderedDocuments}
            onOpenDocument={requestOpenDocument}
            isPreviewOpen={isPreviewOpen}
            onTogglePreview={() => setIsPreviewOpen((current) => !current)}
            isDetailsOpen={isDetailsOpen}
            onToggleDetails={() => setIsDetailsOpen((current) => !current)}
            isFocusMode={isFocusMode}
            onToggleFocusMode={() => setIsFocusMode((current) => !current)}
            isDocumentMenuOpen={isDocumentMenuOpen}
            documentMenuRef={documentMenuRef}
            onToggleDocumentMenu={() => setIsDocumentMenuOpen((current) => !current)}
            onCloseDocumentMenu={() => setIsDocumentMenuOpen(false)}
            onAddDocument={requestAddDocument}
            onRenameDocument={() => {
              setIsDocumentMenuOpen(false);
              focusTitleInput();
            }}
            onDuplicateDocument={requestDuplicateDocument}
            editorWidth={editorWidth}
            onSetEditorWidth={setEditorWidth}
            editorMode={editorMode}
            onSetEditorMode={changeEditorMode}
          />
          {linkMentionsPrompt ? (
            <div className="link-mentions-prompt" role="status">
              <span>
                Found {linkMentionsPrompt.count} other {linkMentionsPrompt.count === 1 ? "mention" : "mentions"} of{" "}
                <strong>{linkMentionsPrompt.title}</strong>.
              </span>
              <div className="link-mentions-actions">
                <button type="button" className="link-mentions-btn" onClick={linkAllMentionPromptMatches}>
                  Link all in this document
                </button>
                <button type="button" className="link-mentions-btn ghost" onClick={() => setLinkMentionsPrompt(null)}>
                  Dismiss
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="editor-workspace-frame">
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
            onEditorBlur={handleEditorBlur}
            onTitleBlur={handleTitleBlur}
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

          {slashCommandMatch && slashMenuPosition ? (
            <EditorSlashMenu
              slashMenuRef={slashMenuRef}
              slashMenuPosition={slashMenuPosition}
              filteredSlashCommands={filteredSlashCommands}
              selectedSlashIndex={selectedSlashIndex}
              onApplySlashCommand={applySlashCommand}
            />
          ) : null}

          {shouldShowSelectionLoreAction ? (
            <button
              className="selection-lore-floating-action"
              type="button"
              style={selectionLoreActionStyle}
              onMouseDown={(event) => event.preventDefault()}
              onClick={openCreateLoreFromSelectionDialog}
            >
              + {selectionLoreActionState.label}
            </button>
          ) : null}

          {selectionLoreDialog ? (
            <div className="confirm-overlay selection-lore-overlay" role="presentation">
              <form
                className="confirm-card selection-lore-card"
                role="dialog"
                aria-modal="true"
                aria-labelledby="selection-lore-title"
                onSubmit={(event) => {
                  event.preventDefault();
                  void createLoreFromSelection();
                }}
              >
                <div className="confirm-title" id="selection-lore-title">Create Lore From Selection</div>
                <div className="selection-lore-source">Selected: {selectionLoreDialog.selectedText}</div>
                {selectionLoreCreateState.titleWasTruncated ? (
                  <div className="selection-lore-warning">The selected text was shortened for the title. Edit it before creating.</div>
                ) : null}
                {selectionLoreError ? <div className="lore-table-error">{selectionLoreError}</div> : null}

                <label className="lore-label" htmlFor="selection-lore-name">Title</label>
                <input
                  id="selection-lore-name"
                  className="lore-input"
                  value={selectionLoreTitle}
                  onChange={(event) => setSelectionLoreTitle(event.target.value)}
                  disabled={isCreatingSelectionLore}
                  autoFocus
                />

                <div className="selection-lore-grid">
                  <div>
                    <label className="lore-label" htmlFor="selection-lore-type">Lore Type</label>
                    <select
                      id="selection-lore-type"
                      className="lore-input"
                      value={selectedSelectionLoreType?.id ?? ""}
                      onChange={(event) => setSelectionLoreTypeId(event.target.value)}
                      disabled={isCreatingSelectionLore}
                    >
                      {loreTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="lore-label" htmlFor="selection-lore-template">Template</label>
                    <select
                      id="selection-lore-template"
                      className="lore-input"
                      value={selectionLoreTemplateId ?? ""}
                      onChange={(event) => setSelectionLoreTemplateId(event.target.value || null)}
                      disabled={isCreatingSelectionLore}
                    >
                      <option value="">No template</option>
                      {filteredSelectionLoreTemplates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <label className="lore-label" htmlFor="selection-lore-tags">Tags</label>
                <input
                  id="selection-lore-tags"
                  className="lore-input"
                  value={selectionLoreTags}
                  onChange={(event) => setSelectionLoreTags(event.target.value)}
                  placeholder="ex: faction, rumor, chapter-one"
                  disabled={isCreatingSelectionLore}
                />

                <label className="lore-label" htmlFor="selection-lore-details">Description</label>
                <textarea
                  id="selection-lore-details"
                  className="lore-textarea selection-lore-details"
                  value={selectionLoreDetails}
                  onChange={(event) => setSelectionLoreDetails(event.target.value)}
                  placeholder="Optional starter notes for this lore page..."
                  disabled={isCreatingSelectionLore}
                />

                {selectedSelectionLoreType?.fieldDefinitions.length ? (
                  <div className="selection-lore-fields">
                    <div className="linked-lore-label">Custom Fields</div>
                    {selectedSelectionLoreType.fieldDefinitions.map((field) => (
                      <div key={field.id} className="custom-field-row selection-lore-field-row">
                        <div>
                          <div className="linked-lore-label">{field.name}</div>
                          <div className="template-list-meta">{field.key} - {field.type}</div>
                        </div>
                        {renderSelectionLoreCustomFieldControl(field)}
                      </div>
                    ))}
                  </div>
                ) : null}

                <label className="meta-tag selection-lore-link-option">
                  <input
                    type="checkbox"
                    checked={shouldReplaceSelectionWithLink}
                    onChange={(event) => setShouldReplaceSelectionWithLink(event.target.checked)}
                    disabled={isCreatingSelectionLore}
                  />
                  Replace selection with [[Lore Link]]
                </label>

                <div className="confirm-actions">
                  <button className="confirm-btn ghost" type="button" onClick={closeSelectionLoreDialog} disabled={isCreatingSelectionLore}>
                    Cancel
                  </button>
                  <button className="confirm-btn" type="submit" disabled={!selectionLoreCreateState.canCreate}>
                    {isCreatingSelectionLore ? "Creating..." : selectionLoreCreateState.buttonLabel}
                  </button>
                </div>
              </form>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
});
