import assert from "node:assert/strict";
import test from "node:test";
import { filterEntries, parseKeywordCsv, parseSince } from "../src/rss/filter.js";
import { scoreEntry, sortScoredEntries } from "../src/rss/scoring.js";
import { entryKey, isSeen, markSeen } from "../src/rss/state.js";
import type { RssEntry } from "../src/rss/types.js";

test("filterEntries supports keyword, author, date, category, and language filters", () => {
  const entries: RssEntry[] = [
    {
      title: "LLM evals in production",
      link: "https://example.com/a",
      author: "Jane Doe",
      published_at: "2026-05-21T08:00:00Z",
      summary: "Reliability benchmark notes.",
      feed_id: "ai-feed",
      feed_title: "AI Feed"
    },
    {
      title: "Hiring for platform teams",
      link: "https://example.com/b",
      author: "Alex",
      published_at: "2026-05-20T08:00:00Z",
      summary: "A sponsor post.",
      feed_id: "biz-feed",
      feed_title: "Business Feed"
    }
  ];

  const filtered = filterEntries(entries, {
    keywords: parseKeywordCsv("llm,agent"),
    shouldKeywords: parseKeywordCsv("benchmark"),
    excludeKeywords: parseKeywordCsv("hiring,sponsor"),
    author: "jane",
    since: parseSince("24h", new Date("2026-05-22T00:00:00Z")),
    category: "AI",
    language: "en",
    feedLookup: {
      "ai-feed": { id: "ai-feed", title: "AI Feed", url: "https://example.com/feed", category: ["AI"], language: "en" }
    }
  });

  assert.equal(filtered.length, 1);
  assert.deepEqual(filtered[0].matched_keywords, ["llm"]);
  assert.deepEqual(filtered[0].matched_should_keywords, ["benchmark"]);
});

test("scoreEntry rewards technical AI relevance and source trust", () => {
  const scored = scoreEntry(
    {
      title: "LLM benchmark for production agents",
      link: "https://example.com/a",
      published_at: "2026-05-21T08:00:00Z",
      summary: "Architecture and reliability notes.",
      feed_id: "ai-feed",
      matched_keyword_locations: { llm: ["title"] },
      matched_should_keyword_locations: { benchmark: ["title"] }
    },
    { id: "ai-feed", title: "AI Feed", url: "https://example.com/feed", base_score: 6, tags: ["must-read"] }
  );

  assert.equal(scored.score, 10);
  assert.equal(scored.topic, "AI / LLM");
  assert.deepEqual(scored.score_reasons?.includes("trusted_source"), true);
});

test("sortScoredEntries orders by score and publication date", () => {
  const sorted = sortScoredEntries([
    { title: "Older", link: "https://example.com/old", score: 9, published_at: "2026-05-20T00:00:00Z", feed_id: "a" },
    { title: "Newer", link: "https://example.com/new", score: 9, published_at: "2026-05-21T00:00:00Z", feed_id: "a" },
    { title: "Top", link: "https://example.com/top", score: 10, published_at: "2026-05-19T00:00:00Z", feed_id: "a" }
  ]);

  assert.deepEqual(sorted.map((entry) => entry.title), ["Top", "Newer", "Older"]);
});

test("seen state uses link-first stable entry keys", () => {
  const state = { seen: {} };
  const entry = { title: "Same", link: "https://example.com/a", feed_id: "feed" };
  const sameLink = { title: "Changed title", link: "https://example.com/a", feed_id: "feed" };

  assert.equal(entryKey(entry), entryKey(sameLink));
  markSeen(state, [entry], new Date("2026-05-22T00:00:00Z"));
  assert.equal(isSeen(state, sameLink), true);
});
