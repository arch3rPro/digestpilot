import { asRecord, attrValue, childrenByLocalName, parseXmlDocument } from "./xml.js";
import type { RssFeed } from "./types.js";

export function parseOpml(opmlText: string): RssFeed[] {
  const document = asRecord(parseXmlDocument(opmlText));
  const opml = asRecord(document.opml ?? document.OPML ?? document);
  const body = asRecord(opml.body ?? opml);
  const feeds: RssFeed[] = [];
  const seenUrls = new Set<string>();

  function walk(outline: Record<string, unknown>, categories: string[]): void {
    const url = attrValue(outline, "xmlUrl") || attrValue(outline, "xmlurl");
    const title = attrValue(outline, "title") || attrValue(outline, "text") || url;
    if (url && !seenUrls.has(url)) {
      feeds.push({
        id: slugify(title),
        title,
        url,
        category: categories,
        language: "",
        base_score: 5,
        tags: [],
        enabled: true
      });
      seenUrls.add(url);
    }

    const childCategories = url ? categories : [...categories, ...(title ? [title] : [])];
    for (const child of childrenByLocalName(outline, "outline")) {
      walk(asRecord(child), childCategories);
    }
  }

  for (const outline of childrenByLocalName(body, "outline")) {
    walk(asRecord(outline), []);
  }

  return feeds;
}

export function applySourceMetadata(feeds: RssFeed[], metadata: Record<string, Partial<RssFeed>>): RssFeed[] {
  return feeds.map((feed) => {
    const overrides = metadata[feed.id ?? ""];
    if (!overrides) return { ...feed };
    return {
      ...feed,
      ...pickDefined(overrides, ["base_score", "language", "tags"])
    };
  });
}

export function slugify(value: string): string {
  let output = "";
  let previousDash = false;
  for (const char of value.toLowerCase()) {
    if (/[a-z0-9]/.test(char)) {
      output += char;
      previousDash = false;
    } else if (!previousDash) {
      output += "-";
      previousDash = true;
    }
  }
  return output.replace(/^-+|-+$/g, "") || "feed";
}

function pickDefined<T extends Record<string, unknown>>(input: T, keys: string[]): Partial<T> {
  return Object.fromEntries(keys.filter((key) => input[key] !== undefined).map((key) => [key, input[key]])) as Partial<T>;
}
