import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { RssDigestEnvelope } from "../types.js";
import { archiveEntries, type ArchiveResult } from "../articles/archive.js";
import { loadEntityConfig } from "../entities/config.js";
import { runRssDigest } from "../rss/python-worker.js";
import { openResearchDb } from "../workspace/db.js";
import { getWorkspacePaths } from "../workspace/paths.js";

export interface IngestRssEnvelopeOptions {
  workspace: string;
  envelope: RssDigestEnvelope;
}

export interface IngestRssCommandOptions {
  workspace: string;
  registry: string;
  scriptPath?: string;
  python?: string;
  since?: string;
  keywords?: string;
  mustKeywords?: string;
  shouldKeywords?: string;
  excludeKeywords?: string;
  minScore?: number;
}

export async function ingestRssEnvelope(options: IngestRssEnvelopeOptions): Promise<ArchiveResult> {
  const paths = getWorkspacePaths(options.workspace);
  const db = openResearchDb(paths.databasePath);
  try {
    const entityConfig = await loadEntityConfig(paths.entitiesConfigPath);
    return await archiveEntries(paths, db, options.envelope.entries || [], { entityConfig });
  } finally {
    db.close();
  }
}

export async function ingestRss(options: IngestRssCommandOptions): Promise<ArchiveResult> {
  const paths = getWorkspacePaths(options.workspace);
  const envelope = await runRssDigest({
    python: options.python,
    scriptPath: options.scriptPath ?? defaultRssMonitorPath(),
    registry: options.registry,
    state: paths.seenPath,
    health: paths.sourceHealthPath,
    since: options.since,
    keywords: options.keywords,
    mustKeywords: options.mustKeywords,
    shouldKeywords: options.shouldKeywords,
    excludeKeywords: options.excludeKeywords,
    minScore: options.minScore
  });
  return ingestRssEnvelope({ workspace: options.workspace, envelope });
}

export function defaultRssMonitorPath(): string {
  let current = dirname(fileURLToPath(import.meta.url));
  for (let depth = 0; depth < 8; depth += 1) {
    const candidate = resolve(current, "skills/rss-ai-digest/scripts/rss_monitor.py");
    if (existsSync(candidate)) {
      return candidate;
    }
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return resolve(dirname(fileURLToPath(import.meta.url)), "../../../../skills/rss-ai-digest/scripts/rss_monitor.py");
}
