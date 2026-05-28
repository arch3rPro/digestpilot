import assert from "node:assert/strict";
import test from "node:test";
import { renderJson, renderMarkdownDigestResult } from "../src/rss/render.js";
import type { NodeDigestEnvelope } from "../src/rss/types.js";

test("renderMarkdownDigestResult omits failed-feed maintenance details", () => {
  const envelope: NodeDigestEnvelope = {
    entries: [
      {
        title: "Agent runtime update",
        link: "https://example.com/agent-runtime",
        feed_title: "AI Feed",
        topic: "AI / LLM",
        score: 9,
        score_reasons: ["must-read source"]
      }
    ],
    failures: [{ id: "broken-feed", title: "Broken Feed", url: "https://example.com/broken.xml", error: "HTTP 503" }],
    stats: {
      feeds_enabled: 2,
      feeds_success: 1,
      feeds_failed: 1,
      entries_fetched: 1,
      entries_filtered: 1,
      entries_reported: 1,
      entries_marked_seen: 1
    }
  };

  const markdown = renderMarkdownDigestResult(envelope);

  assert.doesNotMatch(markdown, /Failed feeds/i);
  assert.doesNotMatch(markdown, /Broken Feed/);
  assert.doesNotMatch(markdown, /HTTP 503/);
  assert.doesNotMatch(markdown, /Run stats/i);
  assert.doesNotMatch(markdown, /Feeds: .*failed/i);
  assert.match(markdown, /Agent runtime update/);
});

test("renderJson preserves failures for automation and source maintenance", () => {
  const envelope: NodeDigestEnvelope = {
    entries: [],
    failures: [{ id: "broken-feed", error: "HTTP 503" }]
  };

  const json = JSON.parse(renderJson(envelope)) as NodeDigestEnvelope;

  assert.equal(json.failures?.[0]?.id, "broken-feed");
  assert.equal(json.failures?.[0]?.error, "HTTP 503");
});
