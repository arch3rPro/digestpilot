import { readFile } from "node:fs/promises";
import { discoverFeedsFromHtml, type DiscoveredFeed } from "../rss/discovery.js";
import { parseFeedXml } from "../rss/feed-parser.js";
import { applySourceMetadata, parseOpml } from "../rss/opml.js";
import { loadRssRegistry, loadSourceHealth, saveRssRegistry } from "../rss/registry.js";
import { fetchRegistryEntries, runNodeRssDigest } from "../rss/node-runtime.js";
import { applySourcePatches, curateSources, evaluateSources, extractSourcePatches } from "../rss/source-governance.js";
import type {
  FeedFetcher,
  NodeDigestEnvelope,
  NodeDigestOptions,
  RssEntry,
  RssRegistry,
  RssSourceEvaluation,
  SourceCurationResult,
  SourceRegistryPatch,
  SourcePatchResult
} from "../rss/types.js";

export interface ImportOpmlOptions {
  opml: string;
  registry: string;
  metadata?: string;
}

export interface FetchRssOptions {
  registry: string;
  timeout?: number;
  maxWorkers?: number;
  fetcher?: FeedFetcher;
}

export interface DiscoverFeedsOptions {
  url: string;
  timeout?: number;
  validate?: boolean;
  fetcher?: FeedFetcher;
}

export interface DiscoverFeedPagesOptions {
  urls: string[];
  timeout?: number;
  validate?: boolean;
  fetcher?: FeedFetcher;
}

export interface DiscoverFeedsResult {
  source_page: string;
  feeds: ValidatedDiscoveredFeed[];
  registry_patches: SourceRegistryPatch[];
}

export interface DiscoverFeedPagesResult {
  pages: DiscoverFeedsResult[];
  feeds: ValidatedDiscoveredFeed[];
  registry_patches: SourceRegistryPatch[];
}

export interface FeedValidation {
  status: "valid" | "invalid";
  item_count: number;
  sample_title: string;
  error: string;
}

export interface ValidatedDiscoveredFeed extends DiscoveredFeed {
  validation?: FeedValidation;
}

export interface DigestRssOptions extends Omit<NodeDigestOptions, "timeoutMs"> {
  timeout?: number;
}

export interface SourceRegistryOptions {
  registry: string;
  health?: string;
}

export interface ApplySourcePatchOptions {
  registry: string;
  patch: string;
  output?: string;
  apply?: boolean;
}

export async function importOpml(options: ImportOpmlOptions): Promise<RssRegistry> {
  let feeds = parseOpml(await readFile(options.opml, "utf8"));
  if (options.metadata) {
    const metadata = JSON.parse(await readFile(options.metadata, "utf8")) as Record<string, Partial<RssRegistry["feeds"][number]>>;
    feeds = applySourceMetadata(feeds, metadata);
  }
  const registry = { feeds };
  await saveRssRegistry(options.registry, registry);
  return registry;
}

export async function fetchRss(options: FetchRssOptions): Promise<{ entries: RssEntry[]; health: Record<string, unknown> }> {
  const registry = await loadRssRegistry(options.registry);
  return fetchRegistryEntries(registry, {
    fetcher: options.fetcher,
    timeoutMs: options.timeout ? options.timeout * 1000 : undefined,
    maxWorkers: options.maxWorkers
  });
}

export async function discoverFeeds(options: DiscoverFeedsOptions): Promise<DiscoverFeedsResult> {
  const html = await fetchHtml(options.url, {
    fetcher: options.fetcher ?? fetch,
    timeoutMs: (options.timeout ?? 20) * 1000
  });
  const discovered = discoverFeedsFromHtml(html, options.url);
  const feeds: ValidatedDiscoveredFeed[] = options.validate ? await validateDiscoveredFeeds(discovered, options) : discovered;
  return {
    source_page: options.url,
    feeds,
    registry_patches: feeds
      .filter((feed) => feed.validation?.status === "valid" || !feed.validation)
      .map((feed) => ({
        id: feed.id,
        set: {
          title: feed.title,
          url: feed.url,
          enabled: true
        }
      }))
  };
}

export async function discoverFeedPages(options: DiscoverFeedPagesOptions): Promise<DiscoverFeedPagesResult> {
  const pages: DiscoverFeedsResult[] = [];
  for (const url of options.urls) {
    pages.push(
      await discoverFeeds({
        url,
        timeout: options.timeout,
        validate: options.validate,
        fetcher: options.fetcher
      })
    );
  }
  const feeds = dedupeByUrl(pages.flatMap((page) => page.feeds));
  return {
    pages,
    feeds,
    registry_patches: feeds
      .filter((feed) => feed.validation?.status === "valid" || !feed.validation)
      .map((feed) => ({
        id: feed.id,
        set: {
          title: feed.title,
          url: feed.url,
          enabled: true
        }
      }))
  };
}

export async function digestRss(options: DigestRssOptions): Promise<NodeDigestEnvelope> {
  return runNodeRssDigest({
    ...options,
    timeoutMs: options.timeout ? options.timeout * 1000 : undefined,
    maxWorkers: options.maxWorkers
  });
}

export async function evaluateSourceRegistry(options: SourceRegistryOptions): Promise<RssSourceEvaluation[]> {
  const registry = await loadRssRegistry(options.registry);
  const health = await loadSourceHealth(options.health);
  return evaluateSources(registry, health);
}

export async function curateSourceRegistry(options: SourceRegistryOptions): Promise<SourceCurationResult> {
  const registry = await loadRssRegistry(options.registry);
  const health = await loadSourceHealth(options.health);
  return curateSources(registry, health);
}

export async function applySourceRegistryPatch(options: ApplySourcePatchOptions): Promise<SourcePatchResult> {
  if (options.apply && !options.output) {
    throw new Error("--output is required when --apply is set");
  }
  const registry = await loadRssRegistry(options.registry);
  const patchPayload = JSON.parse(await readFile(options.patch, "utf8")) as unknown;
  const result = applySourcePatches(registry, extractSourcePatches(patchPayload), !options.apply);
  if (options.apply && options.output) {
    await saveRssRegistry(options.output, result.registry);
  }
  return result;
}

function dedupeByUrl(feeds: ValidatedDiscoveredFeed[]): ValidatedDiscoveredFeed[] {
  const seen = new Set<string>();
  const result: ValidatedDiscoveredFeed[] = [];
  for (const feed of feeds) {
    if (seen.has(feed.url)) continue;
    seen.add(feed.url);
    result.push(feed);
  }
  return result;
}

async function fetchHtml(url: string, options: { fetcher: FeedFetcher; timeoutMs: number }): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    const response = await options.fetcher(url, { signal: controller.signal });
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

async function validateDiscoveredFeeds(
  feeds: DiscoveredFeed[],
  options: DiscoverFeedsOptions
): Promise<ValidatedDiscoveredFeed[]> {
  const fetcher = options.fetcher ?? fetch;
  const timeoutMs = (options.timeout ?? 20) * 1000;
  const result: ValidatedDiscoveredFeed[] = [];
  for (const feed of feeds) {
    try {
      const xml = await fetchHtml(feed.url, { fetcher, timeoutMs });
      const entries = parseFeedXml(xml, feed.id, feed.title);
      result.push({
        ...feed,
        validation: {
          status: "valid",
          item_count: entries.length,
          sample_title: entries[0]?.title || "",
          error: ""
        }
      });
    } catch (error) {
      result.push({
        ...feed,
        validation: {
          status: "invalid",
          item_count: 0,
          sample_title: "",
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }
  return result;
}
