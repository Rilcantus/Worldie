import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import {
  createDocument,
  createLorePage,
  deleteDocument,
  deleteLorePage,
  type Document,
  type LorePage,
  listDocuments,
  listLorePages,
  updateDocument,
  updateLorePage,
} from "../lib/data";
import { createTraitsFromTemplate, parseLoreItemFields, stringifyLoreItemFields } from "../lib/loreItems";
import type { LoreTemplate } from "../lib/loreTemplates";
import { getDefaultLoreTypeId, slugifyLoreTypeName, sortLoreTypes, type LoreType } from "../lib/loreTypes";
import type { WorldUI } from "../types/ui";

type UseContentManagerArgs = {
  activeProjectId: string | null;
  activeWorldId: string | null;
  loreTypes: LoreType[];
  setWorlds: Dispatch<SetStateAction<WorldUI[]>>;
  confirmAction: (message: string) => Promise<boolean>;
  showToast: (message: string, onUndo?: () => void) => void;
};

type CreateLoreItemArgs = {
  title: string;
  loreTypeId: string;
  template: LoreTemplate | null;
  tags: string;
};

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

function countNonEmptyWords(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function removeItemWithFallback<T extends { id: string }>(items: T[], itemId: string) {
  const next: T[] = [];
  let removed = false;

  for (const item of items) {
    if (item.id === itemId) {
      removed = true;
      continue;
    }
    next.push(item);
  }

  return {
    next,
    first: next[0] ?? null,
    removed,
  };
}

function buildInitialLoreFields(loreTypeId: string | null, template: LoreTemplate | null) {
  return stringifyLoreItemFields({
    loreTypeId,
    templateId: template?.id ?? null,
    traits: createTraitsFromTemplate(template),
    details: "",
  });
}

export function useContentManager({
  activeProjectId,
  activeWorldId,
  loreTypes,
  setWorlds,
  confirmAction,
  showToast,
}: UseContentManagerArgs) {
  const orderedLoreTypes = useMemo(() => sortLoreTypes(loreTypes), [loreTypes]);
  const loreTypesById = useMemo(
    () => new Map(orderedLoreTypes.map((type) => [type.id, type])),
    [orderedLoreTypes],
  );
  const loreTypesByNormalizedName = useMemo(
    () =>
      new Map(
        orderedLoreTypes.flatMap((type) => [
          [type.name.trim().toLowerCase(), type],
          [type.slug, type],
        ]),
      ),
    [orderedLoreTypes],
  );
  const defaultLoreTypeId = orderedLoreTypes[0]?.id ?? null;
  const docsLoadRequestId = useRef(0);
  const loreLoadRequestId = useRef(0);

  const [documents, setDocuments] = useState<Document[]>([]);
  const [documentsLoadedWorldId, setDocumentsLoadedWorldId] = useState<string | null>(null);
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
  const [documentTitle, setDocumentTitle] = useState("");
  const [documentContent, setDocumentContent] = useState("");
  const [documentFolderPath, setDocumentFolderPath] = useState("");
  const [documentSaveState, setDocumentSaveState] = useState<SaveState>("idle");
  const [documentLastSavedAt, setDocumentLastSavedAt] = useState<number | null>(null);

  const [lorePages, setLorePages] = useState<LorePage[]>([]);
  const [allLorePages, setAllLorePages] = useState<LorePage[]>([]);
  const [loreLoadedWorldId, setLoreLoadedWorldId] = useState<string | null>(null);
  const [activeLoreId, setActiveLoreId] = useState<string | null>(null);
  const [loreTitle, setLoreTitle] = useState("");
  const [loreTags, setLoreTags] = useState("");
  const [loreFields, setLoreFields] = useState("");
  const [lorePageTypeId, setLorePageTypeId] = useState<string | null>(defaultLoreTypeId);
  const [activeLoreTypeId, setActiveLoreTypeId] = useState<string | null>(defaultLoreTypeId);
  const [loreSaveState, setLoreSaveState] = useState<SaveState>("idle");
  const [loreLastSavedAt, setLoreLastSavedAt] = useState<number | null>(null);

  const resetDocumentState = (loadedWorldId: string | null, saveState: SaveState = "idle") => {
    setDocuments((current) => (current.length === 0 ? current : []));
    setDocumentsLoadedWorldId((current) => (current === loadedWorldId ? current : loadedWorldId));
    setActiveDocumentId((current) => (current === null ? current : null));
    setDocumentTitle((current) => (current === "" ? current : ""));
    setDocumentContent((current) => (current === "" ? current : ""));
    setDocumentFolderPath((current) => (current === "" ? current : ""));
    setDocumentSaveState((current) => (current === saveState ? current : saveState));
    setDocumentLastSavedAt((current) => (current === null ? current : null));
  };

  const resetLoreState = (
    loadedWorldId: string | null,
    nextLorePageTypeId: string | null,
    saveState: SaveState = "idle",
  ) => {
    setLorePages((current) => (current.length === 0 ? current : []));
    setAllLorePages((current) => (current.length === 0 ? current : []));
    setLoreLoadedWorldId((current) => (current === loadedWorldId ? current : loadedWorldId));
    setActiveLoreId((current) => (current === null ? current : null));
    setLoreTitle((current) => (current === "" ? current : ""));
    setLoreTags((current) => (current === "" ? current : ""));
    setLoreFields((current) => (current === "" ? current : ""));
    setLorePageTypeId((current) => (current === nextLorePageTypeId ? current : nextLorePageTypeId));
    setLoreSaveState((current) => (current === saveState ? current : saveState));
    setLoreLastSavedAt((current) => (current === null ? current : null));
  };

  const markDocumentSaved = useCallback(() => {
    setDocumentSaveState("saved");
    setDocumentLastSavedAt(Date.now());
  }, []);

  const markLoreSaved = useCallback(() => {
    setLoreSaveState("saved");
    setLoreLastSavedAt(Date.now());
  }, []);

  const resolveLoreTypeId = useCallback((page: LorePage) => {
    const parsed = parseLoreItemFields(page.fieldsJson);
    if (parsed.loreTypeId && loreTypesById.has(parsed.loreTypeId)) {
      return parsed.loreTypeId;
    }
    return (
      loreTypesByNormalizedName.get(page.type.trim().toLowerCase())?.id ??
      loreTypesByNormalizedName.get(slugifyLoreTypeName(page.type))?.id ??
      defaultLoreTypeId
    );
  }, [defaultLoreTypeId, loreTypesById, loreTypesByNormalizedName]);

  const getLoreType = useCallback(
    (loreTypeId: string | null | undefined) => (loreTypeId ? loreTypesById.get(loreTypeId) ?? null : null),
    [loreTypesById],
  );
  const buildLoreTypeCounts = useCallback(
    (pages: LorePage[]) => {
      const counts = Object.fromEntries(orderedLoreTypes.map((type) => [type.id, 0]));
      for (const page of pages) {
        const loreTypeId = resolveLoreTypeId(page);
        if (!loreTypeId || !(loreTypeId in counts)) continue;
        counts[loreTypeId] += 1;
      }
      return counts;
    },
    [orderedLoreTypes, resolveLoreTypeId],
  );
  const collectLoreStats = useCallback(
    (pages: LorePage[], activeTypeId: string | null) => {
      const counts = Object.fromEntries(orderedLoreTypes.map((type) => [type.id, 0]));
      const pagesForActiveType: LorePage[] = [];
      for (const page of pages) {
        const loreTypeId = resolveLoreTypeId(page);
        if (!loreTypeId || !(loreTypeId in counts)) continue;
        counts[loreTypeId] += 1;
        if (activeTypeId && loreTypeId === activeTypeId) {
          pagesForActiveType.push(page);
        }
      }
      return { counts, pagesForActiveType };
    },
    [orderedLoreTypes, resolveLoreTypeId],
  );

  const activeLoreType = getLoreType(activeLoreTypeId);
  const selectedLorePageType = getLoreType(lorePageTypeId);
  const documentsById = useMemo(() => new Map(documents.map((doc) => [doc.id, doc])), [documents]);
  const lorePagesById = useMemo(() => new Map(lorePages.map((page) => [page.id, page])), [lorePages]);
  const allLorePagesById = useMemo(() => new Map(allLorePages.map((page) => [page.id, page])), [allLorePages]);

  const activeDocument = useMemo(
    () => (activeDocumentId ? documentsById.get(activeDocumentId) : undefined),
    [activeDocumentId, documentsById],
  );
  const activeLore = useMemo(
    () => (activeLoreId ? lorePagesById.get(activeLoreId) : undefined),
    [activeLoreId, lorePagesById],
  );
  const activeLoreFields = useMemo(() => parseLoreItemFields(loreFields), [loreFields]);
  const recentDocuments = useMemo(() => documents.slice(0, 5), [documents]);
  const recentLorePages = useMemo(() => allLorePages.slice(0, 5), [allLorePages]);
  const totalWordCount = useMemo(
    () =>
      documents.reduce(
        (sum, doc) => sum + countNonEmptyWords(doc.contentJson),
        0,
      ),
    [documents],
  );
  const activeLoreTypeName = activeLore?.type ?? "Lore";
  const selectedLorePageTypeName = selectedLorePageType?.name ?? activeLoreTypeName;
  const hasUnsavedDocumentChanges = useMemo(() => {
    if (!activeDocument) return false;
    return (
      activeDocument.title !== documentTitle ||
      (activeDocument.contentJson ?? "") !== documentContent ||
      (activeDocument.folderPath ?? "") !== documentFolderPath
    );
  }, [activeDocument, documentContent, documentFolderPath, documentTitle]);
  const hasUnsavedLoreChanges = useMemo(() => {
    if (!activeLoreId) return false;
    const nextTypeName = selectedLorePageTypeName;
    return (
      (activeLore?.title ?? "") !== loreTitle ||
      activeLoreTypeName !== nextTypeName ||
      (activeLore?.tagsJson ?? "") !== loreTags ||
      (activeLore?.fieldsJson ?? "") !== loreFields
    );
  }, [
    activeLore?.fieldsJson,
    activeLore?.tagsJson,
    activeLore?.title,
    activeLoreId,
    activeLoreTypeName,
    loreFields,
    loreTags,
    loreTitle,
    selectedLorePageTypeName,
  ]);
  useEffect(() => {
    if (!defaultLoreTypeId) return;
    setActiveLoreTypeId((current) => (current && loreTypesById.has(current) ? current : defaultLoreTypeId));
    setLorePageTypeId((current) => (current && loreTypesById.has(current) ? current : defaultLoreTypeId));
  }, [defaultLoreTypeId, loreTypesById]);

  useEffect(() => {
    if (!activeProjectId || allLorePages.length === 0 || orderedLoreTypes.length === 0) return;

    const renamedPages: LorePage[] = [];
    for (const page of allLorePages) {
      const loreTypeId = resolveLoreTypeId(page);
      const loreType = loreTypeId ? loreTypesById.get(loreTypeId) ?? null : null;
      if (!loreType || page.type === loreType.name) continue;
      renamedPages.push({
        ...page,
        type: loreType.name,
      });
    }

    if (renamedPages.length === 0) return;

    const renamedPagesById = new Map(renamedPages.map((page) => [page.id, page]));
    setAllLorePages((prev) =>
      prev.map((page) => renamedPagesById.get(page.id) ?? page),
    );
    setLorePages((prev) =>
      prev.map((page) => renamedPagesById.get(page.id) ?? page),
    );
    if (activeLoreId) {
      const activeUpdated = renamedPagesById.get(activeLoreId);
      if (activeUpdated) {
        setLorePageTypeId(resolveLoreTypeId(activeUpdated));
      }
    }

    void Promise.all(
      renamedPages.map((page) =>
        updateLorePage(activeProjectId, page.id, {
          type: page.type,
        }),
      ),
    ).catch((error) => {
      showToast(error instanceof Error ? error.message : "Worldie could not sync renamed lore type labels.");
    });
  }, [activeLoreId, activeProjectId, allLorePages, loreTypesById, resolveLoreTypeId, showToast]);

  useEffect(() => {
    if (!activeProjectId || !activeWorldId) {
      docsLoadRequestId.current += 1;
      resetDocumentState(null, "idle");
      return;
    }
    resetDocumentState(null, "idle");
    const loadDocs = async () => {
      const requestId = ++docsLoadRequestId.current;
      try {
        const docs = await listDocuments(activeProjectId, activeWorldId);
        if (requestId !== docsLoadRequestId.current) return;
        setDocuments(docs);
        setDocumentsLoadedWorldId(activeWorldId);
        const first = docs[0] ?? null;
        setActiveDocumentId(first?.id ?? null);
        setDocumentTitle(first?.title ?? "");
        setDocumentContent(first?.contentJson ?? "");
        setDocumentFolderPath(first?.folderPath ?? "");
        markDocumentSaved();
        setWorlds((prev) =>
          prev.map((world) =>
            world.id === activeWorldId ? { ...world, editorCount: docs.length } : world,
          ),
        );
      } catch (error) {
        if (requestId !== docsLoadRequestId.current) return;
        resetDocumentState(activeWorldId, "error");
        setWorlds((prev) =>
          prev.map((world) =>
            world.id === activeWorldId ? { ...world, editorCount: 0 } : world,
          ),
        );
        showToast(error instanceof Error ? error.message : "Worldie could not load documents for this world.");
      }
    };
    void loadDocs();
  }, [activeProjectId, activeWorldId, setWorlds]);

  useEffect(() => {
    if (!activeDocumentId) return;
    setDocuments((prev) =>
      prev.map((doc) =>
        doc.id === activeDocumentId
          ? {
              ...doc,
              title: documentTitle,
              contentJson: documentContent,
              folderPath: documentFolderPath,
            }
          : doc,
      ),
    );
    const handle = window.setTimeout(() => {
      if (!activeProjectId) return;
      setDocumentSaveState("saving");
      void updateDocument(activeProjectId, activeDocumentId, {
        title: documentTitle,
        contentJson: documentContent,
        folderPath: documentFolderPath,
      })
        .then(() => {
          markDocumentSaved();
        })
        .catch((error) => {
          setDocumentSaveState("error");
          showToast(error instanceof Error ? error.message : "Worldie could not save the current document.");
        });
    }, 700);
    return () => window.clearTimeout(handle);
  }, [activeProjectId, activeDocumentId, documentTitle, documentContent, documentFolderPath]);

  useEffect(() => {
    if (!activeProjectId || !activeWorldId || !defaultLoreTypeId) {
      loreLoadRequestId.current += 1;
      resetLoreState(null, lorePageTypeId, "idle");
      return;
    }
    resetLoreState(null, activeLoreTypeId ?? defaultLoreTypeId, "idle");
    const loadLore = async () => {
      const requestId = ++loreLoadRequestId.current;
      try {
        const allPages = await listLorePages(activeProjectId, activeWorldId);
        if (requestId !== loreLoadRequestId.current) return;
        const currentTypeId = activeLoreTypeId ?? defaultLoreTypeId;
        const { counts, pagesForActiveType } = collectLoreStats(allPages, currentTypeId);
        const pages = pagesForActiveType;
        setAllLorePages(allPages);
        setLorePages(pages);
        setLoreLoadedWorldId(activeWorldId);
        const first = pages[0] ?? null;
        const firstTypeId = first ? resolveLoreTypeId(first) : currentTypeId;
        setActiveLoreId(first?.id ?? null);
        setLoreTitle(first?.title ?? "");
        setLoreTags(first?.tagsJson ?? "");
        setLoreFields(first?.fieldsJson ?? "");
        setLorePageTypeId(firstTypeId);
        markLoreSaved();

        setWorlds((prev) =>
          prev.map((world) =>
            world.id === activeWorldId
              ? {
                  ...world,
                  loreCount: allPages.length,
                  loreCategories: orderedLoreTypes.map((type) => ({
                    id: type.id,
                    label: type.name,
                    count: counts[type.id] ?? 0,
                    isSystem: type.isSystem,
                  })),
                }
              : world,
          ),
        );
      } catch (error) {
        if (requestId !== loreLoadRequestId.current) return;
        resetLoreState(activeWorldId, activeLoreTypeId ?? defaultLoreTypeId, "error");
        setWorlds((prev) =>
          prev.map((world) =>
            world.id === activeWorldId
              ? {
                  ...world,
                  loreCount: 0,
                  loreCategories: orderedLoreTypes.map((type) => ({
                    id: type.id,
                    label: type.name,
                    count: 0,
                    isSystem: type.isSystem,
                  })),
                }
              : world,
          ),
        );
        showToast(error instanceof Error ? error.message : "Worldie could not load lore for this world.");
      }
    };
    void loadLore();
  }, [activeProjectId, activeWorldId, activeLoreTypeId, defaultLoreTypeId, orderedLoreTypes, setWorlds]);

  useEffect(() => {
    if (!activeLoreId) return;
    const nextTypeName = selectedLorePageTypeName;
    setLorePages((prev) =>
      prev.map((page) =>
        page.id === activeLoreId
          ? (
            page.title === loreTitle &&
            page.type === nextTypeName &&
            (page.tagsJson ?? "") === loreTags &&
            (page.fieldsJson ?? "") === loreFields
          )
            ? page
            : { ...page, title: loreTitle, type: nextTypeName, tagsJson: loreTags, fieldsJson: loreFields }
          : page,
      ),
    );
    setAllLorePages((prev) =>
      prev.map((page) =>
        page.id === activeLoreId
          ? (
            page.title === loreTitle &&
            page.type === nextTypeName &&
            (page.tagsJson ?? "") === loreTags &&
            (page.fieldsJson ?? "") === loreFields
          )
            ? page
            : { ...page, title: loreTitle, type: nextTypeName, tagsJson: loreTags, fieldsJson: loreFields }
          : page,
      ),
    );

    const handle = window.setTimeout(() => {
      const parsedFields = parseLoreItemFields(loreFields);
      const nextFieldsJson = stringifyLoreItemFields({
        ...parsedFields,
        loreTypeId: lorePageTypeId,
      });
      if (nextFieldsJson !== loreFields) {
        setLoreFields(nextFieldsJson);
      }
      if (!activeProjectId) return;
      setLoreSaveState("saving");
      void updateLorePage(activeProjectId, activeLoreId, {
        title: loreTitle,
        type: nextTypeName,
        tagsJson: loreTags,
        fieldsJson: nextFieldsJson,
      })
        .then(() => {
          markLoreSaved();
        })
        .catch((error) => {
          setLoreSaveState("error");
          showToast(error instanceof Error ? error.message : "Worldie could not save the current lore item.");
        });
    }, 700);
    return () => window.clearTimeout(handle);
  }, [activeProjectId, activeLoreId, loreFields, lorePageTypeId, loreTags, loreTitle, selectedLorePageTypeName]);

  const selectDocument = useCallback((doc: Document) => {
    const nextContent = doc.contentJson ?? "";
    const nextFolderPath = doc.folderPath ?? "";
    const changed =
      activeDocumentId !== doc.id ||
      documentTitle !== doc.title ||
      documentContent !== nextContent ||
      documentFolderPath !== nextFolderPath;
    setActiveDocumentId((current) => (current === doc.id ? current : doc.id));
    setDocumentTitle((current) => (current === doc.title ? current : doc.title));
    setDocumentContent((current) => (current === nextContent ? current : nextContent));
    setDocumentFolderPath((current) => (current === nextFolderPath ? current : nextFolderPath));
    if (!changed) return;
    markDocumentSaved();
  }, [activeDocumentId, documentContent, documentFolderPath, documentTitle, markDocumentSaved]);

  const addDocument = async () => {
    if (!activeProjectId || !activeWorldId) return null;
    const title = `New Document ${documents.length + 1}`;
    let created: Document;
    try {
      created = await createDocument(activeProjectId, activeWorldId, title);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Worldie could not create a new document.");
      return null;
    }
    const nextDocs = [created, ...documents];
    setDocuments(nextDocs);
    setActiveDocumentId(created.id);
    setDocumentTitle(created.title);
    setDocumentContent(created.contentJson ?? "");
    setDocumentFolderPath(created.folderPath ?? "");
    markDocumentSaved();
    setWorlds((prev) =>
      prev.map((world) =>
        world.id === activeWorldId ? { ...world, editorCount: nextDocs.length } : world,
      ),
    );
    return created;
  };

  const saveDocument = async () => {
    if (!activeProjectId || !activeDocumentId) return;
    try {
      setDocumentSaveState("saving");
      await updateDocument(activeProjectId, activeDocumentId, {
        title: documentTitle,
        contentJson: documentContent,
        folderPath: documentFolderPath,
      });
      markDocumentSaved();
    } catch (error) {
      setDocumentSaveState("error");
      showToast(error instanceof Error ? error.message : "Worldie could not save the document.");
    }
  };

  const duplicateDocument = async () => {
    if (!activeProjectId || !activeWorldId || !activeDocument) return null;
    const duplicateTitle = `${activeDocument.title} Copy`;
    let created: Document;
    try {
      created = await createDocument(activeProjectId, activeWorldId, duplicateTitle);
      await updateDocument(activeProjectId, created.id, {
        title: duplicateTitle,
        contentJson: activeDocument.contentJson ?? "",
        folderPath: activeDocument.folderPath ?? "",
      });
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Worldie could not duplicate the document.");
      return null;
    }
    const duplicated = {
      ...created,
      title: duplicateTitle,
      contentJson: activeDocument.contentJson ?? "",
      folderPath: activeDocument.folderPath ?? "",
    } satisfies Document;
    const nextDocs = [duplicated, ...documents];
    setDocuments(nextDocs);
    setActiveDocumentId(duplicated.id);
    setDocumentTitle(duplicated.title);
    setDocumentContent(duplicated.contentJson ?? "");
    setDocumentFolderPath(duplicated.folderPath ?? "");
    markDocumentSaved();
    setWorlds((prev) =>
      prev.map((world) =>
        world.id === activeWorldId ? { ...world, editorCount: nextDocs.length } : world,
      ),
    );
    return duplicated;
  };

  const removeDocument = async (docId: string) => {
    const confirmDelete = await confirmAction("Delete this document?");
    if (!confirmDelete) return false;
    const deleted = documentsById.get(docId);
    if (!activeProjectId) return false;
    try {
      await deleteDocument(activeProjectId, docId);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Worldie could not delete the document.");
      return false;
    }
    const { next: nextDocs, first: nextDocument } = removeItemWithFallback(documents, docId);
    setDocuments(nextDocs);
    if (activeDocumentId === docId) {
      setActiveDocumentId(nextDocument?.id ?? null);
      setDocumentTitle(nextDocument?.title ?? "");
      setDocumentContent(nextDocument?.contentJson ?? "");
      setDocumentFolderPath(nextDocument?.folderPath ?? "");
      if (nextDocument) {
        markDocumentSaved();
      } else {
        setDocumentSaveState("idle");
        setDocumentLastSavedAt(null);
      }
    }
    if (activeWorldId) {
      setWorlds((prev) =>
        prev.map((world) =>
          world.id === activeWorldId ? { ...world, editorCount: nextDocs.length } : world,
        ),
      );
    }
    if (deleted && activeWorldId) {
      showToast("Document deleted", () => {
        void createDocument(activeProjectId, activeWorldId, deleted.title).then((restored) => {
          void updateDocument(activeProjectId, restored.id, {
            contentJson: deleted.contentJson ?? "",
            folderPath: deleted.folderPath ?? "",
          }).then(() => {
            setDocuments((prev) => {
              const restoredDocument = {
                ...restored,
                contentJson: deleted.contentJson ?? "",
                folderPath: deleted.folderPath ?? "",
              };
              const nextDocs = [restoredDocument, ...prev];
              setWorlds((worldsPrev) =>
                worldsPrev.map((world) =>
                  world.id === activeWorldId ? { ...world, editorCount: nextDocs.length } : world,
                ),
              );
              return nextDocs;
            });
          });
        });
      });
    }
    return true;
  };

  const selectLorePage = useCallback((page: LorePage) => {
    const loreTypeId = resolveLoreTypeId(page);
    const parsedFields = parseLoreItemFields(page.fieldsJson);
    const normalizedFields = stringifyLoreItemFields({
      ...parsedFields,
      loreTypeId,
    });
    const nextTags = page.tagsJson ?? "";
    const changed =
      activeLoreId !== page.id ||
      loreTitle !== page.title ||
      loreTags !== nextTags ||
      loreFields !== normalizedFields ||
      lorePageTypeId !== loreTypeId ||
      activeLoreTypeId !== loreTypeId;
    setActiveLoreId((current) => (current === page.id ? current : page.id));
    setLoreTitle((current) => (current === page.title ? current : page.title));
    setLoreTags((current) => (current === nextTags ? current : nextTags));
    setLoreFields((current) => (current === normalizedFields ? current : normalizedFields));
    setLorePageTypeId((current) => (current === loreTypeId ? current : loreTypeId));
    setActiveLoreTypeId((current) => (current === loreTypeId ? current : loreTypeId));
    if (!changed) return;
    markLoreSaved();
  }, [
    activeLoreId,
    activeLoreTypeId,
    loreFields,
    lorePageTypeId,
    loreTags,
    loreTitle,
    markLoreSaved,
    resolveLoreTypeId,
  ]);

  const createLoreItem = async ({ title, loreTypeId, template, tags }: CreateLoreItemArgs) => {
    if (!activeProjectId || !activeWorldId) return null;
    const loreType = getLoreType(loreTypeId);
    if (!loreType) return null;
    let created: LorePage;
    const fieldsJson = buildInitialLoreFields(loreType.id, template);
    try {
      created = await createLorePage(activeProjectId, activeWorldId, title.trim() || `New ${loreType.name}`, loreType.name);
      await updateLorePage(activeProjectId, created.id, {
        title: title.trim() || created.title,
        type: loreType.name,
        tagsJson: tags,
        fieldsJson,
      });
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Worldie could not create the lore item.");
      return null;
    }
    const createdItem = {
      ...created,
      title: title.trim() || created.title,
      type: loreType.name,
      tagsJson: tags,
      fieldsJson,
    };
    const nextAll = [createdItem, ...allLorePages];
    const nextPages = loreType.id === activeLoreTypeId ? [createdItem, ...lorePages] : lorePages;
    setAllLorePages(nextAll);
    setLorePages(nextPages);
    setActiveLoreTypeId(loreType.id);
    selectLorePage(createdItem);
    markLoreSaved();
    setWorlds((prev) =>
      prev.map((world) =>
        world.id === activeWorldId
          ? {
              ...world,
              loreCount: nextAll.length,
              loreCategories: world.loreCategories.map((category) => ({
                ...category,
                count: category.id === loreType.id ? category.count + 1 : category.count,
              })),
            }
          : world,
      ),
    );
    return createdItem;
  };

  const saveLorePage = async () => {
    if (!activeProjectId || !activeLoreId) return;
    const nextType = selectedLorePageType;
    const parsedFields = parseLoreItemFields(loreFields);
    const nextFieldsJson = stringifyLoreItemFields({
      ...parsedFields,
      loreTypeId: nextType?.id ?? parsedFields.loreTypeId,
    });
    try {
      setLoreSaveState("saving");
      await updateLorePage(activeProjectId, activeLoreId, {
        title: loreTitle,
        type: nextType?.name ?? activeLore?.type ?? "Lore",
        tagsJson: loreTags,
        fieldsJson: nextFieldsJson,
      });
      markLoreSaved();
    } catch (error) {
      setLoreSaveState("error");
      showToast(error instanceof Error ? error.message : "Worldie could not save the lore item.");
    }
  };

  const removeLorePage = async (loreId: string) => {
    const confirmDelete = await confirmAction("Delete this lore page?");
    if (!confirmDelete) return false;
    const deleted = allLorePagesById.get(loreId);
    if (!activeProjectId) return false;
    try {
      await deleteLorePage(activeProjectId, loreId);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Worldie could not delete the lore item.");
      return false;
    }
    const { next: nextPages, first: nextPage } = removeItemWithFallback(lorePages, loreId);
    const { next: nextAll } = removeItemWithFallback(allLorePages, loreId);
    setLorePages(nextPages);
    setAllLorePages(nextAll);
    if (activeLoreId === loreId) {
      setActiveLoreId(nextPage?.id ?? null);
      setLoreTitle(nextPage?.title ?? "");
      setLoreTags(nextPage?.tagsJson ?? "");
      setLoreFields(nextPage?.fieldsJson ?? "");
      setLorePageTypeId(nextPage ? resolveLoreTypeId(nextPage) : defaultLoreTypeId);
      if (nextPage) {
        markLoreSaved();
      } else {
        setLoreSaveState("idle");
        setLoreLastSavedAt(null);
      }
    }
    if (activeWorldId) {
        const counts = buildLoreTypeCounts(nextAll);
        setWorlds((prev) =>
        prev.map((world) =>
          world.id === activeWorldId
            ? {
                ...world,
                loreCount: nextAll.length,
                loreCategories: orderedLoreTypes.map((type) => ({
                  id: type.id,
                  label: type.name,
                  count: counts[type.id] ?? 0,
                  isSystem: type.isSystem,
                })),
              }
            : world,
        ),
      );
    }
    if (deleted && activeWorldId) {
      showToast("Lore page deleted", () => {
        const deletedFields = parseLoreItemFields(deleted.fieldsJson);
        void createLorePage(activeProjectId, activeWorldId, deleted.title, deleted.type).then((restored) => {
          void updateLorePage(activeProjectId, restored.id, {
            title: deleted.title,
            type: deleted.type,
            tagsJson: deleted.tagsJson ?? "",
            fieldsJson: stringifyLoreItemFields(deletedFields),
          }).then(() => {
            const restoredPage = {
              ...restored,
              title: deleted.title,
              type: deleted.type,
              tagsJson: deleted.tagsJson ?? "",
              fieldsJson: stringifyLoreItemFields(deletedFields),
            };
            const restoredLoreTypeId = resolveLoreTypeId(restoredPage);
            setAllLorePages((prev) => {
              const nextAll = [restoredPage, ...prev];
              const counts = buildLoreTypeCounts(nextAll);
              setWorlds((worldsPrev) =>
                worldsPrev.map((world) =>
                  world.id === activeWorldId
                    ? {
                        ...world,
                        loreCount: nextAll.length,
                        loreCategories: orderedLoreTypes.map((type) => ({
                          id: type.id,
                          label: type.name,
                          count: counts[type.id] ?? 0,
                          isSystem: type.isSystem,
                        })),
                      }
                    : world,
                ),
              );
              return nextAll;
            });
            setLorePages((prev) =>
              restoredLoreTypeId === activeLoreTypeId ? [restoredPage, ...prev] : prev,
            );
          });
        });
      });
    }
    return true;
  };

  const reassignLoreType = async (fromLoreTypeId: string, toLoreTypeId: string) => {
    if (!activeProjectId) return;
    const nextLoreType = getLoreType(toLoreTypeId);
    if (!nextLoreType) return;
    const updates: LorePage[] = [];
    for (const page of allLorePages) {
      if (resolveLoreTypeId(page) !== fromLoreTypeId) continue;
        const fields = parseLoreItemFields(page.fieldsJson);
        updates.push({
          ...page,
          type: nextLoreType.name,
          fieldsJson: stringifyLoreItemFields({
            ...fields,
            loreTypeId: toLoreTypeId,
          }),
        });
    }

    try {
      await Promise.all(
        updates.map((page) =>
          updateLorePage(activeProjectId, page.id, {
            type: page.type,
            fieldsJson: page.fieldsJson,
          }),
        ),
      );
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Worldie could not reassign lore items to the new type.");
      return;
    }

    const updatesById = new Map(updates.map((page) => [page.id, page]));
    const nextAll = allLorePages.map((page) => updatesById.get(page.id) ?? page);
    const nextActiveLoreTypeId = activeLoreTypeId === fromLoreTypeId ? toLoreTypeId : (activeLoreTypeId ?? toLoreTypeId);
    const { counts, pagesForActiveType } = collectLoreStats(nextAll, nextActiveLoreTypeId);
    const nextPages = pagesForActiveType;
    setAllLorePages(nextAll);
    setLorePages(nextPages);
    if (activeLoreTypeId === fromLoreTypeId) {
      setActiveLoreTypeId(toLoreTypeId);
    }

    if (activeWorldId) {
      setWorlds((prev) =>
        prev.map((world) =>
          world.id === activeWorldId
            ? {
                ...world,
                loreCount: nextAll.length,
                loreCategories: orderedLoreTypes.map((type) => ({
                  id: type.id,
                  label: type.name,
                  count: counts[type.id] ?? 0,
                  isSystem: type.isSystem,
                })),
              }
            : world,
        ),
      );
    }

    if (activeLoreId) {
      const activeUpdated = activeLoreId ? updatesById.get(activeLoreId) ?? allLorePagesById.get(activeLoreId) : undefined;
      if (activeUpdated) {
        setLoreFields(activeUpdated.fieldsJson ?? "");
        setLorePageTypeId(resolveLoreTypeId(activeUpdated));
      }
    }
  };

  const updateDocumentTitle = useCallback((value: string) => {
    setDocumentTitle((current) => {
      if (current === value) return current;
      setDocumentSaveState((saveState) => (saveState === "dirty" ? saveState : "dirty"));
      return value;
    });
  }, []);

  const updateDocumentContent = useCallback((value: string) => {
    setDocumentContent((current) => {
      if (current === value) return current;
      setDocumentSaveState((saveState) => (saveState === "dirty" ? saveState : "dirty"));
      return value;
    });
  }, []);

  const updateDocumentFolderPath = useCallback((value: string) => {
    setDocumentFolderPath((current) => {
      if (current === value) return current;
      setDocumentSaveState((saveState) => (saveState === "dirty" ? saveState : "dirty"));
      return value;
    });
  }, []);

  const updateLoreTitle = useCallback((value: string) => {
    setLoreTitle((current) => {
      if (current === value) return current;
      setLoreSaveState((saveState) => (saveState === "dirty" ? saveState : "dirty"));
      return value;
    });
  }, []);

  const updateLoreTags = useCallback((value: string) => {
    setLoreTags((current) => {
      if (current === value) return current;
      setLoreSaveState((saveState) => (saveState === "dirty" ? saveState : "dirty"));
      return value;
    });
  }, []);

  const updateLoreFields = useCallback((value: string) => {
    setLoreFields((current) => {
      if (current === value) return current;
      setLoreSaveState((saveState) => (saveState === "dirty" ? saveState : "dirty"));
      return value;
    });
  }, []);

  const updateLorePageTypeId = useCallback((value: string | null) => {
    setLorePageTypeId((current) => {
      if (current === value) return current;
      setLoreSaveState((saveState) => (saveState === "dirty" ? saveState : "dirty"));
      return value;
    });
  }, []);

  return useMemo(
    () => ({
      documents,
      documentsLoadedWorldId,
      activeDocument,
      activeDocumentId,
      documentSaveState,
      documentLastSavedAt,
      documentTitle,
      documentContent,
      documentFolderPath,
      lorePages,
      allLorePages,
      loreLoadedWorldId,
      activeLore,
      activeLoreId,
      loreSaveState,
      loreLastSavedAt,
      activeLoreFields,
      loreTitle,
      loreTags,
      loreFields,
      lorePageTypeId,
      activeLoreTypeId,
      activeLoreType,
      recentDocuments,
      recentLorePages,
      totalWordCount,
      hasUnsavedChanges: hasUnsavedDocumentChanges || hasUnsavedLoreChanges,
      loreTypes: orderedLoreTypes,
      resolveLoreTypeId,
      getLoreType,
      setDocumentTitle: updateDocumentTitle,
      setDocumentContent: updateDocumentContent,
      setDocumentFolderPath: updateDocumentFolderPath,
      setLoreTitle: updateLoreTitle,
      setLoreTags: updateLoreTags,
      setLoreFields: updateLoreFields,
      setLorePageTypeId: updateLorePageTypeId,
      setActiveLoreTypeId,
      selectDocument,
      addDocument,
      duplicateDocument,
      saveDocument,
      removeDocument,
      selectLorePage,
      createLoreItem,
      reassignLoreType,
      saveLorePage,
      removeLorePage,
    }),
    [
      documents,
      documentsLoadedWorldId,
      activeDocument,
      activeDocumentId,
      documentSaveState,
      documentLastSavedAt,
      documentTitle,
      documentContent,
      documentFolderPath,
      lorePages,
      allLorePages,
      loreLoadedWorldId,
      activeLore,
      activeLoreId,
      loreSaveState,
      loreLastSavedAt,
      activeLoreFields,
      loreTitle,
      loreTags,
      loreFields,
      lorePageTypeId,
      activeLoreTypeId,
      activeLoreType,
      recentDocuments,
      recentLorePages,
      totalWordCount,
      hasUnsavedDocumentChanges,
      hasUnsavedLoreChanges,
      orderedLoreTypes,
      documentsById,
      allLorePagesById,
      resolveLoreTypeId,
      getLoreType,
      updateDocumentTitle,
      updateDocumentContent,
      updateDocumentFolderPath,
      updateLoreTitle,
      updateLoreTags,
      updateLoreFields,
      updateLorePageTypeId,
      setActiveLoreTypeId,
      selectDocument,
      addDocument,
      duplicateDocument,
      saveDocument,
      removeDocument,
      selectLorePage,
      createLoreItem,
      reassignLoreType,
      saveLorePage,
      removeLorePage,
    ],
  );
}
