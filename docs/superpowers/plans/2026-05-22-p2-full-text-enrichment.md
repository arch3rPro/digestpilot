# P2 Full-Text Enrichment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add optional article full-text fetching and readability extraction so subscription evidence can use cleaned article excerpts instead of only RSS summaries.

**Architecture:** Keep RSS digest fast and metadata-first. Add a separate enrichment path that reads archived articles from a research workspace, fetches article HTML on demand, extracts readable text with `@mozilla/readability` and `jsdom`, writes results to SQLite plus a local cache, and lets evidence selection prefer enriched excerpts when available.

**Tech Stack:** Node.js 20, TypeScript, better-sqlite3, commander, jsdom, @mozilla/readability, node:test.

---

### Task 1: Content Schema And Cache Paths

**Files:**
- Modify: `packages/research-cli/src/workspace/schema.ts`
- Modify: `packages/research-cli/src/workspace/paths.ts`
- Modify: `packages/research-cli/src/types.ts`
- Test: `packages/research-cli/test/init.test.ts`

- [ ] Add `article_content` table with `article_id`, `url`, `title`, `byline`, `site_name`, `excerpt`, `text_content`, `content_length`, `status`, `error`, `fetched_at`, and `raw_json`.
- [ ] Add `data/content-cache/` to workspace directories.
- [ ] Add migration coverage for existing workspaces.

### Task 2: Readability Extraction

**Files:**
- Create: `packages/research-cli/src/content/readability.ts`
- Test: `packages/research-cli/test/content-readability.test.ts`

- [ ] Implement deterministic `extractReadableContent(html, url)` using `JSDOM` and `Readability`.
- [ ] Strip excessive whitespace and cap excerpt length without mutating stored full text.
- [ ] Test article extraction, fallback behavior, and short/empty article handling.

### Task 3: Article Enrichment Command

**Files:**
- Create: `packages/research-cli/src/commands/enrich-content.ts`
- Modify: `packages/research-cli/src/cli.ts`
- Test: `packages/research-cli/test/content-enrichment.test.ts`

- [ ] Add `subscription-research content fetch --workspace ...`.
- [ ] Select archived articles by `--since`, `--min-score`, `--limit`, optional `--article-id`, and missing/failed content status.
- [ ] Fetch HTML with timeout, extract readable content, upsert SQLite content rows, write cache JSON, and update `articles.content_excerpt`.
- [ ] Return JSON summary with fetched, cached, failed, skipped, and output cache paths.

### Task 4: Evidence Brief Uses Enriched Excerpts

**Files:**
- Modify: `packages/research-cli/src/evidence/select.ts`
- Test: `packages/research-cli/test/evidence.test.ts`

- [ ] Join `article_content` in evidence selection.
- [ ] Prefer `article_content.excerpt` when `status = 'fetched'`.
- [ ] Keep RSS summary fallback unchanged.

### Task 5: Skill And Public Docs

**Files:**
- Modify: `skills/subscription-research-agent/SKILL.md`
- Modify: `skills/subscription-research-agent/references/evidence-brief.md`
- Modify: `docs/iteration-roadmap.zh-CN.md`
- Modify: `docs/project-status.zh-CN.md`
- Modify: `CHANGELOG.md`

- [ ] Document that full-text enrichment is optional and local-first.
- [ ] Make clear ordinary RSS digests do not require full-text fetch.
- [ ] Mark the first P2 content-enrichment slice as in progress or completed based on implementation.

### Verification

- [ ] `cd packages/research-cli && npm test`
- [ ] `cd packages/research-cli && npm run typecheck`
- [ ] Skill validator for `rss-ai-digest` and `subscription-research-agent`
- [ ] `git diff --check`
