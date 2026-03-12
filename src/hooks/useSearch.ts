import { useEffect, useMemo, useState } from "react";
import type { Document, LorePage } from "../lib/data";

export type SearchResult = {
  id: string;
  label: string;
  kind: "Document" | "Lore";
  typeLabel: string;
  meta: string;
  snippet: string;
  score: number;
};

type UseSearchArgs = {
  enabled: boolean;
  documents: Document[];
  allLorePages: LorePage[];
  onOpenDocument: (doc: Document) => void;
  onOpenLore: (page: LorePage) => void;
};

function normalizeText(value: string | null | undefined) {
  return (value ?? "").toLowerCase();
}

function compactSnippet(value: string | null | undefined, maxLength = 110) {
  const normalized = (value ?? "").replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1)}...`;
}

function buildContextSnippet(text: string, query: string, fallback: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return fallback;

  const index = normalized.toLowerCase().indexOf(query);
  if (index === -1) return compactSnippet(normalized);

  const start = Math.max(0, index - 28);
  const end = Math.min(normalized.length, index + query.length + 54);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < normalized.length ? "..." : "";
  return `${prefix}${normalized.slice(start, end)}${suffix}`;
}

function scoreMatch(title: string, body: string, query: string) {
  const normalizedTitle = normalizeText(title);
  const normalizedBody = normalizeText(body);

  if (!normalizedTitle.includes(query) && !normalizedBody.includes(query)) {
    return null;
  }

  let score = 0;
  if (normalizedTitle === query) score += 140;
  if (normalizedTitle.startsWith(query)) score += 90;
  if (normalizedTitle.includes(query)) score += 55;
  if (normalizedBody.includes(query)) score += 25;
  score += Math.max(0, 20 - Math.max(0, normalizedTitle.indexOf(query)));

  return score;
}

export function useSearch({
  enabled,
  documents,
  allLorePages,
  onOpenDocument,
  onOpenLore,
}: UseSearchArgs) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isQuickOpenOpen, setIsQuickOpenOpen] = useState(false);
  const [activeQuickOpenIndex, setActiveQuickOpenIndex] = useState(0);

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [] as SearchResult[];

    const docMatches: SearchResult[] = [];
    for (const doc of documents) {
      const body = doc.contentJson ?? "";
      const score = scoreMatch(doc.title, body, query);
      if (score === null) continue;
      docMatches.push({
          id: doc.id,
          label: doc.title,
          kind: "Document" as const,
          typeLabel: "Document",
          meta: "Current world document",
          snippet: buildContextSnippet(body, query, "Open document"),
          score,
      });
    }

    const loreMatches: SearchResult[] = [];
    for (const page of allLorePages) {
      const body = `${page.tagsJson ?? ""} ${page.fieldsJson ?? ""}`;
      const score = scoreMatch(page.title, body, query);
      if (score === null) continue;
      loreMatches.push({
          id: page.id,
          label: page.title,
          kind: "Lore" as const,
          typeLabel: page.type,
          meta: `${page.type} lore entry`,
          snippet: buildContextSnippet(body, query, `${page.type} entry`),
          score,
      });
    }

    return [...docMatches, ...loreMatches]
      .sort((left, right) => right.score - left.score || left.label.localeCompare(right.label))
      .slice(0, 18);
  }, [searchQuery, documents, allLorePages]);

  const quickOpenResults = useMemo(() => {
    if (searchQuery.trim()) return searchResults;

    const recentDocuments = documents.slice(0, 4).map((doc) => ({
      id: doc.id,
      label: doc.title,
      kind: "Document" as const,
      typeLabel: "Recent",
      meta: "Recent document",
      snippet: compactSnippet(doc.contentJson, 90) || "Open document",
      score: 0,
    }));

    const recentLore = allLorePages.slice(0, 4).map((page) => ({
      id: page.id,
      label: page.title,
      kind: "Lore" as const,
      typeLabel: page.type,
      meta: `Recent ${page.type.toLowerCase()}`,
      snippet: compactSnippet(`${page.tagsJson ?? ""} ${page.fieldsJson ?? ""}`, 90) || `${page.type} entry`,
      score: 0,
    }));

    return [...recentDocuments, ...recentLore];
  }, [allLorePages, documents, searchQuery, searchResults]);

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

  const closeQuickOpen = () => {
    setIsQuickOpenOpen((current) => (current ? false : current));
  };

  const openQuickOpen = () => {
    if (!enabled) return;
    setIsQuickOpenOpen((current) => (current ? current : true));
  };

  const selectSearchResult = (result: SearchResult) => {
    if (result.kind === "Document") {
      const doc = documents.find((item) => item.id === result.id);
      if (doc) onOpenDocument(doc);
    } else {
      const page = allLorePages.find((item) => item.id === result.id);
      if (page) onOpenLore(page);
    }
    setIsQuickOpenOpen((current) => (current ? false : current));
  };

  return {
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
  };
}
