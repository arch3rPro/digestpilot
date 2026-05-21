import assert from "node:assert/strict";
import { readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import Database from "better-sqlite3";
import { mkdtemp } from "node:fs/promises";
import { initWorkspace } from "../src/commands/init.js";

test("initWorkspace creates directories, config files, and schema", async () => {
  const root = await mkdtemp(join(tmpdir(), "subscription-research-"));
  const workspace = join(root, "workspace");

  try {
    await initWorkspace({ workspace });

    for (const path of [
      "data",
      "notes/briefs",
      "notes/daily",
      "notes/weekly",
      "notes/topics",
      "notes/entities",
      "notes/memos",
      "exports/markdown",
      "exports/json",
      "exports/opml",
      "config"
    ]) {
      assert.equal((await stat(join(workspace, path))).isDirectory(), true);
    }

    const workspaceConfig = JSON.parse(await readFile(join(workspace, "config/workspace.json"), "utf8")) as {
      schema_version: number;
    };
    assert.equal(workspaceConfig.schema_version, 1);

    const db = new Database(join(workspace, "data/research.db"), { readonly: true });
    try {
      const tables = db.prepare("select name from sqlite_master where type = 'table' order by name").all() as Array<{
        name: string;
      }>;
      assert.deepEqual(
        tables.map((row) => row.name),
        [
          "article_entities",
          "article_topics",
          "articles",
          "entities",
          "evidence_items",
          "research_runs",
          "schema_version",
          "sources",
          "topics"
        ]
      );

      const version = db.prepare("select version from schema_version").get() as { version: number };
      assert.equal(version.version, 2);

      const runColumns = db.prepare("pragma table_info(research_runs)").all() as Array<{ name: string }>;
      assert.deepEqual(
        ["run_type", "stats_json", "source_health_summary_json", "archived_count", "entity_link_count", "status"].every(
          (column) => runColumns.some((row) => row.name === column)
        ),
        true
      );
    } finally {
      db.close();
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("initWorkspace migrates version 1 research_runs table", async () => {
  const root = await mkdtemp(join(tmpdir(), "subscription-research-"));
  const workspace = join(root, "workspace");

  try {
    await initWorkspace({ workspace });
    const db = new Database(join(workspace, "data/research.db"));
    try {
      db.prepare("delete from schema_version").run();
      db.prepare("insert into schema_version (version, applied_at) values (1, ?)").run("2026-05-21T00:00:00Z");
      db.prepare("drop table research_runs").run();
      db.prepare(
        `
        create table research_runs (
          id text primary key,
          question text not null,
          time_window text not null,
          criteria_json text not null,
          started_at text not null,
          completed_at text,
          output_markdown_path text,
          output_json_path text
        )
      `
      ).run();
    } finally {
      db.close();
    }

    await initWorkspace({ workspace });

    const migrated = new Database(join(workspace, "data/research.db"), { readonly: true });
    try {
      const version = migrated
        .prepare("select version from schema_version order by version desc limit 1")
        .get() as { version: number };
      assert.equal(version.version, 2);

      const columns = migrated.prepare("pragma table_info(research_runs)").all() as Array<{ name: string }>;
      for (const column of [
        "run_type",
        "stats_json",
        "source_health_summary_json",
        "archived_count",
        "entity_link_count",
        "status"
      ]) {
        assert.equal(columns.some((row) => row.name === column), true);
      }
    } finally {
      migrated.close();
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
