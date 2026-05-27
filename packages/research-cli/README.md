# @subscription-research/cli

Local-first CLI for subscription research workspaces.

## Commands

```bash
subscription-research init --workspace research-workspace
subscription-research ingest rss --workspace research-workspace --registry feeds.json
subscription-research content fetch --workspace research-workspace --since 7d --limit 20
subscription-research brief evidence --workspace research-workspace --question "AI daily" --since 24h
subscription-research source-health --workspace research-workspace --format markdown
subscription-research trend scan --profile ai-tech --web-url-list candidate-pages.md --format markdown
subscription-research trend scan --profile ai-tech --hacker-news-items hn-items.json --github-releases github-releases.json
subscription-research rss import-opml --opml feeds.opml --registry feeds.json
subscription-research rss discover --url https://example.com/blog --validate
subscription-research rss discover --input candidate-pages.md --validate
subscription-research rss apply-source-patch --registry feeds.json --patch discovery.json --output feeds.updated.json --apply
subscription-research rss digest --registry feeds.json --state seen.json --since 24h --preset ai-strict
subscription-research rss curate-sources --registry feeds.json --health source-health.json
```

RSS ingest and direct RSS registry commands use the Node/TypeScript RSS runtime. `content fetch` is optional; it enriches archived articles with readable full-text excerpts stored in SQLite and `data/content-cache/`. `trend scan` is an early public trend radar command that turns public URL lists, Hacker News item JSON, and GitHub release JSON into profile-aware trend cards.
