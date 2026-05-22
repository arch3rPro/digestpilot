# AGENTS.md

## Project Overview

`rss-agent-skills` is a portable collection of RSS-related Skills and local-first subscription research workflows for agent ecosystems. The current suite includes `rss-ai-digest` for AI/technical content discovery, `rss-source-curator` for source governance and registry maintenance, and `subscription-research-agent` for research evidence orchestration.

Keep the repository platform-neutral. Do not make core behavior depend on Codex, Claude, Cursor, OpenClaw, n8n, GitHub Actions, or any single runtime.

## Repository Layout

- `skills/rss-ai-digest/SKILL.md`: main Skill entrypoint and workflow routing.
- `skills/rss-ai-digest/scripts/rss_monitor.py`: Python compatibility RSS/Atom/OPML CLI and parity oracle.
- `skills/rss-ai-digest/references/`: feed registry, scoring, automation, and base OPML references.
- `skills/rss-source-curator/SKILL.md`: source governance Skill entrypoint.
- `skills/rss-source-curator/references/`: source governance and registry maintenance references.
- `skills/subscription-research-agent/SKILL.md`: local-first research orchestration Skill entrypoint.
- `skills/subscription-research-agent/references/`: research workspace, evidence brief, and daily report contract references.
- `packages/research-cli/`: Node/TypeScript CLI package for research workspace, SQLite, RSS runtime, ingestion archive, and evidence brief generation.
- `tests/test_rss_monitor.py`: regression tests for the RSS monitor script.
- `README.md`: human-facing project overview and quick start.
- `README.zh-CN.md`: Chinese project overview.
- `VERSION`: current release version.
- `examples/README.md`: agent-level Skill invocation examples.
- `CONTRIBUTING.md`: contribution and verification workflow.
- `CHANGELOG.md`: project change log.
- `docs/release-checklist.md`: release preparation checklist.
- `docs/releases/`: release notes.
- `docs/superpowers/`: design and implementation planning artifacts.

## Development Commands

Run the test suite before committing code changes:

```bash
python3 -m unittest tests/test_rss_monitor.py -v
```

Run the research CLI test suite and typecheck when `packages/research-cli/` exists or when changing the research CLI contract:

```bash
cd packages/research-cli && npm test
cd packages/research-cli && npm run typecheck
```

Validate the Skill package when the local skill validator is available:

```bash
python3 /path/to/skill-creator/scripts/quick_validate.py skills/rss-ai-digest
python3 /path/to/skill-creator/scripts/quick_validate.py skills/rss-source-curator
python3 /path/to/skill-creator/scripts/quick_validate.py skills/subscription-research-agent
```

Check basic Git whitespace issues:

```bash
git diff --check
```

## Coding Guidelines

- Prefer the Node/TypeScript research CLI for distributable workflows.
- Keep compatibility scripts platform-neutral and callable from any agent runtime.
- Keep research workspace tooling local-first and file-based; do not require hosted storage or a single notes app.
- Keep final research daily reports Agent-written; deterministic tooling should prepare evidence and stable workspace paths, not pretend to produce final conclusions on its own.
- Use explicit file paths for registry, state, health, and output files.
- Keep local runtime outputs out of Git. Examples: `feeds.json`, `seen.json`, `source-health.json`, `digest.md`, `latest.json`, `rss-output/`, `research-workspace/`.
- Preserve the standard Skill layout: `skills/<skill-name>/SKILL.md`.
- Put repeatable compatibility behavior in `scripts/`; put schemas, scoring rules, and workflow references in `references/`.
- Do not add runtime-specific entrypoints unless the project explicitly starts a plugin-packaging phase.

## Documentation Guidelines

- Keep GitHub-facing docs free of local absolute paths.
- Use relative links in README and reference files.
- Update `CHANGELOG.md` for visible project changes.
- Keep `README.md` and `README.zh-CN.md` structurally aligned when changing public project positioning.
- Keep `README.md` focused on humans; keep agent operational details in this file.
- Keep `SKILL.md` concise. Move long schemas, scoring logic, examples, and automation details to `references/`.

## Testing Guidelines

- Add or update tests when changing `rss_monitor.py` behavior.
- Add or update Node tests when changing `packages/research-cli/` behavior.
- Add or update parity tests when Node RSS behavior intentionally tracks Python RSS behavior.
- Test OPML behavior with `skills/rss-ai-digest/references/base-feeds.opml` when changing import logic.
- If tests create Python caches, remove or ignore them before finishing.
- Do not rely on network access for unit tests.

## Security And Privacy

- Do not commit secrets, API tokens, private feed credentials, `.env` files, or local state files.
- Treat feed registries, seen-state files, research workspaces, entity lists, and evidence briefs as potentially personal reading data unless the user says they are public.
- Do not add notification integrations that send data externally without explicit user direction.

## Git Workflow

- Keep commits focused and descriptive.
- Before pushing, run the relevant tests and `git diff --check`.
- Do not stage unrelated local files or generated runtime outputs.
- If publishing repository metadata, keep naming and descriptions broad enough for multiple future RSS Skills.
- Keep additional RSS Skills aligned with the published suite contract and avoid runtime-specific forks.
