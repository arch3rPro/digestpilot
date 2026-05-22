import assert from "node:assert/strict";
import test from "node:test";
import { applySourceMetadata, parseOpml } from "../src/rss/opml.js";

test("parseOpml extracts feed URLs with nested categories and stable defaults", () => {
  const feeds = parseOpml(`
    <opml version="2.0">
      <body>
        <outline text="AI">
          <outline text="Simon Willison" title="Simon Willison" type="rss" xmlUrl="https://simonwillison.net/atom/everything/"/>
          <outline text="Duplicate" xmlUrl="https://simonwillison.net/atom/everything/"/>
        </outline>
        <outline text="Engineering">
          <outline text="Hillel Wayne" xmlUrl="https://buttondown.com/hillelwayne/rss"/>
        </outline>
      </body>
    </opml>
  `);

  assert.deepEqual(
    feeds.map((feed) => ({ id: feed.id, title: feed.title, category: feed.category, base_score: feed.base_score, enabled: feed.enabled })),
    [
      { id: "simon-willison", title: "Simon Willison", category: ["AI"], base_score: 5, enabled: true },
      { id: "hillel-wayne", title: "Hillel Wayne", category: ["Engineering"], base_score: 5, enabled: true }
    ]
  );
});

test("applySourceMetadata applies selected registry overrides", () => {
  const [feed] = applySourceMetadata(
    [{ id: "simon-willison", title: "Simon Willison", url: "https://example.com", category: [], base_score: 5, tags: [] }],
    { "simon-willison": { base_score: 9, language: "en", tags: ["must-read"] } }
  );

  assert.equal(feed.base_score, 9);
  assert.equal(feed.language, "en");
  assert.deepEqual(feed.tags, ["must-read"]);
  assert.equal(feed.title, "Simon Willison");
});
