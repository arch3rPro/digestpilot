import assert from "node:assert/strict";
import test from "node:test";
import { discoverFeedsFromHtml, extractDiscoveryUrls } from "../src/rss/discovery.js";

test("discoverFeedsFromHtml finds RSS and Atom alternate links", () => {
  const result = discoverFeedsFromHtml(
    `
    <html>
      <head>
        <title>Example Product Blog</title>
        <link rel="alternate" type="application/rss+xml" title="RSS" href="/feed.xml">
        <link rel="alternate" type="application/atom+xml" title="Atom Updates" href="https://example.com/atom.xml">
        <link rel="stylesheet" href="/style.css">
      </head>
    </html>
    `,
    "https://example.com/blog/"
  );

  assert.deepEqual(result, [
    {
      id: "example-com-feed-xml",
      title: "RSS",
      url: "https://example.com/feed.xml",
      source_page: "https://example.com/blog/",
      type: "rss"
    },
    {
      id: "example-com-atom-xml",
      title: "Atom Updates",
      url: "https://example.com/atom.xml",
      source_page: "https://example.com/blog/",
      type: "atom"
    }
  ]);
});

test("discoverFeedsFromHtml dedupes duplicate feed URLs and falls back to page title", () => {
  const result = discoverFeedsFromHtml(
    `
    <html>
      <head>
        <title>Example Lab</title>
        <link rel="alternate" type="application/rss+xml" href="/rss">
        <link rel="alternate" type="application/rss+xml" title="Duplicate" href="https://example.com/rss">
      </head>
    </html>
    `,
    "https://example.com/"
  );

  assert.equal(result.length, 1);
  assert.equal(result[0].title, "Example Lab");
  assert.equal(result[0].url, "https://example.com/rss");
});

test("extractDiscoveryUrls finds unique page URLs from markdown lists", () => {
  const result = extractDiscoveryUrls(`
    - [Example Product Blog](https://example.com/blog)
    - Docs: https://docs.example.com/guide.
    - Duplicate: https://example.com/blog
    - Feed candidate: <https://feeds.example.com/rss.xml>
  `);

  assert.deepEqual(result, ["https://example.com/blog", "https://docs.example.com/guide", "https://feeds.example.com/rss.xml"]);
});
