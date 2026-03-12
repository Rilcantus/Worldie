import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
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
import { getDefaultLoreTypeId, getLoreTypeByName, sortLoreTypes, type LoreType } from "../lib/loreTypes";
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
  const defaultLoreTypeId = orderedLoreTypes[0]?.id ?? null;
  const docsLoadRequestId = useRef(0);
  const loreLoadRequestId = useRef(0);

  const createStarterDocument = async (worldId: string) => {
    if (!activeProjectId) return null;
    const created = await createDocument(activeProjectId, worldId, "Welcome Note");
    await updateDocument(activeProjectId, created.id, {
      title: "Welcome Note",
      contentJson:
        "Use this document for chapter drafts, scene notes, or loose ideas.\n\nStart with a rough scene, then link out to lore pages as the world takes shape.",
      folderPath: "Notes",
    });
    return {
      ...created,
      title: "Welcome Note",
      contentJson:
        "Use this document for chapter drafts, scene notes, or loose ideas.\n\nStart with a rough scene, then link out to lore pages as the world takes shape.",
      folderPath: "Notes",
    } satisfies Document;
  };

  const createStarterLorePage = async (worldId: string, loreTypeName: string, title: string, traits: Array<{ name: string; value: string }>, tagsJson: string) => {
    if (!activeProjectId) return null;
    const loreType = getLoreTypeByName(orderedLoreTypes, loreTypeName) ?? orderedLoreTypes[0] ?? null;
    const created = await createLorePage(activeProjectId, worldId, title, loreType?.name ?? loreTypeName);
    const fieldsJson = stringifyLoreItemFields({
      loreTypeId: loreType?.id ?? null,
      templateId: null,
      traits: traits.map((trait) => ({ id: crypto.randomUUID(), name: trait.name, value: trait.value })),
      details: "",
    });
    await updateLorePage(activeProjectId, created.id, {
      title,
      type: loreType?.name ?? loreTypeName,
      tagsJson,
      fieldsJson,
    });
    return {
      ...created,
      title,
      type: loreType?.name ?? loreTypeName,
      tagsJson,
      fieldsJson,
    } satisfies LorePage;
  };

  const [documents, setDocuments] = useState<Document[]>([]);
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
  const [documentTitle, setDocumentTitle] = useState("");
  const [documentContent, setDocumentContent] = useState("");
  const [documentFolderPath, setDocumentFolderPath] = useState("");
  const [documentSaveState, setDocumentSaveState] = useState<SaveState>("idle");
  const [documentLastSavedAt, setDocumentLastSavedAt] = useState<number | null>(null);

  const [lorePages, setLorePages] = useState<LorePage[]>([]);
  const [allLorePages, setAllLorePages] = useState<LorePage[]>([]);
  const [activeLoreId, setActiveLoreId] = useState<string | null>(null);
  const [loreTitle, setLoreTitle] = useState("");
  const [loreTags, setLoreTags] = useState("");
  const [loreFields, setLoreFields] = useState("");
  const [lorePageTypeId, setLorePageTypeId] = useState<string | null>(defaultLoreTypeId);
  const [activeLoreTypeId, setActiveLoreTypeId] = useState<string | null>(defaultLoreTypeId);
  const [loreSaveState, setLoreSaveState] = useState<SaveState>("idle");
  const [loreLastSavedAt, setLoreLastSavedAt] = useState<number | null>(null);

  const markDocumentSaved = () => {
    setDocumentSaveState("saved");
    setDocumentLastSavedAt(Date.now());
  };

  const markLoreSaved = () => {
    setLoreSaveState("saved");
    setLoreLastSavedAt(Date.now());
  };

  const resolveLoreTypeId = (page: LorePage) => {
    const parsed = parseLoreItemFields(page.fieldsJson);
    if (parsed.loreTypeId && orderedLoreTypes.some((type) => type.id === parsed.loreTypeId)) {
      return parsed.loreTypeId;
    }
    return getLoreTypeByName(orderedLoreTypes, page.type)?.id ?? defaultLoreTypeId;
  };

  const getLoreType = (loreTypeId: string | null | undefined) =>
    orderedLoreTypes.find((type) => type.id === loreTypeId) ?? null;

  const activeLoreType = getLoreType(activeLoreTypeId);
  const selectedLorePageType = getLoreType(lorePageTypeId);

  const activeDocument = useMemo(
    () => documents.find((doc) => doc.id === activeDocumentId),
    [documents, activeDocumentId],
  );
  const activeLore = useMemo(
    () => lorePages.find((page) => page.id === activeLoreId),
    [lorePages, activeLoreId],
  );
  const activeLoreFields = useMemo(() => parseLoreItemFields(loreFields), [loreFields]);
  const recentDocuments = useMemo(() => documents.slice(0, 5), [documents]);
  const recentLorePages = useMemo(() => allLorePages.slice(0, 5), [allLorePages]);
  const totalWordCount = useMemo(
    () =>
      documents.reduce(
        (sum, doc) => sum + (doc.contentJson?.trim().split(/\s+/).filter(Boolean).length ?? 0),
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
    setActiveLoreTypeId((current) => (current && orderedLoreTypes.some((type) => type.id === current) ? current : defaultLoreTypeId));
    setLorePageTypeId((current) => (current && orderedLoreTypes.some((type) => type.id === current) ? current : defaultLoreTypeId));
  }, [defaultLoreTypeId, orderedLoreTypes]);

  useEffect(() => {
    if (!activeProjectId || !activeWorldId) {
      docsLoadRequestId.current += 1;
      setDocuments([]);
      setActiveDocumentId(null);
      setDocumentTitle("");
      setDocumentContent("");
      setDocumentFolderPath("");
      setDocumentSaveState("idle");
      setDocumentLastSavedAt(null);
      return;
    }
    const loadDocs = async () => {
      const requestId = ++docsLoadRequestId.current;
      let docs = await listDocuments(activeProjectId, activeWorldId);
      if (requestId !== docsLoadRequestId.current) return;
      if (docs.length === 0) {
        const starter = await createStarterDocument(activeWorldId);
        if (requestId !== docsLoadRequestId.current) return;
        docs = starter ? [starter] : [];
      }
      setDocuments(docs);
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
    };
    void loadDocs().catch((error) => {
      showToast(error instanceof Error ? error.message : "Worldie could not load documents for this world.");
    });
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
      setLorePages([]);
      setAllLorePages([]);
      setActiveLoreId(null);
      setLoreTitle("");
      setLoreTags("");
      setLoreFields("");
      setLoreSaveState("idle");
      setLoreLastSavedAt(null);
      return;
    }
    const loadLore = async () => {
      const requestId = ++loreLoadRequestId.current;
      let allPages = await listLorePages(activeProjectId, activeWorldId);
      if (requestId !== loreLoadRequestId.current) return;
      if (allPages.length === 0) {
        const starterCharacter = await createStarterLorePage(
          activeWorldId,
          "Character",
          "Starter Character",
          [
            { name: "Role", value: "protagonist" },
            { name: "Status", value: "draft" },
          ],
          "starter, character",
        );
        const starterPlace = await createStarterLorePage(
          activeWorldId,
          "Place",
          "Starter Place",
          [
            { name: "Region", value: "unknown" },
            { name: "Status", value: "draft" },
          ],
          "starter, place",
        );
        if (requestId !== loreLoadRequestId.current) return;
        allPages = [starterCharacter, starterPlace].filter(Boolean) as LorePage[];
      }
      const currentTypeId = activeLoreTypeId ?? defaultLoreTypeId;
      const pages = allPages.filter((page) => resolveLoreTypeId(page) === currentTypeId);
      setAllLorePages(allPages);
      setLorePages(pages);
      const first = pages[0] ?? null;
      const firstTypeId = first ? resolveLoreTypeId(first) : currentTypeId;
      setActiveLoreId(first?.id ?? null);
      setLoreTitle(first?.title ?? "");
      setLoreTags(first?.tagsJson ?? "");
      setLoreFields(first?.fieldsJson ?? "");
      setLorePageTypeId(firstTypeId);
      markLoreSaved();

      const counts = Object.fromEntries(
        orderedLoreTypes.map((type) => [type.id, allPages.filter((page) => resolveLoreTypeId(page) === type.id).length]),
      );
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
    };
    void loadLore().catch((error) => {
      showToast(error instanceof Error ? error.message : "Worldie could not load lore for this world.");
    });
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

  const selectDocument = (doc: Document) => {
    setActiveDocumentId(doc.id);
    setDocumentTitle(doc.title);
    setDocumentContent(doc.contentJson ?? "");
    setDocumentFolderPath(doc.folderPath ?? "");
    markDocumentSaved();
  };

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
    const deleted = documents.find((doc) => doc.id === docId);
    if (!activeProjectId) return false;
    try {
      await deleteDocument(activeProjectId, docId);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Worldie could not delete the document.");
      return false;
    }
    const nextDocs = documents.filter((doc) => doc.id !== docId);
    setDocuments(nextDocs);
    if (activeDocumentId === docId) {
      const next = nextDocs[0] ?? null;
      setActiveDocumentId(next?.id ?? null);
      setDocumentTitle(next?.title ?? "");
      setDocumentContent(next?.contentJson ?? "");
      setDocumentFolderPath(next?.folderPath ?? "");
      if (next) {
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
            setDocuments((prev) => [
              { ...restored, contentJson: deleted.contentJson ?? "", folderPath: deleted.folderPath ?? "" },
              ...prev,
            ]);
          });
        });
      });
    }
    return true;
  };

  const selectLorePage = (page: LorePage) => {
    const loreTypeId = resolveLoreTypeId(page);
    const parsedFields = parseLoreItemFields(page.fieldsJson);
    const normalizedFields = stringifyLoreItemFields({
      ...parsedFields,
      loreTypeId,
    });
    setActiveLoreId(page.id);
    setLoreTitle(page.title);
    setLoreTags(page.tagsJson ?? "");
    setLoreFields(normalizedFields);
    setLorePageTypeId(loreTypeId);
    setActiveLoreTypeId(loreTypeId);
    markLoreSaved();
  };

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
    const deleted = allLorePages.find((page) => page.id === loreId);
    if (!activeProjectId) return false;
    try {
      await deleteLorePage(activeProjectId, loreId);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Worldie could not delete the lore item.");
      return false;
    }
    const nextPages = lorePages.filter((page) => page.id !== loreId);
    const nextAll = allLorePages.filter((page) => page.id !== loreId);
    setLorePages(nextPages);
    setAllLorePages(nextAll);
    if (activeLoreId === loreId) {
      const next = nextPages[0] ?? null;
      setActiveLoreId(next?.id ?? null);
      setLoreTitle(next?.title ?? "");
      setLoreTags(next?.tagsJson ?? "");
      setLoreFields(next?.fieldsJson ?? "");
      setLorePageTypeId(next ? resolveLoreTypeId(next) : defaultLoreTypeId);
      if (next) {
        markLoreSaved();
      } else {
        setLoreSaveState("idle");
        setLoreLastSavedAt(null);
      }
    }
    if (activeWorldId) {
      const counts = Object.fromEntries(
        orderedLoreTypes.map((type) => [type.id, nextAll.filter((page) => resolveLoreTypeId(page) === type.id).length]),
      );
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
            setLorePages((prev) => [restoredPage, ...prev]);
            setAllLorePages((prev) => [restoredPage, ...prev]);
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
    const updates = allLorePages
      .filter((page) => resolveLoreTypeId(page) === fromLoreTypeId)
      .map((page) => {
        const fields = parseLoreItemFields(page.fieldsJson);
        return {
          ...page,
          type: nextLoreType.name,
          fieldsJson: stringifyLoreItemFields({
            ...fields,
            loreTypeId: toLoreTypeId,
          }),
        };
      });

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

    const nextAll = allLorePages.map((page) => updates.find((updated) => updated.id === page.id) ?? page);
    const nextPages = nextAll.filter((page) => resolveLoreTypeId(page) === (activeLoreTypeId ?? toLoreTypeId));
    setAllLorePages(nextAll);
    setLorePages(nextPages);

    if (activeLoreId) {
      const activeUpdated = nextAll.find((page) => page.id === activeLoreId);
      if (activeUpdated) {
        setLoreFields(activeUpdated.fieldsJson ?? "");
        setLorePageTypeId(resolveLoreTypeId(activeUpdated));
      }
    }
  };

  return {
    documents,
    activeDocument,
    activeDocumentId,
    documentSaveState,
    documentLastSavedAt,
    documentTitle,
    documentContent,
    documentFolderPath,
    lorePages,
    allLorePages,
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
    setDocumentTitle: (value: string) => {
      setDocumentSaveState("dirty");
      setDocumentTitle(value);
    },
    setDocumentContent: (value: string) => {
      setDocumentSaveState("dirty");
      setDocumentContent(value);
    },
    setDocumentFolderPath: (value: string) => {
      setDocumentSaveState("dirty");
      setDocumentFolderPath(value);
    },
    setLoreTitle: (value: string) => {
      setLoreSaveState("dirty");
      setLoreTitle(value);
    },
    setLoreTags: (value: string) => {
      setLoreSaveState("dirty");
      setLoreTags(value);
    },
    setLoreFields: (value: string) => {
      setLoreSaveState("dirty");
      setLoreFields(value);
    },
    setLorePageTypeId: (value: string | null) => {
      setLoreSaveState("dirty");
      setLorePageTypeId(value);
    },
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
  };
}
