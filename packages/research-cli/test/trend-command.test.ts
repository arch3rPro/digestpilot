import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { scanPublicTrends } from "../src/commands/trend-scan.js";

test("scanPublicTrends returns markdown and json trend cards", async () => {
  const root = await mkdtemp(join(tmpdir(), "public-trend-radar-"));
  try {
    const input = join(root, "urls.md");
    await writeFile(input, "- https://example.com/ai-launch\n- https://example.com/agent-runtime", "utf8");

    const result = await scanPublicTrends({
      profile: "product-business",
      window: "7d",
      webUrlList: input,
      now: new Date("2026-05-27T00:00:00Z")
    });

    assert.equal(result.profile, "product-business");
    assert.ok(result.cards.length >= 1);
    assert.match(result.markdown, /Public Trend Radar/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("scanPublicTrends combines public URL, HN, and GitHub release signals", async () => {
  const root = await mkdtemp(join(tmpdir(), "public-trend-radar-"));
  try {
    const urls = join(root, "urls.md");
    const hn = join(root, "hn.json");
    const releases = join(root, "github-releases.json");
    await writeFile(urls, "- https://example.com/agent-runtime", "utf8");
    await writeFile(
      hn,
      JSON.stringify([
        {
          id: 1,
          title: "Agent workflow runtime discussion",
          url: "https://news.ycombinator.com/item?id=1",
          time: 1780000000,
          score: 220,
          descendants: 42
        }
      ]),
      "utf8"
    );
    await writeFile(
      releases,
      JSON.stringify({
        repo: "example/agent-runtime",
        releases: [
          {
            html_url: "https://github.com/example/agent-runtime/releases/tag/v1",
            tag_name: "v1",
            name: "Agent workflow runtime v1",
            published_at: "2026-05-27T00:00:00Z",
            body: "Graph workflow execution"
          }
        ]
      }),
      "utf8"
    );

    const result = await scanPublicTrends({
      profile: "ai-tech",
      webUrlList: urls,
      hackerNewsItems: hn,
      githubReleases: releases,
      now: new Date("2026-05-27T00:00:00Z")
    });

    assert.ok(result.cards.some((card) => card.source_mix["hacker-news"] === 1));
    assert.ok(result.cards.some((card) => card.source_mix["github-releases"] === 1));
    assert.ok(result.cards.some((card) => card.source_mix["web-url-list"] === 1));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
