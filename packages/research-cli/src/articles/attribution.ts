import type { ArticleAttribution, RssDigestEntry } from "../types.js";

const GENERIC_PREFIXES = new Set(["update", "note", "notes", "links", "misc", "today"]);

export function inferArticleAttribution(entry: RssDigestEntry): ArticleAttribution {
  const currentSource = entry.feed_title || entry.feed_id || "";
  const explicitOriginalSource = cleanAttributionText(entry.original_source);
  if (explicitOriginalSource) {
    return {
      commentary_source: commentarySourceFor(currentSource, explicitOriginalSource),
      original_source: explicitOriginalSource,
      original_url: cleanUrl(entry.original_url)
    };
  }

  const title = entry.title || "";
  const quotingMatch = /^quoting\s+(.{2,80})$/i.exec(title.trim());
  if (quotingMatch) {
    const originalSource = cleanAttributionText(quotingMatch[1]);
    return {
      commentary_source: commentarySourceFor(currentSource, originalSource),
      original_source: originalSource,
      original_url: ""
    };
  }

  const prefixMatch = /^([A-Z][A-Za-z0-9&.'+ -]{1,48}):\s+\S.{6,}$/.exec(title.trim());
  if (prefixMatch) {
    const originalSource = cleanAttributionText(prefixMatch[1]);
    if (isLikelyOriginalSourcePrefix(originalSource)) {
      return {
        commentary_source: commentarySourceFor(currentSource, originalSource),
        original_source: originalSource,
        original_url: ""
      };
    }
  }

  return { commentary_source: "", original_source: "", original_url: "" };
}

function commentarySourceFor(currentSource: string, originalSource: string): string {
  if (!currentSource || normalizeSource(currentSource) === normalizeSource(originalSource)) {
    return "";
  }
  return currentSource;
}

function isLikelyOriginalSourcePrefix(value: string): boolean {
  if (!value || GENERIC_PREFIXES.has(value.toLowerCase())) return false;
  if (/^[A-Z0-9&.]{2,8}$/.test(value)) return true;
  return /\b(Report|Journal|Times|Post|Review|S-[0-9]+)\b/.test(value);
}

function cleanAttributionText(value?: string): string {
  return (value || "")
    .replace(/[“”"']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanUrl(value?: string): string {
  const trimmed = (value || "").trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : "";
}

function normalizeSource(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}
