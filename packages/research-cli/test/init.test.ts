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
      assert.equal(version.version, 1);
    } finally {
      db.close();
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
