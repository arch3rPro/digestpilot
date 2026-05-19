# RSS AI Digest Post-Optimization Validation

Date: 2026-05-20

## Purpose

Validate the optimized `rss-ai-digest` workflow after implementing observability, concurrent fetch, token-aware matching, source metadata enrichment, and source governance improvements.

## Scope

Validated workflows:

- Repository Skill package validation.
- Installed Skill copy synchronization.
- OPML import with source metadata.
- Full 92-feed daily digest with persisted health.
- Source evaluation from the generated health file.
- Markdown digest output with run stats and failed-feed visibility.

## Commands

Skill validation:

```bash
PYTHONPATH=/path/to/pyyaml python3 /path/to/skill-creator/scripts/quick_validate.py skills/rss-ai-digest
```

OPML import with metadata:

```bash
python3 skills/rss-ai-digest/scripts/rss_monitor.py import-opml \
  --opml skills/rss-ai-digest/references/base-feeds.opml \
  --metadata skills/rss-ai-digest/references/source-metadata.json \
  --registry feeds.json
```

Full digest validation:

```bash
python3 skills/rss-ai-digest/scripts/rss_monitor.py digest \
  --registry feeds.json \
  --state seen.json \
  --health source-health.json \
  --since 24h \
  --keywords "agent,llm,rag,ai,model,inference,evals,benchmark" \
  --min-score 7 \
  --mark-seen none \
  --timeout 10 \
  --max-workers 12 \
  --format markdown
```

Source governance validation:

```bash
python3 skills/rss-ai-digest/scripts/rss_monitor.py evaluate-sources \
  --registry feeds.json \
  --health source-health.json
```

## Results

### Installed Copy Sync

The installed `rss-ai-digest` Skill copy was synchronized from the repository copy. A recursive diff between the repository Skill directory and the installed Skill directory returned no differences after sync.

### Full Digest Performance

The earlier retrospective recorded a full 92-feed digest taking roughly two minutes with serial fetches.

Post-optimization full digest runs completed in roughly 14-16 seconds with `--timeout 10 --max-workers 12`.

Observed run stats:

- JSON run: 92 enabled feeds, 88 succeeded, 4 failed, 2623 entries fetched, 9 filtered, 7 reported, 15.39 seconds.
- Markdown run: 92 enabled feeds, 86 succeeded, 6 failed, 2493 entries fetched, 8 filtered, 6 reported, 14.11 seconds.

The difference between the two runs came from normal live-feed/network variability. This is expected for external RSS sources and is now visible in the output.

### Markdown Digest Output

The Markdown run surfaced these reported entries:

1. `Alternatives for the EDIT tool of LLM agents` from `antirez.com`, score `10/10`.
2. `The AI trial of the century ends with a whimper` from `garymarcus.substack.com`, score `10/10`.
3. `AI Is Too Expensive` from `wheresyoured.at`, score `9/10`.
4. `Andrej Karpathy Joined Anthropic` from `daringfireball.net`, score `7/10`.
5. `Messing with bots` from `herman.bearblog.dev`, score `7/10`.
6. `Something's Rotten in the State of macOS Icon Design` from `blog.jim-nielsen.com`, score `7/10`.

The run also included a `Failed feeds` section. Observed failures included HTTP 429, HTTP 530, XML parse failure, and SSL handshake timeout cases. These failures were no longer hidden behind a generic "No matching entries found" result.

### Source Evaluation

`evaluate-sources` successfully consumed the health file produced by `digest`.

Observed governance behavior:

- Curated high-priority sources such as `simonwillison-net`, `antirez-com`, `dwarkesh-com`, `geoffreylitt-com`, `gwern-net`, `minimaxir-com`, and `krebsonsecurity-com` received `keep` recommendations when healthy.
- Failing one-run sources were surfaced with `status` and `last_error`.
- Missing health no longer implies low quality in the implementation; it is treated as `unknown/watch`.

## Quality Notes

The ranking improved for high-signal AI and engineering sources because source metadata and title keyword matches now influence scores. Some broad summary-only matches can still pass at `7/10`, especially from commentary or general technical sources. That is now visible through `summary_only_keyword_match`, which makes the next scoring refinement straightforward.

## Next Optimization Candidates

- Add optional keyword groups, such as `--require-any-title-keyword`, for stricter daily AI digests.
- Expand `source-metadata.json` across more of the 92-feed base OPML, especially marking noisy or broad commentary sources.
- Add a source cleanup helper that can emit OPML or registry patches for repeated failures after several health observations.
- Consider a report mode that truncates long summaries in JSON output for easier downstream agent consumption.
