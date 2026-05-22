import { parseDate } from "./feed-parser.js";
import { textTokens } from "./filter.js";
import type { RssEntry, RssFeed, RssRegistry } from "./types.js";

const AI_TERMS = new Set(["ai", "agent", "agents", "llm", "rag", "model", "models", "transformer", "transformers", "inference", "eval", "evals", "benchmark", "reasoning"]);
const ENGINEERING_TERMS = new Set(["architecture", "debugging", "engineering", "infrastructure", "open-source", "opensource", "production", "reliability", "scaling", "system", "systems"]);
const NOISE_TERMS = ["sponsor", "sponsored", "hiring", "job", "webinar", "coupon", "deal", "press release"];

const TOPIC_KEYWORDS: Record<string, Set<string>> = {
  "AI / LLM": new Set(["ai", "llm", "agent", "agents", "model", "reasoning", "evals", "inference", "rag"]),
  Engineering: new Set(["engineering", "architecture", "systems", "debugging", "infrastructure", "reliability", "scaling"]),
  Security: new Set(["security", "breach", "vulnerability", "malware", "risk", "incident", "exploit"]),
  "Product / Business": new Set(["product", "business", "startup", "strategy", "pricing", "market", "platform"])
};

export const TOPIC_ORDER = ["AI / LLM", "Engineering", "Security", "Product / Business", "Other"];

export function scoreEntry(entry: RssEntry, feed: RssFeed = {} as RssFeed): RssEntry {
  let score = Number.isFinite(feed.base_score) ? Number(feed.base_score) : 5;
  const reasons: string[] = [];
  const noiseFlags: string[] = [];
  const text = `${entry.title ?? ""} ${entry.summary ?? ""}`.toLowerCase();
  const tokens = new Set(text.replace(/\//g, " ").split(/\s+/).map((token) => token.replace(/[.,:;!?()[\]{}"']/g, "").toLowerCase()).filter(Boolean));

  if (intersects(AI_TERMS, tokens)) {
    score += 2;
    reasons.push("ai_or_engineering_relevance");
  }
  if (intersects(ENGINEERING_TERMS, tokens)) {
    score += 1;
    if (!reasons.includes("ai_or_engineering_relevance")) reasons.push("ai_or_engineering_relevance");
    reasons.push("technical_depth_signal");
  }
  if ((feed.tags ?? []).includes("must-read")) {
    score += 1;
    reasons.push("trusted_source");
  }
  const locations = entry.matched_keyword_locations ?? {};
  if (Object.values(locations).some((fields) => fields.includes("title"))) {
    score += 1;
    reasons.push("title_keyword_match");
  } else if (Object.keys(locations).length > 0 && Object.values(locations).every((fields) => fields.includes("summary") && !fields.includes("title"))) {
    score -= 1;
    reasons.push("summary_only_keyword_match");
  }
  const shouldLocations = removeOverlappingKeywordLocations(
    entry.matched_should_keyword_locations ?? {},
    locations,
    entry.matched_must_keyword_locations ?? {}
  );
  if (Object.keys(shouldLocations).length > 0) {
    score += Math.min(2, Object.keys(shouldLocations).length);
    reasons.push("should_keyword_match");
    if (Object.values(shouldLocations).some((fields) => fields.includes("title"))) {
      score += 1;
      reasons.push("title_should_keyword_match");
    }
  }
  if (parseDate(entry.published_at)) {
    score += 1;
    reasons.push("has_publication_date");
  }
  for (const noise of NOISE_TERMS) {
    if (text.includes(noise)) {
      score -= 2;
      noiseFlags.push(noise.replace(/\s+/g, "_"));
    }
  }
  if (!entry.link || !entry.title) {
    score -= 2;
    noiseFlags.push("missing_core_metadata");
  }
  const scored = {
    ...entry,
    score: Math.max(0, Math.min(10, Math.trunc(score))),
    score_reasons: reasons,
    noise_flags: noiseFlags
  };
  return { ...scored, topic: assignTopic(scored, feed) };
}

export function scoreEntries(entries: RssEntry[], registry: RssRegistry): RssEntry[] {
  const feedLookup = Object.fromEntries(registry.feeds.map((feed) => [feed.id, feed]));
  return entries.map((entry) => scoreEntry(entry, feedLookup[entry.feed_id ?? ""]));
}

export function assignTopic(entry: RssEntry, feed: RssFeed = {} as RssFeed): string {
  const entryTokens = textTokens(`${entry.title ?? ""} ${entry.summary ?? ""}`);
  const feedTokens = textTokens((feed.category ?? []).join(" "));
  return topicFromTokens(entryTokens) || topicFromTokens(feedTokens) || "Other";
}

export function sortScoredEntries(entries: RssEntry[]): RssEntry[] {
  return [...entries].sort((left, right) => {
    const scoreDelta = (right.score ?? 0) - (left.score ?? 0);
    if (scoreDelta !== 0) return scoreDelta;
    const dateDelta = (parseDate(right.published_at)?.getTime() ?? 0) - (parseDate(left.published_at)?.getTime() ?? 0);
    if (dateDelta !== 0) return dateDelta;
    return `${left.feed_id ?? ""}${left.title ?? ""}`.localeCompare(`${right.feed_id ?? ""}${right.title ?? ""}`);
  });
}

function topicFromTokens(tokens: Set<string>): string | undefined {
  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    if (intersects(keywords, tokens)) return topic;
  }
  return undefined;
}

function intersects(left: Set<string>, right: Set<string>): boolean {
  for (const item of left) {
    if (right.has(item)) return true;
  }
  return false;
}

function removeOverlappingKeywordLocations(
  locations: Record<string, string[]>,
  ...existingLocations: Array<Record<string, string[]>>
): Record<string, string[]> {
  const existing = new Set(existingLocations.flatMap((item) => Object.keys(item)));
  return Object.fromEntries(Object.entries(locations).filter(([keyword]) => !existing.has(keyword)));
}
