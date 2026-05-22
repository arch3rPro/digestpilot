import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import Database from "better-sqlite3";
import { enrichArticleContent } from "../src/commands/enrich-content.js";
import { initWorkspace } from "../src/commands/init.js";
import { ingestRssEnvelope } from "../src/commands/ingest-rss.js";

test("enrichArticleContent fetches readable content and caches it", async () => {
  const root = await mkdtemp(join(tmpdir(), "subscription-research-"));
  const workspace = join(root, "workspace");
  try {
    await initWorkspace({ workspace });
    await ingestRssEnvelope({
      workspace,
      envelope: {
        entries: [
          {
            title: "Agent workflows for product teams",
            link: "https://example.com/agent-workflows",
            feed_id: "product-feed",
            feed_title: "Product Feed",
            published_at: "2026-05-21T00:00:00Z",
            summary: "Short RSS teaser.",
            topic: "Product / Business",
            score: 8
          }
        ]
      }
    });

    const result = await enrichArticleContent({
      workspace,
      limit: 5,
      fetcher: async () => ({
        async text() {
          return `
            <html><body>
              <article>
                <h1>Agent workflows for product teams</h1>
                <p>Product managers need evidence-rich workflows before they automate decisions.</p>
                <p>The best agent products expose sources, proposed actions, and rollback options.</p>
              </article>
            </body></html>
          `;
        }
      })
    });

    assert.equal(result.fetched, 1);
    assert.equal(result.failed, 0);
    assert.equal(result.cache_paths.length, 1);

    const cached = JSON.parse(await readFile(result.cache_paths[0], "utf8")) as {
      excerpt: string;
      text_content: string;
    };
    assert.match(cached.excerpt, /Product managers need evidence-rich workflows/);
    assert.match(cached.text_content, /rollback options/);

    const db = new Database(join(workspace, "data/research.db"), { readonly: true });
    try {
      const row = db
        .prepare(
          `
          select ac.status, ac.excerpt, ac.content_length, a.content_excerpt
          from article_content ac
          join articles a on a.id = ac.article_id
        `
        )
        .get() as { status: string; excerpt: string; content_length: number; content_excerpt: string };
      assert.equal(row.status, "fetched");
      assert.match(row.excerpt, /Product managers need evidence-rich workflows/);
      assert.equal(row.content_length > 100, true);
      assert.match(row.content_excerpt, /Product managers need evidence-rich workflows/);
    } finally {
      db.close();
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("enrichArticleContent records fetch failures without throwing", async () => {
  const root = await mkdtemp(join(tmpdir(), "subscription-research-"));
  const workspace = join(root, "workspace");
  try {
    await initWorkspace({ workspace });
    await ingestRssEnvelope({
      workspace,
      envelope: {
        entries: [
          {
            title: "Broken article",
            link: "https://example.com/broken",
            feed_id: "broken-feed",
            feed_title: "Broken Feed",
            published_at: "2026-05-21T00:00:00Z",
            summary: "RSS teaser.",
            topic: "Engineering",
            score: 8
          }
        ]
      }
    });

    const result = await enrichArticleContent({
      workspace,
      fetcher: async () => {
        throw new Error("HTTP 500");
      }
    });

    assert.equal(result.fetched, 0);
    assert.equal(result.failed, 1);

    const db = new Database(join(workspace, "data/research.db"), { readonly: true });
    try {
      const row = db.prepare("select status, error from article_content").get() as { status: string; error: string };
      assert.equal(row.status, "failed");
      assert.equal(row.error, "HTTP 500");
    } finally {
      db.close();
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
