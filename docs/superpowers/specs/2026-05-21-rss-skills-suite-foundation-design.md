# RSS Skills Suite Foundation + Digest Quality Design

Date: 2026-05-21

## Background

`rss-agent-skills` has reached the `v0.1.0` stable checkpoint. The first released package, `rss-ai-digest`, already supports OPML import, RSS/Atom parsing, feed fetching, filtering, scoring, seen-state dedupe, source health, source evaluation, source curation, and safe source patch application.

The next stage should move the repository from a single Skill toward an RSS Skills suite while improving the quality of the daily digest. The release-before-splitting gate has been satisfied by `v0.1.0`, so a controlled first split is now appropriate.

## Phase 2 Goal

Build the foundation for an RSS Skills suite by adding `rss-source-curator` as the first separate Skill, while improving `rss-ai-digest` daily digest quality through better presets, keyword semantics, grouping, and Markdown output structure.

This phase targets `v0.2.0`.

## Design Principles

- Keep the core package portable across agent runtimes.
- Do not create Codex-only, Claude-only, GitHub Actions-only, n8n-only, or plugin-marketplace-specific behavior.
- Do not copy `rss_monitor.py` into multiple Skills.
- Keep `skills/<skill-name>/SKILL.md` as the standard Skill entrypoint.
- Keep detailed schemas, examples, and long workflows in `references/`.
- Make the first Skill split small enough to validate suite shape without destabilizing the digest workflow.
- Improve digest quality through deterministic rules first; defer full article fetching, LLM summary, and LLM reranking to Phase 3 or later.

## Skill Boundary

### `rss-ai-digest`

Primary responsibility: content discovery and readable digest generation.

Owns:

- `digest`
- `check-new`
- article filtering
- article scoring
- seen-state dedupe
- digest presets
- must / should / exclude keyword semantics
- digest grouping
- user-facing Markdown digest structure
- JSON output for automation pipelines

### `rss-source-curator`

Primary responsibility: feed source quality, maintenance, and registry governance.

Owns:

- `evaluate-sources`
- `curate-sources`
- `apply-source-patch`
- source health review
- source quality recommendations
- registry maintenance guidance
- future OPML patch generation
- future source cleanup workflow

### Shared Implementation

For Phase 2, keep the existing deterministic implementation in:

```text
skills/rss-ai-digest/scripts/rss_monitor.py
```

`rss-source-curator` should call this existing script for source-governance commands rather than duplicating implementation. A future `v0.3.0` can extract a true shared module such as `shared/rss_core/` once the Skill boundaries are proven.

## Milestone 2.1: Source Curator Skill Split

### Scope

Add a standard Skill package:

```text
skills/rss-source-curator/
├── SKILL.md
├── agents/openai.yaml
└── references/
    ├── source-governance.md
    └── registry-maintenance.md
```

`rss-source-curator/SKILL.md` should route agents to the existing commands:

- `evaluate-sources`
- `curate-sources`
- `apply-source-patch`

It should clearly state that the Skill does not own article digest generation.

### Documentation Updates

Update project docs to show suite shape:

- `README.md`
- `README.zh-CN.md`
- `docs/project-status.zh-CN.md`
- `CHANGELOG.md`
- `AGENTS.md`

README should list:

```text
Current Skills
- rss-ai-digest
- rss-source-curator
```

### Validation

- Existing `tests/test_rss_monitor.py` must continue passing.
- `quick_validate.py skills/rss-ai-digest` must pass.
- `quick_validate.py skills/rss-source-curator` must pass.
- Public docs must not contain local absolute paths.
- No copied `rss_monitor.py` should appear under `rss-source-curator`.

### Done Definition

- `rss-source-curator` exists as a valid Skill.
- Source governance docs are discoverable from `rss-source-curator/SKILL.md`.
- Source governance commands remain behavior-compatible.
- The repository presents itself as a two-Skill suite.

## Milestone 2.2: Digest Quality Improvements

### Scope

Improve deterministic daily digest quality in `rss-ai-digest` without adding external dependencies or LLM-only behavior.

### Presets

Keep existing:

- `ai-strict`

Add deterministic presets:

- `ai-research`
- `engineering-deep-dive`
- `security-risk`
- `product-tech`

Each preset should define:

- default must keywords
- default should keywords
- default exclude keywords
- default minimum score
- whether a title keyword match is required

### Keyword Semantics

Add explicit keyword groups:

- `must`: at least one required signal group must match, depending on mode.
- `should`: optional relevance signals that increase score.
- `exclude`: exclusion terms that remove entries.

Initial CLI shape should stay simple and file/argument based:

```bash
--must-keywords "llm,agents,evals"
--should-keywords "benchmark,inference,reliability"
--exclude-keywords "webinar,sponsor,hiring"
```

The existing `--keywords` option should remain compatible and map to the current behavior. New options must not break existing automation.

### Digest Grouping

Add deterministic topic grouping for Markdown output:

- AI / LLM
- Engineering
- Security
- Product / Business
- Other

Each reported entry should receive a `topic` field in JSON output. Markdown output should group entries by topic after a short overview section.

### Markdown Output Structure

Revise `digest --format markdown` toward:

```text
## RSS AI Digest

### Overview
- Reported entries: N
- Top topics: AI / LLM, Engineering
- Failed feeds: N

### Top Picks
1. [Article title](https://example.com/article)
   - Score: 9/10
   - Source: Example Source
   - Reason: title keyword match, trusted source

### AI / LLM
1. [Article title](https://example.com/article)
   - Score: 9/10
   - Source: Example Source
   - Reason: must keyword match

### Engineering
1. [Article title](https://example.com/engineering)
   - Score: 8/10
   - Source: Engineering Source
   - Reason: technical depth signal

### Security
No matching entries.

### Product / Business
No matching entries.

### Other
No matching entries.

### Failed Feeds
- Example Feed: connection timeout

### Run Stats
- Feeds: 89 succeeded, 3 failed, 92 enabled
- Entries: 420 fetched, 18 filtered, 9 reported
- Seen state: 9 entries marked seen
```

The output should remain concise and suitable for agents to summarize further in Chinese or English.

### Scoring Adjustments

Keep the current 10-point scoring system and add small deterministic adjustments:

- reward title matches from must keywords
- reward title + summary double matches
- reward should-keyword matches
- penalize summary-only weak matches
- penalize promotional, hiring, webinar, coupon, sponsor, and press-release terms
- penalize entries missing core metadata

The scoring behavior must stay explainable through `score_reasons` and `noise_flags`.

### Validation

Add tests for:

- preset defaults
- must / should / exclude matching
- backward compatibility of `--keywords`
- topic assignment
- Markdown grouping order
- JSON `topic` field
- score reasons for must/should/title/summary-only cases

### Done Definition

- Existing digest commands remain backward compatible.
- New preset behavior is deterministic and tested.
- Markdown digest is more readable and grouped.
- JSON output exposes enough structure for downstream agents.
- Tests and Skill validation pass.

## Out Of Scope For Phase 2

- Full article body fetching.
- HTML readability extraction.
- LLM-generated summaries.
- LLM reranking.
- Semantic embeddings.
- Similar article clustering.
- SQLite or database storage.
- Web UI or dashboard.
- Notification integrations.
- Plugin marketplace packaging.
- Runtime-specific wrappers.

These are future phases after the suite foundation and deterministic digest quality improvements stabilize.

## Release Strategy

Target release: `v0.2.0`.

`v0.2.0` should include:

- first two-Skill suite shape
- `rss-source-curator`
- improved digest presets
- must / should / exclude keyword semantics
- grouped Markdown digest output
- updated English and Chinese README files
- updated release notes

Do not publish `v0.2.0` until both Skills validate and existing digest behavior remains backward compatible.

## Risks And Mitigations

### Risk: Skill Split Creates Duplicated Logic

Mitigation: `rss-source-curator` calls the existing deterministic script. Do not copy script files. Extract shared modules only after boundaries are proven.

### Risk: Digest Quality Changes Break Existing Automation

Mitigation: keep `--keywords` and existing output envelope compatible. Add new fields instead of removing existing fields.

### Risk: Markdown Output Becomes Too Verbose

Mitigation: include overview, top picks, grouped sections, failed feeds, and stats, but keep each entry compact.

### Risk: Presets Become Too Opinionated

Mitigation: presets provide defaults only. Users can override keywords, exclude terms, and min-score.

## Recommended Implementation Order

1. Implement Milestone 2.1 first: `rss-source-curator` Skill split.
2. Validate suite docs and both Skill packages.
3. Implement Milestone 2.2: digest presets and keyword semantics.
4. Implement topic assignment and grouped Markdown output.
5. Update docs and release notes for `v0.2.0`.

This keeps architecture changes and digest-quality changes separable while still delivering both in the same phase.
