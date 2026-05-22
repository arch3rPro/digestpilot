# Source Governance

`rss-source-curator` uses registry priors and source-health observations to produce reviewable source quality decisions.

## Status Values

- `healthy`: source has successful fetch history and acceptable quality.
- `degraded`: source is useful but noisy, low-priority, or intermittently failing.
- `failing`: source repeatedly fails without recent successful fetches.
- `unknown`: source has no health observations yet.

## Evaluation Recommendations

- `keep`: preserve the source.
- `watch`: gather more observations.
- `lower-priority`: reduce score or treat as noisy.
- `remove`: remove only after explicit review.

## Curation Actions

`curate-sources` turns evaluation rows into reviewable maintenance actions:

- `keep`: no registry change suggested.
- `watch`: collect more health observations.
- `lower-priority`: source may need a lower score or noisy tag.
- `disable`: repeated failures suggest setting `enabled` to `false` after review.
- `remove`: source is a removal candidate after explicit review.

## Historical Observations

When a local research workspace is available, `subscription-research source-health` summarizes repeated per-source observations from RSS ingest runs:

- `keep`: repeated successful observations.
- `watch`: limited or transient failures that need more observations or timeout/retry tuning.
- `lower_priority`: repeated failures with at least one recent successful observation. Treat this as a noisy or unreliable source rather than a dead source.
- `disable_candidate`: enough consecutive failed observations to justify disabling after review. The default CLI threshold is three consecutive failed observations.

`disable_candidate` is still not permission to mutate a registry. It is a review signal for `rss-source-curator`.

Use `subscription-research source-health --format patch` to convert repeated observations into a reviewable patch envelope. The command only suggests changes. It does not write or modify a registry.

History summaries include `consecutive_failures`, `last_success_at`, `last_failure_at`, and `maintenance_priority`. Use these fields to distinguish sources that are currently broken from sources that are simply noisy or rate-limited.

## Safety Rule

Recommendations are not permission to mutate a registry. Use `apply-source-patch` only after review.
