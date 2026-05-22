import assert from "node:assert/strict";
import test from "node:test";
import { parseFeedXml } from "../src/rss/feed-parser.js";

test("parseFeedXml parses RSS 2.0 entries", () => {
  const entries = parseFeedXml(
    `
      <rss version="2.0">
        <channel>
          <title>AI Feed</title>
          <item>
            <title>LLM evals in production</title>
            <link>https://example.com/llm-evals</link>
            <guid>guid-1</guid>
            <dc:creator>Jane</dc:creator>
            <pubDate>Thu, 21 May 2026 08:00:00 GMT</pubDate>
            <description>Reliability benchmark notes.</description>
          </item>
        </channel>
      </rss>
    `,
    "ai-feed"
  );

  assert.equal(entries.length, 1);
  assert.equal(entries[0].title, "LLM evals in production");
  assert.equal(entries[0].author, "Jane");
  assert.equal(entries[0].published_at, "2026-05-21T08:00:00+00:00");
  assert.equal(entries[0].feed_title, "AI Feed");
});

test("parseFeedXml parses Atom alternate links and authors", () => {
  const entries = parseFeedXml(
    `
      <feed xmlns="http://www.w3.org/2005/Atom">
        <title>Atom Feed</title>
        <entry>
          <title>Agent architecture</title>
          <id>tag:example.com,2026:agent-architecture</id>
          <link rel="self" href="https://example.com/feed-entry"/>
          <link rel="alternate" href="https://example.com/agent-architecture"/>
          <author><name>Alex</name></author>
          <updated>2026-05-21T09:00:00Z</updated>
          <summary>Architecture notes for agent workflows.</summary>
        </entry>
      </feed>
    `,
    "atom-feed"
  );

  assert.equal(entries.length, 1);
  assert.equal(entries[0].link, "https://example.com/agent-architecture");
  assert.equal(entries[0].author, "Alex");
  assert.equal(entries[0].published_at, "2026-05-21T09:00:00+00:00");
  assert.equal(entries[0].feed_title, "Atom Feed");
});
