import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import Database from "better-sqlite3";
import { ingestRssEnvelope } from "../src/commands/ingest-rss.js";
import {
  createSourceHealthRegistryPatch,
  summarizeSourceHealthHistory,
  renderSourceHealthMarkdown
} from "../src/sources/health.js";
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
          ["flaky", "lower_priority", 3, 2],
          ["good", "keep", 3, 0]
        ]
      );
      assert.equal(summary[0].last_error, "SSL timeout");
      assert.equal(summary[0].consecutive_failures, 3);
      assert.equal(summary[0].maintenance_priority, "high");
      assert.equal(summary[0].recommendation_reason, "persistent_failures");
      assert.equal(summary[1].recommendation_reason, "repeated_failures_with_recent_success");
      assert.equal(summary[1].consecutive_failures, 1);
      assert.equal(summary[1].last_success_at, "2026-05-20T00:00:00Z");

      const markdown = renderSourceHealthMarkdown(summary);
      assert.match(markdown, /dead/);
      assert.match(markdown, /disable_candidate/);
      assert.match(markdown, /flaky/);
      assert.match(markdown, /lower_priority/);

      const patch = createSourceHealthRegistryPatch(summary);
      assert.deepEqual(patch.summary, { disable: 1, keep: 1, "lower-priority": 1 });
      assert.deepEqual(
        patch.actions.map((item) => [item.id, item.action, item.registry_patch]),
        [
          ["dead", "disable", { id: "dead", set: { enabled: false } }],
          ["flaky", "lower-priority", {}],
          ["good", "keep", {}]
        ]
      );
    } finally {
      db.close();
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("summarizeSourceHealthHistory lowers priority for noisy sources before disabling", async () => {
  const root = await mkdtemp(join(tmpdir(), "subscription-research-"));
  const workspace = join(root, "workspace");

  try {
    await initWorkspace({ workspace });
    await ingestHealthRun(workspace, "2026-05-18T00:00:00Z", {
      noisy: { status: "healthy", success_count: 1, failure_count: 0 }
    });
    await ingestHealthRun(workspace, "2026-05-19T00:00:00Z", {
      noisy: { status: "failing", success_count: 0, failure_count: 1, last_error: "HTTP 429" }
    });
    await ingestHealthRun(workspace, "2026-05-20T00:00:00Z", {
      noisy: { status: "failing", success_count: 0, failure_count: 1, last_error: "HTTP 429" }
    });
    await ingestHealthRun(workspace, "2026-05-21T00:00:00Z", {
      noisy: { status: "healthy", success_count: 1, failure_count: 0 }
    });
    await ingestHealthRun(workspace, "2026-05-22T00:00:00Z", {
      noisy: { status: "failing", success_count: 0, failure_count: 1, last_error: "HTTP 429" }
    });

    const db = new Database(join(workspace, "data/research.db"), { readonly: true });
    try {
      const summary = summarizeSourceHealthHistory(db, { minObservations: 2, disableObservationThreshold: 3 });
      assert.deepEqual(
        summary.map((item) => [
          item.source_id,
          item.recommendation,
          item.observations,
          item.failures,
          item.consecutive_failures,
          item.last_success_at,
          item.maintenance_priority
        ]),
        [["noisy", "lower_priority", 5, 3, 1, "2026-05-21T00:00:00Z", "medium"]]
      );

      const patch = createSourceHealthRegistryPatch(summary);
      assert.deepEqual(patch.summary, { "lower-priority": 1 });
      assert.deepEqual(patch.actions[0].action, "lower-priority");
      assert.deepEqual(patch.actions[0].registry_patch, {});
      assert.equal(patch.actions[0].consecutive_failures, 1);
      assert.equal(patch.actions[0].last_success_at, "2026-05-21T00:00:00Z");
      assert.equal(patch.actions[0].maintenance_priority, "medium");
    } finally {
      db.close();
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("summarizeSourceHealthHistory does not disable after a single failed observation", async () => {
  const root = await mkdtemp(join(tmpdir(), "subscription-research-"));
  const workspace = join(root, "workspace");

  try {
    await initWorkspace({ workspace });
    await ingestHealthRun(workspace, "2026-05-21T00:00:00Z", {
      transient: { status: "failing", success_count: 0, failure_count: 1, last_error: "SSL timeout" }
    });

    const db = new Database(join(workspace, "data/research.db"), { readonly: true });
    try {
      const summary = summarizeSourceHealthHistory(db, { minObservations: 1 });
      assert.deepEqual(
        summary.map((item) => [item.source_id, item.recommendation, item.observations, item.failures]),
        [["transient", "watch", 1, 1]]
      );

      const patch = createSourceHealthRegistryPatch(summary);
      assert.deepEqual(patch.summary, { watch: 1 });
      assert.deepEqual(patch.actions[0].registry_patch, {});
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
