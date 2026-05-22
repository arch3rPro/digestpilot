import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { parseFeedXml } from "../src/rss/feed-parser.js";
import type { RssEntry } from "../src/rss/types.js";

test("Node RSS parser matches Python parser on compact RSS fixture", async () => {
  await assertParserParity("basic-rss.xml", "ai-feed", "AI Feed");
});

test("Node Atom parser matches Python parser on compact Atom fixture", async () => {
  await assertParserParity("basic-atom.xml", "atom-feed", "Atom Feed");
});

async function assertParserParity(filename: string, feedId: string, feedTitle: string): Promise<void> {
  const fixturePath = join(process.cwd(), "test/fixtures/rss", filename);
  const nodeEntries = parseFeedXml(await readFile(fixturePath, "utf8"), feedId, feedTitle).map(selectComparableFields);
  const pythonEntries = runPythonParser(fixturePath, feedId, feedTitle).map(selectComparableFields);
  assert.deepEqual(nodeEntries, pythonEntries);
}

function runPythonParser(fixturePath: string, feedId: string, feedTitle: string): RssEntry[] {
  const repoRoot = resolve(process.cwd(), "../..");
  const scriptPath = join(repoRoot, "skills/rss-ai-digest/scripts/rss_monitor.py");
  const code = `
import importlib.util
import json
import pathlib
import sys

spec = importlib.util.spec_from_file_location("rss_monitor", sys.argv[1])
module = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(module)
entries = module.parse_feed_xml(pathlib.Path(sys.argv[2]).read_text(encoding="utf-8"), sys.argv[3], sys.argv[4])
print(json.dumps(entries, ensure_ascii=False, sort_keys=True))
`;
  const result = spawnSync("python3", ["-c", code, scriptPath, fixturePath, feedId, feedTitle], {
    encoding: "utf8"
  });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout) as RssEntry[];
}

function selectComparableFields(entry: RssEntry): RssEntry {
  return {
    title: entry.title,
    link: entry.link,
    guid: entry.guid,
    author: entry.author,
    published_at: entry.published_at,
    summary: entry.summary,
    feed_id: entry.feed_id,
    feed_title: entry.feed_title,
    matched_keywords: entry.matched_keywords
  };
}
