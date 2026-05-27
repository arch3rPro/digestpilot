import assert from "node:assert/strict";
import test from "node:test";
import { parseGithubReleaseSignals } from "../src/trends/adapters/github-releases.js";
import { parseHackerNewsSignals } from "../src/trends/adapters/hacker-news.js";
import { parseWebUrlListSignals } from "../src/trends/adapters/web-url-list.js";
import { getTrendProfile } from "../src/trends/profiles.js";

test("parseWebUrlListSignals extracts public URL signals from markdown", () => {
  const signals = parseWebUrlListSignals({
    text: "- [OpenAI changelog](https://example.com/changelog)\n- https://example.com/launch",
    profile: getTrendProfile("product-business"),
    now: new Date("2026-05-27T00:00:00Z"),
    source: "Launch list"
  });

  assert.equal(signals.length, 2);
  assert.equal(signals[0].adapter, "web-url-list");
  assert.equal(signals[0].type, "product");
  assert.equal(signals[0].authority, "secondary");
});

test("parseHackerNewsSignals normalizes HN community signals", () => {
  const signals = parseHackerNewsSignals({
    items: [
      {
        id: 1,
        title: "Show HN: Agent workflow debugger",
        url: "https://example.com/agent-debugger",
        time: 1780000000,
        score: 245,
        descendants: 80
      }
    ],
    profile: getTrendProfile("ai-tech")
  });

  assert.equal(signals[0].adapter, "hacker-news");
  assert.equal(signals[0].authority, "community");
  assert.equal(signals[0].metrics.score, 245);
});

test("parseGithubReleaseSignals normalizes release signals", () => {
  const signals = parseGithubReleaseSignals({
    releases: [
      {
        html_url: "https://github.com/example/agent/releases/tag/v1",
        tag_name: "v1.0.0",
        name: "Agent workflow runtime v1",
        published_at: "2026-05-27T00:00:00Z",
        body: "Adds graph workflow execution"
      }
    ],
    repo: "example/agent",
    profile: getTrendProfile("ai-tech")
  });

  assert.equal(signals[0].adapter, "github-releases");
  assert.equal(signals[0].authority, "primary");
  assert.equal(signals[0].entities.includes("example/agent"), true);
});
