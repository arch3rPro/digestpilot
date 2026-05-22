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
  status?: string;
  title?: string;
}

export type SourceHealthMap = Record<string, SourceHealthItem>;

export interface NodeDigestOptions {
  registry: string;
  state: string;
  health?: string;
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
  fetcher?: FeedFetcher;
  now?: () => Date;
}

export interface FeedFetchResponse {
  text(): Promise<string>;
}

export type FeedFetcher = (url: string, init?: { signal?: AbortSignal; headers?: Record<string, string> }) => Promise<FeedFetchResponse>;

export type NodeDigestEnvelope = RssDigestEnvelope;
