import { XMLParser } from "fast-xml-parser";
import { slugify } from "./opml.js";

export interface DiscoveredFeed {
  id: string;
  title: string;
  url: string;
  source_page: string;
  type: "rss" | "atom";
}

export function discoverFeedsFromHtml(html: string, pageUrl: string): DiscoveredFeed[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    htmlEntities: true,
    parseTagValue: false,
    trimValues: true
  });
  const document = parser.parse(html) as unknown;
  const pageTitle = findFirstText(document, "title");
  const links = findLinkRecords(document);
  const seen = new Set<string>();
  const result: DiscoveredFeed[] = [];

  for (const link of links) {
    const rel = attr(link, "rel").toLowerCase();
    const type = attr(link, "type").toLowerCase();
    const href = attr(link, "href");
    if (!href || !rel.split(/\s+/).includes("alternate")) continue;
    const feedType = feedTypeFromMime(type);
    if (!feedType) continue;

    const url = absoluteUrl(href, pageUrl);
    if (seen.has(url)) continue;
    seen.add(url);
    result.push({
      id: slugify(new URL(url).host + "-" + new URL(url).pathname.replace(/^\/+/, "")),
      title: attr(link, "title") || pageTitle || new URL(url).host,
      url,
      source_page: pageUrl,
      type: feedType
    });
  }

  return result;
}

export function extractDiscoveryUrls(text: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const match of text.matchAll(/https?:\/\/[^\s<>\])"]+/g)) {
    const url = match[0].replace(/[.,;:]+$/g, "");
    if (seen.has(url)) continue;
    seen.add(url);
    result.push(url);
  }
  return result;
}

function feedTypeFromMime(value: string): "rss" | "atom" | undefined {
  if (value.includes("rss")) return "rss";
  if (value.includes("atom")) return "atom";
  return undefined;
}

function absoluteUrl(value: string, pageUrl: string): string {
  return new URL(value, pageUrl).toString();
}

function attr(record: Record<string, unknown>, name: string): string {
  const value = record[`@_${name}`];
  return typeof value === "string" ? value.trim() : "";
}

function findLinkRecords(value: unknown): Array<Record<string, unknown>> {
  const records: Array<Record<string, unknown>> = [];
  visit(value, (record) => {
    const link = record.link;
    if (Array.isArray(link)) {
      records.push(...link.filter(isRecord));
    } else if (isRecord(link)) {
      records.push(link);
    }
  });
  return records;
}

function findFirstText(value: unknown, key: string): string {
  let found = "";
  visit(value, (record) => {
    if (found) return;
    const candidate = record[key];
    if (typeof candidate === "string") {
      found = candidate.trim();
    }
  });
  return found;
}

function visit(value: unknown, fn: (record: Record<string, unknown>) => void): void {
  if (Array.isArray(value)) {
    for (const item of value) visit(item, fn);
    return;
  }
  if (!isRecord(value)) return;
  fn(value);
  for (const child of Object.values(value)) {
    visit(child, fn);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
