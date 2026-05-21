import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import Database from "better-sqlite3";
import { initWorkspace } from "../src/commands/init.js";
import { defaultRssMonitorPath, ingestRssEnvelope } from "../src/commands/ingest-rss.js";
import type { RssDigestEnvelope } from "../src/types.js";

test("ingestRssEnvelope archives entries to JSONL and SQLite", async () => {
  const root = await mkdtemp(join(tmpdir(), "subscription-research-"));
  const workspace = join(root, "workspace");
  try {
    await initWorkspace({ workspace });
    await writeFile(
      join(workspace, "config/entities.json"),
      JSON.stringify({ entities: [{ id: "openai", name: "OpenAI", aliases: ["OpenAI"], type: "company" }] }),
      "utf8"
    );
    const envelope: RssDigestEnvelope = {
      entries: [
        {
          title: "OpenAI LLM evals in production",
          link: "https://example.com/llm-evals",
          feed_id: "ai-feed",
          feed_title: "AI Feed",
          published_at: "2026-05-21T00:00:00Z",
          summary: "Benchmark and reliability notes.",
          topic: "AI / LLM",
          score: 9,
          score_reasons: ["should_keyword_match"]
        }
      ],
      failures: [],
      health: {},
      stats: { feeds_success: 1 },
      generated_at: "2026-05-21T00:00:00Z"
    };

    const result = await ingestRssEnvelope({ workspace, envelope });
    assert.equal(result.entriesArchived, 1);
    assert.equal(result.entitiesLinked > 0, true);

    const jsonl = await readFile(join(workspace, "data/articles.jsonl"), "utf8");
    assert.match(jsonl, /OpenAI LLM evals in production/);

    const db = new Database(join(workspace, "data/research.db"), { readonly: true });
    try {
      const article = db.prepare("select title, topic, score from articles").get() as {
        title: string;
        topic: string;
        score: number;
      };
      assert.equal(article.title, "OpenAI LLM evals in production");
      assert.equal(article.topic, "AI / LLM");
      assert.equal(article.score, 9);

      const entity = db.prepare("select name from entities where id = 'openai'").get() as { name: string };
      assert.equal(entity.name, "OpenAI");
    } finally {
      db.close();
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("defaultRssMonitorPath resolves from the package location instead of cwd", () => {
  assert.match(defaultRssMonitorPath(), /skills\/rss-ai-digest\/scripts\/rss_monitor\.py$/);
  assert.equal(existsSync(defaultRssMonitorPath()), true);
});
