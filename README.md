# DigestPilot

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

[中文说明](./README.zh-CN.md) | [Agent Examples](./examples/README.md) | [Changelog](./CHANGELOG.md) | [v0.3.0](./docs/releases/v0.3.0.md)

An AI agent toolkit that turns trusted information streams into daily briefs and research-ready evidence.

DigestPilot is designed for agents, not as a standalone RSS app. An agent should load the relevant `SKILL.md`, use the bundled references and deterministic CLI where needed, then write the user-facing digest, source review, trend scan, or research report from the prepared evidence.

## Agent Routing

| User intent | Skill to load | Deterministic step | Agent output |
| --- | --- | --- | --- |
| "Prepare an AI/technical RSS digest." | [`rss-ai-digest`](./skills/rss-ai-digest/SKILL.md) | Import OPML, fetch RSS/Atom, filter, score, dedupe. | Quick Markdown or JSON digest focused on article content. |
| "Monitor new posts for a topic." | [`rss-ai-digest`](./skills/rss-ai-digest/SKILL.md) | Run `check-new` with explicit state paths. | New matching entries, with seen-state updated according to policy. |
| "Find public AI or product trends." | [`public-trend-radar`](./skills/public-trend-radar/SKILL.md) | Fetch public signals, then generate trend cards. | Reviewable trend cards with evidence and downstream suggestions. |
| "Review or clean up my sources." | [`rss-source-curator`](./skills/rss-source-curator/SKILL.md) | Evaluate source health and generate reviewable patches. | Keep/watch/disable/remove recommendations. |
| "Create a subscription-backed research memo." | [`subscription-research-agent`](./skills/subscription-research-agent/SKILL.md) | Ingest evidence into a local workspace and generate an evidence brief. | Agent-written research synthesis with evidence, caveats, and follow-up questions. |

## Agent Workflow

1. Load the matching Skill entrypoint under `skills/<skill-name>/SKILL.md`.
2. Read only the reference files needed for the task, such as feed schema, scoring, digest output, source governance, evidence brief, or research report contracts.
3. Use explicit file paths for feed registries, seen-state, source-health, workspace, output, and patches.
4. Treat CLI output as evidence and state, not as the final research judgment.
5. Write the final user-facing artifact in the requested language and format.
6. Do not publish, notify, delete, or disable sources unless the user explicitly asks for that action.

## Skill Contracts

### rss-ai-digest

Use for content discovery, daily news, key information, and monitoring. It covers RSS 2.0, Atom, OPML import, keyword/date/author/category/language filtering, scoring, topic grouping, seen-state dedupe, and Markdown or JSON digest output.

Primary references:

- [Feed registry](./skills/rss-ai-digest/references/feed-registry.md)
- [Scoring](./skills/rss-ai-digest/references/scoring.md)
- [Digest report output](./skills/rss-ai-digest/references/digest-report.md)
- [Automation recipes](./skills/rss-ai-digest/references/automation.md)
- [Base OPML](./skills/rss-ai-digest/references/base-feeds.opml)

### rss-source-curator

Use for source governance. It reviews source quality, health history, failed feeds, and registry changes. It should produce reviewable actions before any registry is changed.

Primary references:

- [Source governance](./skills/rss-source-curator/references/source-governance.md)
- [Registry maintenance](./skills/rss-source-curator/references/registry-maintenance.md)

### public-trend-radar

Use for public-channel trend discovery. It produces trend cards for `ai-tech` and `product-business` profiles and keeps trend discovery separate from daily reports, source governance, publishing, and final research synthesis.

Typical flow:

```bash
subscription-research trend fetch-public --profile ai-tech --output-dir research-workspace/public-trend-radar/latest
subscription-research trend scan \
  --profile ai-tech \
  --web-url-list research-workspace/public-trend-radar/latest/web-url-list.md \
  --hacker-news-items research-workspace/public-trend-radar/latest/hn-items.json \
  --github-releases research-workspace/public-trend-radar/latest/github-releases.json \
  --format markdown \
  --output research-workspace/public-trend-radar/latest/trend-cards.md
```

### subscription-research-agent

Use for deep research workflows around subscription evidence. Deterministic tooling prepares workspace data and evidence briefs; the agent writes the final memo or research synthesis. Ordinary daily digests should stay in `rss-ai-digest`.

Primary references:

- [Research workspace](./skills/subscription-research-agent/references/research-workspace.md)
- [Evidence brief](./skills/subscription-research-agent/references/evidence-brief.md)
- [Research daily or memo](./skills/subscription-research-agent/references/daily-report.md)

## Deterministic Runtime

The shared runtime is the Node/TypeScript CLI in [`packages/research-cli`](./packages/research-cli/README.md). It is file-based so different agent runtimes can call it without changing the Skill contract.

The current development command is `subscription-research`, but the command name is not a permanent product contract. Install or link the runtime before using the Skills:

```bash
cd packages/research-cli
npm install
npm run build
npm link
```

Diagnose local setup from the repository root:

```bash
node scripts/doctor.mjs
```

If the linked command is unavailable, use the repository-local fallback `node packages/research-cli/dist/src/cli.js ...` or set `DIGESTPILOT_RUNTIME_CMD`. See [Runtime setup](./docs/runtime.md).

Common commands by responsibility:

- Digest and monitoring: `subscription-research rss import-opml`, `subscription-research rss digest`, `subscription-research rss check-new`
- Public trend radar: `subscription-research trend fetch-public`, `subscription-research trend scan`
- Feed discovery: `subscription-research rss discover`
- Source maintenance: `subscription-research rss evaluate-sources`, `subscription-research rss curate-sources`, `subscription-research rss apply-source-patch`, `subscription-research source-health`
- Deep research: `subscription-research init`, `subscription-research ingest rss`, `subscription-research content fetch`, `subscription-research brief evidence`

Prompt-level examples are in [examples/README.md](./examples/README.md). CLI details belong in the Skill references and package README, not in this project overview.

## Plugin Packaging

DigestPilot now includes a generated Claude Code and Codex plugin package at [`plugins/digestpilot`](./plugins/digestpilot/README.md). The root [`skills/`](./skills) directory remains the source of truth.

Regenerate the plugin package after changing Skills:

```bash
node scripts/build-plugin.mjs --target all
node scripts/validate-plugin-package.mjs
```

Runtime manifests:

- Claude Code: [`plugins/digestpilot/.claude-plugin/plugin.json`](./plugins/digestpilot/.claude-plugin/plugin.json)
- Codex: [`plugins/digestpilot/.codex-plugin/plugin.json`](./plugins/digestpilot/.codex-plugin/plugin.json)
- Claude marketplace: [`.claude-plugin/marketplace.json`](./.claude-plugin/marketplace.json)
- Codex marketplace: [`.agents/plugins/marketplace.json`](./.agents/plugins/marketplace.json)

## Boundaries

Current non-goals:

- Full RSS reader UI.
- Hosted research service.
- Built-in daemon, scheduler, or notification center.
- Email, Feishu, Slack, Webhook, or Obsidian publisher.
- Fully automated source discovery and scoring without review.
- Full-text analysis as a hard dependency for ordinary daily digests.
- Deterministic CLI generation of final research conclusions.
- Runtime-specific behavior in the core CLI or Skill contracts.

## Repository Map

```text
skills/
  rss-ai-digest/
  public-trend-radar/
  rss-source-curator/
  subscription-research-agent/
packages/
  research-cli/
plugins/
  digestpilot/
docs/
  releases/
examples/
scripts/
  build-plugin.mjs
  validate-plugin-package.mjs
```

Runtime outputs such as `feeds.json`, `seen.json`, `source-health.json`, `digest.md`, and `research-workspace/` should stay out of Git.

## Project Docs

- [Agent examples](./examples/README.md)
- [Project status](./docs/project-status.zh-CN.md)
- [Implemented features and roadmap](./docs/iteration-roadmap.zh-CN.md)
- [Plugin packaging roadmap](./docs/plugin-packaging-roadmap.md)
- [Release checklist](./docs/release-checklist.md)
- [Contributing](./CONTRIBUTING.md)
- [Agent instructions](./AGENTS.md)
- [Claude Code instructions](./CLAUDE.md)

## Maintainers

```bash
cd packages/research-cli && npm test
cd packages/research-cli && npm run typecheck
git diff --check
node scripts/build-plugin.mjs --target all
node scripts/validate-plugin-package.mjs
```

Skill validation, when the local validator is available:

```bash
python3 /path/to/skill-creator/scripts/quick_validate.py skills/rss-ai-digest
python3 /path/to/skill-creator/scripts/quick_validate.py skills/public-trend-radar
python3 /path/to/skill-creator/scripts/quick_validate.py skills/rss-source-curator
python3 /path/to/skill-creator/scripts/quick_validate.py skills/subscription-research-agent
```
