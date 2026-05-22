import type { ResearchDatabase } from "../workspace/db.js";

export type SourceHealthRecommendation = "keep" | "watch" | "lower_priority" | "disable_candidate";
export type SourceHealthMaintenancePriority = "low" | "medium" | "high";

export interface SourceHealthHistoryOptions {
  minObservations?: number;
  disableObservationThreshold?: number;
}

export interface SourceHealthHistoryItem {
  source_id: string;
  title: string;
  url: string;
  observations: number;
  successes: number;
  failures: number;
  consecutive_failures: number;
  failure_rate: number;
  recommendation: SourceHealthRecommendation;
  recommendation_reason: string;
  last_observed_at: string;
  last_success_at: string;
  last_failure_at: string;
  last_error: string;
  maintenance_priority: SourceHealthMaintenancePriority;
}

export interface SourceHealthRegistryPatch {
  id: string;
  set?: Record<string, unknown>;
  remove?: boolean;
}

export interface SourceHealthPatchAction {
  id: string;
  title: string;
  url: string;
  action: "keep" | "watch" | "lower-priority" | "disable";
  status: "healthy" | "degraded" | "failing";
  reason: string;
  observations: number;
  failures: number;
  consecutive_failures: number;
  failure_rate: number;
  maintenance_priority: SourceHealthMaintenancePriority;
  last_observed_at: string;
  last_success_at: string;
  last_failure_at: string;
  last_error: string;
  registry_patch: SourceHealthRegistryPatch | Record<string, never>;
}

export interface SourceHealthPatchEnvelope {
  actions: SourceHealthPatchAction[];
  summary: Record<string, number>;
}

interface ObservationRow {
  source_id: string;
  title: string | null;
  url: string | null;
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
      select
        source_health_observations.source_id,
        sources.title as title,
        sources.url as url,
        source_health_observations.status,
        source_health_observations.success_count,
        source_health_observations.failure_count,
        source_health_observations.last_error,
        source_health_observations.observed_at
      from source_health_observations
      left join sources on sources.id = source_health_observations.source_id
      order by source_health_observations.source_id asc, source_health_observations.observed_at asc
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
    .map(([sourceId, observations]) =>
      summarizeSource(sourceId, observations, options.disableObservationThreshold ?? 3)
    )
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
    lines.push(`- Consecutive failures: ${item.consecutive_failures}`);
    lines.push(`- Failure rate: ${item.failure_rate.toFixed(2)}`);
    lines.push(`- Maintenance priority: ${item.maintenance_priority}`);
    if (item.last_success_at) {
      lines.push(`- Last success: ${item.last_success_at}`);
    }
    if (item.last_error) {
      lines.push(`- Last error: ${item.last_error}`);
    }
    lines.push("");
  }
  return `${lines.join("\n")}`;
}

export function createSourceHealthRegistryPatch(items: SourceHealthHistoryItem[]): SourceHealthPatchEnvelope {
  const actions = items.map(toPatchAction);
  const summary: Record<string, number> = {};
  for (const item of actions) {
    summary[item.action] = (summary[item.action] ?? 0) + 1;
  }
  return { actions, summary: Object.fromEntries(Object.entries(summary).sort()) };
}

function summarizeSource(
  sourceId: string,
  observations: ObservationRow[],
  disableObservationThreshold: number
): SourceHealthHistoryItem {
  const failures = observations.filter(isFailedObservation).length;
  const successes = observations.filter(isSuccessfulObservation).length;
  const latest = observations[observations.length - 1];
  const sourceMeta = [...observations].reverse().find((item) => item.title || item.url);
  const latestError = [...observations].reverse().find((item) => item.last_error)?.last_error ?? "";
  const failureRate = observations.length === 0 ? 0 : failures / observations.length;
  const consecutiveFailures = countConsecutiveFailures(observations);
  const lastSuccessAt = [...observations].reverse().find(isSuccessfulObservation)?.observed_at ?? "";
  const lastFailureAt = [...observations].reverse().find(isFailedObservation)?.observed_at ?? "";
  const recommendation = recommendationFor({
    observations: observations.length,
    failures,
    successes,
    consecutiveFailures,
    failureRate,
    disableObservationThreshold
  });
  const maintenancePriority = maintenancePriorityFor(recommendation);
  return {
    source_id: sourceId,
    title: sourceMeta?.title || sourceId,
    url: sourceMeta?.url || "",
    observations: observations.length,
    successes,
    failures,
    consecutive_failures: consecutiveFailures,
    failure_rate: Number(failureRate.toFixed(4)),
    recommendation,
    recommendation_reason: reasonFor(recommendation),
    last_observed_at: latest?.observed_at ?? "",
    last_success_at: lastSuccessAt,
    last_failure_at: lastFailureAt,
    last_error: latestError,
    maintenance_priority: maintenancePriority
  };
}

function toPatchAction(item: SourceHealthHistoryItem): SourceHealthPatchAction {
  const action = actionFor(item.recommendation);
  return {
    id: item.source_id,
    title: item.title,
    url: item.url,
    action,
    status: statusFor(item.recommendation),
    reason: item.recommendation_reason,
    observations: item.observations,
    failures: item.failures,
    consecutive_failures: item.consecutive_failures,
    failure_rate: item.failure_rate,
    maintenance_priority: item.maintenance_priority,
    last_observed_at: item.last_observed_at,
    last_success_at: item.last_success_at,
    last_failure_at: item.last_failure_at,
    last_error: item.last_error,
    registry_patch: action === "disable" ? { id: item.source_id, set: { enabled: false } } : {}
  };
}

function actionFor(recommendation: SourceHealthRecommendation): SourceHealthPatchAction["action"] {
  if (recommendation === "disable_candidate") return "disable";
  if (recommendation === "lower_priority") return "lower-priority";
  return recommendation;
}

function statusFor(recommendation: SourceHealthRecommendation): SourceHealthPatchAction["status"] {
  if (recommendation === "disable_candidate") return "failing";
  if (recommendation === "lower_priority") return "degraded";
  if (recommendation === "watch") return "degraded";
  return "healthy";
}

function recommendationFor(input: {
  observations: number;
  failures: number;
  successes: number;
  consecutiveFailures: number;
  failureRate: number;
  disableObservationThreshold: number;
}): SourceHealthRecommendation {
  if (
    input.observations >= input.disableObservationThreshold &&
    input.consecutiveFailures >= input.disableObservationThreshold
  ) {
    return "disable_candidate";
  }
  if (input.successes > 0 && input.failures >= input.disableObservationThreshold) return "lower_priority";
  if (input.successes > 0 && input.failures >= 2 && input.failureRate >= 0.5) return "lower_priority";
  if (input.failures > 0) return "watch";
  return "keep";
}

function reasonFor(recommendation: SourceHealthRecommendation): string {
  if (recommendation === "disable_candidate") return "persistent_failures";
  if (recommendation === "lower_priority") return "repeated_failures_with_recent_success";
  if (recommendation === "watch") return "intermittent_failures";
  return "stable_successes";
}

function maintenancePriorityFor(recommendation: SourceHealthRecommendation): SourceHealthMaintenancePriority {
  if (recommendation === "disable_candidate") return "high";
  if (recommendation === "lower_priority" || recommendation === "watch") return "medium";
  return "low";
}

function countConsecutiveFailures(observations: ObservationRow[]): number {
  let count = 0;
  for (let index = observations.length - 1; index >= 0; index -= 1) {
    const row = observations[index];
    if (!isFailedObservation(row)) break;
    count += 1;
  }
  return count;
}

function isFailedObservation(row: ObservationRow): boolean {
  return row.status === "failing" || row.failure_count > 0;
}

function isSuccessfulObservation(row: ObservationRow): boolean {
  return row.status === "healthy" || (row.status !== "failing" && row.success_count > 0);
}

function compareHealthItems(a: SourceHealthHistoryItem, b: SourceHealthHistoryItem): number {
  const severity = { disable_candidate: 0, lower_priority: 1, watch: 2, keep: 3 };
  return (
    severity[a.recommendation] - severity[b.recommendation] ||
    b.consecutive_failures - a.consecutive_failures ||
    b.failure_rate - a.failure_rate ||
    a.source_id.localeCompare(b.source_id)
  );
}
