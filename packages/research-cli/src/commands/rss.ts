import { readFile } from "node:fs/promises";
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
  fetcher?: FeedFetcher;
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
    timeoutMs: options.timeout ? options.timeout * 1000 : undefined
  });
}

export async function digestRss(options: DigestRssOptions): Promise<NodeDigestEnvelope> {
  return runNodeRssDigest({
    ...options,
    timeoutMs: options.timeout ? options.timeout * 1000 : undefined
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
