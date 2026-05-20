# Scoring

Scores are deterministic heuristics for triage. Treat them as recommendation aids, not as absolute truth.

## Article Score

Use a 10-point score. Recommend entries at `7/10` or higher by default.

Positive signals:

- AI, LLM, Agent, RAG, model, inference, evaluation, benchmark, or infrastructure relevance.
- Engineering depth: implementation notes, system design, incident review, benchmark, code, architecture, or production lessons.
- Trusted source: high `base_score` or `must-read` tag.
- Keyword match in the title, especially for specific AI, engineering, security, or project terms.
- Fresh publication date within the requested window.
- Specific technical language rather than generic commentary.

Negative signals:

- Marketing-heavy announcement, sponsor content, thin listicle, or reposted news.
- Job posts, hiring posts, webinars, coupons, events, or press releases.
- Weak keyword matches that appear only in summaries.
- Missing title, link, date, author, or malformed feed metadata.
- Duplicate item already present in the seen state.

Return score reasons with the entry so the user can judge why it was selected.

## Keyword Matching

Single-word keywords use token-aware matching. For example, `ai` should match the standalone token `AI`, but not unrelated substrings inside longer words. Multi-word keywords use phrase matching so terms such as `vector database`, `model context protocol`, and `language model` still match naturally.

Filtered entries include:

- `matched_keywords`: keywords that matched the entry.
- `matched_keyword_locations`: where the match appeared, such as `title` or `summary`.

Title matches receive a small scoring boost. Summary-only matches receive a small penalty so broad feed descriptions do not outrank specific article titles.

Strict filtering options:

- `--require-any-title-keyword`: require at least one included keyword to match the title.
- `--exclude-keywords`: remove entries matching any noise keyword or phrase in title or summary.
- `--keyword-mode all`: require every included keyword to match. The default `any` mode keeps the broader discovery behavior.

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

Source status semantics:

- `healthy`: recent successful fetch observations exist.
- `degraded`: useful source with repeated or recent issues.
- `failing`: recent or repeated fetch failures dominate.
- `unknown`: no persisted health data exists yet.

When reporting source quality, include both `recommendation` and `recommendation_reason`. Include `last_error` for failing sources. Do not silently delete or disable feeds.
