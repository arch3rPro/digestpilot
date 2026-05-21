import type { ResearchDatabase } from "../workspace/db.js";

export type SourceHealthRecommendation = "keep" | "watch" | "disable_candidate";

export interface SourceHealthHistoryOptions {
  minObservations?: number;
}

export interface SourceHealthHistoryItem {
  source_id: string;
  observations: number;
  successes: number;
  failures: number;
  failure_rate: number;
  recommendation: SourceHealthRecommendation;
  recommendation_reason: string;
  last_observed_at: string;
  last_error: string;
}

interface ObservationRow {
  source_id: string;
  status: string;
  success_count: number;
  failure_count: number;
  last_error: string;
  observed_at: string;
}

export function summarizeSourceHealthHistory(
  db: ResearchDatabase,
  options: SourceHealthHistoryOptions = {}
): SourceHealthHistoryItem[] {
  const minObservations = options.minObservations ?? 2;
  const rows = db
    .prepare(
      `
      select source_id, status, success_count, failure_count, last_error, observed_at
      from source_health_observations
      order by source_id asc, observed_at asc
    `
    )
    .all() as ObservationRow[];

  const groups = new Map<string, ObservationRow[]>();
  for (const row of rows) {
    const group = groups.get(row.source_id) ?? [];
    group.push(row);
    groups.set(row.source_id, group);
  }

  return [...groups.entries()]
    .map(([sourceId, observations]) => summarizeSource(sourceId, observations))
    .filter((item) => item.observations >= minObservations)
    .sort(compareHealthItems);
}

export function renderSourceHealthMarkdown(items: SourceHealthHistoryItem[]): string {
  const lines = ["# Source Health History", ""];
  if (items.length === 0) {
    lines.push("No source health observations found.");
    return `${lines.join("\n")}\n`;
  }

  for (const item of items) {
    lines.push(`## ${item.source_id}`);
    lines.push(`- Recommendation: ${item.recommendation}`);
    lines.push(`- Reason: ${item.recommendation_reason}`);
    lines.push(`- Observations: ${item.observations}`);
    lines.push(`- Failures: ${item.failures}`);
    lines.push(`- Failure rate: ${item.failure_rate.toFixed(2)}`);
    if (item.last_error) {
      lines.push(`- Last error: ${item.last_error}`);
    }
    lines.push("");
  }
  return `${lines.join("\n")}`;
}

function summarizeSource(sourceId: string, observations: ObservationRow[]): SourceHealthHistoryItem {
  const failures = observations.filter(isFailedObservation).length;
  const successes = observations.filter(isSuccessfulObservation).length;
  const latest = observations[observations.length - 1];
  const latestError = [...observations].reverse().find((item) => item.last_error)?.last_error ?? "";
  const failureRate = observations.length === 0 ? 0 : failures / observations.length;
  const recommendation = recommendationFor(observations.length, failures);
  return {
    source_id: sourceId,
    observations: observations.length,
    successes,
    failures,
    failure_rate: Number(failureRate.toFixed(4)),
    recommendation,
    recommendation_reason: reasonFor(recommendation),
    last_observed_at: latest?.observed_at ?? "",
    last_error: latestError
  };
}

function recommendationFor(observations: number, failures: number): SourceHealthRecommendation {
  if (observations > 0 && failures === observations) return "disable_candidate";
  if (failures > 0) return "watch";
  return "keep";
}

function reasonFor(recommendation: SourceHealthRecommendation): string {
  if (recommendation === "disable_candidate") return "persistent_failures";
  if (recommendation === "watch") return "intermittent_failures";
  return "stable_successes";
}

function isFailedObservation(row: ObservationRow): boolean {
  return row.status === "failing" || row.failure_count > 0;
}

function isSuccessfulObservation(row: ObservationRow): boolean {
  return row.status === "healthy" || row.success_count > 0;
}

function compareHealthItems(a: SourceHealthHistoryItem, b: SourceHealthHistoryItem): number {
  const severity = { disable_candidate: 0, watch: 1, keep: 2 };
  return (
    severity[a.recommendation] - severity[b.recommendation] ||
    b.failure_rate - a.failure_rate ||
    a.source_id.localeCompare(b.source_id)
  );
}
