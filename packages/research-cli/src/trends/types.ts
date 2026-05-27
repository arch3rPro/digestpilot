export type TrendProfileId = "ai-tech" | "product-business";

export type TrendObjectType =
  | "topic"
  | "project"
  | "product"
  | "paper"
  | "model"
  | "dataset"
  | "company"
  | "ecosystem"
  | "event";

export type TrendAuthority = "official" | "primary" | "secondary" | "community" | "derived";

export interface TrendProfileWeights {
  freshness: number;
  velocity: number;
  cross_source: number;
  authority: number;
  discussion: number;
  relevance: number;
  novelty: number;
  evidence_depth: number;
}

export interface TrendProfile {
  id: TrendProfileId;
  title: string;
  description: string;
  weights: TrendProfileWeights;
  keywords: string[];
  preferredSignalTypes: TrendObjectType[];
}

export interface PublicTrendSignal {
  id: string;
  adapter: string;
  profile: TrendProfileId;
  type: TrendObjectType;
  title: string;
  url: string;
  source: string;
  published_at: string;
  summary: string;
  entities: string[];
  metrics: Record<string, number>;
  authority: TrendAuthority;
  raw: unknown;
}

export interface PublicTrendCard {
  id: string;
  profile: TrendProfileId;
  title: string;
  type: TrendObjectType;
  window: string;
  score: number;
  confidence: "low" | "medium" | "high";
  why_trending: string[];
  primary_evidence: PublicTrendSignal[];
  community_signals: PublicTrendSignal[];
  related_entities: string[];
  source_mix: Record<string, number>;
  novelty_notes: string[];
  suggested_downstream: Array<"include-in-digest" | "create-research-memo" | "add-to-watchlist">;
  generated_at: string;
}

export interface TrendAdapterInput {
  profile: TrendProfile;
  now: Date;
}

export interface TrendAdapter {
  id: string;
  collect(input: TrendAdapterInput): Promise<PublicTrendSignal[]>;
}
