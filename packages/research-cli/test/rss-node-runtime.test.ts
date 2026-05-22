import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fetchRegistryEntries, runNodeRssDigest } from "../src/rss/node-runtime.js";
import type { FeedFetcher, RssRegistry } from "../src/rss/types.js";

test("fetchRegistryEntries fetches enabled feeds and records isolated failures", async () => {
  const registry: RssRegistry = {
    feeds: [
      { id: "good", title: "Good", url: "https://example.com/good.xml" },
      { id: "bad", title: "Bad", url: "https://example.com/bad.xml" },
      { id: "disabled", title: "Disabled", url: "https://example.com/disabled.xml", enabled: false }
    ]
  };
  const fetcher: FeedFetcher = async (url) => {
    if (url.includes("bad")) throw new Error("HTTP 503");
    return {
      async text() {
        return `
          <rss version="2.0">
            <channel><title>Good</title>
              <item><title>LLM evals</title><link>https://example.com/a</link><pubDate>Thu, 21 May 2026 08:00:00 GMT</pubDate></item>
            </channel>
          </rss>
        `;
      }
    };
  };

  const result = await fetchRegistryEntries(registry, { fetcher, now: () => new Date("2026-05-22T00:00:00Z") });
  assert.equal(result.entries.length, 1);
  assert.equal(result.health.good.failure_count, 0);
  assert.equal(result.health.bad.failure_count, 1);
  assert.match(result.health.bad.error ?? "", /HTTP 503/);
  assert.equal(result.health.disabled, undefined);
});

test("fetchRegistryEntries respects maxWorkers concurrency", async () => {
  const registry: RssRegistry = {
    feeds: [
      { id: "one", title: "One", url: "https://example.com/one.xml" },
      { id: "two", title: "Two", url: "https://example.com/two.xml" },
      { id: "three", title: "Three", url: "https://example.com/three.xml" }
    ]
  };
  let active = 0;
  let maxActive = 0;
  const fetcher: FeedFetcher = async () => {
    active += 1;
    maxActive = Math.max(maxActive, active);
    await new Promise((resolve) => setTimeout(resolve, 5));
    active -= 1;
    return {
      async text() {
        return `
          <rss version="2.0">
            <channel><title>Feed</title>
              <item><title>LLM evals</title><link>https://example.com/a</link><pubDate>Thu, 21 May 2026 08:00:00 GMT</pubDate></item>
            </channel>
          </rss>
        `;
      }
    };
  };

  const result = await fetchRegistryEntries(registry, { fetcher, maxWorkers: 1 });
  assert.equal(result.entries.length, 3);
  assert.equal(maxActive, 1);
});

test("runNodeRssDigest filters, scores, marks seen, and emits digest envelope", async () => {
  const root = await mkdtemp(join(tmpdir(), "subscription-research-node-rss-"));
  try {
    const registryPath = join(root, "feeds.json");
    const statePath = join(root, "seen.json");
    const healthPath = join(root, "source-health.json");
    await writeFile(
      registryPath,
      JSON.stringify({
        feeds: [{ id: "ai-feed", title: "AI Feed", url: "https://example.com/feed.xml", base_score: 6, tags: ["must-read"] }]
      }),
      "utf8"
    );
    const fetcher: FeedFetcher = async () => ({
      async text() {
        return `
          <rss version="2.0">
            <channel><title>AI Feed</title>
              <item>
                <title>LLM benchmark for production agents</title>
                <link>https://example.com/a</link>
                <author>Jane</author>
                <pubDate>Thu, 21 May 2026 08:00:00 GMT</pubDate>
                <description>Reliability and architecture notes.</description>
              </item>
              <item>
                <title>Hiring webinar</title>
                <link>https://example.com/b</link>
                <pubDate>Thu, 21 May 2026 09:00:00 GMT</pubDate>
              </item>
            </channel>
          </rss>
        `;
      }
    });

    const result = await runNodeRssDigest({
      registry: registryPath,
      state: statePath,
      health: healthPath,
      keywords: "llm,agent",
      shouldKeywords: "benchmark,architecture",
      excludeKeywords: "hiring,webinar",
      since: "2d",
      minScore: 8,
      fetcher,
      now: () => new Date("2026-05-22T00:00:00Z")
    });

    assert.equal(result.entries.length, 1);
    assert.equal(result.entries[0].title, "LLM benchmark for production agents");
    assert.equal(result.entries[0].score, 10);
    assert.equal(result.stats?.entries_fetched, 2);
    assert.equal(result.stats?.entries_filtered, 1);
    assert.equal(result.stats?.entries_marked_seen, 1);

    const state = JSON.parse(await readFile(statePath, "utf8")) as { seen: Record<string, unknown> };
    assert.equal(Object.keys(state.seen).length, 1);
    const persistedHealth = JSON.parse(await readFile(healthPath, "utf8")) as Record<string, { status: string }>;
    assert.equal(persistedHealth["ai-feed"].status, "healthy");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
