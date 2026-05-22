import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { parseFeedXml } from "../src/rss/feed-parser.js";
import type { RssEntry } from "../src/rss/types.js";

test("Node RSS parser matches compact RSS fixture snapshot", async () => {
  await assertParserSnapshot("basic-rss.xml", "ai-feed", "AI Feed", [
    {
      title: "LLM evals in production",
      link: "https://example.com/llm-evals",
      guid: "guid-1",
      author: "Jane",
      published_at: "2026-05-21T08:00:00+00:00",
      summary: "Reliability benchmark notes.",
      feed_id: "ai-feed",
      feed_title: "AI Feed",
      matched_keywords: []
    }
  ]);
});

test("Node Atom parser matches compact Atom fixture snapshot", async () => {
  await assertParserSnapshot("basic-atom.xml", "atom-feed", "Atom Feed", [
    {
      title: "Agent architecture",
      link: "https://example.com/agent-architecture",
      guid: "tag:example.com,2026:agent-architecture",
      author: "Alex",
      published_at: "2026-05-21T09:00:00+00:00",
      summary: "Architecture notes for agent workflows.",
      feed_id: "atom-feed",
      feed_title: "Atom Feed",
      matched_keywords: []
    }
  ]);
});

async function assertParserSnapshot(
  filename: string,
  feedId: string,
  feedTitle: string,
  expectedEntries: RssEntry[]
): Promise<void> {
  const fixturePath = join(process.cwd(), "test/fixtures/rss", filename);
  const nodeEntries = parseFeedXml(await readFile(fixturePath, "utf8"), feedId, feedTitle).map(selectComparableFields);
  assert.deepEqual(nodeEntries, expectedEntries);
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
