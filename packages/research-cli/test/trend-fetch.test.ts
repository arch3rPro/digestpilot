import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fetchPublicTrendInputs } from "../src/commands/trend-fetch.js";

test("fetchPublicTrendInputs writes live public-channel input files", async () => {
  const root = await mkdtemp(join(tmpdir(), "public-trend-fetch-"));
  try {
    const result = await fetchPublicTrendInputs({
      outputDir: root,
      profile: "ai-tech",
      windowDays: 7,
      hackerNewsQueries: ["AI agent"],
      githubRepos: ["example/agent"],
      limit: 5,
      now: new Date("2026-05-27T00:00:00Z"),
      fetcher: mockFetch
    });

    assert.equal(result.profile, "ai-tech");
    assert.equal(result.sources.hacker_news.items, 2);
    assert.equal(result.sources.github[0].source, "atom");
    assert.match(result.sources.github[0].error ?? "", /403/);

    const hnItems = JSON.parse(await readFile(result.files.hacker_news_items, "utf8")) as unknown[];
    const githubReleases = JSON.parse(await readFile(result.files.github_releases, "utf8")) as { repos: unknown[] };
    const urlList = await readFile(result.files.web_url_list, "utf8");

    assert.equal(hnItems.length, 2);
    assert.equal(githubReleases.repos.length, 1);
    assert.match(urlList, /https:\/\/example.com\/agent-debugger/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function mockFetch(url: string | URL | Request): Promise<Response> {
  const href = String(url);
  if (href.startsWith("https://hn.algolia.com")) {
    return jsonResponse({
      hits: [
        {
          objectID: "1",
          title: "Show HN: Agent workflow debugger",
          url: "https://example.com/agent-debugger",
          created_at_i: 1780000000,
          points: 245,
          num_comments: 80
        },
        {
          objectID: "2",
          title: "AI coding benchmark",
          url: "https://example.com/ai-coding-benchmark",
          created_at_i: 1780000100,
          points: 120,
          num_comments: 40
        }
      ]
    });
  }
  if (href === "https://api.github.com/repos/example/agent/releases?per_page=10") {
    return response({ ok: false, status: 403, statusText: "rate limit exceeded", body: {} });
  }
  if (href === "https://github.com/example/agent/releases.atom") {
    return textResponse(`
      <feed>
        <entry>
          <title>Agent workflow runtime v1.0.0</title>
          <updated>2026-05-27T00:00:00Z</updated>
          <link href="https://github.com/example/agent/releases/tag/v1.0.0"/>
          <content type="html">Adds graph workflow execution and replay support.</content>
        </entry>
      </feed>
    `);
  }
  throw new Error(`Unexpected URL: ${href}`);
}

function jsonResponse(body: unknown): Response {
  return response({ body });
}

function textResponse(body: string): Response {
  return response({ body });
}

function response(options: { ok?: boolean; status?: number; statusText?: string; body: unknown }): Response {
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    statusText: options.statusText ?? "OK",
    json: async () => options.body,
    text: async () => String(options.body)
  } as Response;
}
