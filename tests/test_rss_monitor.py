import importlib.util
import json
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path


SCRIPT_PATH = Path(__file__).resolve().parents[1] / "skills" / "rss-ai-digest" / "scripts" / "rss_monitor.py"


def load_module():
    spec = importlib.util.spec_from_file_location("rss_monitor", SCRIPT_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


OPML = """<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <body>
    <outline text="AI" title="AI">
      <outline text="Simon Willison" title="Simon Willison" type="rss" xmlUrl="https://simonwillison.net/atom/everything/" htmlUrl="https://simonwillison.net/" />
      <outline text="No Feed" title="No Feed" htmlUrl="https://example.com/" />
    </outline>
  </body>
</opml>
"""


RSS = """<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Example RSS</title>
    <item>
      <title>Building reliable LLM agents with evals</title>
      <link>https://example.com/agents</link>
      <guid>agent-guid</guid>
      <author>Jane Engineer</author>
      <pubDate>Wed, 20 May 2026 08:00:00 GMT</pubDate>
      <description>A practical engineering write-up about agents, evals, and production systems.</description>
    </item>
  </channel>
</rss>
"""


ATOM = """<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Example Atom</title>
  <entry>
    <title>Transformer debugging notes</title>
    <link href="https://example.com/transformers" />
    <id>tag:example.com,2026:transformers</id>
    <author><name>Researcher</name></author>
    <updated>2026-05-20T07:00:00Z</updated>
    <summary>Deep technical notes on model debugging and inference infrastructure.</summary>
  </entry>
</feed>
"""


class RssMonitorTests(unittest.TestCase):
    def setUp(self):
        self.mod = load_module()

    def test_parse_opml_extracts_feed_urls(self):
        feeds = self.mod.parse_opml(OPML)

        self.assertEqual(len(feeds), 1)
        self.assertEqual(feeds[0]["title"], "Simon Willison")
        self.assertEqual(feeds[0]["url"], "https://simonwillison.net/atom/everything/")
        self.assertEqual(feeds[0]["category"], ["AI"])
        self.assertEqual(feeds[0]["enabled"], True)

    def test_base_opml_imports_curated_feeds(self):
        base_opml = Path(__file__).resolve().parents[1] / "skills" / "rss-ai-digest" / "references" / "base-feeds.opml"

        feeds = self.mod.parse_opml(base_opml.read_text(encoding="utf-8"))
        by_title = {feed["title"]: feed for feed in feeds}

        self.assertGreaterEqual(len(feeds), 90)
        self.assertIn("simonwillison.net", by_title)
        self.assertEqual(by_title["simonwillison.net"]["category"], ["AI, Research, and High-Signal Analysis"])
        self.assertIn("krebsonsecurity.com", by_title)
        self.assertEqual(by_title["krebsonsecurity.com"]["category"], ["Security and Risk"])

    def test_parse_rss_and_atom_entries(self):
        rss_entries = self.mod.parse_feed_xml(RSS, feed_id="rss", feed_title="Example RSS")
        atom_entries = self.mod.parse_feed_xml(ATOM, feed_id="atom", feed_title="Example Atom")

        self.assertEqual(rss_entries[0]["title"], "Building reliable LLM agents with evals")
        self.assertEqual(rss_entries[0]["link"], "https://example.com/agents")
        self.assertEqual(rss_entries[0]["author"], "Jane Engineer")
        self.assertEqual(atom_entries[0]["title"], "Transformer debugging notes")
        self.assertEqual(atom_entries[0]["link"], "https://example.com/transformers")
        self.assertEqual(atom_entries[0]["author"], "Researcher")

    def test_filter_entries_by_keyword_author_and_since(self):
        entries = self.mod.parse_feed_xml(RSS, feed_id="rss", feed_title="Example RSS")
        since = datetime(2026, 5, 20, 0, 0, tzinfo=timezone.utc)

        matched = self.mod.filter_entries(entries, keywords=["agents"], author="jane", since=since)
        missed = self.mod.filter_entries(entries, keywords=["kubernetes"], author="jane", since=since)

        self.assertEqual(len(matched), 1)
        self.assertEqual(matched[0]["matched_keywords"], ["agents"])
        self.assertEqual(missed, [])

    def test_entry_key_and_seen_state_dedupe(self):
        entries = self.mod.parse_feed_xml(RSS, feed_id="rss", feed_title="Example RSS")
        key = self.mod.entry_key(entries[0])

        with tempfile.TemporaryDirectory() as tmp:
            state_path = Path(tmp) / "seen.json"
            state = self.mod.load_seen_state(state_path)
            self.assertNotIn(key, state["seen"])

            self.mod.mark_seen(state, entries)
            self.mod.save_json(state_path, state)
            reloaded = self.mod.load_seen_state(state_path)

        self.assertIn(key, reloaded["seen"])

    def test_score_entry_rewards_technical_ai_content(self):
        entry = self.mod.parse_feed_xml(RSS, feed_id="rss", feed_title="Example RSS")[0]

        scored = self.mod.score_entry(entry, feed={"base_score": 8, "tags": ["must-read"]})

        self.assertGreaterEqual(scored["score"], 8)
        self.assertIn("ai_or_engineering_relevance", scored["score_reasons"])
        self.assertEqual(scored["noise_flags"], [])

    def test_evaluate_sources_recommends_keep_and_remove(self):
        registry = {
            "feeds": [
                {"id": "strong", "title": "Strong", "url": "https://example.com/strong", "base_score": 9, "enabled": True},
                {"id": "dead", "title": "Dead", "url": "https://example.com/dead", "base_score": 3, "enabled": True},
            ]
        }
        health = {
            "strong": {"failure_count": 0, "quality_avg": 8.5},
            "dead": {"failure_count": 5, "quality_avg": 2.0},
        }

        results = self.mod.evaluate_sources(registry, health)

        by_id = {item["id"]: item for item in results}
        self.assertEqual(by_id["strong"]["recommendation"], "keep")
        self.assertEqual(by_id["dead"]["recommendation"], "remove")

    def test_render_markdown_digest_orders_by_score(self):
        low = {"title": "Low", "link": "https://example.com/low", "feed_title": "Feed", "score": 5, "score_reasons": []}
        high = {"title": "High", "link": "https://example.com/high", "feed_title": "Feed", "score": 9, "score_reasons": ["ai_or_engineering_relevance"]}

        markdown = self.mod.render_markdown_digest([low, high], title="Test Digest")

        self.assertLess(markdown.index("High"), markdown.index("Low"))
        self.assertIn("## Test Digest", markdown)


if __name__ == "__main__":
    unittest.main()
