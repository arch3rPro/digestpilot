import assert from "node:assert/strict";
import test from "node:test";
import { arrayValue, asRecord, childText, parseXmlDocument, textValue } from "../src/rss/xml.js";

test("parseXmlDocument parses RSS style text and attributes", () => {
  const doc = asRecord(
    parseXmlDocument(`
      <rss version="2.0">
        <channel>
          <title>Example</title>
          <item><title>Hello</title><link>https://example.com</link></item>
        </channel>
      </rss>
    `)
  );

  const rss = asRecord(doc.rss);
  const channel = asRecord(rss.channel);
  assert.equal(childText(channel, ["title"]), "Example");
  const items = arrayValue(channel.item);
  assert.equal(textValue(asRecord(items[0]).title), "Hello");
});
