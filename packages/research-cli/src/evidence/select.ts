import type { EvidenceItem } from "../types.js";
import type { ResearchDatabase } from "../workspace/db.js";

export interface SelectEvidenceOptions {
  question: string;
  since?: string;
  mustKeywords?: string;
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

  return rows
    .filter((row) => {
      const text = `${row.title || ""} ${row.summary || ""} ${row.topic || ""}`.toLowerCase();
      if (excludeTerms.some((term) => text.includes(term))) return false;
      if (mustTerms.length > 0 && !mustTerms.every((term) => text.includes(term))) return false;
      if (terms.length === 0) return true;
      return terms.some((term) => text.includes(term));
    })
    .slice(0, options.limit)
    .map((row) => {
      const why = parseReasons(row.score_reasons_json);
      const matchedTerms = terms.filter((term) =>
        `${row.title || ""} ${row.summary || ""} ${row.topic || ""}`.toLowerCase().includes(term)
      );
      return {
        article_id: String(row.id),
        title: String(row.title || ""),
        link: String(row.link || ""),
        source: String(row.source || ""),
        commentary_source: String(row.commentary_source || ""),
        original_source: String(row.original_source || ""),
        original_url: String(row.original_url || ""),
        published_at: String(row.published_at || ""),
        topic: String(row.topic || "Other"),
        entities: loadArticleEntities(db, String(row.id)),
        score: Number(row.score || 0),
        why_selected: [...why, ...matchedTerms.map((term) => `matched:${term}`)],
        evidence_type: "analysis",
        usefulness: Number(row.score || 0) >= 8 ? "high" : "medium"
      };
    });
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
  return rows.map((row) => row.name);
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
