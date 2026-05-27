import assert from "node:assert/strict";
import test from "node:test";
import type { PublicTrendCard, PublicTrendSignal, TrendProfile } from "../src/trends/types.js";

test("trend domain types support public trend cards", () => {
  const profile: TrendProfile = {
    id: "ai-tech",
    title: "AI Technical Trends",
    description: "AI and technical trend discovery",
    weights: {
      freshness: 1,
      velocity: 1,
      cross_source: 1,
      authority: 1,
      discussion: 1,
      relevance: 1,
      novelty: 1,
      evidence_depth: 1
    },
    keywords: ["agent", "llm"],
    preferredSignalTypes: ["project", "paper", "topic"]
  };

  const signal: PublicTrendSignal = {
    id: "github:repo:v1",
    adapter: "github-releases",
    profile: "ai-tech",
    type: "project",
    title: "Agent runtime v1",
    url: "https://github.com/example/agent/releases/tag/v1",
    source: "GitHub Releases",
    published_at: "2026-05-27T00:00:00Z",
    summary: "Agent runtime release",
    entities: ["Agent Runtime"],
    metrics: { stars: 100, comments: 0 },
    authority: "primary",
    raw: { tag_name: "v1" }
  };

  const card: PublicTrendCard = {
    id: "trend-agent-runtime",
    profile: profile.id,
    title: "Agent runtime projects are releasing workflow features",
    type: "project",
    window: "7d",
    score: 8.2,
    confidence: "medium",
    why_trending: ["Primary release signal from GitHub"],
    primary_evidence: [signal],
    community_signals: [],
    related_entities: ["Agent Runtime"],
    source_mix: { "github-releases": 1 },
    novelty_notes: ["New release in the selected window"],
    suggested_downstream: ["include-in-digest"],
    generated_at: "2026-05-27T00:00:00Z"
  };

  assert.equal(card.profile, "ai-tech");
  assert.equal(card.primary_evidence[0].authority, "primary");
});
