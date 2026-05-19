# Scoring

Scores are deterministic heuristics for triage. Treat them as recommendation aids, not as absolute truth.

## Article Score

Use a 10-point score. Recommend entries at `7/10` or higher by default.

Positive signals:

- AI, LLM, Agent, RAG, model, inference, evaluation, benchmark, or infrastructure relevance.
- Engineering depth: implementation notes, system design, incident review, benchmark, code, architecture, or production lessons.
- Trusted source: high `base_score` or `must-read` tag.
- Fresh publication date within the requested window.
- Specific technical language rather than generic commentary.

Negative signals:

- Marketing-heavy announcement, sponsor content, thin listicle, or reposted news.
- Job posts, hiring posts, webinars, coupons, events, or press releases.
- Missing title, link, date, author, or malformed feed metadata.
- Duplicate item already present in the seen state.

Return score reasons with the entry so the user can judge why it was selected.

## Source Score

Use a 10-point score and one recommendation:

- `keep`: stable high-quality source.
- `watch`: useful but still needs observation.
- `lower-priority`: relevant but noisy or inconsistent.
- `remove`: dead, irrelevant, or repeatedly low-signal.

Signals:

- Availability: recent successful fetches and low failure count.
- Freshness: regular updates without overwhelming volume.
- Quality: recent entries score well.
- Relevance: source consistently covers AI and technical work.
- Originality: low duplicate or repost rate.
- Manual tags: `must-read` boosts; `noisy` and `deprecated` penalize.

When reporting source quality, include both the recommendation and the reason. Do not silently delete or disable feeds.
