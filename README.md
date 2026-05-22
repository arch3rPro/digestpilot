# RSS Agent Skills

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

[中文说明](./README.zh-CN.md) | [Agent Examples](./examples/README.md) | [Changelog](./CHANGELOG.md) | [v0.3.0](./docs/releases/v0.3.0.md)

Portable RSS Skills and local-first subscription research workflows for agent ecosystems.

This repository is designed for agents, not as a standalone RSS app. An agent should load the relevant `SKILL.md`, use the bundled references and deterministic CLI where needed, then write the user-facing digest, source review, or research report from the prepared evidence.

## Agent Routing

| User intent | Skill to load | Deterministic step | Agent output |
| --- | --- | --- | --- |
| "Prepare an AI/technical RSS digest." | [`rss-ai-digest`](./skills/rss-ai-digest/SKILL.md) | Import OPML, fetch RSS/Atom, filter, score, dedupe. | Quick Markdown or JSON digest focused on article content. |
| "Monitor new posts for a topic." | [`rss-ai-digest`](./skills/rss-ai-digest/SKILL.md) | Run `check-new` with explicit state paths. | New matching entries, with seen-state updated according to policy. |
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

### subscription-research-agent

Use for deep research workflows around subscription evidence. Deterministic tooling prepares workspace data and evidence briefs; the agent writes the final memo or research synthesis. Ordinary daily digests should stay in `rss-ai-digest`.

Primary references:

- [Research workspace](./skills/subscription-research-agent/references/research-workspace.md)
- [Evidence brief](./skills/subscription-research-agent/references/evidence-brief.md)
- [Research daily or memo](./skills/subscription-research-agent/references/daily-report.md)

## Deterministic Runtime

The shared runtime is the Node/TypeScript `subscription-research` CLI in [`packages/research-cli`](./packages/research-cli/README.md). It is file-based so different agent runtimes can call it without changing the Skill contract.

Common commands by responsibility:

- Digest and monitoring: `subscription-research rss import-opml`, `subscription-research rss digest`, `subscription-research rss check-new`
- Source maintenance: `subscription-research rss evaluate-sources`, `subscription-research rss curate-sources`, `subscription-research rss apply-source-patch`, `subscription-research source-health`
- Deep research: `subscription-research init`, `subscription-research ingest rss`, `subscription-research brief evidence`

Prompt-level examples are in [examples/README.md](./examples/README.md). CLI details belong in the Skill references and package README, not in this project overview.

## Boundaries

Current non-goals:

- Full RSS reader UI.
- Hosted research service.
- Built-in daemon, scheduler, or notification center.
- Email, Feishu, Slack, Webhook, or Obsidian publisher.
- Automatic feed discovery.
- Full-text fetching and readability extraction.
- Deterministic CLI generation of final research conclusions.
- Claude/OpenAI/OpenClaw plugin packaging.

## Repository Map

```text
skills/
  rss-ai-digest/
  rss-source-curator/
  subscription-research-agent/
packages/
  research-cli/
docs/
  releases/
  superpowers/
examples/
```

Runtime outputs such as `feeds.json`, `seen.json`, `source-health.json`, `digest.md`, and `research-workspace/` should stay out of Git.

## Project Docs

- [Agent examples](./examples/README.md)
- [Project status](./docs/project-status.zh-CN.md)
- [Implemented features and roadmap](./docs/iteration-roadmap.zh-CN.md)
- [Release checklist](./docs/release-checklist.md)
- [Contributing](./CONTRIBUTING.md)
- [Agent instructions](./AGENTS.md)
- [Claude Code instructions](./CLAUDE.md)

Design history lives under [`docs/superpowers/`](./docs/superpowers/). Treat it as an archive, not the usage guide.

## Maintainers

```bash
cd packages/research-cli && npm test
cd packages/research-cli && npm run typecheck
git diff --check
```

Skill validation, when the local validator is available:

```bash
python3 /path/to/skill-creator/scripts/quick_validate.py skills/rss-ai-digest
python3 /path/to/skill-creator/scripts/quick_validate.py skills/rss-source-curator
python3 /path/to/skill-creator/scripts/quick_validate.py skills/subscription-research-agent
```
