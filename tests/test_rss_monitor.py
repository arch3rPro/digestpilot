import importlib.util
import json
import tempfile
import unittest
from argparse import Namespace
from contextlib import redirect_stdout
from datetime import datetime, timezone
from io import StringIO
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

    def test_keyword_matching_is_token_aware_for_short_terms(self):
        entry = {
            "title": "Maintaining reliability",
            "summary": "A practical post about maintainability.",
            "author": "",
            "published_at": "2026-05-20T08:00:00+00:00",
            "feed_id": "test",
        }

        matched = self.mod.filter_entries([entry], keywords=["ai"])

        self.assertEqual(matched, [])

    def test_phrase_keyword_matching_and_locations(self):
        entry = {
            "title": "Reliable systems",
            "summary": "A post about LLM agents in production.",
            "author": "",
            "published_at": "2026-05-20T08:00:00+00:00",
            "feed_id": "test",
        }

        matched = self.mod.filter_entries([entry], keywords=["llm agents"])

        self.assertEqual(len(matched), 1)
        self.assertEqual(matched[0]["matched_keywords"], ["llm agents"])
        self.assertEqual(matched[0]["matched_keyword_locations"], {"llm agents": ["summary"]})

    def test_require_any_title_keyword_filters_summary_only_matches(self):
        title_match = {
            "title": "LLM agents in production",
            "summary": "A practical implementation note.",
            "author": "",
            "published_at": "2026-05-20T08:00:00+00:00",
            "feed_id": "test",
        }
        summary_only = {
            "title": "Production notes",
            "summary": "A practical implementation note about LLM agents.",
            "author": "",
            "published_at": "2026-05-20T08:00:00+00:00",
            "feed_id": "test",
        }

        matched = self.mod.filter_entries(
            [title_match, summary_only],
            keywords=["llm", "agents"],
            require_any_title_keyword=True,
        )

        self.assertEqual([entry["title"] for entry in matched], ["LLM agents in production"])

    def test_exclude_keywords_remove_matching_entries(self):
        useful = {
            "title": "LLM inference notes",
            "summary": "A practical benchmark writeup.",
            "author": "",
            "published_at": "2026-05-20T08:00:00+00:00",
            "feed_id": "test",
        }
        noisy = {
            "title": "LLM webinar announcement",
            "summary": "Join a marketing webinar.",
            "author": "",
            "published_at": "2026-05-20T08:00:00+00:00",
            "feed_id": "test",
        }

        matched = self.mod.filter_entries(
            [useful, noisy],
            keywords=["llm"],
            exclude_keywords=["webinar"],
        )

        self.assertEqual([entry["title"] for entry in matched], ["LLM inference notes"])

    def test_keyword_mode_all_requires_every_keyword(self):
        partial = {
            "title": "LLM production notes",
            "summary": "A practical implementation note.",
            "author": "",
            "published_at": "2026-05-20T08:00:00+00:00",
            "feed_id": "test",
        }
        complete = {
            "title": "LLM agent production notes",
            "summary": "A practical implementation note.",
            "author": "",
            "published_at": "2026-05-20T08:00:00+00:00",
            "feed_id": "test",
        }

        matched = self.mod.filter_entries([partial, complete], keywords=["llm", "agent"], keyword_mode="all")

        self.assertEqual([entry["title"] for entry in matched], ["LLM agent production notes"])

    def test_title_keyword_match_scores_higher_than_summary_only_match(self):
        title_match = {
            "title": "LLM agents in production",
            "summary": "A practical implementation note.",
            "published_at": "2026-05-20T08:00:00+00:00",
            "link": "https://example.com/title",
            "feed_id": "test",
            "matched_keywords": ["llm"],
            "matched_keyword_locations": {"llm": ["title"]},
        }
        summary_match = dict(title_match)
        summary_match["title"] = "Production notes"
        summary_match["summary"] = "A practical implementation note about LLM systems."
        summary_match["link"] = "https://example.com/summary"
        summary_match["matched_keyword_locations"] = {"llm": ["summary"]}

        title_score = self.mod.score_entry(title_match, feed={"base_score": 5})["score"]
        summary_score = self.mod.score_entry(summary_match, feed={"base_score": 5})["score"]

        self.assertGreater(title_score, summary_score)

    def test_import_opml_applies_source_metadata(self):
        metadata = {
            "simon-willison": {
                "base_score": 9,
                "language": "en",
                "tags": ["must-read", "llm"],
            }
        }

        feeds = self.mod.apply_source_metadata(self.mod.parse_opml(OPML), metadata)

        self.assertEqual(feeds[0]["base_score"], 9)
        self.assertEqual(feeds[0]["language"], "en")
        self.assertEqual(feeds[0]["tags"], ["must-read", "llm"])

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

    def test_evaluate_sources_marks_missing_health_as_unknown_watch(self):
        registry = {"feeds": [{"id": "new", "title": "New", "url": "https://example.com/new", "base_score": 5, "enabled": True}]}

        result = self.mod.evaluate_sources(registry, health={})[0]

        self.assertEqual(result["status"], "unknown")
        self.assertEqual(result["recommendation"], "watch")
        self.assertIn("No health data", result["recommendation_reason"])

    def test_evaluate_sources_exposes_failing_status_and_last_error(self):
        registry = {"feeds": [{"id": "bad", "title": "Bad", "url": "https://example.com/bad", "base_score": 6, "enabled": True}]}
        health = {"bad": {"failure_count": 4, "success_count": 0, "last_error": "network denied"}}

        result = self.mod.evaluate_sources(registry, health=health)[0]

        self.assertEqual(result["status"], "failing")
        self.assertIn(result["recommendation"], {"lower-priority", "remove"})
        self.assertEqual(result["last_error"], "network denied")
        self.assertIn("Repeated failures", result["recommendation_reason"])

    def test_evaluate_sources_marks_healthy_high_quality_source_keep(self):
        registry = {"feeds": [{"id": "strong", "title": "Strong", "url": "https://example.com/strong", "base_score": 9, "enabled": True}]}
        health = {"strong": {"failure_count": 0, "success_count": 5, "quality_avg": 8.5, "status": "healthy"}}

        result = self.mod.evaluate_sources(registry, health=health)[0]

        self.assertEqual(result["status"], "healthy")
        self.assertEqual(result["recommendation"], "keep")
        self.assertIn("High quality", result["recommendation_reason"])

    def test_render_markdown_digest_orders_by_score(self):
        low = {"title": "Low", "link": "https://example.com/low", "feed_title": "Feed", "score": 5, "score_reasons": []}
        high = {"title": "High", "link": "https://example.com/high", "feed_title": "Feed", "score": 9, "score_reasons": ["ai_or_engineering_relevance"]}

        markdown = self.mod.render_markdown_digest([low, high], title="Test Digest")

        self.assertLess(markdown.index("High"), markdown.index("Low"))
        self.assertIn("## Test Digest", markdown)

    def test_digest_json_envelope_includes_failures_health_and_stats(self):
        entry = self.mod.parse_feed_xml(RSS, feed_id="rss", feed_title="Example RSS")[0]
        registry = {
            "feeds": [
                {"id": "rss", "title": "Example RSS", "url": "https://example.com/rss", "base_score": 8, "enabled": True},
                {"id": "broken", "title": "Broken Feed", "url": "https://example.com/broken", "base_score": 5, "enabled": True},
            ]
        }
        current_health = {
            "rss": {"last_success_at": "2026-05-20T08:00:00+00:00", "failure_count": 0, "last_item_at": entry["published_at"]},
            "broken": {"last_error_at": "2026-05-20T08:01:00+00:00", "failure_count": 1, "error": "Operation not permitted"},
        }

        with tempfile.TemporaryDirectory() as tmp:
            registry_path = Path(tmp) / "feeds.json"
            state_path = Path(tmp) / "seen.json"
            self.mod.save_json(registry_path, registry)
            original_fetch_entries = self.mod.fetch_entries
            self.mod.fetch_entries = lambda loaded_registry, timeout=20, max_workers=8: ([entry], current_health)
            try:
                output = StringIO()
                with redirect_stdout(output):
                    self.mod.command_digest(
                        Namespace(
                            registry=str(registry_path),
                            state=str(state_path),
                            health=None,
                            since="24h",
                            keywords="agents",
                            author=None,
                            category=None,
                            language=None,
                            format="json",
                            min_score=7,
                            mark_seen="reported-only",
                        )
                    )
            finally:
                self.mod.fetch_entries = original_fetch_entries

        payload = json.loads(output.getvalue())
        self.assertEqual(set(payload.keys()), {"entries", "failures", "generated_at", "health", "stats"})
        self.assertEqual(len(payload["entries"]), 1)
        self.assertEqual(payload["failures"][0]["id"], "broken")
        self.assertEqual(payload["failures"][0]["error"], "Operation not permitted")
        self.assertEqual(payload["stats"]["feeds_total"], 2)
        self.assertEqual(payload["stats"]["feeds_failed"], 1)
        self.assertEqual(payload["stats"]["entries_reported"], 1)

    def test_digest_persists_merged_health_when_health_path_is_set(self):
        entry = self.mod.parse_feed_xml(RSS, feed_id="rss", feed_title="Example RSS")[0]
        registry = {
            "feeds": [
                {"id": "rss", "title": "Example RSS", "url": "https://example.com/rss", "base_score": 8, "enabled": True},
                {"id": "broken", "title": "Broken Feed", "url": "https://example.com/broken", "base_score": 5, "enabled": True},
            ]
        }
        current_health = {
            "rss": {"last_success_at": "2026-05-20T08:00:00+00:00", "failure_count": 0, "last_item_at": entry["published_at"]},
            "broken": {"last_error_at": "2026-05-20T08:01:00+00:00", "failure_count": 1, "error": "Operation not permitted"},
        }

        with tempfile.TemporaryDirectory() as tmp:
            registry_path = Path(tmp) / "feeds.json"
            state_path = Path(tmp) / "seen.json"
            health_path = Path(tmp) / "source-health.json"
            self.mod.save_json(registry_path, registry)
            self.mod.save_json(health_path, {"broken": {"failure_count": 2, "success_count": 0, "last_error": "timeout"}})
            original_fetch_entries = self.mod.fetch_entries
            self.mod.fetch_entries = lambda loaded_registry, timeout=20, max_workers=8: ([entry], current_health)
            try:
                with redirect_stdout(StringIO()):
                    self.mod.command_digest(
                        Namespace(
                            registry=str(registry_path),
                            state=str(state_path),
                            health=str(health_path),
                            since="24h",
                            keywords="agents",
                            author=None,
                            category=None,
                            language=None,
                            format="json",
                            min_score=7,
                            mark_seen="reported-only",
                        )
                    )
            finally:
                self.mod.fetch_entries = original_fetch_entries
            saved_health = self.mod.load_json(health_path, {})

        self.assertEqual(saved_health["rss"]["success_count"], 1)
        self.assertEqual(saved_health["rss"]["failure_count"], 0)
        self.assertEqual(saved_health["broken"]["failure_count"], 3)
        self.assertEqual(saved_health["broken"]["last_error"], "Operation not permitted")

    def test_reported_only_mark_seen_policy_marks_only_reported_entries(self):
        high = self.mod.parse_feed_xml(RSS, feed_id="rss", feed_title="Example RSS")[0]
        low = dict(high)
        low["title"] = "General notes about teams"
        low["link"] = "https://example.com/low"
        low["summary"] = "Light commentary about process."
        registry = {"feeds": [{"id": "rss", "title": "Example RSS", "url": "https://example.com/rss", "base_score": 5, "enabled": True}]}

        with tempfile.TemporaryDirectory() as tmp:
            registry_path = Path(tmp) / "feeds.json"
            state_path = Path(tmp) / "seen.json"
            self.mod.save_json(registry_path, registry)
            original_fetch_entries = self.mod.fetch_entries
            self.mod.fetch_entries = lambda loaded_registry, timeout=20, max_workers=8: (
                [high, low],
                {"rss": {"last_success_at": "2026-05-20T08:00:00+00:00", "failure_count": 0}},
            )
            try:
                with redirect_stdout(StringIO()):
                    self.mod.command_digest(
                        Namespace(
                            registry=str(registry_path),
                            state=str(state_path),
                            health=None,
                            since="24h",
                            keywords="",
                            author=None,
                            category=None,
                            language=None,
                            format="json",
                            min_score=7,
                            mark_seen="reported-only",
                        )
                    )
            finally:
                self.mod.fetch_entries = original_fetch_entries
            state = self.mod.load_seen_state(state_path)

        self.assertIn(self.mod.entry_key(high), state["seen"])
        self.assertNotIn(self.mod.entry_key(low), state["seen"])

    def test_none_mark_seen_policy_does_not_update_seen_state(self):
        entry = self.mod.parse_feed_xml(RSS, feed_id="rss", feed_title="Example RSS")[0]
        registry = {"feeds": [{"id": "rss", "title": "Example RSS", "url": "https://example.com/rss", "base_score": 8, "enabled": True}]}

        with tempfile.TemporaryDirectory() as tmp:
            registry_path = Path(tmp) / "feeds.json"
            state_path = Path(tmp) / "seen.json"
            self.mod.save_json(registry_path, registry)
            original_fetch_entries = self.mod.fetch_entries
            self.mod.fetch_entries = lambda loaded_registry, timeout=20, max_workers=8: (
                [entry],
                {"rss": {"last_success_at": "2026-05-20T08:00:00+00:00", "failure_count": 0}},
            )
            try:
                with redirect_stdout(StringIO()):
                    self.mod.command_digest(
                        Namespace(
                            registry=str(registry_path),
                            state=str(state_path),
                            health=None,
                            since="24h",
                            keywords="agents",
                            author=None,
                            category=None,
                            language=None,
                            format="json",
                            min_score=7,
                            mark_seen="none",
                        )
                    )
            finally:
                self.mod.fetch_entries = original_fetch_entries
            state = self.mod.load_seen_state(state_path)

        self.assertEqual(state["seen"], {})

    def test_markdown_digest_result_renders_failed_feeds_section(self):
        markdown = self.mod.render_markdown_digest_result(
            {
                "entries": [],
                "failures": [
                    {
                        "id": "broken",
                        "title": "Broken Feed",
                        "url": "https://example.com/broken",
                        "error": "Operation not permitted",
                    }
                ],
                "health": {},
                "stats": {"feeds_total": 1, "feeds_success": 0, "feeds_failed": 1, "entries_reported": 0},
                "generated_at": "2026-05-20T08:00:00+00:00",
            },
            title="Test Digest",
        )

        self.assertIn("## Test Digest", markdown)
        self.assertIn("No matching entries found.", markdown)
        self.assertIn("### Failed feeds", markdown)
        self.assertIn("Broken Feed", markdown)

    def test_concurrent_fetch_matches_serial_fetch_for_controlled_feeds(self):
        registry = {
            "feeds": [
                {"id": "b-feed", "title": "B Feed", "url": "https://example.com/b", "enabled": True},
                {"id": "a-feed", "title": "A Feed", "url": "https://example.com/a", "enabled": True},
            ]
        }
        xml_by_url = {
            "https://example.com/a": RSS.replace("https://example.com/agents", "https://example.com/a-entry"),
            "https://example.com/b": RSS.replace("https://example.com/agents", "https://example.com/b-entry"),
        }
        original_fetch_url = self.mod.fetch_url
        self.mod.fetch_url = lambda url, timeout=20: xml_by_url[url]
        try:
            serial_entries, serial_health = self.mod.fetch_entries(registry, timeout=5, max_workers=1)
            concurrent_entries, concurrent_health = self.mod.fetch_entries(registry, timeout=5, max_workers=4)
        finally:
            self.mod.fetch_url = original_fetch_url

        self.assertEqual([entry["link"] for entry in serial_entries], [entry["link"] for entry in concurrent_entries])
        self.assertEqual(set(serial_health.keys()), {"a-feed", "b-feed"})
        self.assertEqual(set(concurrent_health.keys()), {"a-feed", "b-feed"})

    def test_concurrent_fetch_isolates_feed_failures(self):
        registry = {
            "feeds": [
                {"id": "good", "title": "Good", "url": "https://example.com/good", "enabled": True},
                {"id": "bad", "title": "Bad", "url": "https://example.com/bad", "enabled": True},
            ]
        }

        def fake_fetch_url(url, timeout=20):
            if url.endswith("/bad"):
                raise OSError("network denied")
            return RSS

        original_fetch_url = self.mod.fetch_url
        self.mod.fetch_url = fake_fetch_url
        try:
            entries, health = self.mod.fetch_entries(registry, timeout=5, max_workers=2)
        finally:
            self.mod.fetch_url = original_fetch_url

        self.assertEqual(len(entries), 1)
        self.assertEqual(health["good"]["failure_count"], 0)
        self.assertEqual(health["bad"]["failure_count"], 1)
        self.assertIn("network denied", health["bad"]["error"])

    def test_scored_entries_have_deterministic_order(self):
        older = {
            "title": "Older",
            "link": "https://example.com/older",
            "feed_id": "z-feed",
            "published_at": "2026-05-19T08:00:00+00:00",
            "score": 8,
        }
        newer = {
            "title": "Newer",
            "link": "https://example.com/newer",
            "feed_id": "z-feed",
            "published_at": "2026-05-20T08:00:00+00:00",
            "score": 8,
        }
        higher = {
            "title": "Higher",
            "link": "https://example.com/higher",
            "feed_id": "a-feed",
            "published_at": "2026-05-18T08:00:00+00:00",
            "score": 9,
        }

        sorted_entries = self.mod.sort_scored_entries([older, newer, higher])

        self.assertEqual([entry["title"] for entry in sorted_entries], ["Higher", "Newer", "Older"])


if __name__ == "__main__":
    unittest.main()
