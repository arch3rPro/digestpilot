import { slugify } from "./opml.js";
import type {
  RssFeed,
  RssRegistry,
  RssSourceEvaluation,
  SourceCurationResult,
  SourceHealthMap,
  SourcePatchResult,
  SourceRegistryPatch
} from "./types.js";

export function evaluateSources(registry: RssRegistry, health: SourceHealthMap = {}): RssSourceEvaluation[] {
  return registry.feeds
    .map((feed) => evaluateSource(feed, health[feedId(feed)] ?? {}, feedId(feed) in health))
    .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id));
}

export function curateSources(registry: RssRegistry, health: SourceHealthMap = {}): SourceCurationResult {
  const actions = evaluateSources(registry, health).map((item) => {
    let action: "keep" | "watch" | "lower-priority" | "disable" | "remove";
    let registryPatch: SourceRegistryPatch | Record<string, never> = {};
    if (item.status === "failing" && item.failure_count >= 3 && item.success_count === 0) {
      action = "disable";
      registryPatch = { id: item.id, set: { enabled: false } };
    } else if (item.recommendation === "remove") {
      action = "remove";
      registryPatch = { id: item.id, remove: true };
    } else if (item.recommendation === "lower-priority") {
      action = "lower-priority";
    } else if (item.recommendation === "keep") {
      action = "keep";
    } else {
      action = "watch";
    }
    return {
      id: item.id,
      title: item.title,
      url: item.url,
      action,
      status: item.status,
      score: item.score,
      reason: item.recommendation_reason,
      last_error: item.last_error,
      registry_patch: registryPatch
    };
  });
  const summary: Record<string, number> = {};
  actions.forEach((item) => {
    summary[item.action] = (summary[item.action] ?? 0) + 1;
  });
  return { actions, summary: Object.fromEntries(Object.entries(summary).sort(([left], [right]) => left.localeCompare(right))) };
}

export function extractSourcePatches(payload: unknown): SourceRegistryPatch[] {
  if (Array.isArray(payload)) {
    return payload.filter(isPatch).map((item) => ({ ...item }));
  }
  if (!payload || typeof payload !== "object") return [];
  const record = payload as Record<string, unknown>;
  if (Array.isArray(record.patches)) return extractSourcePatches(record.patches);
  const patches: SourceRegistryPatch[] = [];
  if (Array.isArray(record.actions)) {
    for (const action of record.actions) {
      const patch = action && typeof action === "object" ? (action as Record<string, unknown>).registry_patch : undefined;
      if (isPatch(patch)) patches.push({ ...patch });
    }
  }
  if (isPatch(record)) patches.push({ ...record });
  return patches;
}

export function applySourcePatches(registry: RssRegistry, patches: SourceRegistryPatch[], dryRun = true): SourcePatchResult {
  const nextRegistry: RssRegistry = { feeds: registry.feeds.map((feed) => ({ ...feed })) };
  const operations: Array<Record<string, unknown>> = [];
  const skipped: Array<{ id: string; reason: string }> = [];
  const summary = { set: 0, remove: 0, skipped: 0 };

  for (const patch of patches) {
    const index = nextRegistry.feeds.findIndex((feed) => feed.id === patch.id);
    if (index < 0) {
      skipped.push({ id: patch.id, reason: "source not found" });
      summary.skipped += 1;
      continue;
    }
    if (patch.remove) {
      const [removed] = nextRegistry.feeds.splice(index, 1);
      operations.push({ id: patch.id, action: "remove", title: removed.title ?? "" });
      summary.remove += 1;
      continue;
    }
    if (patch.set && Object.keys(patch.set).length > 0) {
      const before = Object.fromEntries(Object.keys(patch.set).map((key) => [key, nextRegistry.feeds[index][key as keyof RssFeed]]));
      nextRegistry.feeds[index] = { ...nextRegistry.feeds[index], ...patch.set };
      operations.push({ id: patch.id, action: "set", before, after: patch.set });
      summary.set += 1;
    }
  }

  return { dry_run: dryRun, summary, operations, skipped, registry: nextRegistry };
}

function evaluateSource(feed: RssFeed, itemHealth: SourceHealthMap[string], hasHealth: boolean): RssSourceEvaluation {
  const id = feedId(feed);
  const baseScore = Number.isFinite(feed.base_score) ? Number(feed.base_score) : 5;
  const failureCount = Number(itemHealth.failure_count ?? 0);
  const successCount = Number(itemHealth.success_count ?? 0);
  const qualityAvg = Number(itemHealth.quality_avg ?? baseScore);
  const tags = new Set(feed.tags ?? []);
  let score = baseScore + Math.round((qualityAvg - 5) * 0.7) - Math.min(4, failureCount);
  if (tags.has("must-read")) score += 1;
  if (tags.has("noisy")) score -= 2;
  if (tags.has("deprecated")) score -= 4;
  const finalScore = Math.max(0, Math.min(10, Math.trunc(score)));
  const lastError = itemHealth.last_error ?? itemHealth.error ?? "";
  const result = recommendation({ hasHealth, failureCount, successCount, finalScore });
  return {
    id,
    title: feed.title ?? id,
    url: feed.url ?? "",
    enabled: feed.enabled ?? true,
    score: finalScore,
    status: result.status,
    failure_count: failureCount,
    success_count: successCount,
    quality_avg: qualityAvg,
    recommendation: result.recommendation,
    recommendation_reason: result.reason,
    last_error: lastError
  };
}

function recommendation(input: {
  hasHealth: boolean;
  failureCount: number;
  successCount: number;
  finalScore: number;
}): { status: RssSourceEvaluation["status"]; recommendation: RssSourceEvaluation["recommendation"]; reason: string } {
  if (!input.hasHealth) {
    return { status: "unknown", recommendation: "watch", reason: "No health data yet; observe this source before changing priority." };
  }
  if (input.failureCount >= 3 && input.successCount === 0) {
    return {
      status: "failing",
      recommendation: input.finalScore < 5 ? "remove" : "lower-priority",
      reason: "Repeated failures without successful fetches."
    };
  }
  if (input.failureCount > input.successCount && input.failureCount >= 2) {
    return { status: "degraded", recommendation: "lower-priority", reason: "More failures than successful fetches." };
  }
  if (input.finalScore >= 8 && input.failureCount <= 1) {
    return { status: "healthy", recommendation: "keep", reason: "High quality and currently healthy." };
  }
  if (input.finalScore >= 6) {
    return {
      status: input.failureCount === 0 ? "healthy" : "degraded",
      recommendation: "watch",
      reason: "Useful source with moderate quality or limited history."
    };
  }
  if (input.finalScore >= 4) {
    return {
      status: input.failureCount ? "degraded" : "healthy",
      recommendation: "lower-priority",
      reason: "Relevant but noisy, low-priority, or inconsistent."
    };
  }
  return {
    status: input.failureCount ? "degraded" : "healthy",
    recommendation: "remove",
    reason: "Consistently low source score."
  };
}

function feedId(feed: RssFeed): string {
  return feed.id || slugify(feed.title || feed.url || "feed");
}

function isPatch(value: unknown): value is SourceRegistryPatch {
  return Boolean(value && typeof value === "object" && typeof (value as SourceRegistryPatch).id === "string");
}
