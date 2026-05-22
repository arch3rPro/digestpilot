import type { RssDigestEntry, RssDigestEnvelope } from "../types.js";

export interface RssFeed {
  id?: string;
  title?: string;
  url: string;
  category?: string[];
  language?: string;
  base_score?: number;
  tags?: string[];
  enabled?: boolean;
}

export interface RssRegistry {
  feeds: RssFeed[];
}

export interface RssEntry extends RssDigestEntry {
  guid?: string;
  matched_keyword_locations?: Record<string, string[]>;
  matched_must_keyword_locations?: Record<string, string[]>;
  matched_should_keyword_locations?: Record<string, string[]>;
  noise_flags?: string[];
}

export interface SeenState {
  seen: Record<
    string,
    {
      first_seen_at: string;
      feed_id: string;
      title: string;
    }
  >;
}

export interface SourceHealthItem {
  last_success_at?: string;
  last_item_at?: string;
  last_error_at?: string;
  last_error?: string;
  error?: string;
  success_count?: number;
  failure_count?: number;
  quality_avg?: number;
  status?: string;
  title?: string;
}

export type SourceHealthMap = Record<string, SourceHealthItem>;

export interface NodeDigestOptions {
  registry: string;
  state: string;
  health?: string;
  preset?: "none" | "ai-strict" | "ai-research" | "engineering-deep-dive" | "security-risk" | "product-tech";
  since?: string;
  keywords?: string;
  mustKeywords?: string;
  shouldKeywords?: string;
  excludeKeywords?: string;
  keywordMode?: "any" | "all";
  requireAnyTitleKeyword?: boolean;
  author?: string;
  category?: string;
  language?: string;
  minScore?: number;
  markSeen?: "none" | "all-filtered" | "reported-only";
  timeoutMs?: number;
  maxWorkers?: number;
  fetcher?: FeedFetcher;
  now?: () => Date;
}

export interface RssSourceEvaluation {
  id: string;
  title: string;
  url: string;
  enabled: boolean;
  score: number;
  status: "unknown" | "failing" | "degraded" | "healthy";
  failure_count: number;
  success_count: number;
  quality_avg: number;
  recommendation: "keep" | "watch" | "lower-priority" | "remove";
  recommendation_reason: string;
  last_error: string;
}

export interface SourceCurationAction {
  id: string;
  title: string;
  url: string;
  action: "keep" | "watch" | "lower-priority" | "disable" | "remove";
  status: string;
  score: number;
  reason: string;
  last_error: string;
  registry_patch: SourceRegistryPatch | Record<string, never>;
}

export interface SourceRegistryPatch {
  id: string;
  set?: Partial<RssFeed>;
  remove?: boolean;
}

export interface SourceCurationResult {
  actions: SourceCurationAction[];
  summary: Record<string, number>;
}

export interface SourcePatchResult {
  dry_run: boolean;
  summary: { add: number; set: number; remove: number; skipped: number };
  operations: Array<Record<string, unknown>>;
  skipped: Array<{ id: string; reason: string }>;
  registry: RssRegistry;
}

export interface FeedFetchResponse {
  text(): Promise<string>;
}

export type FeedFetcher = (url: string, init?: { signal?: AbortSignal; headers?: Record<string, string> }) => Promise<FeedFetchResponse>;

export type NodeDigestEnvelope = RssDigestEnvelope;
