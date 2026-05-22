import { asRecord, attrValue, childText, childrenByLocalName, parseXmlDocument } from "./xml.js";
import type { RssEntry } from "./types.js";

export function parseFeedXml(xmlText: string, feedId: string, feedTitle = ""): RssEntry[] {
  const document = asRecord(parseXmlDocument(xmlText));
  if (document.rss !== undefined) {
    return parseRss(asRecord(document.rss), feedId, feedTitle);
  }
  if (document.feed !== undefined) {
    return parseAtom(asRecord(document.feed), feedId, feedTitle);
  }
  throw new Error(`Unsupported feed root: ${Object.keys(document)[0] ?? "unknown"}`);
}

export function parseRss(root: Record<string, unknown>, feedId: string, feedTitle = ""): RssEntry[] {
  const channel = asRecord(root.channel ?? root);
  const title = feedTitle || childText(channel, ["title"]) || feedId;
  return childrenByLocalName(channel, "item").map((item) => {
    const record = asRecord(item);
    const published = parseDateToIso(childText(record, ["pubDate", "published", "updated", "date"]));
    return normalizeEntry({
      title: childText(record, ["title"]),
      link: childText(record, ["link"]),
      guid: childText(record, ["guid", "id"]),
      author: childText(record, ["author", "creator"]),
      published_at: published,
      summary: childText(record, ["description", "summary", "content"]),
      feed_id: feedId,
      feed_title: title
    });
  });
}

export function parseAtom(root: Record<string, unknown>, feedId: string, feedTitle = ""): RssEntry[] {
  const title = feedTitle || childText(root, ["title"]) || feedId;
  return childrenByLocalName(root, "entry").map((entry) => {
    const record = asRecord(entry);
    const link = selectAtomLink(record);
    const author = selectAtomAuthor(record);
    const published = parseDateToIso(childText(record, ["published", "updated"]));
    return normalizeEntry({
      title: childText(record, ["title"]),
      link,
      guid: childText(record, ["id"]),
      author,
      published_at: published,
      summary: childText(record, ["summary", "content"]),
      feed_id: feedId,
      feed_title: title
    });
  });
}

export function parseDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  return undefined;
}

export function parseDateToIso(value: string | undefined): string {
  const parsed = parseDate(value);
  return parsed ? parsed.toISOString().replace(/\.\d{3}Z$/, "+00:00") : "";
}

function selectAtomLink(entry: Record<string, unknown>): string {
  for (const link of childrenByLocalName(entry, "link")) {
    const record = asRecord(link);
    const rel = attrValue(record, "rel") || "alternate";
    const href = attrValue(record, "href");
    if (href && rel === "alternate") return href;
  }
  const first = asRecord(childrenByLocalName(entry, "link")[0]);
  return attrValue(first, "href");
}

function selectAtomAuthor(entry: Record<string, unknown>): string {
  const author = asRecord(childrenByLocalName(entry, "author")[0]);
  return childText(author, ["name"]) || "";
}

function normalizeEntry(entry: RssEntry): RssEntry {
  return {
    title: (entry.title ?? "").trim(),
    link: (entry.link ?? "").trim(),
    guid: (entry.guid ?? "").trim(),
    author: (entry.author ?? "").trim(),
    published_at: entry.published_at ?? "",
    summary: (entry.summary ?? "").trim(),
    feed_id: entry.feed_id ?? "",
    feed_title: entry.feed_title ?? "",
    matched_keywords: entry.matched_keywords ?? []
  };
}
