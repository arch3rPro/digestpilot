import { parseDate } from "./feed-parser.js";
import type { RssEntry, RssFeed } from "./types.js";

export interface FilterOptions {
  keywords?: string[];
  mustKeywords?: string[];
  shouldKeywords?: string[];
  excludeKeywords?: string[];
  keywordMode?: "any" | "all";
  requireAnyTitleKeyword?: boolean;
  author?: string;
  since?: Date;
  category?: string;
  language?: string;
  feedLookup?: Record<string, RssFeed>;
}

export function parseKeywordCsv(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function parseSince(value: string | undefined, now = new Date()): Date | undefined {
  if (!value) return undefined;
  const text = value.trim().toLowerCase();
  const relative = text.match(/^(\d+)([hd])$/);
  if (relative) {
    const amount = Number.parseInt(relative[1], 10);
    const unitMs = relative[2] === "h" ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    return new Date(now.getTime() - amount * unitMs);
  }
  return parseDate(value);
}

export function filterEntries(entries: RssEntry[], options: FilterOptions = {}): RssEntry[] {
  const keywords = normalizeKeywords(options.keywords);
  const mustKeywords = normalizeKeywords(options.mustKeywords);
  const shouldKeywords = normalizeKeywords(options.shouldKeywords);
  const excludeKeywords = normalizeKeywords(options.excludeKeywords);
  const keywordMode = options.keywordMode ?? "any";
  if (keywordMode !== "any" && keywordMode !== "all") {
    throw new Error(`Unsupported keyword mode: ${keywordMode}`);
  }
  const authorFilter = options.author?.toLowerCase() ?? "";
  const feedLookup = options.feedLookup ?? {};

  return entries.flatMap((entry) => {
    const feed = feedLookup[entry.feed_id ?? ""] ?? {};
    if (excludeKeywords.some((keyword) => keywordLocations(entry, keyword).length > 0)) return [];

    const matchedLocations = matchLocations(entry, keywords);
    const matchedMustLocations = matchLocations(entry, mustKeywords);
    const matchedShouldLocations = matchLocations(entry, shouldKeywords);
    const matchedKeywords = Object.keys(matchedLocations);

    if (mustKeywords.length > 0 && Object.keys(matchedMustLocations).length === 0) return [];
    if (keywords.length > 0 && keywordMode === "all" && matchedKeywords.length !== keywords.length) return [];
    if (keywords.length > 0 && keywordMode === "any" && matchedKeywords.length === 0) return [];

    const titleRequirementLocations = [
      ...Object.values(matchedLocations),
      ...Object.values(matchedMustLocations),
      ...Object.values(matchedShouldLocations)
    ];
    if (
      options.requireAnyTitleKeyword &&
      (keywords.length > 0 || mustKeywords.length > 0 || shouldKeywords.length > 0) &&
      !titleRequirementLocations.some((locations) => locations.includes("title"))
    ) {
      return [];
    }

    if (authorFilter && !(entry.author ?? "").toLowerCase().includes(authorFilter)) return [];
    const published = parseDate(entry.published_at);
    if (options.since && (!published || published < options.since)) return [];
    if (options.category && !(feed.category ?? []).includes(options.category)) return [];
    if (options.language && feed.language && options.language !== feed.language) return [];

    return [
      {
        ...entry,
        matched_keywords: matchedKeywords,
        matched_keyword_locations: matchedLocations,
        matched_must_keywords: Object.keys(matchedMustLocations),
        matched_must_keyword_locations: matchedMustLocations,
        matched_should_keywords: Object.keys(matchedShouldLocations),
        matched_should_keyword_locations: matchedShouldLocations
      }
    ];
  });
}

export function textTokens(value: string): Set<string> {
  return new Set(value.toLowerCase().match(/[a-z0-9]+/g) ?? []);
}

export function keywordLocations(entry: RssEntry, keyword: string): string[] {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) return [];
  const locations: string[] = [];
  for (const field of ["title", "summary"] as const) {
    const text = (entry[field] ?? "").toLowerCase();
    if (normalized.includes(" ")) {
      if (text.includes(normalized)) locations.push(field);
    } else if (textTokens(text).has(normalized)) {
      locations.push(field);
    }
  }
  return locations;
}

function matchLocations(entry: RssEntry, keywords: string[]): Record<string, string[]> {
  return Object.fromEntries(
    keywords
      .map((keyword) => [keyword, keywordLocations(entry, keyword)] as const)
      .filter(([, locations]) => locations.length > 0)
  );
}

function normalizeKeywords(keywords: string[] | undefined): string[] {
  return (keywords ?? []).map((keyword) => keyword.trim().toLowerCase()).filter(Boolean);
}
