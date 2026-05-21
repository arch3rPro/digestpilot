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
      stats: { feeds_total: 1, feeds_success: 1, feeds_failed: 0 },
      generated_at: "2026-05-21T00:00:00Z"
    };

    const result = await ingestRssEnvelope({ workspace, envelope });
    assert.equal(result.entriesArchived, 1);
    assert.equal(result.entitiesLinked > 0, true);
    assert.equal(typeof result.runId, "string");
    assert.deepEqual(result.sourceHealthSummary, { checked: 1, succeeded: 1, failed: 0, failed_sample: [] });

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

      const run = db.prepare("select * from research_runs where run_type = 'rss_ingest'").get() as {
        question: string;
        time_window: string;
        stats_json: string;
        source_health_summary_json: string;
        archived_count: number;
        entity_link_count: number;
        status: string;
      };
      assert.equal(run.question, "RSS ingest");
      assert.equal(run.time_window, "unspecified");
      assert.deepEqual(JSON.parse(run.stats_json), { feeds_total: 1, feeds_success: 1, feeds_failed: 0 });
      assert.deepEqual(JSON.parse(run.source_health_summary_json), {
        checked: 1,
        succeeded: 1,
        failed: 0,
        failed_sample: []
      });
      assert.equal(run.archived_count, 1);
      assert.equal(run.entity_link_count > 0, true);
      assert.equal(run.status, "completed");
    } finally {
      db.close();
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("ingestRssEnvelope persists failed source health samples from envelope health", async () => {
  const root = await mkdtemp(join(tmpdir(), "subscription-research-"));
  const workspace = join(root, "workspace");
  try {
    await initWorkspace({ workspace });
    const result = await ingestRssEnvelope({
      workspace,
      timeWindow: "24h",
      criteria: {
        channel: "rss",
        since: "24h",
        must_keywords: "llm,agent",
        min_score: 8
      },
      envelope: {
        entries: [],
        health: {
          good: { status: "healthy", success_count: 2, failure_count: 0 },
          bad: { status: "failing", success_count: 0, failure_count: 3, last_error: "HTTP 503" }
        },
        stats: { feeds_total: 2, feeds_success: 1, feeds_failed: 1 },
        generated_at: "2026-05-21T00:00:00Z"
      }
    });

    assert.equal(result.entriesArchived, 0);
    assert.deepEqual(result.sourceHealthSummary, {
      checked: 2,
      succeeded: 1,
      failed: 1,
      failed_sample: [{ id: "bad", error: "HTTP 503" }]
    });

    const db = new Database(join(workspace, "data/research.db"), { readonly: true });
    try {
      const run = db.prepare("select criteria_json, source_health_summary_json from research_runs").get() as {
        criteria_json: string;
        source_health_summary_json: string;
      };
      assert.deepEqual(JSON.parse(run.criteria_json), {
        channel: "rss",
        since: "24h",
        must_keywords: "llm,agent",
        min_score: 8
      });
      assert.deepEqual(JSON.parse(run.source_health_summary_json), result.sourceHealthSummary);
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
