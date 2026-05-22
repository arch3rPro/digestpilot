export interface RssDigestEntry {
  title?: string;
  link?: string;
  author?: string;
  published_at?: string;
  summary?: string;
  feed_id?: string;
  feed_title?: string;
  topic?: string;
  score?: number;
  score_reasons?: string[];
  matched_keywords?: string[];
  matched_must_keywords?: string[];
  matched_should_keywords?: string[];
  commentary_source?: string;
  original_source?: string;
  original_url?: string;
  raw?: unknown;
}

export interface RssDigestEnvelope {
  entries: RssDigestEntry[];
  failures?: Array<Record<string, unknown>>;
  health?: Record<string, unknown>;
  stats?: Record<string, number>;
  generated_at?: string;
}

export interface SourceHealthSummary {
  checked: number;
  succeeded: number;
  failed: number;
  failed_sample: Array<{
    id: string;
    error: string;
  }>;
}

export interface ArticleAttribution {
  commentary_source: string;
  original_source: string;
  original_url: string;
}

export interface WorkspacePaths {
  root: string;
  dataDir: string;
  notesDir: string;
  briefsDir: string;
  dailyDir: string;
  exportsDir: string;
  jsonExportsDir: string;
  configDir: string;
  databasePath: string;
  articlesJsonlPath: string;
  sourcesJsonPath: string;
  sourceHealthPath: string;
  contentCacheDir: string;
  seenPath: string;
  workspaceConfigPath: string;
  entitiesConfigPath: string;
  topicsConfigPath: string;
  researchRulesPath: string;
}

export interface EvidenceItem {
  article_id: string;
  title: string;
  link: string;
  source: string;
  summary: string;
  commentary_source: string;
  original_source: string;
  original_url: string;
  published_at: string;
  topic: string;
  entities: string[];
  score: number;
  why_selected: string[];
  evidence_type: string;
  usefulness: string;
  priority_bucket: "lead" | "supporting" | "watch";
  attribution_label: string;
  merge_key: string;
  low_confidence: boolean;
}
