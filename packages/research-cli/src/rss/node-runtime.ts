import { readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { mkdir } from "node:fs/promises";
import { filterEntries, parseKeywordCsv, parseSince } from "./filter.js";
import { parseDate, parseFeedXml } from "./feed-parser.js";
import { scoreEntries, sortScoredEntries } from "./scoring.js";
import { isSeen, loadSeenState, markSeen, saveSeenState } from "./state.js";
import type { FeedFetcher, NodeDigestEnvelope, NodeDigestOptions, RssEntry, RssFeed, RssRegistry, SourceHealthMap } from "./types.js";

export async function runNodeRssDigest(options: NodeDigestOptions): Promise<NodeDigestEnvelope> {
  const now = options.now ?? (() => new Date());
  const registry = await loadRegistry(options.registry);
  const state = await loadSeenState(options.state);
  const { entries, health: currentHealth } = await fetchRegistryEntries(registry, {
    fetcher: options.fetcher,
    timeoutMs: options.timeoutMs,
    now
  });
  const health = options.health ? await mergeAndPersistHealth(options.health, currentHealth) : currentHealth;
  const feedLookup = Object.fromEntries(registry.feeds.map((feed) => [feed.id, feed]));
  const filtered = filterEntries(entries, {
    keywords: parseKeywordCsv(options.keywords),
    mustKeywords: parseKeywordCsv(options.mustKeywords),
    shouldKeywords: parseKeywordCsv(options.shouldKeywords),
    excludeKeywords: parseKeywordCsv(options.excludeKeywords),
    keywordMode: options.keywordMode ?? "any",
    requireAnyTitleKeyword: options.requireAnyTitleKeyword,
    author: options.author,
    since: parseSince(options.since, now()),
    category: options.category,
    language: options.language,
    feedLookup
  });
  const newEntries = filtered.filter((entry) => !isSeen(state, entry));
  const scored = sortScoredEntries(scoreEntries(newEntries, registry).filter((entry) => (entry.score ?? 0) >= (options.minScore ?? 0)));
  const entriesToMark = selectEntriesToMark(newEntries, scored, options.markSeen ?? "reported-only");
  markSeen(state, entriesToMark, now());
  await saveSeenState(options.state, state);
  return {
    entries: scored,
    failures: buildFailures(currentHealth, registry),
    health,
    stats: buildStats(registry, entries, filtered, scored, entriesToMark, currentHealth),
    generated_at: now().toISOString()
  };
}

export async function fetchRegistryEntries(
  registry: RssRegistry,
  options: { fetcher?: FeedFetcher; timeoutMs?: number; now?: () => Date } = {}
): Promise<{ entries: RssEntry[]; health: SourceHealthMap }> {
  const fetcher = options.fetcher ?? fetch;
  const now = options.now ?? (() => new Date());
  const enabledFeeds = registry.feeds.filter((feed) => feed.enabled !== false);
  const results = await Promise.all(enabledFeeds.map((feed) => fetchOneFeed(feed, { fetcher, timeoutMs: options.timeoutMs, now })));
  return {
    entries: sortEntries(results.flatMap((result) => result.entries)),
    health: Object.fromEntries(results.flatMap((result) => Object.entries(result.health)).sort(([left], [right]) => left.localeCompare(right)))
  };
}

async function fetchOneFeed(
  feed: RssFeed,
  options: { fetcher: FeedFetcher; timeoutMs?: number; now: () => Date }
): Promise<{ entries: RssEntry[]; health: SourceHealthMap }> {
  const feedId = feed.id || feed.title || feed.url || "feed";
  try {
    const controller = new AbortController();
    const timeout = options.timeoutMs ? setTimeout(() => controller.abort(), options.timeoutMs) : undefined;
    try {
      const response = await options.fetcher(feed.url, {
        signal: controller.signal,
        headers: { "User-Agent": "rss-agent-skills/0.3" }
      });
      const xml = await response.text();
      const entries = parseFeedXml(xml, feedId, feed.title ?? feedId);
      return {
        entries,
        health: {
          [feedId]: {
            last_success_at: options.now().toISOString(),
            failure_count: 0,
            last_item_at: entries.map((entry) => entry.published_at ?? "").sort().at(-1) ?? ""
          }
        }
      };
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  } catch (error) {
    return {
      entries: [],
      health: {
        [feedId]: {
          last_error_at: options.now().toISOString(),
          failure_count: 1,
          error: error instanceof Error ? error.message : String(error)
        }
      }
    };
  }
}

async function loadRegistry(path: string): Promise<RssRegistry> {
  const parsed = JSON.parse(await readFile(path, "utf8")) as Partial<RssRegistry>;
  return { feeds: parsed.feeds ?? [] };
}

async function mergeAndPersistHealth(path: string, current: SourceHealthMap): Promise<SourceHealthMap> {
  let previous: SourceHealthMap = {};
  try {
    previous = JSON.parse(await readFile(path, "utf8")) as SourceHealthMap;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const merged = mergeHealth(previous, current);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
  return merged;
}

export function mergeHealth(previous: SourceHealthMap, current: SourceHealthMap): SourceHealthMap {
  const merged: SourceHealthMap = { ...previous };
  for (const [feedId, item] of Object.entries(current)) {
    const prior = { ...(merged[feedId] ?? {}) };
    if ((item.failure_count ?? 0) > 0) {
      prior.failure_count = (prior.failure_count ?? 0) + (item.failure_count ?? 1);
      prior.success_count = prior.success_count ?? 0;
      prior.last_error_at = item.last_error_at ?? prior.last_error_at;
      prior.last_error = item.error ?? item.last_error ?? prior.last_error;
      prior.status = "failing";
    } else {
      prior.success_count = (prior.success_count ?? 0) + 1;
      prior.failure_count = prior.failure_count ?? 0;
      prior.last_success_at = item.last_success_at ?? prior.last_success_at;
      prior.last_item_at = item.last_item_at ?? prior.last_item_at;
      prior.status = "healthy";
      prior.last_error ??= "";
      prior.last_error_at ??= "";
    }
    merged[feedId] = prior;
  }
  return merged;
}

function sortEntries(entries: RssEntry[]): RssEntry[] {
  return [...entries].sort((left, right) => {
    const feedDelta = (left.feed_id ?? "").localeCompare(right.feed_id ?? "");
    if (feedDelta !== 0) return feedDelta;
    const dateDelta = (parseDate(left.published_at)?.getTime() ?? 0) - (parseDate(right.published_at)?.getTime() ?? 0);
    if (dateDelta !== 0) return dateDelta;
    const titleDelta = (left.title ?? "").localeCompare(right.title ?? "");
    if (titleDelta !== 0) return titleDelta;
    return (left.link ?? "").localeCompare(right.link ?? "");
  });
}

function buildFailures(health: SourceHealthMap, registry: RssRegistry): Array<Record<string, unknown>> {
  const feedLookup = Object.fromEntries(registry.feeds.map((feed) => [feed.id, feed]));
  return Object.entries(health)
    .filter(([, item]) => (item.failure_count ?? 0) > 0)
    .map(([id, item]) => ({
      id,
      title: feedLookup[id]?.title ?? id,
      url: feedLookup[id]?.url ?? "",
      error: item.error ?? item.last_error ?? "",
      last_error_at: item.last_error_at ?? ""
    }))
    .sort((left, right) => String(left.id).localeCompare(String(right.id)));
}

function buildStats(
  registry: RssRegistry,
  entries: RssEntry[],
  filtered: RssEntry[],
  reported: RssEntry[],
  marked: RssEntry[],
  health: SourceHealthMap
): Record<string, number> {
  const enabledFeeds = registry.feeds.filter((feed) => feed.enabled !== false);
  const failedIds = new Set(Object.entries(health).filter(([, item]) => (item.failure_count ?? 0) > 0).map(([id]) => id));
  return {
    feeds_total: registry.feeds.length,
    feeds_enabled: enabledFeeds.length,
    feeds_success: Object.keys(health).length - failedIds.size,
    feeds_failed: failedIds.size,
    entries_fetched: entries.length,
    entries_filtered: filtered.length,
    entries_reported: reported.length,
    entries_marked_seen: marked.length
  };
}

function selectEntriesToMark(newEntries: RssEntry[], reportedEntries: RssEntry[], policy: "none" | "all-filtered" | "reported-only"): RssEntry[] {
  if (policy === "none") return [];
  if (policy === "all-filtered") return newEntries;
  if (policy === "reported-only") return reportedEntries;
  throw new Error(`Unsupported mark-seen policy: ${policy}`);
}
