import type { PublicTrendSignal, TrendObjectType } from "./types.js";

export interface TrendCandidate {
  id: string;
  title: string;
  type: TrendObjectType;
  signals: PublicTrendSignal[];
}

export function clusterTrendSignals(signals: PublicTrendSignal[]): TrendCandidate[] {
  const groups = new Map<string, PublicTrendSignal[]>();
  for (const signal of signals) {
    const key = clusterKey(signal);
    groups.set(key, [...(groups.get(key) ?? []), signal]);
  }
  return [...groups.entries()].map(([key, grouped]) => ({
    id: `trend-${key}`,
    title: grouped[0]?.title || key,
    type: grouped[0]?.type || "topic",
    signals: grouped
  }));
}

function clusterKey(signal: PublicTrendSignal): string {
  const entity = signal.entities[0];
  if (entity) return slug(entity);
  return slug(signal.title.split(/\s+/).slice(0, 4).join(" "));
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "unknown";
}
