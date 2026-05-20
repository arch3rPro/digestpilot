#!/usr/bin/env python3
"""Portable RSS/Atom monitor for the rss-ai-digest skill."""

from __future__ import annotations

import argparse
import concurrent.futures
import hashlib
import json
import re
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

AI_STRICT_KEYWORDS = "agent,llm,rag,ai,model,inference,evals,benchmark"
AI_STRICT_EXCLUDE_KEYWORDS = "webinar,coupon,sponsor,sponsored,hiring,job,press release"


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


def apply_filter_preset(args: argparse.Namespace) -> argparse.Namespace:
    preset = getattr(args, "preset", "none")
    if preset == "none":
        return args
    if preset != "ai-strict":
        raise ValueError(f"Unsupported preset: {preset}")
    if not getattr(args, "keywords", ""):
        args.keywords = AI_STRICT_KEYWORDS
    if not getattr(args, "exclude_keywords", ""):
        args.exclude_keywords = AI_STRICT_EXCLUDE_KEYWORDS
    args.require_any_title_keyword = True
    return args


def text_tokens(value: str) -> set[str]:
    return set(re.findall(r"[a-z0-9]+", value.lower()))


def keyword_locations(entry: dict[str, Any], keyword: str) -> list[str]:
    keyword = keyword.lower().strip()
    if not keyword:
        return []
    locations = []
    for field in ("title", "summary"):
        text = entry.get(field, "").lower()
        if " " in keyword:
            if keyword in text:
                locations.append(field)
        elif keyword in text_tokens(text):
            locations.append(field)
    return locations


def parse_opml(opml_text: str) -> list[dict[str, Any]]:
    root = ET.fromstring(opml_text)
    feeds: list[dict[str, Any]] = []
    seen_urls: set[str] = set()
    body = next((node for node in root.iter() if local_name(node.tag) == "body"), root)

    def walk(outline: ET.Element, categories: list[str]) -> None:
        url = outline.attrib.get("xmlUrl") or outline.attrib.get("xmlurl")
        title = outline.attrib.get("title") or outline.attrib.get("text") or url or ""
        if url and url not in seen_urls:
            feed_id = slugify(title)
            feeds.append(
                {
                    "id": feed_id,
                    "title": title,
                    "url": url,
                    "category": categories,
                    "language": "",
                    "base_score": 5,
                    "tags": [],
                    "enabled": True,
                }
            )
            seen_urls.add(url)
        child_categories = categories if url else categories + ([title] if title else [])
        for child in [node for node in list(outline) if local_name(node.tag) == "outline"]:
            walk(child, child_categories)

    for outline in [node for node in list(body) if local_name(node.tag) == "outline"]:
        walk(outline, [])
    return feeds


def apply_source_metadata(feeds: list[dict[str, Any]], metadata: dict[str, Any]) -> list[dict[str, Any]]:
    enriched = []
    for feed in feeds:
        item = dict(feed)
        overrides = metadata.get(item.get("id"), {})
        for key in ("base_score", "language", "tags"):
            if key in overrides:
                item[key] = overrides[key]
        enriched.append(item)
    return enriched


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
    exclude_keywords: list[str] | None = None,
    keyword_mode: str = "any",
    require_any_title_keyword: bool = False,
    author: str | None = None,
    since: datetime | None = None,
    category: str | None = None,
    language: str | None = None,
    feed_lookup: dict[str, dict[str, Any]] | None = None,
) -> list[dict[str, Any]]:
    feed_lookup = feed_lookup or {}
    normalized_keywords = [keyword.lower() for keyword in (keywords or [])]
    normalized_exclude_keywords = [keyword.lower() for keyword in (exclude_keywords or [])]
    author_filter = author.lower() if author else ""
    results = []
    for entry in entries:
        feed = feed_lookup.get(entry.get("feed_id", ""), {})
        if any(keyword_locations(entry, keyword) for keyword in normalized_exclude_keywords):
            continue
        matched_locations = {
            keyword: locations
            for keyword in normalized_keywords
            if (locations := keyword_locations(entry, keyword))
        }
        matched_keywords = list(matched_locations.keys())
        if normalized_keywords and keyword_mode == "all" and len(matched_keywords) != len(normalized_keywords):
            continue
        if normalized_keywords and keyword_mode == "any" and not matched_keywords:
            continue
        if keyword_mode not in {"any", "all"}:
            raise ValueError(f"Unsupported keyword mode: {keyword_mode}")
        if (
            require_any_title_keyword
            and normalized_keywords
            and not any("title" in locations for locations in matched_locations.values())
        ):
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
        item["matched_keyword_locations"] = matched_locations
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
    locations = entry.get("matched_keyword_locations", {})
    if any("title" in fields for fields in locations.values()):
        score += 1
        reasons.append("title_keyword_match")
    elif locations and all("summary" in fields and "title" not in fields for fields in locations.values()):
        score -= 1
        reasons.append("summary_only_keyword_match")
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
        has_health = feed_id in health
        failure_count = int(item_health.get("failure_count", 0) or 0)
        success_count = int(item_health.get("success_count", 0) or 0)
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
        last_error = item_health.get("last_error") or item_health.get("error", "")
        if not has_health:
            status = "unknown"
            recommendation = "watch"
            recommendation_reason = "No health data yet; observe this source before changing priority."
        elif failure_count >= 3 and success_count == 0:
            status = "failing"
            recommendation = "remove" if final_score < 5 else "lower-priority"
            recommendation_reason = "Repeated failures without successful fetches."
        elif failure_count > success_count and failure_count >= 2:
            status = "degraded"
            recommendation = "lower-priority"
            recommendation_reason = "More failures than successful fetches."
        elif final_score >= 8 and failure_count <= 1:
            status = "healthy"
            recommendation = "keep"
            recommendation_reason = "High quality and currently healthy."
        elif final_score >= 6:
            status = "healthy" if failure_count == 0 else "degraded"
            recommendation = "watch"
            recommendation_reason = "Useful source with moderate quality or limited history."
        elif final_score >= 4:
            status = "degraded" if failure_count else "healthy"
            recommendation = "lower-priority"
            recommendation_reason = "Relevant but noisy, low-priority, or inconsistent."
        else:
            status = "degraded" if failure_count else "healthy"
            recommendation = "remove"
            recommendation_reason = "Consistently low source score."
        results.append(
            {
                "id": feed_id,
                "title": feed.get("title", feed_id),
                "url": feed.get("url", ""),
                "enabled": feed.get("enabled", True),
                "score": final_score,
                "status": status,
                "failure_count": failure_count,
                "success_count": success_count,
                "quality_avg": quality_avg,
                "recommendation": recommendation,
                "recommendation_reason": recommendation_reason,
                "last_error": last_error,
            }
        )
    return sorted(results, key=lambda item: (-int(item["score"]), item["id"]))


def curate_sources(registry: dict[str, Any], health: dict[str, Any] | None = None) -> dict[str, Any]:
    actions = []
    for item in evaluate_sources(registry, health):
        patch: dict[str, Any] = {}
        if item["status"] == "failing" and item["failure_count"] >= 3 and item["success_count"] == 0:
            action = "disable"
            patch = {"id": item["id"], "set": {"enabled": False}}
        elif item["recommendation"] == "remove":
            action = "remove"
            patch = {"id": item["id"], "remove": True}
        elif item["recommendation"] == "lower-priority":
            action = "lower-priority"
        elif item["recommendation"] == "keep":
            action = "keep"
        else:
            action = "watch"
        actions.append(
            {
                "id": item["id"],
                "title": item["title"],
                "url": item["url"],
                "action": action,
                "status": item["status"],
                "score": item["score"],
                "reason": item["recommendation_reason"],
                "last_error": item["last_error"],
                "registry_patch": patch,
            }
        )
    summary: dict[str, int] = {}
    for item in actions:
        summary[item["action"]] = summary.get(item["action"], 0) + 1
    return {"actions": actions, "summary": dict(sorted(summary.items()))}


def render_markdown_source_curation(curation: dict[str, Any]) -> str:
    lines = ["## RSS Source Curation", ""]
    summary = curation.get("summary", {})
    if summary:
        lines.append("### Summary")
        lines.append("")
        for action, count in sorted(summary.items()):
            lines.append(f"- {action}: {count}")
        lines.append("")
    actions = curation.get("actions", [])
    if not actions:
        lines.append("No source curation actions.")
        return "\n".join(lines) + "\n"
    lines.append("### Actions")
    lines.append("")
    for item in actions:
        patch = item.get("registry_patch") or {}
        patch_text = json.dumps(patch, ensure_ascii=False, sort_keys=True) if patch else "{}"
        lines.append(f"- `{item.get('action')}` `{item.get('id')}` - {item.get('title', '')}")
        lines.append(f"  - Status: {item.get('status')} / Score: {item.get('score')}/10")
        lines.append(f"  - Reason: {item.get('reason', '')}")
        if item.get("last_error"):
            lines.append(f"  - Last error: {item['last_error']}")
        lines.append(f"  - Registry patch: `{patch_text}`")
    return "\n".join(lines) + "\n"


def extract_source_patches(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, list):
        return [dict(item) for item in payload if isinstance(item, dict) and item.get("id")]
    if not isinstance(payload, dict):
        return []
    if isinstance(payload.get("patches"), list):
        return extract_source_patches(payload["patches"])
    patches = []
    for action in payload.get("actions", []):
        if not isinstance(action, dict):
            continue
        patch = action.get("registry_patch") or {}
        if patch.get("id"):
            patches.append(dict(patch))
    if payload.get("id"):
        patches.append(dict(payload))
    return patches


def apply_source_patches(registry: dict[str, Any], patches: list[dict[str, Any]], dry_run: bool = True) -> dict[str, Any]:
    next_registry = deepcopy(registry)
    feeds = next_registry.setdefault("feeds", [])
    operations = []
    skipped = []
    summary = {"set": 0, "remove": 0, "skipped": 0}

    for patch in patches:
        feed_id = patch.get("id")
        index = next((idx for idx, feed in enumerate(feeds) if feed.get("id") == feed_id), None)
        if index is None:
            skipped.append({"id": feed_id, "reason": "source not found"})
            summary["skipped"] += 1
            continue
        if patch.get("remove"):
            removed = feeds.pop(index)
            operations.append({"id": feed_id, "action": "remove", "title": removed.get("title", "")})
            summary["remove"] += 1
            continue
        updates = patch.get("set") or {}
        if updates:
            before = {key: feeds[index].get(key) for key in updates}
            feeds[index].update(updates)
            operations.append({"id": feed_id, "action": "set", "before": before, "after": updates})
            summary["set"] += 1

    result = {
        "dry_run": dry_run,
        "summary": summary,
        "operations": operations,
        "skipped": skipped,
        "registry": next_registry,
    }
    return result


def render_markdown_source_patch_result(result: dict[str, Any]) -> str:
    lines = ["## RSS Source Patch", ""]
    lines.append(f"- Mode: {'dry-run' if result.get('dry_run') else 'apply'}")
    summary = result.get("summary", {})
    lines.append(f"- Set: {summary.get('set', 0)}")
    lines.append(f"- Remove: {summary.get('remove', 0)}")
    lines.append(f"- Skipped: {summary.get('skipped', 0)}")
    operations = result.get("operations", [])
    if operations:
        lines.extend(["", "### Operations", ""])
        for operation in operations:
            lines.append(f"- `{operation.get('action')}` `{operation.get('id')}`")
    skipped = result.get("skipped", [])
    if skipped:
        lines.extend(["", "### Skipped", ""])
        for item in skipped:
            lines.append(f"- `{item.get('id')}`: {item.get('reason', '')}")
    return "\n".join(lines) + "\n"


def build_failures(health: dict[str, Any], registry: dict[str, Any]) -> list[dict[str, Any]]:
    feed_lookup = {feed.get("id"): feed for feed in registry.get("feeds", [])}
    failures = []
    for feed_id, item_health in health.items():
        if int(item_health.get("failure_count", 0) or 0) <= 0:
            continue
        feed = feed_lookup.get(feed_id, {})
        failures.append(
            {
                "id": feed_id,
                "title": feed.get("title", feed_id),
                "url": feed.get("url", ""),
                "error": item_health.get("error") or item_health.get("last_error", ""),
                "last_error_at": item_health.get("last_error_at", ""),
            }
        )
    return sorted(failures, key=lambda item: item["id"])


def build_stats(
    registry: dict[str, Any],
    entries: list[dict[str, Any]],
    filtered: list[dict[str, Any]],
    reported: list[dict[str, Any]],
    marked: list[dict[str, Any]],
    health: dict[str, Any],
) -> dict[str, int]:
    feeds = registry.get("feeds", [])
    enabled_feeds = [feed for feed in feeds if feed.get("enabled", True)]
    failed_ids = {feed_id for feed_id, item in health.items() if int(item.get("failure_count", 0) or 0) > 0}
    success_ids = set(health) - failed_ids
    return {
        "feeds_total": len(feeds),
        "feeds_enabled": len(enabled_feeds),
        "feeds_success": len(success_ids),
        "feeds_failed": len(failed_ids),
        "entries_fetched": len(entries),
        "entries_filtered": len(filtered),
        "entries_reported": len(reported),
        "entries_marked_seen": len(marked),
    }


def merge_health(previous: dict[str, Any], current: dict[str, Any]) -> dict[str, Any]:
    merged = deepcopy(previous)
    for feed_id, item in current.items():
        prior = dict(merged.get(feed_id, {}))
        current_failed = int(item.get("failure_count", 0) or 0) > 0
        if current_failed:
            prior["failure_count"] = int(prior.get("failure_count", 0) or 0) + int(item.get("failure_count", 1) or 1)
            prior["success_count"] = int(prior.get("success_count", 0) or 0)
            prior["last_error_at"] = item.get("last_error_at", prior.get("last_error_at", ""))
            prior["last_error"] = item.get("error") or item.get("last_error", prior.get("last_error", ""))
            prior["status"] = "failing"
        else:
            prior["success_count"] = int(prior.get("success_count", 0) or 0) + 1
            prior["failure_count"] = int(prior.get("failure_count", 0) or 0)
            prior["last_success_at"] = item.get("last_success_at", prior.get("last_success_at", ""))
            prior["last_item_at"] = item.get("last_item_at", prior.get("last_item_at", ""))
            prior["status"] = "healthy"
            prior.setdefault("last_error", "")
            prior.setdefault("last_error_at", "")
        merged[feed_id] = prior
    return merged


def build_digest_result(
    entries: list[dict[str, Any]],
    failures: list[dict[str, Any]],
    health: dict[str, Any],
    stats: dict[str, int],
) -> dict[str, Any]:
    return {
        "entries": entries,
        "failures": failures,
        "health": health,
        "stats": stats,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


def select_entries_to_mark(
    new_entries: list[dict[str, Any]],
    reported_entries: list[dict[str, Any]],
    policy: str,
) -> list[dict[str, Any]]:
    if policy == "none":
        return []
    if policy == "all-filtered":
        return new_entries
    if policy == "reported-only":
        return reported_entries
    raise ValueError(f"Unsupported mark-seen policy: {policy}")


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


def render_markdown_digest_result(result: dict[str, Any], title: str = "RSS AI Digest") -> str:
    lines = [render_markdown_digest(result.get("entries", []), title).rstrip()]
    stats = result.get("stats", {})
    if stats:
        lines.extend(
            [
                "",
                "### Run stats",
                "",
                f"- Feeds: {stats.get('feeds_success', 0)} succeeded, {stats.get('feeds_failed', 0)} failed, {stats.get('feeds_enabled', stats.get('feeds_total', 0))} enabled",
                f"- Entries: {stats.get('entries_fetched', 0)} fetched, {stats.get('entries_filtered', 0)} filtered, {stats.get('entries_reported', 0)} reported",
                f"- Seen state: {stats.get('entries_marked_seen', 0)} entries marked seen",
            ]
        )
    failures = result.get("failures", [])
    if failures:
        lines.extend(["", "### Failed feeds", ""])
        for failure in failures:
            label = failure.get("title") or failure.get("id", "unknown")
            error = failure.get("error", "")
            url = failure.get("url", "")
            suffix = f" ({url})" if url else ""
            lines.append(f"- {label}{suffix}: {error}")
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


def fetch_one_feed(feed: dict[str, Any], timeout: int = 20) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    feed_id = feed.get("id") or slugify(feed.get("title", feed.get("url", "feed")))
    try:
        xml_text = fetch_url(feed["url"], timeout=timeout)
        feed_entries = parse_feed_xml(xml_text, feed_id=feed_id, feed_title=feed.get("title", feed_id))
        last_item_at = max((entry.get("published_at", "") for entry in feed_entries), default="")
        return feed_entries, {
            feed_id: {
                "last_success_at": datetime.now(timezone.utc).isoformat(),
                "failure_count": 0,
                "last_item_at": last_item_at,
            }
        }
    except Exception as exc:  # noqa: BLE001 - CLI should report per-feed failures.
        return [], {
            feed_id: {
                "last_error_at": datetime.now(timezone.utc).isoformat(),
                "failure_count": 1,
                "error": str(exc),
            }
        }


def fetch_entries(registry: dict[str, Any], timeout: int = 20, max_workers: int = 8) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    health: dict[str, Any] = {}
    enabled_feeds = [feed for feed in registry.get("feeds", []) if feed.get("enabled", True)]
    worker_count = max(1, int(max_workers or 1))
    if worker_count == 1 or len(enabled_feeds) <= 1:
        for feed in enabled_feeds:
            feed_entries, feed_health = fetch_one_feed(feed, timeout=timeout)
            entries.extend(feed_entries)
            health.update(feed_health)
        return sort_entries(entries), dict(sorted(health.items()))

    with concurrent.futures.ThreadPoolExecutor(max_workers=worker_count) as executor:
        futures = [executor.submit(fetch_one_feed, feed, timeout) for feed in enabled_feeds]
        for future in concurrent.futures.as_completed(futures):
            feed_entries, feed_health = future.result()
            entries.extend(feed_entries)
            health.update(feed_health)
    return sort_entries(entries), dict(sorted(health.items()))


def sort_entries(entries: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(
        entries,
        key=lambda entry: (
            entry.get("feed_id", ""),
            parse_datetime(entry.get("published_at")) or datetime.min.replace(tzinfo=timezone.utc),
            entry.get("title", ""),
            entry.get("link", ""),
        ),
    )


def sort_scored_entries(entries: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(
        entries,
        key=lambda entry: (
            -int(entry.get("score", 0) or 0),
            -(parse_datetime(entry.get("published_at")) or datetime.min.replace(tzinfo=timezone.utc)).timestamp(),
            entry.get("feed_id", ""),
            entry.get("title", ""),
        ),
    )


def score_entries(entries: list[dict[str, Any]], registry: dict[str, Any]) -> list[dict[str, Any]]:
    feed_lookup = {feed.get("id"): feed for feed in registry.get("feeds", [])}
    return [score_entry(entry, feed_lookup.get(entry.get("feed_id", ""), {})) for entry in entries]


def command_import_opml(args: argparse.Namespace) -> int:
    feeds = parse_opml(Path(args.opml).read_text(encoding="utf-8"))
    if getattr(args, "metadata", None):
        feeds = apply_source_metadata(feeds, load_json(args.metadata, {}))
    registry = {"feeds": feeds}
    save_json(args.registry, registry)
    print(render_json(registry), end="")
    return 0


def command_fetch(args: argparse.Namespace) -> int:
    registry = load_registry(args.registry)
    entries, health = fetch_entries(registry, timeout=args.timeout, max_workers=args.max_workers)
    payload = {"entries": entries, "health": health}
    print(render_json(payload) if args.format == "json" else render_markdown_digest(entries, "Fetched RSS Entries"), end="")
    return 0


def command_digest(args: argparse.Namespace) -> int:
    apply_filter_preset(args)
    registry = load_registry(args.registry)
    state = load_seen_state(args.state)
    entries, current_health = fetch_entries(
        registry,
        timeout=getattr(args, "timeout", 20),
        max_workers=getattr(args, "max_workers", 8),
    )
    health = current_health
    if getattr(args, "health", None):
        previous_health = load_json(args.health, {})
        health = merge_health(previous_health, current_health)
        save_json(args.health, health)
    feed_lookup = {feed.get("id"): feed for feed in registry.get("feeds", [])}
    filtered = filter_entries(
        entries,
        keywords=parse_keyword_csv(args.keywords),
        exclude_keywords=parse_keyword_csv(getattr(args, "exclude_keywords", "")),
        keyword_mode=getattr(args, "keyword_mode", "any"),
        require_any_title_keyword=getattr(args, "require_any_title_keyword", False),
        author=args.author,
        since=parse_since(args.since),
        category=args.category,
        language=args.language,
        feed_lookup=feed_lookup,
    )
    new_entries = [entry for entry in filtered if not is_seen(state, entry)]
    scored = sort_scored_entries([entry for entry in score_entries(new_entries, registry) if entry.get("score", 0) >= args.min_score])
    entries_to_mark = select_entries_to_mark(new_entries, scored, getattr(args, "mark_seen", "reported-only"))
    mark_seen(state, entries_to_mark)
    save_json(args.state, state)
    failures = build_failures(current_health, registry)
    stats = build_stats(registry, entries, filtered, scored, entries_to_mark, current_health)
    result = build_digest_result(scored, failures, health, stats)
    print(render_json(result) if args.format == "json" else render_markdown_digest_result(result), end="")
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


def command_curate_sources(args: argparse.Namespace) -> int:
    registry = load_registry(args.registry)
    health = load_json(args.health, {}) if args.health else {}
    curation = curate_sources(registry, health)
    print(render_json(curation) if args.format == "json" else render_markdown_source_curation(curation), end="")
    return 0


def command_apply_source_patch(args: argparse.Namespace) -> int:
    registry = load_registry(args.registry)
    patch_payload = load_json(args.patch, {})
    patches = extract_source_patches(patch_payload)
    should_apply = bool(getattr(args, "apply", False))
    if should_apply and not args.output:
        raise ValueError("--output is required when --apply is set")
    result = apply_source_patches(registry, patches, dry_run=not should_apply)
    if should_apply:
        save_json(args.output, result["registry"])
    print(render_json(result) if args.format == "json" else render_markdown_source_patch_result(result), end="")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Monitor and score AI/technical RSS feeds.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    import_opml = subparsers.add_parser("import-opml", help="Import OPML subscriptions into a registry JSON file.")
    import_opml.add_argument("--opml", required=True)
    import_opml.add_argument("--registry", required=True)
    import_opml.add_argument("--metadata")
    import_opml.set_defaults(func=command_import_opml)

    fetch = subparsers.add_parser("fetch", help="Fetch enabled feeds and output raw normalized entries.")
    fetch.add_argument("--registry", required=True)
    fetch.add_argument("--format", choices=["json", "markdown"], default="json")
    fetch.add_argument("--timeout", type=int, default=20)
    fetch.add_argument("--max-workers", type=int, default=8)
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

    curate = subparsers.add_parser("curate-sources", help="Generate reviewable source curation actions without modifying the registry.")
    curate.add_argument("--registry", required=True)
    curate.add_argument("--health")
    curate.add_argument("--format", choices=["json", "markdown"], default="markdown")
    curate.set_defaults(func=command_curate_sources)

    apply_patch_parser = subparsers.add_parser(
        "apply-source-patch",
        help="Dry-run or apply reviewable source registry patches to an explicit output file.",
    )
    apply_patch_parser.add_argument("--registry", required=True)
    apply_patch_parser.add_argument("--patch", required=True)
    apply_patch_parser.add_argument("--output")
    apply_patch_parser.add_argument("--apply", action="store_true")
    apply_patch_parser.add_argument("--format", choices=["json", "markdown"], default="markdown")
    apply_patch_parser.set_defaults(func=command_apply_source_patch)
    return parser


def add_digest_args(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--registry", required=True)
    parser.add_argument("--state", required=True)
    parser.add_argument("--health")
    parser.add_argument("--since", default="24h")
    parser.add_argument("--preset", choices=["none", "ai-strict"], default="none")
    parser.add_argument("--keywords", default="")
    parser.add_argument("--exclude-keywords", default="")
    parser.add_argument("--keyword-mode", choices=["any", "all"], default="any")
    parser.add_argument("--require-any-title-keyword", action="store_true")
    parser.add_argument("--author")
    parser.add_argument("--category")
    parser.add_argument("--language")
    parser.add_argument("--format", choices=["json", "markdown"], default="markdown")
    parser.add_argument("--mark-seen", choices=["reported-only", "all-filtered", "none"], default="reported-only")
    parser.add_argument("--timeout", type=int, default=20)
    parser.add_argument("--max-workers", type=int, default=8)


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
