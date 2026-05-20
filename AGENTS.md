# AGENTS.md

## Project Overview

`rss-agent-skills` is a portable collection of RSS-related Skills for agent ecosystems. The current package, `rss-ai-digest`, helps agents import OPML, parse RSS/Atom feeds, monitor new AI and technical content, dedupe seen entries, score articles, evaluate source quality, and apply reviewed source curation patches.

Keep the repository platform-neutral. Do not make core behavior depend on Codex, Claude, Cursor, OpenClaw, n8n, GitHub Actions, or any single runtime.

## Repository Layout

- `skills/rss-ai-digest/SKILL.md`: main Skill entrypoint and workflow routing.
- `skills/rss-ai-digest/scripts/rss_monitor.py`: deterministic RSS/Atom/OPML CLI implementation.
- `skills/rss-ai-digest/references/`: feed registry, scoring, automation, and base OPML references.
- `tests/test_rss_monitor.py`: regression tests for the RSS monitor script.
- `README.md`: human-facing project overview and quick start.
- `CHANGELOG.md`: project change log.
- `docs/superpowers/`: design and implementation planning artifacts.

## Development Commands

Run the test suite before committing code changes:

```bash
python3 -m unittest tests/test_rss_monitor.py -v
```

Validate the Skill package when the local skill validator is available:

```bash
python3 /path/to/skill-creator/scripts/quick_validate.py skills/rss-ai-digest
```

Check basic Git whitespace issues:

```bash
git diff --check
```

## Coding Guidelines

- Prefer Python standard library for MVP functionality.
- Keep core scripts platform-neutral and callable from any agent runtime.
- Use explicit file paths for registry, state, health, and output files.
- Keep local runtime outputs out of Git. Examples: `feeds.json`, `seen.json`, `source-health.json`, `digest.md`, `latest.json`, `rss-output/`.
- Preserve the standard Skill layout: `skills/<skill-name>/SKILL.md`.
- Put repeatable behavior in `scripts/`; put schemas, scoring rules, and workflow references in `references/`.
- Do not add runtime-specific entrypoints unless the project explicitly starts a plugin-packaging phase.

## Documentation Guidelines

- Keep GitHub-facing docs free of local absolute paths.
- Use relative links in README and reference files.
- Update `CHANGELOG.md` for visible project changes.
- Keep `README.md` focused on humans; keep agent operational details in this file.
- Keep `SKILL.md` concise. Move long schemas, scoring logic, examples, and automation details to `references/`.

## Testing Guidelines

- Add or update tests when changing `rss_monitor.py` behavior.
- Test OPML behavior with `skills/rss-ai-digest/references/base-feeds.opml` when changing import logic.
- If tests create Python caches, remove or ignore them before finishing.
- Do not rely on network access for unit tests.

## Security And Privacy

- Do not commit secrets, API tokens, private feed credentials, `.env` files, or local state files.
- Treat feed registries and seen-state files as potentially personal reading data unless the user says they are public.
- Do not add notification integrations that send data externally without explicit user direction.

## Git Workflow

- Keep commits focused and descriptive.
- Before pushing, run the relevant tests and `git diff --check`.
- Do not stage unrelated local files or generated runtime outputs.
- If publishing repository metadata, keep naming and descriptions broad enough for multiple future RSS Skills.
- Before splitting stable `rss-ai-digest` behavior into multiple Skills, publish a release version first.
