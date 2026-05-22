import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  applySourceRegistryPatch,
  curateSourceRegistry,
  evaluateSourceRegistry,
  fetchRss,
  importOpml
} from "../src/commands/rss.js";
import type { FeedFetcher } from "../src/rss/types.js";

test("importOpml writes a registry with optional metadata", async () => {
  const root = await mkdtemp(join(tmpdir(), "subscription-research-rss-command-"));
  try {
    const opml = join(root, "feeds.opml");
    const metadata = join(root, "metadata.json");
    const registry = join(root, "feeds.json");
    await writeFile(
      opml,
      `
        <opml version="2.0"><body>
          <outline text="AI">
            <outline title="Simon Willison" xmlUrl="https://simonwillison.net/atom/everything/"/>
          </outline>
        </body></opml>
      `,
      "utf8"
    );
    await writeFile(metadata, JSON.stringify({ "simon-willison": { base_score: 9, tags: ["must-read"], language: "en" } }), "utf8");

    const result = await importOpml({ opml, metadata, registry });
    assert.equal(result.feeds[0].id, "simon-willison");
    assert.equal(result.feeds[0].base_score, 9);
    assert.deepEqual(result.feeds[0].tags, ["must-read"]);

    const persisted = JSON.parse(await readFile(registry, "utf8")) as typeof result;
    assert.deepEqual(persisted, result);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("fetchRss returns normalized entries and source health", async () => {
  const root = await mkdtemp(join(tmpdir(), "subscription-research-rss-command-"));
  try {
    const registry = join(root, "feeds.json");
    await writeFile(registry, JSON.stringify({ feeds: [{ id: "ai-feed", title: "AI Feed", url: "https://example.com/feed.xml" }] }), "utf8");
    const fetcher: FeedFetcher = async () => ({
      async text() {
        return `
          <rss version="2.0">
            <channel><title>AI Feed</title>
              <item><title>LLM evals</title><link>https://example.com/a</link><pubDate>Thu, 21 May 2026 08:00:00 GMT</pubDate></item>
            </channel>
          </rss>
        `;
      }
    });

    const result = await fetchRss({ registry, fetcher });
    assert.equal(result.entries[0].title, "LLM evals");
    assert.equal((result.health["ai-feed"] as { failure_count: number }).failure_count, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("source governance commands evaluate, curate, and apply reviewed patches", async () => {
  const root = await mkdtemp(join(tmpdir(), "subscription-research-rss-command-"));
  try {
    const registry = join(root, "feeds.json");
    const health = join(root, "health.json");
    const patch = join(root, "patch.json");
    const output = join(root, "feeds.curated.json");
    await writeFile(
      registry,
      JSON.stringify({
        feeds: [
          { id: "good", title: "Good", url: "https://example.com/good.xml", base_score: 9, tags: ["must-read"] },
          { id: "bad", title: "Bad", url: "https://example.com/bad.xml", base_score: 4 }
        ]
      }),
      "utf8"
    );
    await writeFile(
      health,
      JSON.stringify({
        good: { success_count: 2, failure_count: 0, quality_avg: 9 },
        bad: { success_count: 0, failure_count: 3, last_error: "HTTP 503" }
      }),
      "utf8"
    );

    const evaluations = await evaluateSourceRegistry({ registry, health });
    assert.equal(evaluations[0].id, "good");
    assert.equal(evaluations.find((item) => item.id === "bad")?.status, "failing");

    const curation = await curateSourceRegistry({ registry, health });
    const badAction = curation.actions.find((item) => item.id === "bad");
    assert.equal(badAction?.action, "disable");
    await writeFile(patch, JSON.stringify(curation), "utf8");

    const dryRun = await applySourceRegistryPatch({ registry, patch });
    assert.equal(dryRun.dry_run, true);
    assert.equal(dryRun.summary.set, 1);

    const applied = await applySourceRegistryPatch({ registry, patch, output, apply: true });
    assert.equal(applied.dry_run, false);
    const persisted = JSON.parse(await readFile(output, "utf8")) as { feeds: Array<{ id: string; enabled?: boolean }> };
    assert.equal(persisted.feeds.find((feed) => feed.id === "bad")?.enabled, false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
