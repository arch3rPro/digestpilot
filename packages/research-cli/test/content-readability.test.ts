import assert from "node:assert/strict";
import test from "node:test";
import { extractReadableContent } from "../src/content/readability.js";

test("extractReadableContent extracts article text and metadata", () => {
  const result = extractReadableContent(
    `
    <!doctype html>
    <html>
      <head><title>Ignored Site Title</title></head>
      <body>
        <nav>Navigation noise</nav>
        <article>
          <h1>Agent Workflows for Product Teams</h1>
          <p class="byline">By Ada PM</p>
          <p>Product teams are moving from static dashboards to agent-assisted workflows.</p>
          <p>The useful pattern is to expose evidence, actions, and rollback paths.</p>
        </article>
      </body>
    </html>
    `,
    "https://example.com/articles/agent-workflows"
  );

  assert.equal(result.title, "Agent Workflows for Product Teams");
  assert.match(result.textContent, /agent-assisted workflows/);
  assert.match(result.excerpt, /Product teams are moving/);
  assert.equal(result.contentLength > 80, true);
});

test("extractReadableContent falls back to document body when readability fails", () => {
  const result = extractReadableContent(
    "<html><body><p>Short useful note about pricing and user trust.</p></body></html>",
    "https://example.com/short"
  );

  assert.equal(result.title, "");
  assert.equal(result.textContent, "Short useful note about pricing and user trust.");
  assert.equal(result.contentLength, result.textContent.length);
});
