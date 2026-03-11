function normalizeLoreTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

export function extractLoreLinkTitles(text: string): string[] {
  if (!text) return [];

  const matches = text.matchAll(/\[\[([^\]\n]+)\]\]/g);
  const seen = new Set<string>();
  const titles: string[] = [];

  for (const match of matches) {
    const title = match[1]?.trim();
    if (!title) continue;

    const normalized = normalizeLoreTitle(title);
    if (seen.has(normalized)) continue;

    seen.add(normalized);
    titles.push(title);
  }

  return titles;
}

type LinkableLorePage = { id: string; title: string };

export function findLinkedLorePages<T extends LinkableLorePage>(text: string, pages: T[]) {
  const linkTitles = extractLoreLinkTitles(text);
  if (linkTitles.length === 0 || pages.length === 0) return [];

  const byTitle = new Map(pages.map((page) => [normalizeLoreTitle(page.title), page]));

  return linkTitles
    .map((title) => byTitle.get(normalizeLoreTitle(title)))
    .filter((page): page is T => Boolean(page));
}

export function resolveLoreLinks<T extends LinkableLorePage>(text: string, pages: T[]) {
  const linkTitles = extractLoreLinkTitles(text);
  const byTitle = new Map(pages.map((page) => [normalizeLoreTitle(page.title), page]));

  const linked: T[] = [];
  const unresolved: string[] = [];
  const seenLinked = new Set<string>();

  for (const title of linkTitles) {
    const page = byTitle.get(normalizeLoreTitle(title));
    if (!page) {
      unresolved.push(title);
      continue;
    }

    if (seenLinked.has(page.id)) continue;
    seenLinked.add(page.id);
    linked.push(page);
  }

  return { linked, unresolved };
}

export type LoreLinkToken =
  | { type: "text"; value: string }
  | { type: "link"; value: string };

export function tokenizeLoreLinks(text: string): LoreLinkToken[] {
  if (!text) return [{ type: "text", value: "" }];

  const tokens: LoreLinkToken[] = [];
  const pattern = /\[\[([^\]\n]+)\]\]/g;
  let cursor = 0;

  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    const full = match[0];
    const title = match[1]?.trim() ?? "";

    if (index > cursor) {
      tokens.push({ type: "text", value: text.slice(cursor, index) });
    }

    tokens.push({ type: "link", value: title || full });
    cursor = index + full.length;
  }

  if (cursor < text.length) {
    tokens.push({ type: "text", value: text.slice(cursor) });
  }

  return tokens;
}
