import type { EvidenceItem } from "../types.js";
import type { ResearchDatabase } from "../workspace/db.js";

export interface SelectEvidenceOptions {
  question: string;
  since?: string;
  mustKeywords?: string;
  mustKeywordMode?: "any" | "all";
  shouldKeywords?: string;
  excludeKeywords?: string;
  minScore?: number;
  limit: number;
}

export function selectEvidence(db: ResearchDatabase, options: SelectEvidenceOptions): EvidenceItem[] {
  const mustTerms = splitCsv(options.mustKeywords);
  const shouldTerms = splitCsv(options.shouldKeywords);
  const excludeTerms = splitCsv(options.excludeKeywords);
  const terms = [...mustTerms, ...shouldTerms];
  const mustKeywordMode = options.mustKeywordMode ?? "any";
  const minScore = options.minScore ?? 7;
  const sinceIso = parseSince(options.since);

  const rows = db
    .prepare(
      `
    select
      a.id, a.title, a.link, a.published_at, a.topic, a.score, a.score_reasons_json, a.summary,
      a.commentary_source, a.original_source, a.original_url,
      s.title as source
    from articles a
    left join sources s on s.id = a.source_id
    where coalesce(a.score, 0) >= ?
      and (? is null or a.published_at >= ?)
    order by coalesce(a.score, 0) desc, a.published_at desc, a.title asc
    limit ?
  `
    )
    .all(minScore, sinceIso, sinceIso, Math.max(options.limit * 5, options.limit)) as Array<Record<string, unknown>>;

  const candidates = rows
    .filter((row) => {
      const text = `${row.title || ""} ${row.summary || ""} ${row.topic || ""}`.toLowerCase();
      if (excludeTerms.some((term) => text.includes(term))) return false;
      if (mustTerms.length > 0 && mustKeywordMode === "all" && !mustTerms.every((term) => text.includes(term))) {
        return false;
      }
      if (mustTerms.length > 0 && mustKeywordMode === "any" && !mustTerms.some((term) => text.includes(term))) {
        return false;
      }
      if (terms.length === 0) return true;
      return terms.some((term) => text.includes(term));
    })
    .map((row) => {
      const why = parseReasons(row.score_reasons_json);
      const matchedTerms = terms.filter((term) =>
        `${row.title || ""} ${row.summary || ""} ${row.topic || ""}`.toLowerCase().includes(term)
      );
      const score = Number(row.score || 0);
      const source = String(row.source || "");
      const originalSource = String(row.original_source || "");
      const commentarySource = String(row.commentary_source || "");
      const publishedAt = String(row.published_at || "");
      return {
        article_id: String(row.id),
        title: String(row.title || ""),
        link: String(row.link || ""),
        source,
        summary: cleanSummary(String(row.summary || "")),
        commentary_source: commentarySource,
        original_source: originalSource,
        original_url: String(row.original_url || ""),
        published_at: publishedAt,
        topic: String(row.topic || "Other"),
        entities: loadArticleEntities(db, String(row.id)),
        score,
        why_selected: [...why, ...matchedTerms.map((term) => `matched:${term}`)],
        evidence_type: "analysis",
        usefulness: score >= 8 ? "high" : "medium",
        priority_bucket: priorityBucket(score, why, publishedAt),
        attribution_label: attributionLabel({ source, originalSource, commentarySource }),
        merge_key: mergeKey(String(row.title || ""), String(row.topic || "")),
        low_confidence: isLowConfidence(score, why, publishedAt)
      };
    });

  return diversifyBySource(candidates, options.limit);
}

function diversifyBySource(items: EvidenceItem[], limit: number): EvidenceItem[] {
  const sourceLimit = Math.max(3, Math.ceil(limit * 0.35));
  const selected: EvidenceItem[] = [];
  const deferred: EvidenceItem[] = [];
  const sourceCounts = new Map<string, number>();

  for (const item of items) {
    const key = item.source || "unknown";
    const count = sourceCounts.get(key) ?? 0;
    if (count < sourceLimit) {
      selected.push(item);
      sourceCounts.set(key, count + 1);
    } else {
      deferred.push(item);
    }
    if (selected.length >= limit) return selected;
  }

  return [...selected, ...deferred].slice(0, limit);
}

function priorityBucket(score: number, reasons: string[], publishedAt: string): "lead" | "supporting" | "watch" {
  if (score >= 9 && publishedAt && reasons.some(isStrongSelectionReason)) return "lead";
  if (score >= 7) return "supporting";
  return "watch";
}

function isStrongSelectionReason(reason: string): boolean {
  return ["trusted_source", "technical_depth_signal", "ai_or_engineering_relevance", "title_should_keyword_match"].includes(reason);
}

function attributionLabel(input: { source: string; originalSource: string; commentarySource: string }): string {
  if (input.originalSource && input.commentarySource) return `${input.originalSource} via ${input.commentarySource}`;
  if (input.originalSource) return input.originalSource;
  if (input.commentarySource) return input.commentarySource;
  return input.source || "unknown source";
}

function isLowConfidence(score: number, reasons: string[], publishedAt: string): boolean {
  if (!publishedAt) return true;
  if (score < 7) return true;
  return !reasons.some(isStrongSelectionReason);
}

function mergeKey(title: string, topic: string): string {
  const normalized = `${title} ${topic}`
    .toLowerCase()
    .replace(/\b\d+(?:\.\d+)*(?:a\d+|b\d+|rc\d+)?\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ");
  const tokens = normalized
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !MERGE_STOP_WORDS.has(token));
  if (tokens.includes("datasette") && tokens.includes("agent")) return "datasette agent";
  return tokens.slice(0, 3).join(" ") || "general";
}

const MERGE_STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "into",
  "release",
  "update",
  "notes",
  "more",
  "new",
  "llm",
  "ai"
]);

function cleanSummary(value: string, maxLength = 360): string {
  const withoutTags = value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  const decoded = decodeBasicEntities(withoutTags)
    .replace(/\s+/g, " ")
    .trim();
  if (decoded.length <= maxLength) return decoded;
  return `${decoded.slice(0, maxLength - 1).trimEnd()}...`;
}

function decodeBasicEntities(value: string): string {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x201C;|&#8220;/g, '"')
    .replace(/&#x201D;|&#8221;/g, '"')
    .replace(/&#x2019;|&#8217;/g, "'");
}

function splitCsv(value?: string): string[] {
  return (value || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function parseReasons(value: unknown): string[] {
  try {
    const parsed = JSON.parse(String(value || "[]")) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function loadArticleEntities(db: ResearchDatabase, articleId: string): string[] {
  const rows = db
    .prepare(
      `
    select e.name
    from article_entities ae
    join entities e on e.id = ae.entity_id
    where ae.article_id = ?
    order by e.name asc
  `
    )
    .all(articleId) as Array<{ name: string }>;
  return rows.map((row) => row.name).filter(isUsefulEvidenceEntity).slice(0, 12);
}

function isUsefulEvidenceEntity(name: string): boolean {
  if (/^(AND|DESC|FROM|LIKE|LIMIT|ORDER|SELECT|WHERE)$/i.test(name)) return false;
  if (/^(MUST|SHOULD|NOT|READ|REVIEW|COPYEDIT|COMPLETE|LEGAL|PLANNING)$/i.test(name)) return false;
  if (/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}$/i.test(name)) return false;
  if (/^Sections?\s+\d+/i.test(name)) return false;
  if (/^\d{4}$/.test(name)) return false;
  return true;
}

function parseSince(value?: string): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  const relative = /^(\d+)([hdw])$/.exec(trimmed);
  if (relative) {
    const amount = Number.parseInt(relative[1], 10);
    const unit = relative[2];
    const hours = unit === "h" ? amount : unit === "d" ? amount * 24 : amount * 24 * 7;
    return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  }
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid since value: ${value}`);
  }
  return date.toISOString();
}
