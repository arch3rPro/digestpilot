# RSS Skills Suite Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `v0.2.0` RSS Skills suite foundation by adding `rss-source-curator` and improving deterministic `rss-ai-digest` daily digest quality.

**Architecture:** Keep `skills/rss-ai-digest/scripts/rss_monitor.py` as the shared deterministic implementation for Phase 2. Add `rss-source-curator` as a separate Skill package that routes source-governance work to the existing commands. Improve digest quality inside `rss-ai-digest` through backward-compatible CLI options, deterministic presets, topic assignment, scoring reasons, and grouped Markdown output.

**Tech Stack:** Python 3 standard library, `argparse`, `unittest`, standard Skill layout under `skills/<skill-name>/SKILL.md`.

---

## File Structure

- Create: `skills/rss-source-curator/SKILL.md`
  - Agent entrypoint for source quality, health review, curation, and patch application.
- Create: `skills/rss-source-curator/agents/openai.yaml`
  - Human-facing Skill metadata.
- Create: `skills/rss-source-curator/references/source-governance.md`
  - Source status, recommendations, and curation action semantics.
- Create: `skills/rss-source-curator/references/registry-maintenance.md`
  - Safe registry patch, dry-run, and reviewed application workflow.
- Modify: `skills/rss-ai-digest/SKILL.md`
  - Narrow source-governance language and point agents to `rss-source-curator` for source maintenance.
- Modify: `skills/rss-ai-digest/scripts/rss_monitor.py`
  - Add deterministic presets, must/should/exclude semantics, topic assignment, grouped Markdown output, and JSON topic fields.
- Modify: `tests/test_rss_monitor.py`
  - Add regression tests for presets, keyword groups, topic assignment, grouped Markdown, JSON topic fields, and score reasons.
- Modify: `README.md`
  - Present repository as a two-Skill suite.
- Modify: `README.zh-CN.md`
  - Mirror the suite positioning in Chinese.
- Modify: `docs/project-status.zh-CN.md`
  - Move `rss-source-curator` from future item to implemented/Phase 2 status after implementation.
- Modify: `AGENTS.md`
  - Add `rss-source-curator` layout and validation rules.
- Modify: `CHANGELOG.md`
  - Add unreleased `v0.2.0` notes as implementation proceeds.
- Create: `docs/releases/v0.2.0.md`
  - Draft release notes for the Phase 2 release.

---

## Task 1: Add `rss-source-curator` Skill Package

**Files:**
- Create: `skills/rss-source-curator/SKILL.md`
- Create: `skills/rss-source-curator/agents/openai.yaml`
- Create: `skills/rss-source-curator/references/source-governance.md`
- Create: `skills/rss-source-curator/references/registry-maintenance.md`

- [ ] **Step 1: Run validator to confirm the new Skill does not exist yet**

Run:

```bash
python3 /path/to/skill-creator/scripts/quick_validate.py skills/rss-source-curator
```

Expected: FAIL because `skills/rss-source-curator` does not exist yet.

- [ ] **Step 2: Create `skills/rss-source-curator/SKILL.md`**

Add:

```markdown
---
name: rss-source-curator
description: Use when an agent needs to evaluate RSS source quality, review feed health, generate source curation actions, apply reviewed registry patches, or maintain RSS/OPML source registries.
---

# RSS Source Curator

## Overview

Use this skill to review and maintain RSS source quality. Keep the workflow portable: use explicit registry, health, patch, and output files, and avoid runtime-specific assumptions.

## Workflow Selection

- For source quality scoring, run `../rss-ai-digest/scripts/rss_monitor.py evaluate-sources`.
- For reviewable source governance actions, run `../rss-ai-digest/scripts/rss_monitor.py curate-sources`.
- For applying reviewed registry patches, run `../rss-ai-digest/scripts/rss_monitor.py apply-source-patch`.
- For source status semantics, read `references/source-governance.md`.
- For safe registry maintenance, read `references/registry-maintenance.md`.

## Core Commands

Evaluate source quality:

```bash
python3 skills/rss-ai-digest/scripts/rss_monitor.py evaluate-sources \
  --registry feeds.json \
  --health source-health.json
```

Generate reviewable curation actions:

```bash
python3 skills/rss-ai-digest/scripts/rss_monitor.py curate-sources \
  --registry feeds.json \
  --health source-health.json \
  --format markdown
```

Apply reviewed patches to a new registry:

```bash
python3 skills/rss-ai-digest/scripts/rss_monitor.py apply-source-patch \
  --registry feeds.json \
  --patch source-curation.json \
  --output feeds.curated.json \
  --apply
```

## Boundaries

This skill owns source governance, not article digest generation. For daily reading reports or content discovery, use `rss-ai-digest`.

Do not delete, disable, or remove feeds automatically. Generate reviewable actions first, then apply reviewed patches to an explicit output file.
```

- [ ] **Step 3: Create `agents/openai.yaml`**

Add:

```yaml
interface:
  display_name: "RSS Source Curator"
  short_description: "Review RSS source health and maintain feed registries."
  default_prompt: "Use $rss-source-curator to review my RSS source quality and recommend registry cleanup actions."
```

- [ ] **Step 4: Create `references/source-governance.md`**

Add:

```markdown
# Source Governance

`rss-source-curator` uses registry priors and source-health observations to produce reviewable source quality decisions.

## Status Values

- `healthy`: source has successful fetch history and acceptable quality.
- `degraded`: source is useful but noisy, low-priority, or intermittently failing.
- `failing`: source repeatedly fails without recent successful fetches.
- `unknown`: source has no health observations yet.

## Recommendations

- `keep`: preserve the source.
- `watch`: gather more observations.
- `lower-priority`: reduce score or treat as noisy.
- `disable`: set `enabled` to `false` after review.
- `remove`: remove only after explicit review.

## Safety Rule

Recommendations are not permission to mutate a registry. Use `apply-source-patch` only after review.
```

- [ ] **Step 5: Create `references/registry-maintenance.md`**

Add:

```markdown
# Registry Maintenance

Use `curate-sources` to generate curation actions, then review the registry patches before applying them.

## Dry Run

```bash
python3 skills/rss-ai-digest/scripts/rss_monitor.py apply-source-patch \
  --registry feeds.json \
  --patch source-curation.json \
  --format markdown
```

## Apply To A New File

```bash
python3 skills/rss-ai-digest/scripts/rss_monitor.py apply-source-patch \
  --registry feeds.json \
  --patch source-curation.json \
  --output feeds.curated.json \
  --apply \
  --format json
```

Keep generated registries out of Git unless the user explicitly says they are public.
```

- [ ] **Step 6: Validate the new Skill**

Run:

```bash
python3 /path/to/skill-creator/scripts/quick_validate.py skills/rss-source-curator
```

Expected: PASS with `Skill is valid!`.

- [ ] **Step 7: Commit Task 1**

Run:

```bash
git add skills/rss-source-curator
git commit -m "feat: add rss source curator skill"
```

---

## Task 2: Update Suite Documentation For Two Skills

**Files:**
- Modify: `README.md`
- Modify: `README.zh-CN.md`
- Modify: `docs/project-status.zh-CN.md`
- Modify: `AGENTS.md`
- Modify: `CHANGELOG.md`
- Modify: `skills/rss-ai-digest/SKILL.md`

- [ ] **Step 1: Update `README.md` current package wording**

Replace single-Skill wording with:

```markdown
## Current Skills

| Skill | Purpose |
| --- | --- |
| `rss-ai-digest` | Discover, filter, score, dedupe, and render high-signal AI/technical reading digests. |
| `rss-source-curator` | Evaluate RSS source quality, review feed health, generate curation actions, and apply reviewed registry patches. |
```

- [ ] **Step 2: Update `README.zh-CN.md` with matching Chinese section**

Add:

```markdown
## 当前 Skills

| Skill | 用途 |
| --- | --- |
| `rss-ai-digest` | 发现、筛选、评分、去重并生成高信号 AI/技术阅读摘要。 |
| `rss-source-curator` | 评估 RSS 源质量、审查源健康、生成源治理动作，并应用已审阅 registry patch。 |
```

- [ ] **Step 3: Update `docs/project-status.zh-CN.md`**

Move `rss-source-curator` from the future list into implemented Phase 2 status:

```markdown
### RSS Skills Suite

- 已发布 `v0.1.0` 作为拆分前稳定检查点。
- Phase 2 开始引入第二个正式 Skill：`rss-source-curator`。
- `rss-ai-digest` 继续负责内容发现和日报。
- `rss-source-curator` 负责源质量治理和 registry 维护。
```

- [ ] **Step 4: Narrow source-governance wording in `rss-ai-digest/SKILL.md`**

Replace the source cleanup bullets with:

```markdown
- For source cleanup or feed quality review, prefer `rss-source-curator`.
- For backwards compatibility, source-governance commands remain available through `scripts/rss_monitor.py`.
```

- [ ] **Step 5: Update `AGENTS.md` repository layout**

Add:

```markdown
- `skills/rss-source-curator/SKILL.md`: source governance Skill entrypoint.
- `skills/rss-source-curator/references/`: source governance and registry maintenance references.
```

- [ ] **Step 6: Update `CHANGELOG.md`**

Add under a new `## Unreleased` section:

```markdown
### Added

- Added `rss-source-curator` as the first separate RSS suite Skill for source governance and registry maintenance.
```

- [ ] **Step 7: Validate docs**

Run:

```bash
rg -n "(/Users/[^[:space:]]+|/private[/]tmp|My[-]Skills|T[D]B|TO[D]O)" README.md README.zh-CN.md docs/project-status.zh-CN.md AGENTS.md CHANGELOG.md skills/rss-ai-digest/SKILL.md skills/rss-source-curator/SKILL.md
```

Expected: no matches.

- [ ] **Step 8: Commit Task 2**

Run:

```bash
git add README.md README.zh-CN.md docs/project-status.zh-CN.md AGENTS.md CHANGELOG.md skills/rss-ai-digest/SKILL.md
git commit -m "docs: present rss skills suite structure"
```

---

## Task 3: Add Digest Preset Tests And Implementation

**Files:**
- Modify: `tests/test_rss_monitor.py`
- Modify: `skills/rss-ai-digest/scripts/rss_monitor.py`

- [ ] **Step 1: Add failing tests for new preset defaults**

Add tests after `test_ai_strict_preset_preserves_explicit_keywords_and_excludes`:

```python
    def test_digest_presets_define_quality_defaults(self):
        presets = self.mod.DIGEST_PRESETS

        self.assertIn("ai-research", presets)
        self.assertIn("engineering-deep-dive", presets)
        self.assertIn("security-risk", presets)
        self.assertIn("product-tech", presets)
        self.assertIn("llm", presets["ai-research"]["must_keywords"])
        self.assertIn("architecture", presets["engineering-deep-dive"]["should_keywords"])
        self.assertIn("breach", presets["security-risk"]["must_keywords"])
        self.assertIn("sponsor", presets["product-tech"]["exclude_keywords"])

    def test_apply_research_preset_sets_new_keyword_groups(self):
        args = Namespace(
            preset="ai-research",
            keywords="",
            must_keywords="",
            should_keywords="",
            exclude_keywords="",
            require_any_title_keyword=False,
            min_score=0,
        )

        self.mod.apply_filter_preset(args)

        self.assertIn("llm", args.must_keywords)
        self.assertIn("benchmark", args.should_keywords)
        self.assertIn("webinar", args.exclude_keywords)
        self.assertTrue(args.require_any_title_keyword)
        self.assertEqual(args.min_score, 8)
```

- [ ] **Step 2: Run tests to verify RED**

Run:

```bash
python3 -m unittest tests.test_rss_monitor.RssMonitorTests.test_digest_presets_define_quality_defaults tests.test_rss_monitor.RssMonitorTests.test_apply_research_preset_sets_new_keyword_groups -v
```

Expected: FAIL because `DIGEST_PRESETS` and new preset fields are missing.

- [ ] **Step 3: Add preset constants**

In `rss_monitor.py`, replace scalar preset constants with:

```python
DIGEST_PRESETS = {
    "ai-strict": {
        "keywords": ["agent", "llm", "rag", "ai", "model", "inference", "evals", "benchmark"],
        "must_keywords": [],
        "should_keywords": [],
        "exclude_keywords": ["webinar", "coupon", "sponsor", "sponsored", "hiring", "job", "press release"],
        "require_any_title_keyword": True,
        "min_score": None,
    },
    "ai-research": {
        "keywords": [],
        "must_keywords": ["llm", "model", "reasoning", "evals", "benchmark"],
        "should_keywords": ["inference", "agent", "rag", "alignment", "research"],
        "exclude_keywords": ["webinar", "coupon", "sponsor", "sponsored", "hiring", "job", "press release"],
        "require_any_title_keyword": True,
        "min_score": 8,
    },
    "engineering-deep-dive": {
        "keywords": [],
        "must_keywords": ["engineering", "architecture", "systems", "debugging", "infrastructure"],
        "should_keywords": ["reliability", "scaling", "production", "performance"],
        "exclude_keywords": ["webinar", "coupon", "sponsor", "sponsored", "hiring", "job", "press release"],
        "require_any_title_keyword": False,
        "min_score": 7,
    },
    "security-risk": {
        "keywords": [],
        "must_keywords": ["security", "breach", "vulnerability", "malware", "risk"],
        "should_keywords": ["incident", "exploit", "privacy", "supply chain"],
        "exclude_keywords": ["webinar", "coupon", "sponsor", "sponsored", "hiring", "job", "press release"],
        "require_any_title_keyword": False,
        "min_score": 7,
    },
    "product-tech": {
        "keywords": [],
        "must_keywords": ["product", "platform", "startup", "business", "strategy"],
        "should_keywords": ["ai", "developer", "pricing", "market", "workflow"],
        "exclude_keywords": ["webinar", "coupon", "sponsor", "sponsored", "hiring", "job", "press release"],
        "require_any_title_keyword": False,
        "min_score": 6,
    },
}
```

- [ ] **Step 4: Update `apply_filter_preset`**

Replace current body with logic that:

```python
def apply_filter_preset(args: argparse.Namespace) -> argparse.Namespace:
    preset = getattr(args, "preset", "none")
    if preset == "none":
        return args
    if preset not in DIGEST_PRESETS:
        raise ValueError(f"Unsupported preset: {preset}")
    defaults = DIGEST_PRESETS[preset]
    if not getattr(args, "keywords", "") and defaults["keywords"]:
        args.keywords = ",".join(defaults["keywords"])
    if not getattr(args, "must_keywords", "") and defaults["must_keywords"]:
        args.must_keywords = ",".join(defaults["must_keywords"])
    if not getattr(args, "should_keywords", "") and defaults["should_keywords"]:
        args.should_keywords = ",".join(defaults["should_keywords"])
    if not getattr(args, "exclude_keywords", "") and defaults["exclude_keywords"]:
        args.exclude_keywords = ",".join(defaults["exclude_keywords"])
    if defaults["require_any_title_keyword"]:
        args.require_any_title_keyword = True
    if defaults["min_score"] is not None and getattr(args, "min_score", 0) == 0:
        args.min_score = defaults["min_score"]
    return args
```

- [ ] **Step 5: Update parser preset choices**

In `add_digest_args`, replace preset choices with:

```python
parser.add_argument("--preset", choices=["none", *sorted(DIGEST_PRESETS)], default="none")
```

- [ ] **Step 6: Run preset tests to verify GREEN**

Run:

```bash
python3 -m unittest tests.test_rss_monitor.RssMonitorTests.test_digest_presets_define_quality_defaults tests.test_rss_monitor.RssMonitorTests.test_apply_research_preset_sets_new_keyword_groups -v
```

Expected: PASS.

- [ ] **Step 7: Commit Task 3**

Run:

```bash
git add tests/test_rss_monitor.py skills/rss-ai-digest/scripts/rss_monitor.py
git commit -m "feat: add digest quality presets"
```

---

## Task 4: Add Must/Should/Exclude Keyword Semantics

**Files:**
- Modify: `tests/test_rss_monitor.py`
- Modify: `skills/rss-ai-digest/scripts/rss_monitor.py`

- [ ] **Step 1: Add failing tests for keyword groups**

Add:

```python
    def test_must_keywords_filter_entries_and_should_keywords_score(self):
        entry = {
            "title": "LLM reliability benchmark",
            "summary": "A practical post about inference reliability.",
            "author": "",
            "published_at": "2026-05-20T08:00:00+00:00",
            "feed_id": "test",
        }

        matched = self.mod.filter_entries(
            [entry],
            must_keywords=["llm"],
            should_keywords=["benchmark", "inference"],
        )

        self.assertEqual(len(matched), 1)
        self.assertEqual(matched[0]["matched_must_keywords"], ["llm"])
        self.assertEqual(matched[0]["matched_should_keywords"], ["benchmark", "inference"])

    def test_missing_must_keywords_filters_entry(self):
        entry = {
            "title": "General engineering notes",
            "summary": "A practical post about systems.",
            "author": "",
            "published_at": "2026-05-20T08:00:00+00:00",
            "feed_id": "test",
        }

        matched = self.mod.filter_entries([entry], must_keywords=["llm"])

        self.assertEqual(matched, [])
```

- [ ] **Step 2: Run keyword group tests to verify RED**

Run:

```bash
python3 -m unittest tests.test_rss_monitor.RssMonitorTests.test_must_keywords_filter_entries_and_should_keywords_score tests.test_rss_monitor.RssMonitorTests.test_missing_must_keywords_filters_entry -v
```

Expected: FAIL because `filter_entries` does not accept `must_keywords` or `should_keywords`.

- [ ] **Step 3: Update `filter_entries` signature**

Add parameters:

```python
    must_keywords: list[str] | None = None,
    should_keywords: list[str] | None = None,
```

- [ ] **Step 4: Add keyword group matching inside `filter_entries`**

After existing keyword normalization, add:

```python
    normalized_must_keywords = [keyword.lower() for keyword in (must_keywords or [])]
    normalized_should_keywords = [keyword.lower() for keyword in (should_keywords or [])]
```

Inside the loop, after `matched_locations`:

```python
        matched_must_locations = {
            keyword: locations
            for keyword in normalized_must_keywords
            if (locations := keyword_locations(entry, keyword))
        }
        matched_should_locations = {
            keyword: locations
            for keyword in normalized_should_keywords
            if (locations := keyword_locations(entry, keyword))
        }
        if normalized_must_keywords and not matched_must_locations:
            continue
```

Before appending `item`, add:

```python
        item["matched_must_keywords"] = list(matched_must_locations.keys())
        item["matched_must_keyword_locations"] = matched_must_locations
        item["matched_should_keywords"] = list(matched_should_locations.keys())
        item["matched_should_keyword_locations"] = matched_should_locations
```

- [ ] **Step 5: Update command wiring**

In `command_digest`, pass:

```python
        must_keywords=parse_keyword_csv(getattr(args, "must_keywords", "")),
        should_keywords=parse_keyword_csv(getattr(args, "should_keywords", "")),
```

In `add_digest_args`, add:

```python
parser.add_argument("--must-keywords", default="")
parser.add_argument("--should-keywords", default="")
```

- [ ] **Step 6: Run keyword group tests to verify GREEN**

Run:

```bash
python3 -m unittest tests.test_rss_monitor.RssMonitorTests.test_must_keywords_filter_entries_and_should_keywords_score tests.test_rss_monitor.RssMonitorTests.test_missing_must_keywords_filters_entry -v
```

Expected: PASS.

- [ ] **Step 7: Run backward compatibility tests**

Run:

```bash
python3 -m unittest tests.test_rss_monitor.RssMonitorTests.test_filter_entries_by_keyword_author_and_since tests.test_rss_monitor.RssMonitorTests.test_ai_strict_preset_preserves_explicit_keywords_and_excludes -v
```

Expected: PASS.

- [ ] **Step 8: Commit Task 4**

Run:

```bash
git add tests/test_rss_monitor.py skills/rss-ai-digest/scripts/rss_monitor.py
git commit -m "feat: add digest keyword groups"
```

---

## Task 5: Add Topic Assignment And Scoring Signals

**Files:**
- Modify: `tests/test_rss_monitor.py`
- Modify: `skills/rss-ai-digest/scripts/rss_monitor.py`

- [ ] **Step 1: Add failing tests for topic and scoring signals**

Add:

```python
    def test_assign_topic_uses_entry_text_and_feed_category(self):
        ai_entry = {"title": "LLM evals", "summary": "Reasoning benchmark", "feed_id": "ai"}
        security_entry = {"title": "Supply chain breach", "summary": "Security incident", "feed_id": "sec"}
        feed_lookup = {
            "ai": {"category": ["AI, Research, and High-Signal Analysis"]},
            "sec": {"category": ["Security and Risk"]},
        }

        self.assertEqual(self.mod.assign_topic(ai_entry, feed_lookup["ai"]), "AI / LLM")
        self.assertEqual(self.mod.assign_topic(security_entry, feed_lookup["sec"]), "Security")

    def test_should_keyword_match_adds_score_reason(self):
        entry = {
            "title": "LLM reliability benchmark",
            "summary": "Inference notes.",
            "published_at": "2026-05-20T08:00:00+00:00",
            "link": "https://example.com/llm",
            "feed_id": "test",
            "matched_should_keywords": ["benchmark"],
            "matched_should_keyword_locations": {"benchmark": ["title"]},
        }

        scored = self.mod.score_entry(entry, feed={"base_score": 5})

        self.assertIn("should_keyword_match", scored["score_reasons"])
        self.assertGreaterEqual(scored["score"], 7)
```

- [ ] **Step 2: Run tests to verify RED**

Run:

```bash
python3 -m unittest tests.test_rss_monitor.RssMonitorTests.test_assign_topic_uses_entry_text_and_feed_category tests.test_rss_monitor.RssMonitorTests.test_should_keyword_match_adds_score_reason -v
```

Expected: FAIL because `assign_topic` and should-keyword score reasons are missing.

- [ ] **Step 3: Add topic constants and `assign_topic`**

In `rss_monitor.py`, add:

```python
TOPIC_KEYWORDS = {
    "AI / LLM": {"ai", "llm", "agent", "agents", "model", "reasoning", "evals", "inference", "rag"},
    "Engineering": {"engineering", "architecture", "systems", "debugging", "infrastructure", "reliability", "scaling"},
    "Security": {"security", "breach", "vulnerability", "malware", "risk", "incident", "exploit"},
    "Product / Business": {"product", "business", "startup", "strategy", "pricing", "market", "platform"},
}


def assign_topic(entry: dict[str, Any], feed: dict[str, Any] | None = None) -> str:
    feed = feed or {}
    category_text = " ".join(feed.get("category", [])).lower()
    text = f"{entry.get('title', '')} {entry.get('summary', '')} {category_text}".lower()
    tokens = text_tokens(text)
    for topic, keywords in TOPIC_KEYWORDS.items():
        if tokens & keywords:
            return topic
    return "Other"
```

- [ ] **Step 4: Add topic in `score_entries`**

Replace list comprehension with:

```python
def score_entries(entries: list[dict[str, Any]], registry: dict[str, Any]) -> list[dict[str, Any]]:
    feed_lookup = {feed.get("id"): feed for feed in registry.get("feeds", [])}
    scored_entries = []
    for entry in entries:
        feed = feed_lookup.get(entry.get("feed_id", ""), {})
        scored = score_entry(entry, feed)
        scored["topic"] = assign_topic(scored, feed)
        scored_entries.append(scored)
    return scored_entries
```

- [ ] **Step 5: Add should-keyword scoring**

In `score_entry`, after title keyword scoring, add:

```python
    should_locations = entry.get("matched_should_keyword_locations", {})
    if should_locations:
        score += min(2, len(should_locations))
        reasons.append("should_keyword_match")
        if any("title" in fields for fields in should_locations.values()):
            score += 1
            reasons.append("title_should_keyword_match")
```

- [ ] **Step 6: Run topic and scoring tests to verify GREEN**

Run:

```bash
python3 -m unittest tests.test_rss_monitor.RssMonitorTests.test_assign_topic_uses_entry_text_and_feed_category tests.test_rss_monitor.RssMonitorTests.test_should_keyword_match_adds_score_reason -v
```

Expected: PASS.

- [ ] **Step 7: Commit Task 5**

Run:

```bash
git add tests/test_rss_monitor.py skills/rss-ai-digest/scripts/rss_monitor.py
git commit -m "feat: add digest topic scoring"
```

---

## Task 6: Add Grouped Markdown Digest Output

**Files:**
- Modify: `tests/test_rss_monitor.py`
- Modify: `skills/rss-ai-digest/scripts/rss_monitor.py`

- [ ] **Step 1: Add failing tests for Markdown grouping**

Add:

```python
    def test_markdown_digest_result_groups_entries_by_topic(self):
        result = {
            "entries": [
                {
                    "title": "LLM evals",
                    "link": "https://example.com/ai",
                    "feed_title": "AI Feed",
                    "score": 9,
                    "score_reasons": ["should_keyword_match"],
                    "topic": "AI / LLM",
                },
                {
                    "title": "Debugging production systems",
                    "link": "https://example.com/eng",
                    "feed_title": "Engineering Feed",
                    "score": 8,
                    "score_reasons": ["technical_depth_signal"],
                    "topic": "Engineering",
                },
            ],
            "failures": [],
            "health": {},
            "stats": {"feeds_success": 2, "feeds_failed": 0, "feeds_enabled": 2, "entries_fetched": 2, "entries_filtered": 2, "entries_reported": 2, "entries_marked_seen": 2},
            "generated_at": "2026-05-20T08:00:00+00:00",
        }

        markdown = self.mod.render_markdown_digest_result(result, title="Test Digest")

        self.assertIn("### Overview", markdown)
        self.assertIn("### Top Picks", markdown)
        self.assertLess(markdown.index("### AI / LLM"), markdown.index("### Engineering"))
        self.assertIn("LLM evals", markdown)
        self.assertIn("Debugging production systems", markdown)
```

- [ ] **Step 2: Run grouping test to verify RED**

Run:

```bash
python3 -m unittest tests.test_rss_monitor.RssMonitorTests.test_markdown_digest_result_groups_entries_by_topic -v
```

Expected: FAIL because grouped Markdown sections do not exist.

- [ ] **Step 3: Add grouping helpers**

Add:

```python
TOPIC_ORDER = ["AI / LLM", "Engineering", "Security", "Product / Business", "Other"]


def group_entries_by_topic(entries: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    groups = {topic: [] for topic in TOPIC_ORDER}
    for entry in entries:
        topic = entry.get("topic") or "Other"
        groups.setdefault(topic, []).append(entry)
    return groups
```

- [ ] **Step 4: Update `render_markdown_digest_result`**

Revise it to:

```python
def render_markdown_digest_result(result: dict[str, Any], title: str = "RSS AI Digest") -> str:
    entries = sort_scored_entries(result.get("entries", []))
    failures = result.get("failures", [])
    stats = result.get("stats", {})
    lines = [f"## {title}", "", "### Overview", ""]
    lines.append(f"- Reported entries: {len(entries)}")
    top_topics = [topic for topic, items in group_entries_by_topic(entries).items() if items][:3]
    lines.append(f"- Top topics: {', '.join(top_topics) if top_topics else 'None'}")
    lines.append(f"- Failed feeds: {len(failures)}")
    lines.extend(["", "### Top Picks", ""])
    if entries:
        for index, entry in enumerate(entries[:5], start=1):
            lines.extend(render_markdown_entry_lines(index, entry))
    else:
        lines.append("No matching entries found.")
    groups = group_entries_by_topic(entries)
    for topic in TOPIC_ORDER:
        lines.extend(["", f"### {topic}", ""])
        topic_entries = groups.get(topic, [])
        if not topic_entries:
            lines.append("No matching entries.")
            continue
        for index, entry in enumerate(topic_entries, start=1):
            lines.extend(render_markdown_entry_lines(index, entry))
    if failures:
        lines.extend(["", "### Failed Feeds", ""])
        for failure in failures:
            label = failure.get("title") or failure.get("id", "unknown")
            error = failure.get("error", "")
            url = failure.get("url", "")
            suffix = f" ({url})" if url else ""
            lines.append(f"- {label}{suffix}: {error}")
    if stats:
        lines.extend(["", "### Run Stats", ""])
        lines.append(f"- Feeds: {stats.get('feeds_success', 0)} succeeded, {stats.get('feeds_failed', 0)} failed, {stats.get('feeds_enabled', stats.get('feeds_total', 0))} enabled")
        lines.append(f"- Entries: {stats.get('entries_fetched', 0)} fetched, {stats.get('entries_filtered', 0)} filtered, {stats.get('entries_reported', 0)} reported")
        lines.append(f"- Seen state: {stats.get('entries_marked_seen', 0)} entries marked seen")
    return "\n".join(lines) + "\n"
```

Add helper:

```python
def render_markdown_entry_lines(index: int, entry: dict[str, Any]) -> list[str]:
    reasons = ", ".join(entry.get("score_reasons", [])) or "matched filters"
    lines = [f"{index}. [{entry.get('title', 'Untitled')}]({entry.get('link', '')})"]
    lines.append(f"   - Score: {entry.get('score', 0)}/10")
    lines.append(f"   - Source: {entry.get('feed_title') or entry.get('feed_id', '')}")
    if entry.get("author"):
        lines.append(f"   - Author: {entry['author']}")
    lines.append(f"   - Reason: {reasons}")
    return lines
```

- [ ] **Step 5: Run grouping test to verify GREEN**

Run:

```bash
python3 -m unittest tests.test_rss_monitor.RssMonitorTests.test_markdown_digest_result_groups_entries_by_topic -v
```

Expected: PASS.

- [ ] **Step 6: Run existing Markdown tests**

Run:

```bash
python3 -m unittest tests.test_rss_monitor.RssMonitorTests.test_markdown_digest_result_renders_failed_feeds_section tests.test_rss_monitor.RssMonitorTests.test_render_markdown_digest_orders_by_score -v
```

Expected: PASS. If `test_render_markdown_digest_orders_by_score` still tests the old standalone renderer, keep it passing by not changing `render_markdown_digest`.

- [ ] **Step 7: Commit Task 6**

Run:

```bash
git add tests/test_rss_monitor.py skills/rss-ai-digest/scripts/rss_monitor.py
git commit -m "feat: group digest markdown output"
```

---

## Task 7: Update Documentation And Release Notes For `v0.2.0`

**Files:**
- Modify: `README.md`
- Modify: `README.zh-CN.md`
- Modify: `skills/rss-ai-digest/SKILL.md`
- Modify: `skills/rss-ai-digest/references/scoring.md`
- Modify: `skills/rss-ai-digest/references/feed-registry.md`
- Modify: `docs/project-status.zh-CN.md`
- Modify: `CHANGELOG.md`
- Create: `docs/releases/v0.2.0.md`
- Modify: `VERSION`

- [ ] **Step 1: Update `VERSION`**

Replace contents with:

```text
0.2.0
```

- [ ] **Step 2: Update `rss-ai-digest/SKILL.md` digest guidance**

Add:

```markdown
For higher-quality digests, use presets such as `ai-research`, `engineering-deep-dive`, `security-risk`, or `product-tech`. Use `--must-keywords`, `--should-keywords`, and `--exclude-keywords` when the user provides explicit quality criteria.

Markdown digests are grouped by deterministic topics. JSON entries include `topic` for downstream routing.
```

- [ ] **Step 3: Update `references/scoring.md`**

Add:

```markdown
## Digest Quality Signals

- Must keyword title matches are strong relevance signals.
- Should keyword matches increase score but do not admit an entry by themselves.
- Summary-only matches are weaker than title matches.
- Entries are assigned deterministic topics: `AI / LLM`, `Engineering`, `Security`, `Product / Business`, or `Other`.
```

- [ ] **Step 4: Update `README.md` and `README.zh-CN.md`**

Add current skills table and digest quality summary from Task 2. Include:

```markdown
- `rss-ai-digest` now supports deterministic digest presets, keyword groups, and topic-grouped Markdown output.
- `rss-source-curator` owns source governance and registry maintenance workflows.
```

- [ ] **Step 5: Create `docs/releases/v0.2.0.md`**

Add:

```markdown
# rss-agent-skills v0.2.0

Release target: 2026-05-21 or later

## Highlights

- Adds `rss-source-curator` as the second Skill in the RSS Skills suite.
- Improves `rss-ai-digest` with deterministic digest presets.
- Adds must / should / exclude keyword groups.
- Adds deterministic topic assignment and grouped Markdown digest output.
- Keeps source-governance commands behavior-compatible and avoids script duplication.

## Validation

- `python3 -m unittest tests/test_rss_monitor.py -v`
- `quick_validate.py skills/rss-ai-digest`
- `quick_validate.py skills/rss-source-curator`
- `git diff --check`
```

- [ ] **Step 6: Update `CHANGELOG.md`**

Add:

```markdown
## v0.2.0 - Unreleased

### Added

- Added `rss-source-curator` as the source governance Skill.
- Added deterministic digest presets for research, engineering, security, and product/technology workflows.
- Added must / should / exclude keyword groups.
- Added deterministic topic assignment and grouped Markdown digest output.

### Changed

- Presented the repository as an RSS Skills suite.
- Kept existing digest command behavior backward compatible while adding new digest quality controls.
```

- [ ] **Step 7: Run public doc scan**

Run:

```bash
rg -n "(/Users/[^[:space:]]+|/private[/]tmp|My[-]Skills|T[D]B|TO[D]O)" README.md README.zh-CN.md CHANGELOG.md docs/project-status.zh-CN.md docs/releases/v0.2.0.md skills/rss-ai-digest/SKILL.md skills/rss-source-curator/SKILL.md
```

Expected: no matches.

- [ ] **Step 8: Commit Task 7**

Run:

```bash
git add README.md README.zh-CN.md skills/rss-ai-digest/SKILL.md skills/rss-ai-digest/references/scoring.md skills/rss-ai-digest/references/feed-registry.md docs/project-status.zh-CN.md CHANGELOG.md docs/releases/v0.2.0.md VERSION
git commit -m "docs: prepare rss skills suite v0.2.0"
```

---

## Task 8: Final Verification

**Files:**
- Read: all changed files
- No expected code creation in this task unless verification exposes a concrete issue

- [ ] **Step 1: Run full unit test suite**

Run:

```bash
python3 -m unittest tests/test_rss_monitor.py -v
```

Expected: all tests pass.

- [ ] **Step 2: Validate both Skills**

Run:

```bash
python3 /path/to/skill-creator/scripts/quick_validate.py skills/rss-ai-digest
python3 /path/to/skill-creator/scripts/quick_validate.py skills/rss-source-curator
```

Expected: both return `Skill is valid!`.

- [ ] **Step 3: Verify no copied script under `rss-source-curator`**

Run:

```bash
find skills/rss-source-curator -type f | sort
```

Expected: only `SKILL.md`, `agents/openai.yaml`, and files under `references/`.

- [ ] **Step 4: Check whitespace**

Run:

```bash
git diff --check
```

Expected: no output.

- [ ] **Step 5: Check status**

Run:

```bash
git status --short
```

Expected: no unstaged or uncommitted changes.

- [ ] **Step 6: Present completion for review**

Report:

```text
Phase 2 implementation complete locally.

Validated:
- tests/test_rss_monitor.py
- quick_validate.py skills/rss-ai-digest
- quick_validate.py skills/rss-source-curator
- git diff --check

Latest commits:
- 1234567 feat: add rss source curator skill
- 2345678 feat: add digest keyword groups
- 3456789 docs: prepare rss skills suite v0.2.0

Ready for v0.2.0 release review.
```

Do not create a `v0.2.0` tag until the user explicitly approves the release.
