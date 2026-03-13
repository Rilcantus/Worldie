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

export function normalizeText(value: string | null | undefined) {
  return (value ?? "").toLowerCase();
}

export function compactSnippet(value: string | null | undefined, maxLength = 110) {
  const normalized = (value ?? "").replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1)}...`;
}

export function buildContextSnippet(text: string, query: string, fallback: string) {
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

export function scoreMatch(title: string, body: string, query: string) {
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

export function buildSearchResults(searchQuery: string, documents: Document[], allLorePages: LorePage[]) {
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
      kind: "Document",
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
      kind: "Lore",
      typeLabel: page.type,
      meta: `${page.type} lore entry`,
      snippet: buildContextSnippet(body, query, `${page.type} entry`),
      score,
    });
  }

  return [...docMatches, ...loreMatches]
    .sort((left, right) => right.score - left.score || left.label.localeCompare(right.label))
    .slice(0, 18);
}

export function buildQuickOpenResults(searchQuery: string, documents: Document[], allLorePages: LorePage[]) {
  if (searchQuery.trim()) return buildSearchResults(searchQuery, documents, allLorePages);

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
}
