# Release Checklist

Use this checklist before publishing a stable release, especially before splitting `rss-ai-digest` into separate RSS Skills.

## Pre-Release Checks

- Confirm `CHANGELOG.md` describes the user-visible delta.
- Confirm `README.md` and `README.zh-CN.md` describe the current package shape.
- Run tests:

```bash
python3 -m unittest tests/test_rss_monitor.py -v
```

- Check whitespace:

```bash
git diff --check
```

- Validate the Skill package when the local validator is available:

```bash
python3 /path/to/skill-creator/scripts/quick_validate.py skills/rss-ai-digest
```

## Versioning

Recommended first stable checkpoint:

```text
v0.1.0
```

Before splitting into multiple Skills, publish a release that documents:

- Current single-Skill command contract.
- Supported registry, seen-state, health, and patch file shapes.
- Migration expectations for future `rss-source-curator`, `rss-alert-monitor`, or publisher Skills.

## Publish

- Create a Git tag for the selected version.
- Push the tag.
- Create GitHub release notes from the changelog and release summary.
