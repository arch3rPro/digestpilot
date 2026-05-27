import assert from "node:assert/strict";
import test from "node:test";
import { clusterTrendSignals } from "../src/trends/cluster.js";
import { getTrendProfile } from "../src/trends/profiles.js";
import { renderTrendCardsMarkdown } from "../src/trends/render.js";
import { scoreTrendCandidates } from "../src/trends/score.js";
import type { PublicTrendSignal } from "../src/trends/types.js";

test("trend pipeline clusters, scores, and renders cards", () => {
  const profile = getTrendProfile("ai-tech");
  const signals: PublicTrendSignal[] = [
    {
      id: "github:agent:v1",
      adapter: "github-releases",
      profile: "ai-tech",
      type: "project",
      title: "Agent workflow runtime v1",
      url: "https://github.com/example/agent/releases/tag/v1",
      source: "GitHub Releases",
      published_at: "2026-05-27T00:00:00Z",
      summary: "Graph workflow execution",
      entities: ["example/agent"],
      metrics: {},
      authority: "primary",
      raw: {}
    },
    {
      id: "hn:agent",
      adapter: "hacker-news",
      profile: "ai-tech",
      type: "topic",
      title: "Agent workflow runtime discussion",
      url: "https://news.ycombinator.com/item?id=1",
      source: "Hacker News",
      published_at: "2026-05-27T01:00:00Z",
      summary: "Agent workflow discussion",
      entities: ["example/agent"],
      metrics: { score: 200, comments: 30 },
      authority: "community",
      raw: {}
    }
  ];

  const candidates = clusterTrendSignals(signals);
  const cards = scoreTrendCandidates({
    candidates,
    profile,
    window: "7d",
    now: new Date("2026-05-27T02:00:00Z")
  });
  const markdown = renderTrendCardsMarkdown(cards);

  assert.equal(cards.length, 1);
  assert.equal(cards[0].source_mix["github-releases"], 1);
  assert.equal(cards[0].source_mix["hacker-news"], 1);
  assert.match(markdown, /Agent workflow/);
});
