import type { TrendCandidate } from "./cluster.js";
import type { PublicTrendCard, PublicTrendSignal, TrendProfile } from "./types.js";

export function scoreTrendCandidates(options: {
  candidates: TrendCandidate[];
  profile: TrendProfile;
  window: string;
  now: Date;
}): PublicTrendCard[] {
  return options.candidates
    .map((candidate) => toTrendCard(candidate, options.profile, options.window, options.now))
    .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title));
}

function toTrendCard(candidate: TrendCandidate, profile: TrendProfile, window: string, now: Date): PublicTrendCard {
  const sourceMix = sourceMixFor(candidate.signals);
  const primary = candidate.signals.filter((signal) => signal.authority !== "community");
  const community = candidate.signals.filter((signal) => signal.authority === "community");
  const score = trendScore(candidate.signals, profile);
  return {
    id: candidate.id,
    profile: profile.id,
    title: candidate.title,
    type: candidate.type,
    window,
    score,
    confidence: score >= 8 ? "high" : score >= 5 ? "medium" : "low",
    why_trending: whyTrending(candidate.signals),
    primary_evidence: primary,
    community_signals: community,
    related_entities: [...new Set(candidate.signals.flatMap((signal) => signal.entities))],
    source_mix: sourceMix,
    novelty_notes: [`Observed ${candidate.signals.length} public signal(s) in ${window}`],
    suggested_downstream: score >= 7 ? ["include-in-digest", "add-to-watchlist"] : ["add-to-watchlist"],
    generated_at: now.toISOString()
  };
}

function trendScore(signals: PublicTrendSignal[], profile: TrendProfile): number {
  const crossSource = new Set(signals.map((signal) => signal.adapter)).size;
  const primarySignals = signals.filter((signal) => signal.authority === "official" || signal.authority === "primary").length;
  const discussion = signals.reduce((sum, signal) => sum + (signal.metrics.score ?? 0) / 100 + (signal.metrics.comments ?? 0) / 50, 0);
  const relevance = signals.some((signal) =>
    profile.keywords.some((keyword) => `${signal.title} ${signal.summary}`.toLowerCase().includes(keyword.toLowerCase()))
  )
    ? 2
    : 0;
  const raw =
    crossSource * profile.weights.cross_source +
    primarySignals * profile.weights.authority +
    Math.min(3, discussion) * profile.weights.discussion +
    relevance * profile.weights.relevance +
    Math.min(2, signals.length) * profile.weights.evidence_depth;
  return Math.round(Math.min(10, raw) * 10) / 10;
}

function sourceMixFor(signals: PublicTrendSignal[]): Record<string, number> {
  const mix: Record<string, number> = {};
  for (const signal of signals) {
    mix[signal.adapter] = (mix[signal.adapter] ?? 0) + 1;
  }
  return mix;
}

function whyTrending(signals: PublicTrendSignal[]): string[] {
  const sources = Object.keys(sourceMixFor(signals));
  return [`Detected ${signals.length} public signal(s) across ${sources.join(", ")}`];
}
