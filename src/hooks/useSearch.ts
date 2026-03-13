import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Document, LorePage } from "../lib/data";
import { buildQuickOpenResults, buildSearchResults, type SearchResult } from "./searchState";

export type { SearchResult } from "./searchState";

type UseSearchArgs = {
  enabled: boolean;
  documents: Document[];
  allLorePages: LorePage[];
  onOpenDocument: (doc: Document, options?: { skipGuard?: boolean }) => void;
  onOpenLore: (page: LorePage, options?: { skipGuard?: boolean }) => void;
  canLeaveCurrentView: () => Promise<boolean>;
};

export function useSearch({
  enabled,
  documents,
  allLorePages,
  onOpenDocument,
  onOpenLore,
  canLeaveCurrentView,
}: UseSearchArgs) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isQuickOpenOpen, setIsQuickOpenOpen] = useState(false);
  const [activeQuickOpenIndex, setActiveQuickOpenIndex] = useState(0);
  const documentsById = useMemo(() => new Map(documents.map((item) => [item.id, item])), [documents]);
  const lorePagesById = useMemo(() => new Map(allLorePages.map((item) => [item.id, item])), [allLorePages]);
  const enabledRef = useRef(enabled);
  const documentsByIdRef = useRef(documentsById);
  const lorePagesByIdRef = useRef(lorePagesById);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    documentsByIdRef.current = documentsById;
  }, [documentsById]);

  useEffect(() => {
    lorePagesByIdRef.current = lorePagesById;
  }, [lorePagesById]);

  const searchResults = useMemo(() => buildSearchResults(searchQuery, documents, allLorePages), [searchQuery, documents, allLorePages]);

  const quickOpenResults = useMemo(
    () => buildQuickOpenResults(searchQuery, documents, allLorePages),
    [allLorePages, documents, searchQuery],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        if (!enabled) {
          event.preventDefault();
          return;
        }
        event.preventDefault();
        setIsQuickOpenOpen(true);
        return;
      }

      if (event.key === "Escape") {
        setIsQuickOpenOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled]);

  useEffect(() => {
    if (enabled) return;
    setIsQuickOpenOpen((current) => (current ? false : current));
    setSearchQuery((current) => (current ? "" : current));
  }, [enabled]);

  useEffect(() => {
    setActiveQuickOpenIndex((current) => (current === 0 ? current : 0));
  }, [searchQuery, isQuickOpenOpen]);

  useEffect(() => {
    if (activeQuickOpenIndex < quickOpenResults.length) return;
    setActiveQuickOpenIndex(0);
  }, [activeQuickOpenIndex, quickOpenResults]);

  const closeQuickOpen = useCallback(() => {
    setIsQuickOpenOpen((current) => (current ? false : current));
  }, []);

  const openQuickOpen = useCallback(() => {
    if (!enabled) return;
    setIsQuickOpenOpen((current) => (current ? current : true));
  }, [enabled]);

  const selectSearchResult = useCallback(
    async (result: SearchResult) => {
      if (!(await canLeaveCurrentView())) return;
      if (!enabledRef.current) return;
      if (result.kind === "Document") {
        const doc = documentsByIdRef.current.get(result.id);
        if (doc) onOpenDocument(doc, { skipGuard: true });
      } else {
        const page = lorePagesByIdRef.current.get(result.id);
        if (page) onOpenLore(page, { skipGuard: true });
      }
      setIsQuickOpenOpen((current) => (current ? false : current));
    },
    [canLeaveCurrentView, onOpenDocument, onOpenLore],
  );

  return useMemo(
    () => ({
      searchQuery,
      setSearchQuery,
      searchResults,
      quickOpenResults,
      isQuickOpenOpen,
      activeQuickOpenIndex,
      setActiveQuickOpenIndex,
      openQuickOpen,
      closeQuickOpen,
      selectSearchResult,
    }),
    [
      searchQuery,
      searchResults,
      quickOpenResults,
      isQuickOpenOpen,
      activeQuickOpenIndex,
      openQuickOpen,
      closeQuickOpen,
      selectSearchResult,
    ],
  );
}
