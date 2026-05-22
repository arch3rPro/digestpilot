import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createEvidenceBrief } from "../src/commands/brief-evidence.js";
import { ingestRssEnvelope } from "../src/commands/ingest-rss.js";
import { initWorkspace } from "../src/commands/init.js";

test("createEvidenceBrief writes markdown and JSON evidence outputs", async () => {
  const root = await mkdtemp(join(tmpdir(), "subscription-research-"));
  const workspace = join(root, "workspace");
  try {
    await initWorkspace({ workspace });
    await ingestRssEnvelope({
      workspace,
      envelope: {
        entries: [
          {
            title: "LLM evals in production",
            link: "https://example.com/llm-evals",
            feed_id: "ai-feed",
            feed_title: "AI Feed",
            published_at: "2026-05-21T00:00:00Z",
            summary: "<p>Benchmark &amp; reliability notes.</p>",
            topic: "AI / LLM",
            score: 9,
            score_reasons: ["should_keyword_match"]
          }
        ]
      }
    });

    const result = await createEvidenceBrief({
      workspace,
      question: "最近 LLM evals 有哪些新进展？",
      since: "7d",
      mustKeywords: "llm,evals",
      shouldKeywords: "benchmark,reliability",
      limit: 10
    });

    const markdown = await readFile(result.markdownPath, "utf8");
    const json = JSON.parse(await readFile(result.jsonPath, "utf8")) as {
      question: string;
      evidence_items: unknown[];
      source_health_summary: { checked: number };
    };
    assert.match(markdown, /# Evidence Brief:/);
    assert.match(markdown, /LLM evals in production/);
    assert.match(markdown, /Summary: Benchmark & reliability notes\./);
    assert.equal(json.evidence_items.length, 1);
    assert.equal(json.question, "最近 LLM evals 有哪些新进展？");
    assert.equal(json.source_health_summary.checked, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("createEvidenceBrief defaults must keywords to any mode and supports all mode", async () => {
  const root = await mkdtemp(join(tmpdir(), "subscription-research-"));
  const workspace = join(root, "workspace");
  try {
    await initWorkspace({ workspace });
    await ingestRssEnvelope({
      workspace,
      envelope: {
        entries: [
          {
            title: "Agent runtime update",
            link: "https://example.com/agent-runtime",
            feed_id: "ai-feed",
            feed_title: "AI Feed",
            published_at: new Date().toISOString(),
            summary: "Tool orchestration notes.",
            topic: "AI / LLM",
            score: 8
          }
        ]
      }
    });

    const anyMode = await createEvidenceBrief({
      workspace,
      question: "agent or evals",
      since: "1d",
      mustKeywords: "agent,evals",
      limit: 10
    });
    const allMode = await createEvidenceBrief({
      workspace,
      question: "agent and evals",
      since: "1d",
      mustKeywords: "agent,evals",
      mustKeywordMode: "all",
      limit: 10
    });

    const anyJson = JSON.parse(await readFile(anyMode.jsonPath, "utf8")) as {
      evidence_items: unknown[];
      selection_criteria: { must_keyword_mode: string };
    };
    const allJson = JSON.parse(await readFile(allMode.jsonPath, "utf8")) as {
      evidence_items: unknown[];
      selection_criteria: { must_keyword_mode: string };
    };

    assert.equal(anyJson.selection_criteria.must_keyword_mode, "any");
    assert.equal(anyJson.evidence_items.length, 1);
    assert.equal(allJson.selection_criteria.must_keyword_mode, "all");
    assert.equal(allJson.evidence_items.length, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("createEvidenceBrief reports source health summary from workspace health file", async () => {
  const root = await mkdtemp(join(tmpdir(), "subscription-research-"));
  const workspace = join(root, "workspace");
  try {
    await initWorkspace({ workspace });
    await writeFile(
      join(workspace, "data/source-health.json"),
      JSON.stringify(
        {
          good: { last_success_at: "2026-05-21T00:00:00Z" },
          recovered: {
            failure_count: 0,
            last_error_at: "",
            last_error: "",
            last_success_at: "2026-05-21T00:00:00Z",
            status: "healthy",
            success_count: 1
          },
          bad: { failure_count: 1, last_error_at: "2026-05-21T00:00:00Z", last_error: "HTTP 503", status: "failing" }
        },
        null,
        2
      ),
      "utf8"
    );

    const result = await createEvidenceBrief({
      workspace,
      question: "health summary",
      since: "24h",
      limit: 10
    });

    const markdown = await readFile(result.markdownPath, "utf8");
    const json = JSON.parse(await readFile(result.jsonPath, "utf8")) as {
      sources_scanned: number;
      source_health_summary: {
        checked: number;
        succeeded: number;
        failed: number;
        failed_sample: Array<{ id: string; error: string }>;
      };
    };

    assert.equal(json.sources_scanned, 3);
    assert.equal(json.source_health_summary.succeeded, 2);
    assert.equal(json.source_health_summary.failed, 1);
    assert.deepEqual(json.source_health_summary.failed_sample, [{ id: "bad", error: "HTTP 503" }]);
    assert.match(markdown, /Source health: 2 succeeded, 1 failed/);
    assert.match(markdown, /bad: HTTP 503/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("createEvidenceBrief avoids filename collisions and applies since filtering", async () => {
  const root = await mkdtemp(join(tmpdir(), "subscription-research-"));
  const workspace = join(root, "workspace");
  try {
    await initWorkspace({ workspace });
    await ingestRssEnvelope({
      workspace,
      envelope: {
        entries: [
          {
            title: "Fresh LLM evals in production",
            link: "https://example.com/fresh-llm-evals",
            feed_id: "ai-feed",
            feed_title: "AI Feed",
            published_at: new Date().toISOString(),
            summary: "Benchmark reliability notes.",
            topic: "AI / LLM",
            score: 9,
            score_reasons: ["should_keyword_match"]
          },
          {
            title: "Old LLM evals in production",
            link: "https://example.com/old-llm-evals",
            feed_id: "ai-feed",
            feed_title: "AI Feed",
            published_at: "2020-01-01T00:00:00Z",
            summary: "Benchmark reliability notes.",
            topic: "AI / LLM",
            score: 9,
            score_reasons: ["should_keyword_match"]
          }
        ]
      }
    });

    const first = await createEvidenceBrief({
      workspace,
      question: "最近 LLM evals 有哪些新进展？",
      since: "1d",
      mustKeywords: "llm,evals",
      limit: 10
    });
    const second = await createEvidenceBrief({
      workspace,
      question: "最近 LLM evals 有哪些新进展？",
      since: "1d",
      mustKeywords: "llm,evals",
      limit: 10
    });

    assert.notEqual(first.markdownPath, second.markdownPath);
    const json = JSON.parse(await readFile(first.jsonPath, "utf8")) as {
      evidence_items: Array<{ title: string }>;
    };
    assert.deepEqual(
      json.evidence_items.map((item) => item.title),
      ["Fresh LLM evals in production"]
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("createEvidenceBrief includes original and commentary source attribution", async () => {
  const root = await mkdtemp(join(tmpdir(), "subscription-research-"));
  const workspace = join(root, "workspace");
  try {
    await initWorkspace({ workspace });
    await ingestRssEnvelope({
      workspace,
      envelope: {
        entries: [
          {
            title: "WSJ: Google Unveils New Gemini AI Agent",
            link: "https://daringfireball.net/linked/2026/05/20/google-gemini",
            feed_id: "daring-fireball",
            feed_title: "Daring Fireball",
            published_at: new Date().toISOString(),
            summary: "AI agent reporting and commentary.",
            topic: "AI / LLM",
            score: 9
          }
        ]
      }
    });

    const result = await createEvidenceBrief({
      workspace,
      question: "AI agent daily",
      since: "1d",
      mustKeywords: "ai,agent",
      limit: 10
    });

    const json = JSON.parse(await readFile(result.jsonPath, "utf8")) as {
      evidence_items: Array<{
        commentary_source?: string;
        original_source?: string;
        original_url?: string;
      }>;
    };
    assert.equal(json.evidence_items[0].commentary_source, "Daring Fireball");
    assert.equal(json.evidence_items[0].original_source, "WSJ");
    assert.equal(json.evidence_items[0].original_url, "");

    const markdown = await readFile(result.markdownPath, "utf8");
    assert.match(markdown, /Original source: WSJ/);
    assert.match(markdown, /Commentary source: Daring Fireball/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("createEvidenceBrief adds daily-report guidance and diversifies repeated source items", async () => {
  const root = await mkdtemp(join(tmpdir(), "subscription-research-"));
  const workspace = join(root, "workspace");
  try {
    await initWorkspace({ workspace });
    await ingestRssEnvelope({
      workspace,
      envelope: {
        entries: [
          {
            title: "Datasette Agent 0.1a4",
            link: "https://example.com/datasette-agent-4",
            feed_id: "simon",
            feed_title: "Simon Willison",
            published_at: "2026-05-22T05:00:00Z",
            summary: "Agent release with LLM tool improvements.",
            topic: "AI / LLM",
            score: 10,
            score_reasons: ["trusted_source", "should_keyword_match"]
          },
          {
            title: "Datasette Agent Charts 0.1a3",
            link: "https://example.com/datasette-agent-charts-3",
            feed_id: "simon",
            feed_title: "Simon Willison",
            published_at: "2026-05-22T04:00:00Z",
            summary: "Related Datasette Agent chart release.",
            topic: "AI / LLM",
            score: 10,
            score_reasons: ["trusted_source", "should_keyword_match"]
          },
          {
            title: "Datasette Agent Sprites 0.1a0",
            link: "https://example.com/datasette-agent-sprites",
            feed_id: "simon",
            feed_title: "Simon Willison",
            published_at: "2026-05-22T03:00:00Z",
            summary: "Related Datasette Agent sandbox release.",
            topic: "AI / LLM",
            score: 10,
            score_reasons: ["trusted_source", "should_keyword_match"]
          },
          {
            title: "llm-gemini 0.32",
            link: "https://example.com/llm-gemini",
            feed_id: "simon",
            feed_title: "Simon Willison",
            published_at: "2026-05-22T02:00:00Z",
            summary: "Gemini model plugin update.",
            topic: "AI / LLM",
            score: 10,
            score_reasons: ["trusted_source", "should_keyword_match"]
          },
          {
            title: "Gemini Agent Runtime Architecture",
            link: "https://example.com/gemini-agent-runtime",
            feed_id: "other-ai",
            feed_title: "Other AI Lab",
            published_at: "2026-05-22T01:00:00Z",
            summary: "Original architecture notes for an AI agent runtime.",
            topic: "AI / LLM",
            score: 9,
            score_reasons: ["technical_depth_signal", "should_keyword_match"]
          }
        ]
      }
    });

    const result = await createEvidenceBrief({
      workspace,
      question: "AI 技术日报",
      since: "7d",
      shouldKeywords: "agent,llm,gemini,architecture",
      limit: 4
    });

    const json = JSON.parse(await readFile(result.jsonPath, "utf8")) as {
      evidence_items: Array<{
        title: string;
        source: string;
        priority_bucket?: string;
        attribution_label?: string;
        merge_key?: string;
      }>;
      daily_report_guidance?: {
        priority_buckets: { lead: string[]; supporting: string[]; watch: string[] };
        merge_hints: Array<{ merge_key: string; primary_title: string; related_titles: string[] }>;
        style_notes: string[];
      };
    };
    const markdown = await readFile(result.markdownPath, "utf8");

    assert.ok(json.evidence_items.some((item) => item.source === "Other AI Lab"));
    assert.ok(json.evidence_items.every((item) => item.priority_bucket));
    assert.ok(json.evidence_items.every((item) => item.attribution_label));
    assert.ok(json.daily_report_guidance);
    assert.ok(json.daily_report_guidance.priority_buckets.lead.length > 0);
    assert.equal(
      json.daily_report_guidance.priority_buckets.lead.filter((title) => title.toLowerCase().includes("datasette")).length,
      1
    );
    assert.ok(
      json.daily_report_guidance.merge_hints.some(
        (hint) => hint.merge_key === "datasette agent" && hint.related_titles.length >= 1
      )
    );
    assert.match(markdown, /## Daily Report Guidance/);
    assert.match(markdown, /### Merge Hints/);
    assert.match(markdown, /Attribution:/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
