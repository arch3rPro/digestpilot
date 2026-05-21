import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import Database from "better-sqlite3";
import { ingestRssEnvelope } from "../src/commands/ingest-rss.js";
import { summarizeSourceHealthHistory, renderSourceHealthMarkdown } from "../src/sources/health.js";
import { initWorkspace } from "../src/commands/init.js";

test("summarizeSourceHealthHistory ranks persistent and intermittent source failures", async () => {
  const root = await mkdtemp(join(tmpdir(), "subscription-research-"));
  const workspace = join(root, "workspace");

  try {
    await initWorkspace({ workspace });
    await ingestHealthRun(workspace, "2026-05-19T00:00:00Z", {
      good: { status: "healthy", success_count: 1, failure_count: 0 },
      flaky: { status: "failing", success_count: 0, failure_count: 1, last_error: "HTTP 503" },
      dead: { status: "failing", success_count: 0, failure_count: 1, last_error: "SSL timeout" }
    });
    await ingestHealthRun(workspace, "2026-05-20T00:00:00Z", {
      good: { status: "healthy", success_count: 1, failure_count: 0 },
      flaky: { status: "healthy", success_count: 1, failure_count: 0 },
      dead: { status: "failing", success_count: 0, failure_count: 1, last_error: "SSL timeout" }
    });
    await ingestHealthRun(workspace, "2026-05-21T00:00:00Z", {
      good: { status: "healthy", success_count: 1, failure_count: 0 },
      flaky: { status: "failing", success_count: 1, failure_count: 1, last_error: "HTTP 503" },
      dead: { status: "failing", success_count: 0, failure_count: 1, last_error: "SSL timeout" }
    });

    const db = new Database(join(workspace, "data/research.db"), { readonly: true });
    try {
      const observations = db.prepare("select source_id, status from source_health_observations").all() as Array<{
        source_id: string;
        status: string;
      }>;
      assert.equal(observations.length, 9);

      const summary = summarizeSourceHealthHistory(db, { minObservations: 2 });
      assert.deepEqual(
        summary.map((item) => [item.source_id, item.recommendation, item.observations, item.failures]),
        [
          ["dead", "disable_candidate", 3, 3],
          ["flaky", "watch", 3, 2],
          ["good", "keep", 3, 0]
        ]
      );
      assert.equal(summary[0].last_error, "SSL timeout");
      assert.equal(summary[0].recommendation_reason, "persistent_failures");
      assert.equal(summary[1].recommendation_reason, "intermittent_failures");

      const markdown = renderSourceHealthMarkdown(summary);
      assert.match(markdown, /dead/);
      assert.match(markdown, /disable_candidate/);
      assert.match(markdown, /flaky/);
      assert.match(markdown, /watch/);
    } finally {
      db.close();
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function ingestHealthRun(
  workspace: string,
  generatedAt: string,
  health: Record<string, Record<string, unknown>>
): Promise<void> {
  await ingestRssEnvelope({
    workspace,
    timeWindow: "24h",
    envelope: {
      entries: [],
      health,
      stats: {
        feeds_total: Object.keys(health).length,
        feeds_success: Object.values(health).filter((item) => item.status === "healthy").length,
        feeds_failed: Object.values(health).filter((item) => item.status === "failing").length
      },
      generated_at: generatedAt
    }
  });
}
