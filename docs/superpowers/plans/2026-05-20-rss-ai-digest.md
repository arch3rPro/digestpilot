# RSS AI Digest Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a portable `rss-ai-digest` Skill for AI and technical RSS discovery, scoring, source evaluation, and digest output.

**Architecture:** Keep one standard Skill folder with a concise `SKILL.md`, detailed reference files, and one deterministic Python CLI. Use JSON registry/state files and Markdown/JSON output so any Agent runtime can call the tool.

**Tech Stack:** Python 3 standard library, `xml.etree.ElementTree`, `argparse`, `unittest`, standard Agent Skill packaging.

---

## File Structure

- Create `skills/rss-ai-digest/SKILL.md`: Skill trigger metadata and concise workflow routing.
- Create `skills/rss-ai-digest/agents/openai.yaml`: optional OpenAI/Codex UI metadata.
- Create `skills/rss-ai-digest/scripts/rss_monitor.py`: RSS/Atom/OPML parsing, filtering, scoring, state handling, and source evaluation CLI.
- Create `skills/rss-ai-digest/references/feed-registry.md`: registry and state schema reference.
- Create `skills/rss-ai-digest/references/scoring.md`: article and source scoring guidance.
- Create `skills/rss-ai-digest/references/automation.md`: platform-neutral automation recipes.
- Create `skills/rss-ai-digest/references/base-feeds.opml`: curated starter OPML for AI and technical sources.
- Create `tests/test_rss_monitor.py`: local regression tests for the script.

### Task 1: Initialize Skill Package

**Files:**
- Create: `skills/rss-ai-digest/SKILL.md`
- Create: `skills/rss-ai-digest/agents/openai.yaml`
- Create: `skills/rss-ai-digest/scripts/`
- Create: `skills/rss-ai-digest/references/`

- [ ] Run `init_skill.py rss-ai-digest --path skills --resources scripts,references --interface display_name="RSS AI Digest" --interface short_description="Rank high-signal AI and technical RSS updates." --interface default_prompt="Use $rss-ai-digest to find high-quality new AI and technical articles from my RSS feeds."`
- [ ] Replace generated placeholders in `SKILL.md` with the final trigger description and workflow instructions.
- [ ] Confirm `agents/openai.yaml` contains only interface metadata and no core behavior.

### Task 2: Write Script Tests First

**Files:**
- Create: `tests/test_rss_monitor.py`

- [ ] Add tests for OPML import, RSS parsing, Atom parsing, keyword filtering, seen-state dedupe, article scoring, and source evaluation.
- [ ] Run `python3 -m unittest tests/test_rss_monitor.py -v`.
- [ ] Confirm tests fail because `skills/rss-ai-digest/scripts/rss_monitor.py` has not implemented the expected functions yet.

### Task 3: Implement RSS Monitor CLI

**Files:**
- Create/modify: `skills/rss-ai-digest/scripts/rss_monitor.py`

- [ ] Implement public functions used by tests: `parse_opml`, `parse_feed_xml`, `load_registry`, `filter_entries`, `score_entry`, `entry_key`, `load_seen_state`, `mark_seen`, `evaluate_sources`, `render_markdown_digest`, and CLI subcommands.
- [ ] Run `python3 -m unittest tests/test_rss_monitor.py -v`.
- [ ] Confirm all tests pass.

### Task 4: Add References

**Files:**
- Create: `skills/rss-ai-digest/references/feed-registry.md`
- Create: `skills/rss-ai-digest/references/scoring.md`
- Create: `skills/rss-ai-digest/references/automation.md`
- Create: `skills/rss-ai-digest/references/base-feeds.opml`

- [ ] Document feed registry, state, scoring, and automation recipes.
- [ ] Keep references platform-neutral and avoid Codex-only or Claude-only assumptions.

### Task 5: Validate And Commit

**Files:**
- Validate: `skills/rss-ai-digest/SKILL.md`
- Validate: `skills/rss-ai-digest/agents/openai.yaml`
- Validate: `skills/rss-ai-digest/scripts/rss_monitor.py`
- Validate: `tests/test_rss_monitor.py`

- [ ] Run `python3 /path/to/skill-creator/scripts/quick_validate.py skills/rss-ai-digest`.
- [ ] Run `python3 -m unittest tests/test_rss_monitor.py -v`.
- [ ] Run `git status --short`.
- [ ] Commit the initialized repository if verification passes.
