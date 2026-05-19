#!/usr/bin/env python3
"""Portable RSS/Atom monitor for the rss-ai-digest skill."""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
import urllib.request
from copy import deepcopy
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from typing import Any
from xml.etree import ElementTree as ET


AI_TERMS = {
    "ai",
    "agent",
    "agents",
    "llm",
    "rag",
    "model",
    "models",
    "transformer",
    "transformers",
    "inference",
    "eval",
    "evals",
    "benchmark",
    "reasoning",
}

ENGINEERING_TERMS = {
    "architecture",
    "debugging",
    "engineering",
    "infrastructure",
    "open-source",
    "opensource",
    "production",
    "reliability",
    "scaling",
    "system",
    "systems",
}

NOISE_TERMS = {
    "sponsor",
    "sponsored",
    "hiring",
    "job",
    "webinar",
    "coupon",
    "deal",
    "press release",
}


def local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1].lower()


def child_text(element: ET.Element, names: set[str]) -> str:
    for child in list(element):
        if local_name(child.tag) in names and child.text:
            return child.text.strip()
    return ""


def descendants(element: ET.Element, name: str) -> list[ET.Element]:
    return [node for node in element.iter() if local_name(node.tag) == name]


def parse_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    text = value.strip()
    try:
        parsed = parsedate_to_datetime(text)
    except (TypeError, ValueError, IndexError):
        parsed = None
    if parsed is None:
        try:
            parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
        except ValueError:
            return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def parse_since(value: str | None) -> datetime | None:
    if not value:
        return None
    text = value.strip().lower()
    now = datetime.now(timezone.utc)
    if text.endswith("h") and text[:-1].isdigit():
        return now - timedelta(hours=int(text[:-1]))
    if text.endswith("d") and text[:-1].isdigit():
        return now - timedelta(days=int(text[:-1]))
    return parse_datetime(value)


def parse_keyword_csv(value: str | None) -> list[str]:
    if not value:
        return []
    return [item.strip().lower() for item in value.split(",") if item.strip()]


def parse_opml(opml_text: str) -> list[dict[str, Any]]:
    root = ET.fromstring(opml_text)
    feeds: list[dict[str, Any]] = []
    seen_urls: set[str] = set()
    for outline in descendants(root, "outline"):
        url = outline.attrib.get("xmlUrl") or outline.attrib.get("xmlurl")
        if not url or url in seen_urls:
            continue
        title = outline.attrib.get("title") or outline.attrib.get("text") or url
        feed_id = slugify(title)
        feeds.append(
            {
                "id": feed_id,
                "title": title,
                "url": url,
                "category": [],
                "language": "",
                "base_score": 5,
                "tags": [],
                "enabled": True,
            }
        )
        seen_urls.add(url)
    return feeds


def parse_feed_xml(xml_text: str, feed_id: str, feed_title: str = "") -> list[dict[str, Any]]:
    root = ET.fromstring(xml_text)
    root_name = local_name(root.tag)
    if root_name == "rss":
        return parse_rss(root, feed_id, feed_title)
    if root_name == "feed":
        return parse_atom(root, feed_id, feed_title)
    raise ValueError(f"Unsupported feed root: {root.tag}")


def parse_rss(root: ET.Element, feed_id: str, feed_title: str = "") -> list[dict[str, Any]]:
    channel = next((child for child in list(root) if local_name(child.tag) == "channel"), root)
    title = feed_title or child_text(channel, {"title"}) or feed_id
    entries = []
    for item in [child for child in list(channel) if local_name(child.tag) == "item"]:
        published = parse_datetime(child_text(item, {"pubdate", "published", "updated", "date"}))
        entries.append(
            normalize_entry(
                {
                    "title": child_text(item, {"title"}),
                    "link": child_text(item, {"link"}),
                    "guid": child_text(item, {"guid", "id"}),
                    "author": child_text(item, {"author", "creator"}),
                    "published_at": published.isoformat() if published else "",
                    "summary": child_text(item, {"description", "summary", "content"}),
                    "feed_id": feed_id,
                    "feed_title": title,
                }
            )
        )
    return entries


def parse_atom(root: ET.Element, feed_id: str, feed_title: str = "") -> list[dict[str, Any]]:
    title = feed_title or child_text(root, {"title"}) or feed_id
    entries = []
    for entry in [child for child in list(root) if local_name(child.tag) == "entry"]:
        link = ""
        for child in list(entry):
            if local_name(child.tag) == "link":
                rel = child.attrib.get("rel", "alternate")
                if rel == "alternate" or not link:
                    link = child.attrib.get("href", link)
        author = ""
        for child in list(entry):
            if local_name(child.tag) == "author":
                author = child_text(child, {"name"}) or (child.text or "").strip()
        published = parse_datetime(child_text(entry, {"published", "updated"}))
        entries.append(
            normalize_entry(
                {
                    "title": child_text(entry, {"title"}),
                    "link": link,
                    "guid": child_text(entry, {"id"}),
                    "author": author,
                    "published_at": published.isoformat() if published else "",
                    "summary": child_text(entry, {"summary", "content"}),
                    "feed_id": feed_id,
                    "feed_title": title,
                }
            )
        )
    return entries


def normalize_entry(entry: dict[str, Any]) -> dict[str, Any]:
    normalized = {
        "title": entry.get("title", "").strip(),
        "link": entry.get("link", "").strip(),
        "guid": entry.get("guid", "").strip(),
        "author": entry.get("author", "").strip(),
        "published_at": entry.get("published_at", ""),
        "summary": entry.get("summary", "").strip(),
        "feed_id": entry.get("feed_id", ""),
        "feed_title": entry.get("feed_title", ""),
        "matched_keywords": entry.get("matched_keywords", []),
    }
    return normalized


def load_json(path: str | Path, default: Any) -> Any:
    file_path = Path(path)
    if not file_path.exists():
        return deepcopy(default)
    with file_path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def save_json(path: str | Path, data: Any) -> None:
    file_path = Path(path)
    file_path.parent.mkdir(parents=True, exist_ok=True)
    with file_path.open("w", encoding="utf-8") as handle:
        json.dump(data, handle, ensure_ascii=False, indent=2, sort_keys=True)
        handle.write("\n")


def load_registry(path: str | Path) -> dict[str, Any]:
    registry = load_json(path, {"feeds": []})
    registry.setdefault("feeds", [])
    return registry


def load_seen_state(path: str | Path) -> dict[str, Any]:
    state = load_json(path, {"seen": {}})
    state.setdefault("seen", {})
    return state


def entry_key(entry: dict[str, Any]) -> str:
    if entry.get("link"):
        basis = f"link:{entry['link']}"
    elif entry.get("guid"):
        basis = f"guid:{entry.get('feed_id', '')}:{entry['guid']}"
    else:
        basis = f"title:{entry.get('feed_id', '')}:{entry.get('title', '').lower()}:{entry.get('published_at', '')}"
    return hashlib.sha256(basis.encode("utf-8")).hexdigest()


def mark_seen(state: dict[str, Any], entries: list[dict[str, Any]]) -> None:
    seen = state.setdefault("seen", {})
    now = datetime.now(timezone.utc).isoformat()
    for entry in entries:
        key = entry_key(entry)
        seen.setdefault(
            key,
            {
                "first_seen_at": now,
                "feed_id": entry.get("feed_id", ""),
                "title": entry.get("title", ""),
            },
        )


def is_seen(state: dict[str, Any], entry: dict[str, Any]) -> bool:
    return entry_key(entry) in state.get("seen", {})


def filter_entries(
    entries: list[dict[str, Any]],
    keywords: list[str] | None = None,
    author: str | None = None,
    since: datetime | None = None,
    category: str | None = None,
    language: str | None = None,
    feed_lookup: dict[str, dict[str, Any]] | None = None,
) -> list[dict[str, Any]]:
    feed_lookup = feed_lookup or {}
    normalized_keywords = [keyword.lower() for keyword in (keywords or [])]
    author_filter = author.lower() if author else ""
    results = []
    for entry in entries:
        feed = feed_lookup.get(entry.get("feed_id", ""), {})
        haystack = f"{entry.get('title', '')} {entry.get('summary', '')}".lower()
        matched_keywords = [keyword for keyword in normalized_keywords if keyword in haystack]
        if normalized_keywords and not matched_keywords:
            continue
        if author_filter and author_filter not in entry.get("author", "").lower():
            continue
        published = parse_datetime(entry.get("published_at"))
        if since and published and published < since:
            continue
        if since and not published:
            continue
        if category and category not in feed.get("category", []):
            continue
        if language and feed.get("language") and language != feed.get("language"):
            continue
        item = dict(entry)
        item["matched_keywords"] = matched_keywords
        results.append(item)
    return results


def score_entry(entry: dict[str, Any], feed: dict[str, Any] | None = None) -> dict[str, Any]:
    feed = feed or {}
    score = int(feed.get("base_score", 5) or 5)
    reasons: list[str] = []
    noise_flags: list[str] = []
    text = f"{entry.get('title', '')} {entry.get('summary', '')}".lower()
    tokens = {token.strip(".,:;!?()[]{}\"'").lower() for token in text.replace("/", " ").split()}

    if AI_TERMS & tokens:
        score += 2
        reasons.append("ai_or_engineering_relevance")
    if ENGINEERING_TERMS & tokens:
        score += 1
        if "ai_or_engineering_relevance" not in reasons:
            reasons.append("ai_or_engineering_relevance")
        reasons.append("technical_depth_signal")
    if any(tag == "must-read" for tag in feed.get("tags", [])):
        score += 1
        reasons.append("trusted_source")
    if parse_datetime(entry.get("published_at")):
        score += 1
        reasons.append("has_publication_date")
    for noise in NOISE_TERMS:
        if noise in text:
            score -= 2
            noise_flags.append(noise.replace(" ", "_"))
    if not entry.get("link") or not entry.get("title"):
        score -= 2
        noise_flags.append("missing_core_metadata")

    scored = dict(entry)
    scored["score"] = max(0, min(10, score))
    scored["score_reasons"] = reasons
    scored["noise_flags"] = noise_flags
    return scored


def evaluate_sources(registry: dict[str, Any], health: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    health = health or {}
    results = []
    for feed in registry.get("feeds", []):
        feed_id = feed.get("id") or slugify(feed.get("title", feed.get("url", "feed")))
        item_health = health.get(feed_id, {})
        base_score = int(feed.get("base_score", 5) or 5)
        score = base_score
        failure_count = int(item_health.get("failure_count", 0) or 0)
        quality_avg = float(item_health.get("quality_avg", base_score) or base_score)
        score += round((quality_avg - 5) * 0.7)
        score -= min(4, failure_count)
        tags = set(feed.get("tags", []))
        if "must-read" in tags:
            score += 1
        if "noisy" in tags:
            score -= 2
        if "deprecated" in tags:
            score -= 4
        final_score = max(0, min(10, int(score)))
        if final_score >= 8 and failure_count <= 1:
            recommendation = "keep"
        elif final_score >= 6:
            recommendation = "watch"
        elif final_score >= 4:
            recommendation = "lower-priority"
        else:
            recommendation = "remove"
        results.append(
            {
                "id": feed_id,
                "title": feed.get("title", feed_id),
                "url": feed.get("url", ""),
                "score": final_score,
                "failure_count": failure_count,
                "quality_avg": quality_avg,
                "recommendation": recommendation,
            }
        )
    return sorted(results, key=lambda item: item["score"], reverse=True)


def render_markdown_digest(entries: list[dict[str, Any]], title: str = "RSS AI Digest") -> str:
    lines = [f"## {title}", ""]
    ranked = sorted(entries, key=lambda item: item.get("score", 0), reverse=True)
    if not ranked:
        lines.append("No matching entries found.")
        return "\n".join(lines) + "\n"
    for index, entry in enumerate(ranked, start=1):
        reasons = ", ".join(entry.get("score_reasons", [])) or "matched filters"
        lines.append(f"{index}. [{entry.get('title', 'Untitled')}]({entry.get('link', '')})")
        lines.append(f"   - Score: {entry.get('score', 0)}/10")
        lines.append(f"   - Source: {entry.get('feed_title') or entry.get('feed_id', '')}")
        if entry.get("author"):
            lines.append(f"   - Author: {entry['author']}")
        lines.append(f"   - Reason: {reasons}")
    return "\n".join(lines) + "\n"


def render_json(data: Any) -> str:
    return json.dumps(data, ensure_ascii=False, indent=2, sort_keys=True) + "\n"


def slugify(value: str) -> str:
    chars = []
    previous_dash = False
    for char in value.lower():
        if char.isalnum():
            chars.append(char)
            previous_dash = False
        elif not previous_dash:
            chars.append("-")
            previous_dash = True
    slug = "".join(chars).strip("-")
    return slug or "feed"


def fetch_url(url: str, timeout: int = 20) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": "rss-ai-digest/0.1"})
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return response.read().decode(response.headers.get_content_charset() or "utf-8", errors="replace")


def fetch_entries(registry: dict[str, Any]) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    health: dict[str, Any] = {}
    for feed in registry.get("feeds", []):
        if not feed.get("enabled", True):
            continue
        feed_id = feed.get("id") or slugify(feed.get("title", feed.get("url", "feed")))
        try:
            xml_text = fetch_url(feed["url"])
            feed_entries = parse_feed_xml(xml_text, feed_id=feed_id, feed_title=feed.get("title", feed_id))
            entries.extend(feed_entries)
            last_item_at = max((entry.get("published_at", "") for entry in feed_entries), default="")
            health[feed_id] = {
                "last_success_at": datetime.now(timezone.utc).isoformat(),
                "failure_count": 0,
                "last_item_at": last_item_at,
            }
        except Exception as exc:  # noqa: BLE001 - CLI should report per-feed failures.
            health[feed_id] = {
                "last_error_at": datetime.now(timezone.utc).isoformat(),
                "failure_count": 1,
                "error": str(exc),
            }
    return entries, health


def score_entries(entries: list[dict[str, Any]], registry: dict[str, Any]) -> list[dict[str, Any]]:
    feed_lookup = {feed.get("id"): feed for feed in registry.get("feeds", [])}
    return [score_entry(entry, feed_lookup.get(entry.get("feed_id", ""), {})) for entry in entries]


def command_import_opml(args: argparse.Namespace) -> int:
    feeds = parse_opml(Path(args.opml).read_text(encoding="utf-8"))
    registry = {"feeds": feeds}
    save_json(args.registry, registry)
    print(render_json(registry), end="")
    return 0


def command_fetch(args: argparse.Namespace) -> int:
    registry = load_registry(args.registry)
    entries, health = fetch_entries(registry)
    payload = {"entries": entries, "health": health}
    print(render_json(payload) if args.format == "json" else render_markdown_digest(entries, "Fetched RSS Entries"), end="")
    return 0


def command_digest(args: argparse.Namespace) -> int:
    registry = load_registry(args.registry)
    state = load_seen_state(args.state)
    entries, _health = fetch_entries(registry)
    feed_lookup = {feed.get("id"): feed for feed in registry.get("feeds", [])}
    filtered = filter_entries(
        entries,
        keywords=parse_keyword_csv(args.keywords),
        author=args.author,
        since=parse_since(args.since),
        category=args.category,
        language=args.language,
        feed_lookup=feed_lookup,
    )
    new_entries = [entry for entry in filtered if not is_seen(state, entry)]
    scored = [entry for entry in score_entries(new_entries, registry) if entry.get("score", 0) >= args.min_score]
    mark_seen(state, new_entries)
    save_json(args.state, state)
    print(render_json(scored) if args.format == "json" else render_markdown_digest(scored), end="")
    return 0


def command_check_new(args: argparse.Namespace) -> int:
    args.min_score = getattr(args, "min_score", 0)
    return command_digest(args)


def command_evaluate_sources(args: argparse.Namespace) -> int:
    registry = load_registry(args.registry)
    health = load_json(args.health, {}) if args.health else {}
    results = evaluate_sources(registry, health)
    print(render_json(results), end="")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Monitor and score AI/technical RSS feeds.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    import_opml = subparsers.add_parser("import-opml", help="Import OPML subscriptions into a registry JSON file.")
    import_opml.add_argument("--opml", required=True)
    import_opml.add_argument("--registry", required=True)
    import_opml.set_defaults(func=command_import_opml)

    fetch = subparsers.add_parser("fetch", help="Fetch enabled feeds and output raw normalized entries.")
    fetch.add_argument("--registry", required=True)
    fetch.add_argument("--format", choices=["json", "markdown"], default="json")
    fetch.set_defaults(func=command_fetch)

    digest = subparsers.add_parser("digest", help="Fetch, filter, score, dedupe, and render a digest.")
    add_digest_args(digest)
    digest.add_argument("--min-score", type=int, default=7)
    digest.set_defaults(func=command_digest)

    check_new = subparsers.add_parser("check-new", help="Fetch and report new matching entries.")
    add_digest_args(check_new)
    check_new.set_defaults(func=command_check_new)

    evaluate = subparsers.add_parser("evaluate-sources", help="Evaluate source quality from registry and health JSON.")
    evaluate.add_argument("--registry", required=True)
    evaluate.add_argument("--health")
    evaluate.set_defaults(func=command_evaluate_sources)
    return parser


def add_digest_args(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--registry", required=True)
    parser.add_argument("--state", required=True)
    parser.add_argument("--since", default="24h")
    parser.add_argument("--keywords", default="")
    parser.add_argument("--author")
    parser.add_argument("--category")
    parser.add_argument("--language")
    parser.add_argument("--format", choices=["json", "markdown"], default="markdown")


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
