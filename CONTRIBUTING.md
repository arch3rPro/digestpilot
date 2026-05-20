# Contributing

Thanks for improving `rss-agent-skills`.

## Scope

This repository keeps RSS Skills portable across agent runtimes. Contributions should avoid coupling the core Skill to Codex, Claude, Cursor, OpenClaw, n8n, GitHub Actions, cron, or any single runtime.

## Before Changing Code

- Keep the standard Skill layout: `skills/<skill-name>/SKILL.md`.
- Put deterministic behavior in `scripts/`.
- Put schemas, source lists, scoring rules, and workflow references in `references/`.
- Keep runtime output files out of Git.
- Update `CHANGELOG.md` for visible behavior or documentation changes.

## Verification

Run the test suite:

```bash
python3 -m unittest tests/test_rss_monitor.py -v
```

Check whitespace:

```bash
git diff --check
```

Validate the Skill package when the local validator is available:

```bash
python3 /path/to/skill-creator/scripts/quick_validate.py skills/rss-ai-digest
```

## Release Gate

Before splitting stable `rss-ai-digest` behavior into separate Skills, publish a release version first so downstream agents can pin the current single-Skill contract.
