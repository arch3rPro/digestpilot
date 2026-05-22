import { readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { mkdir } from "node:fs/promises";
import { filterEntries, parseKeywordCsv, parseSince } from "./filter.js";
import { parseDate, parseFeedXml } from "./feed-parser.js";
import { loadRssRegistry } from "./registry.js";
import { scoreEntries, sortScoredEntries } from "./scoring.js";
import { isSeen, loadSeenState, markSeen, saveSeenState } from "./state.js";
import type { FeedFetcher, NodeDigestEnvelope, NodeDigestOptions, RssEntry, RssFeed, RssRegistry, SourceHealthMap } from "./types.js";

export async function runNodeRssDigest(options: NodeDigestOptions): Promise<NodeDigestEnvelope> {
  const effectiveOptions = applyDigestPreset(options);
  const now = options.now ?? (() => new Date());
  const registry = await loadRssRegistry(effectiveOptions.registry);
  const state = await loadSeenState(effectiveOptions.state);
  const { entries, health: currentHealth } = await fetchRegistryEntries(registry, {
    fetcher: effectiveOptions.fetcher,
    timeoutMs: effectiveOptions.timeoutMs,
    maxWorkers: effectiveOptions.maxWorkers,
    now
  });
  const health = effectiveOptions.health ? await mergeAndPersistHealth(effectiveOptions.health, currentHealth) : currentHealth;
  const feedLookup = Object.fromEntries(registry.feeds.map((feed) => [feed.id, feed]));
  const filtered = filterEntries(entries, {
    keywords: parseKeywordCsv(effectiveOptions.keywords),
    mustKeywords: parseKeywordCsv(effectiveOptions.mustKeywords),
    shouldKeywords: parseKeywordCsv(effectiveOptions.shouldKeywords),
    excludeKeywords: parseKeywordCsv(effectiveOptions.excludeKeywords),
    keywordMode: effectiveOptions.keywordMode ?? "any",
    requireAnyTitleKeyword: effectiveOptions.requireAnyTitleKeyword,
    author: effectiveOptions.author,
    since: parseSince(effectiveOptions.since, now()),
    category: effectiveOptions.category,
    language: effectiveOptions.language,
    feedLookup
  });
  const newEntries = filtered.filter((entry) => !isSeen(state, entry));
  const scored = sortScoredEntries(scoreEntries(newEntries, registry).filter((entry) => (entry.score ?? 0) >= (effectiveOptions.minScore ?? 0)));
  const entriesToMark = selectEntriesToMark(newEntries, scored, effectiveOptions.markSeen ?? "reported-only");
  markSeen(state, entriesToMark, now());
  await saveSeenState(effectiveOptions.state, state);
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
  options: { fetcher?: FeedFetcher; timeoutMs?: number; maxWorkers?: number; now?: () => Date } = {}
): Promise<{ entries: RssEntry[]; health: SourceHealthMap }> {
  const fetcher = options.fetcher ?? fetch;
  const now = options.now ?? (() => new Date());
  const enabledFeeds = registry.feeds.filter((feed) => feed.enabled !== false);
  const workerCount = Math.max(1, Math.trunc(options.maxWorkers ?? 8));
  const results = await mapWithConcurrency(enabledFeeds, workerCount, (feed) =>
    fetchOneFeed(feed, { fetcher, timeoutMs: options.timeoutMs, now })
  );
  return {
    entries: sortEntries(results.flatMap((result) => result.entries)),
    health: Object.fromEntries(results.flatMap((result) => Object.entries(result.health)).sort(([left], [right]) => left.localeCompare(right)))
  };
}

async function mapWithConcurrency<T, R>(items: T[], concurrency: number, mapper: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
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

const DIGEST_PRESETS: Record<
  Exclude<NodeDigestOptions["preset"], undefined | "none">,
  {
    keywords: string[];
    mustKeywords: string[];
    shouldKeywords: string[];
    excludeKeywords: string[];
    requireAnyTitleKeyword: boolean;
    minScore?: number;
  }
> = {
  "ai-strict": {
    keywords: ["agent", "llm", "rag", "ai", "model", "inference", "evals", "benchmark"],
    mustKeywords: [],
    shouldKeywords: [],
    excludeKeywords: ["webinar", "coupon", "sponsor", "sponsored", "hiring", "job", "press release"],
    requireAnyTitleKeyword: true
  },
  "ai-research": {
    keywords: [],
    mustKeywords: ["llm", "model", "reasoning", "evals"],
    shouldKeywords: ["benchmark", "inference", "agent", "rag", "alignment", "research"],
    excludeKeywords: ["webinar", "coupon", "sponsor", "sponsored", "hiring", "job", "press release"],
    requireAnyTitleKeyword: true,
    minScore: 8
  },
  "engineering-deep-dive": {
    keywords: [],
    mustKeywords: ["engineering", "systems", "debugging", "infrastructure"],
    shouldKeywords: ["architecture", "reliability", "scaling", "production", "performance"],
    excludeKeywords: ["webinar", "coupon", "sponsor", "sponsored", "hiring", "job", "press release"],
    requireAnyTitleKeyword: false,
    minScore: 7
  },
  "security-risk": {
    keywords: [],
    mustKeywords: ["security", "breach", "vulnerability", "malware", "risk"],
    shouldKeywords: ["incident", "exploit", "privacy", "supply chain"],
    excludeKeywords: ["webinar", "coupon", "sponsor", "sponsored", "hiring", "job", "press release"],
    requireAnyTitleKeyword: false,
    minScore: 7
  },
  "product-tech": {
    keywords: [],
    mustKeywords: ["product", "platform", "startup", "business", "strategy"],
    shouldKeywords: ["ai", "developer", "pricing", "market", "workflow"],
    excludeKeywords: ["webinar", "coupon", "sponsor", "sponsored", "hiring", "job", "press release"],
    requireAnyTitleKeyword: false,
    minScore: 6
  }
};

function applyDigestPreset(options: NodeDigestOptions): NodeDigestOptions {
  if (!options.preset || options.preset === "none") return options;
  const preset = DIGEST_PRESETS[options.preset];
  return {
    ...options,
    keywords: options.keywords || preset.keywords.join(","),
    mustKeywords: options.mustKeywords || preset.mustKeywords.join(","),
    shouldKeywords: options.shouldKeywords || preset.shouldKeywords.join(","),
    excludeKeywords: options.excludeKeywords || preset.excludeKeywords.join(","),
    requireAnyTitleKeyword: preset.requireAnyTitleKeyword || options.requireAnyTitleKeyword,
    minScore: preset.minScore !== undefined && (options.minScore ?? 0) === 0 ? preset.minScore : options.minScore
  };
}
