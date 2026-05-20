# RSS AI Digest Source Patch Loop Plan

Date: 2026-05-21

## Goal

Close the source governance loop without turning source cleanup into unsafe automation. `curate-sources` should produce reviewable recommendations, and `apply-source-patch` should turn reviewed patch objects into a new registry file.

## Scope

- Add a portable `apply-source-patch` CLI command.
- Keep dry-run as the default behavior.
- Require `--apply` and an explicit `--output` path before writing a registry.
- Accept both direct patch lists and `curate-sources --format json` envelopes.
- Preserve the input registry unless the caller intentionally chooses the same output path.

## Release Gate

Before splitting stable `rss-ai-digest` behavior into separate Skills such as `rss-source-curator`, publish a release version first. The release should include notes for the current single-Skill contract, supported commands, and migration expectations.

## Verification

- Add regression tests before implementation.
- Run `python3 -m unittest tests/test_rss_monitor.py -v`.
- Run the Skill validator when available.
- Run `git diff --check`.
