import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { RssDigestEnvelope, SourceHealthSummary } from "../types.js";
import { archiveEntries, type ArchiveResult } from "../articles/archive.js";
import { loadEntityConfig } from "../entities/config.js";
import { runRssDigest } from "../rss/python-worker.js";
import { openResearchDb } from "../workspace/db.js";
import { getWorkspacePaths } from "../workspace/paths.js";

export interface IngestRssEnvelopeOptions {
  workspace: string;
  envelope: RssDigestEnvelope;
  criteria?: IngestRunCriteria;
  question?: string;
  startedAt?: string;
  timeWindow?: string;
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

export interface IngestRunCriteria {
  channel?: string;
  registry?: string;
  since?: string;
  keywords?: string;
  must_keywords?: string;
  should_keywords?: string;
  exclude_keywords?: string;
  min_score?: number;
}

export async function ingestRssEnvelope(options: IngestRssEnvelopeOptions): Promise<ArchiveResult> {
  const paths = getWorkspacePaths(options.workspace);
  const db = openResearchDb(paths.databasePath);
  try {
    const entityConfig = await loadEntityConfig(paths.entitiesConfigPath);
    const archiveResult = await archiveEntries(paths, db, options.envelope.entries || [], { entityConfig });
    const sourceHealthSummary = summarizeSourceHealth(options.envelope);
    const runId = persistIngestRun(db, {
      archiveResult,
      envelope: options.envelope,
      criteria: options.criteria ?? {},
      question: options.question ?? "RSS ingest",
      sourceHealthSummary,
      startedAt: options.startedAt ?? options.envelope.generated_at ?? new Date().toISOString(),
      timeWindow: options.timeWindow ?? options.criteria?.since ?? "unspecified"
    });
    return { ...archiveResult, runId, sourceHealthSummary, stats: options.envelope.stats ?? {} };
  } finally {
    db.close();
  }
}

export async function ingestRss(options: IngestRssCommandOptions): Promise<ArchiveResult> {
  const paths = getWorkspacePaths(options.workspace);
  const startedAt = new Date().toISOString();
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
  return ingestRssEnvelope({
    workspace: options.workspace,
    envelope,
    criteria: {
      channel: "rss",
      registry: options.registry,
      since: options.since,
      keywords: options.keywords,
      must_keywords: options.mustKeywords,
      should_keywords: options.shouldKeywords,
      exclude_keywords: options.excludeKeywords,
      min_score: options.minScore
    },
    startedAt,
    timeWindow: options.since
  });
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

function persistIngestRun(
  db: ReturnType<typeof openResearchDb>,
  options: {
    archiveResult: ArchiveResult;
    criteria: IngestRunCriteria;
    envelope: RssDigestEnvelope;
    question: string;
    sourceHealthSummary: SourceHealthSummary;
    startedAt: string;
    timeWindow: string;
  }
): string {
  const runId = randomUUID();
  const completedAt = new Date().toISOString();
  db.prepare(
    `
    insert into research_runs (
      id, run_type, question, time_window, criteria_json, stats_json, source_health_summary_json,
      archived_count, entity_link_count, status, started_at, completed_at, output_markdown_path, output_json_path
    )
    values (?, 'rss_ingest', ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?, null, null)
  `
  ).run(
    runId,
    options.question,
    options.timeWindow,
    JSON.stringify(cleanObject(options.criteria)),
    JSON.stringify(options.envelope.stats ?? {}),
    JSON.stringify(options.sourceHealthSummary),
    options.archiveResult.entriesArchived,
    options.archiveResult.entitiesLinked,
    options.startedAt,
    completedAt
  );
  return runId;
}

function summarizeSourceHealth(envelope: RssDigestEnvelope): SourceHealthSummary {
  const healthEntries = Object.entries((envelope.health ?? {}) as Record<string, Record<string, unknown>>);
  const failedHealthEntries = healthEntries.filter(([, value]) => isFailedHealth(value));
  const succeededHealthEntries = healthEntries.filter(([, value]) => isSucceededHealth(value));
  const failureSamples =
    failedHealthEntries.length > 0
      ? failedHealthEntries.map(([id, value]) => ({ id, error: String(value.last_error || "unknown error") }))
      : (envelope.failures ?? []).map((failure) => ({
          id: String(failure.id || failure.title || "unknown"),
          error: String(failure.error || "unknown error")
        }));

  return {
    checked: numberFromStats(envelope.stats, "feeds_total") ?? healthEntries.length,
    succeeded: numberFromStats(envelope.stats, "feeds_success") ?? succeededHealthEntries.length,
    failed: numberFromStats(envelope.stats, "feeds_failed") ?? failedHealthEntries.length,
    failed_sample: failureSamples.slice(0, 10)
  };
}

function isFailedHealth(value: Record<string, unknown>): boolean {
  return Number(value.failure_count || 0) > 0 || value.status === "failing";
}

function isSucceededHealth(value: Record<string, unknown>): boolean {
  return (
    Number(value.success_count || 0) > 0 ||
    value.status === "healthy" ||
    (typeof value.last_success_at === "string" && Number(value.failure_count || 0) === 0)
  );
}

function numberFromStats(stats: Record<string, number> | undefined, key: string): number | undefined {
  const value = stats?.[key];
  return typeof value === "number" ? value : undefined;
}

function cleanObject(input: IngestRunCriteria): IngestRunCriteria {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined && value !== "")) as IngestRunCriteria;
}
