import { randomUUID } from "node:crypto";
import type { RssDigestEnvelope, SourceHealthSummary } from "../types.js";
import { archiveEntries, type ArchiveResult } from "../articles/archive.js";
import { loadEntityConfig } from "../entities/config.js";
import { runNodeRssDigest } from "../rss/node-runtime.js";
import type { FeedFetcher } from "../rss/types.js";
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
  since?: string;
  keywords?: string;
  mustKeywords?: string;
  shouldKeywords?: string;
  excludeKeywords?: string;
  minScore?: number;
  fetcher?: FeedFetcher;
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
    persistSourceHealthObservations(db, runId, options.envelope);
    return { ...archiveResult, runId, sourceHealthSummary, stats: options.envelope.stats ?? {} };
  } finally {
    db.close();
  }
}

export async function ingestRss(options: IngestRssCommandOptions): Promise<ArchiveResult> {
  const paths = getWorkspacePaths(options.workspace);
  const startedAt = new Date().toISOString();
  const envelope = await runNodeRssDigest({
    registry: options.registry,
    state: paths.seenPath,
    health: paths.sourceHealthPath,
    since: options.since,
    keywords: options.keywords,
    mustKeywords: options.mustKeywords,
    shouldKeywords: options.shouldKeywords,
    excludeKeywords: options.excludeKeywords,
    minScore: options.minScore,
    fetcher: options.fetcher
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

function persistSourceHealthObservations(
  db: ReturnType<typeof openResearchDb>,
  runId: string,
  envelope: RssDigestEnvelope
): void {
  const observedAt = envelope.generated_at ?? new Date().toISOString();
  const upsertSource = db.prepare(`
    insert into sources (id, title, url, type, category_json, created_at, updated_at)
    values (@id, @title, '', 'rss', '[]', @now, @now)
    on conflict(id) do update set updated_at = excluded.updated_at
  `);
  const insertObservation = db.prepare(`
    insert or replace into source_health_observations (
      run_id, source_id, status, success_count, failure_count, last_success_at,
      last_error_at, last_error, observed_at, raw_json
    )
    values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const [sourceId, value] of Object.entries((envelope.health ?? {}) as Record<string, Record<string, unknown>>)) {
    const status = sourceStatus(value);
    upsertSource.run({
      id: sourceId,
      title: String(value.title || sourceId),
      now: observedAt
    });
    insertObservation.run(
      runId,
      sourceId,
      status,
      numericValue(value.success_count),
      numericValue(value.failure_count),
      stringValue(value.last_success_at),
      stringValue(value.last_error_at),
      stringValue(value.last_error),
      observedAt,
      JSON.stringify(value)
    );
  }
}

function sourceStatus(value: Record<string, unknown>): string {
  if (typeof value.status === "string" && value.status) return value.status;
  if (isFailedHealth(value)) return "failing";
  if (isSucceededHealth(value)) return "healthy";
  return "unknown";
}

function numericValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}
