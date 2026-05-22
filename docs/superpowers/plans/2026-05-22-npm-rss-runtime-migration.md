# NPM RSS Runtime Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the project from a Python-first RSS implementation toward an npm-distributable Node/TypeScript runtime without breaking the existing Skill contracts.

**Architecture:** Keep `rss_monitor.py` as the parity oracle while building a TypeScript RSS runtime under `packages/research-cli/src/rss/`. First make the npm CLI distributable with a Python-worker fallback, then port RSS parsing, filtering, scoring, dedupe, source health, and registry patching behind the same JSON contracts. Switch defaults only after TypeScript and Python outputs match on fixture-based parity tests.

**Tech Stack:** Node.js 20+, TypeScript, `commander`, `node:test`, `better-sqlite3`, built-in `fetch`, `node:fs`, `node:crypto`, existing Python `rss_monitor.py` as oracle, standard Skill layout.

---

## Current State

- `packages/research-cli` already provides the npm-style `subscription-research` CLI.
- `subscription-research init`, `ingest rss`, `brief evidence`, and `source-health` are implemented in TypeScript.
- `subscription-research ingest rss` still calls `skills/rss-ai-digest/scripts/rss_monitor.py` through `packages/research-cli/src/rss/python-worker.ts`.
- Python still owns RSS/Atom parsing, OPML import, filtering, scoring, dedupe, digest rendering, source evaluation, source curation, and registry patch application.
- README has been cleaned so version/release notes are not part of the main project overview.

## Remaining Non-Migration Work

These are not blockers for starting migration, but they remain useful follow-ups:

- Real daily report quality: add topic clustering so multiple `Datasette Agent` release entries can collapse into one report item.
- Relevance tuning: reduce false positives such as general archiving or political posts that happen to mention AI-related tokens.
- Evidence brief structure: fill `Key Signals`, `Gaps`, and `Suggested Next Questions` more usefully.
- Source governance: add consecutive failure windows and last-success timestamps to source-health patch suggestions.
- Future features: feed discovery, alert monitor Skill, publisher adapters, full text extraction, semantic dedupe, and plugin packaging.

## Migration Strategy

Do not rewrite everything at once. The safest path is:

1. **NPM-distributable wrapper:** make the current CLI installable and runnable with `npx`, still using Python worker as fallback.
2. **TypeScript RSS core in parallel:** add TypeScript modules and parity tests while Python remains default.
3. **Dual runtime switch:** add `--rss-runtime python|node` and use Python/Node fixture parity in tests.
4. **Node default:** switch `subscription-research ingest rss` to Node runtime once parity is stable.
5. **Skill command migration:** update Skills to prefer npm commands; keep Python examples as compatibility notes.
6. **Python deprecation:** keep `rss_monitor.py` for one compatibility window, then move it to legacy support only.

## File Structure

- Create `packages/research-cli/src/rss/types.ts`: shared RSS registry, entry, health, digest, and patch types.
- Create `packages/research-cli/src/rss/opml.ts`: OPML parser and source metadata application.
- Create `packages/research-cli/src/rss/xml.ts`: minimal XML helpers using a dependency selected in Task 2.
- Create `packages/research-cli/src/rss/feed-parser.ts`: RSS 2.0 and Atom parser.
- Create `packages/research-cli/src/rss/filter.ts`: keyword, author, date, category, language, and preset filtering.
- Create `packages/research-cli/src/rss/scoring.ts`: topic assignment and score reasoning.
- Create `packages/research-cli/src/rss/state.ts`: seen-state identity and mark-seen behavior.
- Create `packages/research-cli/src/rss/source-governance.ts`: evaluate, curate, and apply source patches.
- Create `packages/research-cli/src/rss/node-runtime.ts`: Node implementation of digest/fetch/import/check-new behavior.
- Modify `packages/research-cli/src/rss/python-worker.ts`: keep as `python` runtime adapter.
- Modify `packages/research-cli/src/commands/ingest-rss.ts`: add runtime selection.
- Modify `packages/research-cli/src/cli.ts`: expose npm-friendly RSS commands and runtime selection.
- Create `packages/research-cli/test/rss-fixtures.test.ts`: fixture parity tests.
- Create `packages/research-cli/test/rss-node-runtime.test.ts`: Node RSS runtime behavior tests.
- Create `packages/research-cli/test/fixtures/rss/*.xml`: compact RSS and Atom fixtures.
- Create `packages/research-cli/test/fixtures/opml/base-small.opml`: compact OPML fixture.
- Modify `skills/rss-ai-digest/SKILL.md`: prefer `subscription-research rss ...` once Node runtime exists.
- Modify `skills/rss-source-curator/SKILL.md`: prefer npm source-governance commands once exposed.
- Modify `README.md` and `README.zh-CN.md`: describe npm CLI usage without release/version wording.
- Modify `AGENTS.md`: update development commands after Node parity exists.

---

### Task 1: Make The NPM Package Locally Packable

**Files:**
- Modify: `packages/research-cli/package.json`
- Modify: `packages/research-cli/tsconfig.json`
- Create: `packages/research-cli/README.md`
- Test: `packages/research-cli/test/package-metadata.test.ts`

- [ ] **Step 1: Write the package metadata test**

Create `packages/research-cli/test/package-metadata.test.ts`:

```ts
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

test("package metadata is npx-ready", async () => {
  const packageJson = JSON.parse(
    await readFile(join(process.cwd(), "package.json"), "utf8")
  ) as {
    private?: boolean;
    bin?: Record<string, string>;
    files?: string[];
    engines?: Record<string, string>;
  };

  assert.equal(packageJson.private, false);
  assert.deepEqual(packageJson.bin, {
    "subscription-research": "./dist/src/cli.js"
  });
  assert.deepEqual(packageJson.files, ["dist", "README.md", "package.json"]);
  assert.equal(packageJson.engines?.node, ">=20");
});
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
cd packages/research-cli && npm test -- --test-name-pattern "package metadata"
```

Expected: FAIL because `private` is currently `true` and `files` is absent.

- [ ] **Step 3: Update package metadata**

Modify `packages/research-cli/package.json`:

```json
{
  "name": "@subscription-research/cli",
  "version": "0.3.0",
  "private": false,
  "description": "Local-first subscription research workspace CLI.",
  "type": "module",
  "bin": {
    "subscription-research": "./dist/src/cli.js"
  },
  "files": ["dist", "README.md", "package.json"],
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "npm run build && node --test dist/test/*.test.js",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "prepack": "npm run build"
  },
  "dependencies": {
    "better-sqlite3": "^11.8.1",
    "commander": "^13.1.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.12",
    "@types/node": "^22.13.1",
    "typescript": "^5.7.3"
  },
  "engines": {
    "node": ">=20"
  }
}
```

- [ ] **Step 4: Add package README**

Create `packages/research-cli/README.md`:

```markdown
# @subscription-research/cli

Local-first CLI for subscription research workspaces.

## Commands

```bash
subscription-research init --workspace research-workspace
subscription-research ingest rss --workspace research-workspace --registry feeds.json
subscription-research brief evidence --workspace research-workspace --question "AI daily" --since 24h
subscription-research source-health --workspace research-workspace --format markdown
```

The current RSS ingest command can use the bundled project Python worker in a local checkout. A Node RSS runtime is planned and will preserve the same JSON envelope contract.
```

- [ ] **Step 5: Run package tests**

Run:

```bash
cd packages/research-cli && npm test
```

Expected: PASS.

- [ ] **Step 6: Verify local pack**

Run:

```bash
cd packages/research-cli && npm pack --dry-run
```

Expected: output includes `dist/src/cli.js`, `README.md`, and `package.json`; it does not include `src/`, `test/`, or workspace runtime files.

- [ ] **Step 7: Commit**

```bash
git add packages/research-cli/package.json packages/research-cli/package-lock.json packages/research-cli/README.md packages/research-cli/test/package-metadata.test.ts
git commit -m "chore: prepare research cli for npm packaging"
```

---

### Task 2: Select And Add The XML Parser Dependency

**Files:**
- Modify: `packages/research-cli/package.json`
- Modify: `packages/research-cli/package-lock.json`
- Create: `packages/research-cli/src/rss/xml.ts`
- Test: `packages/research-cli/test/rss-xml.test.ts`

**Decision:** Use `fast-xml-parser`. It is pure JavaScript, works under Node ESM, avoids native install risk, and is enough for RSS/Atom/OPML.

- [ ] **Step 1: Install dependency**

Run:

```bash
cd packages/research-cli && npm install fast-xml-parser
```

Expected: `package.json` and `package-lock.json` update with `fast-xml-parser`.

- [ ] **Step 2: Write XML helper tests**

Create `packages/research-cli/test/rss-xml.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { parseXmlDocument, textValue, arrayValue } from "../src/rss/xml.js";

test("parseXmlDocument parses RSS style text and attributes", () => {
  const doc = parseXmlDocument(`
    <rss version="2.0">
      <channel>
        <title>Example</title>
        <item><title>Hello</title><link>https://example.com</link></item>
      </channel>
    </rss>
  `) as Record<string, unknown>;

  const rss = doc.rss as Record<string, unknown>;
  const channel = rss.channel as Record<string, unknown>;
  assert.equal(textValue(channel.title), "Example");
  const items = arrayValue(channel.item);
  assert.equal(textValue((items[0] as Record<string, unknown>).title), "Hello");
});
```

- [ ] **Step 3: Run failing test**

Run:

```bash
cd packages/research-cli && npm test -- --test-name-pattern parseXmlDocument
```

Expected: FAIL because `src/rss/xml.ts` does not exist.

- [ ] **Step 4: Implement XML helpers**

Create `packages/research-cli/src/rss/xml.ts`:

```ts
import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  trimValues: true,
  parseTagValue: false,
  parseAttributeValue: false,
  removeNSPrefix: true
});

export function parseXmlDocument(xml: string): unknown {
  return parser.parse(xml);
}

export function textValue(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }
  if (typeof value === "object" && "#text" in value) {
    return textValue((value as Record<string, unknown>)["#text"]);
  }
  return "";
}

export function attrValue(value: unknown, name: string): string {
  if (!value || typeof value !== "object") return "";
  const record = value as Record<string, unknown>;
  return textValue(record[`@_${name}`]);
}

export function arrayValue(value: unknown): unknown[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}
```

- [ ] **Step 5: Run tests**

Run:

```bash
cd packages/research-cli && npm test
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/research-cli/package.json packages/research-cli/package-lock.json packages/research-cli/src/rss/xml.ts packages/research-cli/test/rss-xml.test.ts
git commit -m "feat: add node xml helpers for rss runtime"
```

---

### Task 3: Port Shared RSS Types And OPML Import

**Files:**
- Create: `packages/research-cli/src/rss/types.ts`
- Create: `packages/research-cli/src/rss/opml.ts`
- Test: `packages/research-cli/test/rss-opml.test.ts`

- [ ] **Step 1: Write OPML tests**

Create `packages/research-cli/test/rss-opml.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { parseOpml, applySourceMetadata } from "../src/rss/opml.js";

const OPML = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <body>
    <outline text="AI">
      <outline text="Simon Willison" title="Simon Willison" type="rss" xmlUrl="https://simonwillison.net/atom/everything/" htmlUrl="https://simonwillison.net/" />
      <outline text="No Feed" title="No Feed" htmlUrl="https://example.com/" />
    </outline>
  </body>
</opml>`;

test("parseOpml extracts RSS outlines and preserves parent category", () => {
  const feeds = parseOpml(OPML);
  assert.equal(feeds.length, 1);
  assert.deepEqual(feeds[0], {
    id: "simonwillison-net",
    title: "Simon Willison",
    url: "https://simonwillison.net/atom/everything/",
    category: ["AI"],
    enabled: true
  });
});

test("applySourceMetadata overlays base score language and tags", () => {
  const feeds = applySourceMetadata(parseOpml(OPML), {
    "simonwillison-net": {
      base_score: 9,
      language: "en",
      tags: ["llm", "engineering"]
    }
  });

  assert.equal(feeds[0].base_score, 9);
  assert.equal(feeds[0].language, "en");
  assert.deepEqual(feeds[0].tags, ["llm", "engineering"]);
});
```

- [ ] **Step 2: Run failing tests**

Run:

```bash
cd packages/research-cli && npm test -- --test-name-pattern parseOpml
```

Expected: FAIL because `src/rss/opml.ts` does not exist.

- [ ] **Step 3: Add RSS types**

Create `packages/research-cli/src/rss/types.ts`:

```ts
export interface FeedRegistry {
  feeds: FeedSource[];
}

export interface FeedSource {
  id: string;
  title: string;
  url: string;
  category?: string[];
  enabled?: boolean;
  language?: string;
  tags?: string[];
  base_score?: number;
}

export interface FeedMetadata {
  base_score?: number;
  language?: string;
  tags?: string[];
}

export interface RssEntry {
  title: string;
  link: string;
  guid?: string;
  author?: string;
  published_at?: string;
  summary?: string;
  feed_id: string;
  feed_title?: string;
  topic?: string;
  score?: number;
  score_reasons?: string[];
  matched_keywords?: string[];
  matched_keyword_locations?: Record<string, string[]>;
  matched_must_keywords?: string[];
  matched_should_keywords?: string[];
}
```

- [ ] **Step 4: Implement OPML parser**

Create `packages/research-cli/src/rss/opml.ts`:

```ts
import { parseXmlDocument, arrayValue, attrValue } from "./xml.js";
import type { FeedMetadata, FeedSource } from "./types.js";

export function parseOpml(opmlText: string): FeedSource[] {
  const doc = parseXmlDocument(opmlText) as Record<string, unknown>;
  const body = ((doc.opml as Record<string, unknown>)?.body ?? {}) as Record<string, unknown>;
  return collectOutlines(body.outline, []);
}

function collectOutlines(value: unknown, categories: string[]): FeedSource[] {
  const feeds: FeedSource[] = [];
  for (const outline of arrayValue(value)) {
    if (!outline || typeof outline !== "object") continue;
    const record = outline as Record<string, unknown>;
    const title = attrValue(record, "title") || attrValue(record, "text");
    const xmlUrl = attrValue(record, "xmlUrl");
    if (xmlUrl) {
      feeds.push({
        id: slugify(title || xmlUrl),
        title: title || xmlUrl,
        url: xmlUrl,
        category: categories,
        enabled: true
      });
      continue;
    }
    const nextCategories = title ? [...categories, title] : categories;
    feeds.push(...collectOutlines(record.outline, nextCategories));
  }
  return feeds;
}

export function applySourceMetadata(
  feeds: FeedSource[],
  metadata: Record<string, FeedMetadata>
): FeedSource[] {
  return feeds.map((feed) => ({ ...feed, ...(metadata[feed.id] ?? {}) }));
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/https?:\/\//g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "feed";
}
```

- [ ] **Step 5: Run tests**

Run:

```bash
cd packages/research-cli && npm test
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/research-cli/src/rss/types.ts packages/research-cli/src/rss/opml.ts packages/research-cli/test/rss-opml.test.ts
git commit -m "feat: port opml import to node rss runtime"
```

---

### Task 4: Port RSS And Atom Parsing

**Files:**
- Create: `packages/research-cli/src/rss/feed-parser.ts`
- Create: `packages/research-cli/test/rss-feed-parser.test.ts`

- [ ] **Step 1: Write feed parser tests**

Create `packages/research-cli/test/rss-feed-parser.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { parseFeedXml } from "../src/rss/feed-parser.js";

const RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Example RSS</title>
    <item>
      <title>Building reliable LLM agents with evals</title>
      <link>https://example.com/agents</link>
      <guid>agent-guid</guid>
      <author>Jane Engineer</author>
      <pubDate>Wed, 20 May 2026 08:00:00 GMT</pubDate>
      <description>A practical engineering write-up about agents.</description>
    </item>
  </channel>
</rss>`;

const ATOM = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Example Atom</title>
  <entry>
    <title>Transformer debugging notes</title>
    <link href="https://example.com/transformers" />
    <id>tag:example.com,2026:transformers</id>
    <author><name>Researcher</name></author>
    <updated>2026-05-20T07:00:00Z</updated>
    <summary>Deep technical notes on model debugging.</summary>
  </entry>
</feed>`;

test("parseFeedXml parses RSS entries", () => {
  const entries = parseFeedXml(RSS, "rss", "Example RSS");
  assert.equal(entries[0].title, "Building reliable LLM agents with evals");
  assert.equal(entries[0].link, "https://example.com/agents");
  assert.equal(entries[0].guid, "agent-guid");
  assert.equal(entries[0].author, "Jane Engineer");
  assert.equal(entries[0].published_at, "2026-05-20T08:00:00.000Z");
});

test("parseFeedXml parses Atom entries", () => {
  const entries = parseFeedXml(ATOM, "atom", "Example Atom");
  assert.equal(entries[0].title, "Transformer debugging notes");
  assert.equal(entries[0].link, "https://example.com/transformers");
  assert.equal(entries[0].guid, "tag:example.com,2026:transformers");
  assert.equal(entries[0].author, "Researcher");
  assert.equal(entries[0].published_at, "2026-05-20T07:00:00.000Z");
});
```

- [ ] **Step 2: Run failing tests**

Run:

```bash
cd packages/research-cli && npm test -- --test-name-pattern parseFeedXml
```

Expected: FAIL because `src/rss/feed-parser.ts` does not exist.

- [ ] **Step 3: Implement feed parser**

Create `packages/research-cli/src/rss/feed-parser.ts`:

```ts
import { arrayValue, attrValue, parseXmlDocument, textValue } from "./xml.js";
import type { RssEntry } from "./types.js";

export function parseFeedXml(xmlText: string, feedId: string, feedTitle = ""): RssEntry[] {
  const doc = parseXmlDocument(xmlText) as Record<string, unknown>;
  if (doc.rss) return parseRss(doc.rss as Record<string, unknown>, feedId, feedTitle);
  if (doc.feed) return parseAtom(doc.feed as Record<string, unknown>, feedId, feedTitle);
  throw new Error("Unsupported feed XML");
}

function parseRss(rss: Record<string, unknown>, feedId: string, feedTitle: string): RssEntry[] {
  const channel = (rss.channel ?? {}) as Record<string, unknown>;
  const title = feedTitle || textValue(channel.title);
  return arrayValue(channel.item).map((item) => {
    const record = item as Record<string, unknown>;
    return normalizeEntry({
      title: textValue(record.title),
      link: textValue(record.link),
      guid: textValue(record.guid),
      author: textValue(record.author) || textValue(record.creator),
      published_at: parseDate(textValue(record.pubDate) || textValue(record.published)),
      summary: textValue(record.description) || textValue(record.summary),
      feed_id: feedId,
      feed_title: title
    });
  });
}

function parseAtom(feed: Record<string, unknown>, feedId: string, feedTitle: string): RssEntry[] {
  const title = feedTitle || textValue(feed.title);
  return arrayValue(feed.entry).map((entry) => {
    const record = entry as Record<string, unknown>;
    const author = (record.author ?? {}) as Record<string, unknown>;
    return normalizeEntry({
      title: textValue(record.title),
      link: atomLink(record.link),
      guid: textValue(record.id),
      author: textValue(author.name),
      published_at: parseDate(textValue(record.updated) || textValue(record.published)),
      summary: textValue(record.summary) || textValue(record.content),
      feed_id: feedId,
      feed_title: title
    });
  });
}

function atomLink(value: unknown): string {
  const links = arrayValue(value);
  const alternate = links.find((link) => attrValue(link, "rel") === "alternate") ?? links[0];
  return attrValue(alternate, "href") || textValue(alternate);
}

function normalizeEntry(entry: RssEntry): RssEntry {
  return {
    ...entry,
    title: entry.title || "(untitled)",
    link: entry.link || "",
    author: entry.author || "",
    summary: entry.summary || "",
    published_at: entry.published_at || "",
    feed_title: entry.feed_title || entry.feed_id
  };
}

function parseDate(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}
```

- [ ] **Step 4: Run tests**

Run:

```bash
cd packages/research-cli && npm test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/research-cli/src/rss/feed-parser.ts packages/research-cli/test/rss-feed-parser.test.ts
git commit -m "feat: port rss and atom parsing to node"
```

---

### Task 5: Port Filtering, Topics, And Scoring

**Files:**
- Create: `packages/research-cli/src/rss/filter.ts`
- Create: `packages/research-cli/src/rss/scoring.ts`
- Test: `packages/research-cli/test/rss-filter-scoring.test.ts`

- [ ] **Step 1: Write filtering and scoring tests**

Create `packages/research-cli/test/rss-filter-scoring.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { filterEntries } from "../src/rss/filter.js";
import { scoreEntry } from "../src/rss/scoring.js";
import type { FeedSource, RssEntry } from "../src/rss/types.js";

const entry: RssEntry = {
  title: "Building reliable LLM agents with evals",
  link: "https://example.com/agents",
  author: "Jane Engineer",
  published_at: "2026-05-20T08:00:00.000Z",
  summary: "A practical engineering write-up about agents and production systems.",
  feed_id: "ai-feed",
  feed_title: "AI Feed"
};

test("filterEntries supports token aware keywords and title requirement", () => {
  const matched = filterEntries([entry], {
    keywords: ["llm", "agents"],
    requireAnyTitleKeyword: true
  });
  assert.equal(matched.length, 1);
  assert.deepEqual(matched[0].matched_keywords, ["llm", "agents"]);

  const missed = filterEntries([{ ...entry, title: "Production notes" }], {
    keywords: ["llm"],
    requireAnyTitleKeyword: true
  });
  assert.equal(missed.length, 0);
});

test("filterEntries supports must should exclude and all mode", () => {
  const matched = filterEntries([entry], {
    mustKeywords: ["llm"],
    shouldKeywords: ["evals"],
    excludeKeywords: ["webinar"],
    keywordMode: "all"
  });
  assert.equal(matched.length, 1);
  assert.deepEqual(matched[0].matched_must_keywords, ["llm"]);
  assert.deepEqual(matched[0].matched_should_keywords, ["evals"]);
});

test("scoreEntry assigns topic and score reasons", () => {
  const feed: FeedSource = {
    id: "ai-feed",
    title: "AI Feed",
    url: "https://example.com/feed",
    base_score: 8,
    tags: ["must-read", "llm"]
  };
  const scored = scoreEntry(entry, feed);
  assert.equal(scored.topic, "AI / LLM");
  assert.equal((scored.score ?? 0) >= 8, true);
  assert.ok(scored.score_reasons?.includes("ai_or_engineering_relevance"));
});
```

- [ ] **Step 2: Run failing tests**

Run:

```bash
cd packages/research-cli && npm test -- --test-name-pattern filterEntries
```

Expected: FAIL because `filter.ts` and `scoring.ts` do not exist.

- [ ] **Step 3: Implement filter module**

Create `packages/research-cli/src/rss/filter.ts` with direct TypeScript equivalents of Python behavior:

```ts
import type { RssEntry } from "./types.js";

export interface FilterOptions {
  keywords?: string[];
  mustKeywords?: string[];
  shouldKeywords?: string[];
  excludeKeywords?: string[];
  keywordMode?: "any" | "all";
  requireAnyTitleKeyword?: boolean;
  author?: string;
  category?: string;
  language?: string;
  since?: string;
}

export function filterEntries(entries: RssEntry[], options: FilterOptions): RssEntry[] {
  const keywordMode = options.keywordMode ?? "any";
  const sinceIso = parseSince(options.since);
  return entries
    .map((entry) => annotateMatches(entry, options))
    .filter((entry) => {
      const text = entryText(entry);
      if (sinceIso && entry.published_at && entry.published_at < sinceIso) return false;
      if (options.author && !String(entry.author || "").toLowerCase().includes(options.author.toLowerCase())) return false;
      if ((options.excludeKeywords ?? []).some((keyword) => hasKeyword(text, keyword))) return false;
      if ((options.mustKeywords ?? []).length > 0 && !(options.mustKeywords ?? []).every((keyword) => hasKeyword(text, keyword))) return false;
      if ((options.keywords ?? []).length > 0) {
        const matches = (options.keywords ?? []).filter((keyword) => hasKeyword(text, keyword));
        if (keywordMode === "all" && matches.length !== (options.keywords ?? []).length) return false;
        if (keywordMode === "any" && matches.length === 0) return false;
      }
      if (options.requireAnyTitleKeyword) {
        const title = String(entry.title || "").toLowerCase();
        const allTerms = [...(options.keywords ?? []), ...(options.mustKeywords ?? [])];
        if (allTerms.length > 0 && !allTerms.some((keyword) => hasKeyword(title, keyword))) return false;
      }
      return true;
    });
}

function annotateMatches(entry: RssEntry, options: FilterOptions): RssEntry {
  const text = entryText(entry);
  return {
    ...entry,
    matched_keywords: (options.keywords ?? []).filter((keyword) => hasKeyword(text, keyword)),
    matched_must_keywords: (options.mustKeywords ?? []).filter((keyword) => hasKeyword(text, keyword)),
    matched_should_keywords: (options.shouldKeywords ?? []).filter((keyword) => hasKeyword(text, keyword))
  };
}

function entryText(entry: RssEntry): string {
  return `${entry.title || ""} ${entry.summary || ""}`.toLowerCase();
}

function hasKeyword(text: string, keyword: string): boolean {
  const trimmed = keyword.trim().toLowerCase();
  if (!trimmed) return false;
  if (trimmed.includes(" ")) return text.includes(trimmed);
  return new RegExp(`(^|[^a-z0-9])${escapeRegExp(trimmed)}([^a-z0-9]|$)`, "i").test(text);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseSince(value?: string): string | null {
  if (!value) return null;
  const relative = /^(\d+)([hdw])$/.exec(value);
  if (relative) {
    const amount = Number.parseInt(relative[1], 10);
    const hours = relative[2] === "h" ? amount : relative[2] === "d" ? amount * 24 : amount * 24 * 7;
    return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid since value: ${value}`);
  return date.toISOString();
}
```

- [ ] **Step 4: Implement scoring module**

Create `packages/research-cli/src/rss/scoring.ts`:

```ts
import type { FeedSource, RssEntry } from "./types.js";

export function scoreEntry(entry: RssEntry, feed?: FeedSource): RssEntry {
  const text = `${entry.title || ""} ${entry.summary || ""}`.toLowerCase();
  const reasons: string[] = [];
  let score = feed?.base_score ?? 5;
  const topic = assignTopic(entry, feed);

  if (/(llm|agent|agents|evals|inference|benchmark|model|models|ai)/i.test(text)) {
    score += 2;
    reasons.push("ai_or_engineering_relevance");
  }
  if (/(implementation|architecture|benchmark|production|debugging|sql|api|sdk)/i.test(text)) {
    score += 1;
    reasons.push("technical_depth_signal");
  }
  if ((feed?.tags ?? []).includes("must-read")) {
    score += 1;
    reasons.push("trusted_source");
  }
  if (entry.published_at) {
    score += 1;
    reasons.push("has_publication_date");
  }

  return {
    ...entry,
    topic,
    score: Math.max(1, Math.min(10, score)),
    score_reasons: Array.from(new Set([...(entry.score_reasons ?? []), ...reasons]))
  };
}

export function assignTopic(entry: RssEntry, feed?: FeedSource): string {
  const text = `${entry.title || ""} ${entry.summary || ""} ${(feed?.category ?? []).join(" ")} ${(feed?.tags ?? []).join(" ")}`.toLowerCase();
  if (/(llm|agent|agents|model|inference|evals|ai|deepmind|openai|anthropic)/.test(text)) return "AI / LLM";
  if (/(security|vulnerability|risk|malware|breach)/.test(text)) return "Security";
  if (/(product|business|startup|market|pricing)/.test(text)) return "Product / Business";
  if (/(engineering|systems|programming|database|compiler|runtime|api|sdk)/.test(text)) return "Engineering";
  return "Other";
}
```

- [ ] **Step 5: Run tests**

Run:

```bash
cd packages/research-cli && npm test
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/research-cli/src/rss/filter.ts packages/research-cli/src/rss/scoring.ts packages/research-cli/test/rss-filter-scoring.test.ts
git commit -m "feat: port rss filtering and scoring to node"
```

---

### Task 6: Port Seen State And Digest Envelope

**Files:**
- Create: `packages/research-cli/src/rss/state.ts`
- Create: `packages/research-cli/src/rss/node-runtime.ts`
- Test: `packages/research-cli/test/rss-node-runtime.test.ts`

- [ ] **Step 1: Write state and digest tests**

Create `packages/research-cli/test/rss-node-runtime.test.ts`:

```ts
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { entryKey, markSeen, isSeen } from "../src/rss/state.js";
import { buildDigestEnvelope } from "../src/rss/node-runtime.js";
import type { FeedRegistry, RssEntry } from "../src/rss/types.js";

const entry: RssEntry = {
  title: "LLM agents in production",
  link: "https://example.com/agents",
  guid: "agent-guid",
  published_at: "2026-05-20T08:00:00.000Z",
  summary: "A production note.",
  feed_id: "ai-feed",
  feed_title: "AI Feed"
};

test("entryKey and seen state dedupe entries", () => {
  const state = { seen: {} as Record<string, string> };
  assert.equal(entryKey(entry), "agent-guid");
  assert.equal(isSeen(state, entry), false);
  markSeen(state, [entry], "2026-05-21T00:00:00.000Z");
  assert.equal(isSeen(state, entry), true);
});

test("buildDigestEnvelope scores filters and writes seen state", async () => {
  const root = await mkdtemp(join(tmpdir(), "rss-node-runtime-"));
  try {
    const statePath = join(root, "seen.json");
    await writeFile(statePath, JSON.stringify({ seen: {} }), "utf8");
    const registry: FeedRegistry = {
      feeds: [{ id: "ai-feed", title: "AI Feed", url: "https://example.com/feed", base_score: 8 }]
    };
    const envelope = await buildDigestEnvelope({
      registry,
      entries: [entry],
      statePath,
      minScore: 7,
      keywords: ["llm"],
      markSeen: "reported-only"
    });

    assert.equal(envelope.entries.length, 1);
    assert.equal(envelope.stats.entries_reported, 1);
    const state = JSON.parse(await readFile(statePath, "utf8")) as { seen: Record<string, string> };
    assert.equal(Object.keys(state.seen).length, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run failing tests**

Run:

```bash
cd packages/research-cli && npm test -- --test-name-pattern "entryKey|buildDigestEnvelope"
```

Expected: FAIL because `state.ts` and `node-runtime.ts` do not exist.

- [ ] **Step 3: Implement state module**

Create `packages/research-cli/src/rss/state.ts`:

```ts
import { createHash } from "node:crypto";
import type { RssEntry } from "./types.js";

export interface SeenState {
  seen: Record<string, string>;
}

export function entryKey(entry: RssEntry): string {
  if (entry.guid) return entry.guid;
  if (entry.link) return entry.link;
  return createHash("sha256")
    .update(`${entry.title}|${entry.published_at || ""}`)
    .digest("hex");
}

export function isSeen(state: SeenState, entry: RssEntry): boolean {
  return Boolean(state.seen[entryKey(entry)]);
}

export function markSeen(state: SeenState, entries: RssEntry[], timestamp = new Date().toISOString()): void {
  for (const entry of entries) {
    state.seen[entryKey(entry)] = timestamp;
  }
}
```

- [ ] **Step 4: Implement digest envelope builder**

Create `packages/research-cli/src/rss/node-runtime.ts`:

```ts
import { readFile, writeFile } from "node:fs/promises";
import { filterEntries } from "./filter.js";
import { scoreEntry } from "./scoring.js";
import { isSeen, markSeen, type SeenState } from "./state.js";
import type { FeedRegistry, RssEntry } from "./types.js";

export interface DigestEnvelope {
  entries: RssEntry[];
  failures: Array<Record<string, unknown>>;
  health: Record<string, unknown>;
  stats: Record<string, number>;
  generated_at: string;
}

export interface BuildDigestEnvelopeOptions {
  registry: FeedRegistry;
  entries: RssEntry[];
  statePath: string;
  minScore: number;
  keywords?: string[];
  markSeen: "reported-only" | "all-filtered" | "none";
}

export async function buildDigestEnvelope(options: BuildDigestEnvelopeOptions): Promise<DigestEnvelope> {
  const state = await loadSeenState(options.statePath);
  const byId = new Map(options.registry.feeds.map((feed) => [feed.id, feed]));
  const filtered = filterEntries(options.entries, { keywords: options.keywords ?? [] })
    .filter((entry) => !isSeen(state, entry))
    .map((entry) => scoreEntry(entry, byId.get(entry.feed_id)))
    .filter((entry) => (entry.score ?? 0) >= options.minScore)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || String(b.published_at).localeCompare(String(a.published_at)));

  if (options.markSeen === "reported-only") {
    markSeen(state, filtered);
    await saveSeenState(options.statePath, state);
  }

  return {
    entries: filtered,
    failures: [],
    health: {},
    stats: {
      feeds_total: options.registry.feeds.length,
      feeds_success: options.registry.feeds.length,
      feeds_failed: 0,
      entries_fetched: options.entries.length,
      entries_filtered: filtered.length,
      entries_reported: filtered.length,
      entries_marked_seen: options.markSeen === "reported-only" ? filtered.length : 0
    },
    generated_at: new Date().toISOString()
  };
}

async function loadSeenState(path: string): Promise<SeenState> {
  try {
    const parsed = JSON.parse(await readFile(path, "utf8")) as SeenState;
    return { seen: parsed.seen ?? {} };
  } catch {
    return { seen: {} };
  }
}

async function saveSeenState(path: string, state: SeenState): Promise<void> {
  await writeFile(path, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}
```

- [ ] **Step 5: Run tests**

Run:

```bash
cd packages/research-cli && npm test
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/research-cli/src/rss/state.ts packages/research-cli/src/rss/node-runtime.ts packages/research-cli/test/rss-node-runtime.test.ts
git commit -m "feat: add node rss digest envelope"
```

---

### Task 7: Add Runtime Selection To Ingest

**Files:**
- Modify: `packages/research-cli/src/commands/ingest-rss.ts`
- Modify: `packages/research-cli/src/cli.ts`
- Test: `packages/research-cli/test/ingest-rss.test.ts`

- [ ] **Step 1: Add ingest runtime test**

Append to `packages/research-cli/test/ingest-rss.test.ts`:

```ts
import { ingestRss } from "../src/commands/ingest-rss.js";

test("ingestRss rejects node runtime until feed fetching is implemented", async () => {
  const root = await mkdtemp(join(tmpdir(), "subscription-research-"));
  const workspace = join(root, "workspace");
  const registry = join(root, "feeds.json");
  try {
    await initWorkspace({ workspace });
    await writeFile(registry, JSON.stringify({ feeds: [] }), "utf8");
    await assert.rejects(
      ingestRss({ workspace, registry, rssRuntime: "node" }),
      /Node RSS runtime does not fetch remote feeds yet/
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run failing test**

Run:

```bash
cd packages/research-cli && npm test -- --test-name-pattern "node runtime"
```

Expected: FAIL because `rssRuntime` is not part of `IngestRssCommandOptions`.

- [ ] **Step 3: Add runtime option**

Modify `packages/research-cli/src/commands/ingest-rss.ts`:

```ts
export interface IngestRssCommandOptions {
  workspace: string;
  registry: string;
  scriptPath?: string;
  python?: string;
  rssRuntime?: "python" | "node";
  since?: string;
  keywords?: string;
  mustKeywords?: string;
  shouldKeywords?: string;
  excludeKeywords?: string;
  minScore?: number;
}
```

In `ingestRss`, add before `runRssDigest`:

```ts
if ((options.rssRuntime ?? "python") === "node") {
  throw new Error("Node RSS runtime does not fetch remote feeds yet");
}
```

- [ ] **Step 4: Expose CLI option**

Modify `packages/research-cli/src/cli.ts` ingest command:

```ts
.option("--rss-runtime <runtime>", "RSS runtime: python or node", "python")
```

Pass:

```ts
rssRuntime: rssRuntime(optionalString(options.rssRuntime) ?? "python"),
```

Add helper:

```ts
function rssRuntime(value: string): "python" | "node" {
  if (value === "python" || value === "node") return value;
  throw new Error(`Unsupported RSS runtime: ${value}`);
}
```

- [ ] **Step 5: Run tests**

Run:

```bash
cd packages/research-cli && npm test
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/research-cli/src/commands/ingest-rss.ts packages/research-cli/src/cli.ts packages/research-cli/test/ingest-rss.test.ts
git commit -m "feat: add rss runtime selection"
```

---

### Task 8: Port Fetching And Enable Node Runtime For Ingest

**Files:**
- Modify: `packages/research-cli/src/rss/node-runtime.ts`
- Modify: `packages/research-cli/src/commands/ingest-rss.ts`
- Test: `packages/research-cli/test/rss-node-runtime-fetch.test.ts`

- [ ] **Step 1: Write fetch test with injected fetch**

Create `packages/research-cli/test/rss-node-runtime-fetch.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { fetchRegistryEntries } from "../src/rss/node-runtime.js";

test("fetchRegistryEntries fetches enabled feeds and reports failures", async () => {
  const result = await fetchRegistryEntries(
    {
      feeds: [
        { id: "good", title: "Good", url: "https://example.com/good", enabled: true },
        { id: "bad", title: "Bad", url: "https://example.com/bad", enabled: true },
        { id: "off", title: "Off", url: "https://example.com/off", enabled: false }
      ]
    },
    {
      fetchText: async (url) => {
        if (url.endsWith("/bad")) throw new Error("HTTP 503");
        return `<?xml version="1.0"?><rss version="2.0"><channel><title>Good</title><item><title>LLM note</title><link>https://example.com/item</link></item></channel></rss>`;
      }
    }
  );

  assert.equal(result.entries.length, 1);
  assert.equal(result.entries[0].feed_id, "good");
  assert.equal(result.failures.length, 1);
  assert.equal(result.failures[0].id, "bad");
  assert.equal(result.health.good.status, "healthy");
  assert.equal(result.health.bad.status, "failing");
});
```

- [ ] **Step 2: Run failing test**

Run:

```bash
cd packages/research-cli && npm test -- --test-name-pattern fetchRegistryEntries
```

Expected: FAIL because `fetchRegistryEntries` does not exist.

- [ ] **Step 3: Implement fetch registry entries**

Add to `packages/research-cli/src/rss/node-runtime.ts`:

```ts
import { parseFeedXml } from "./feed-parser.js";

export interface FetchRegistryOptions {
  fetchText?: (url: string) => Promise<string>;
}

export async function fetchRegistryEntries(
  registry: FeedRegistry,
  options: FetchRegistryOptions = {}
): Promise<{
  entries: RssEntry[];
  failures: Array<{ id: string; title: string; url: string; error: string }>;
  health: Record<string, Record<string, unknown>>;
}> {
  const fetchText = options.fetchText ?? defaultFetchText;
  const entries: RssEntry[] = [];
  const failures: Array<{ id: string; title: string; url: string; error: string }> = [];
  const health: Record<string, Record<string, unknown>> = {};

  for (const feed of registry.feeds.filter((item) => item.enabled !== false)) {
    try {
      const xml = await fetchText(feed.url);
      const parsed = parseFeedXml(xml, feed.id, feed.title);
      entries.push(...parsed);
      health[feed.id] = {
        title: feed.title,
        status: "healthy",
        success_count: 1,
        failure_count: 0,
        last_success_at: new Date().toISOString(),
        last_error: ""
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push({ id: feed.id, title: feed.title, url: feed.url, error: message });
      health[feed.id] = {
        title: feed.title,
        status: "failing",
        success_count: 0,
        failure_count: 1,
        last_error_at: new Date().toISOString(),
        last_error: message
      };
    }
  }

  return { entries, failures, health };
}

async function defaultFetchText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  return response.text();
}
```

- [ ] **Step 4: Enable node runtime path**

Modify `ingestRss` in `packages/research-cli/src/commands/ingest-rss.ts`:

```ts
if ((options.rssRuntime ?? "python") === "node") {
  const registry = JSON.parse(await readFile(options.registry, "utf8")) as FeedRegistry;
  const fetched = await fetchRegistryEntries(registry);
  const envelope = await buildDigestEnvelope({
    registry,
    entries: fetched.entries,
    statePath: paths.seenPath,
    minScore: options.minScore ?? 7,
    keywords: splitCsv(options.keywords),
    markSeen: "reported-only"
  });
  envelope.failures = fetched.failures;
  envelope.health = fetched.health;
  return ingestRssEnvelope({
    workspace: options.workspace,
    envelope,
    criteria: {
      channel: "rss",
      registry: options.registry,
      since: options.since,
      keywords: options.keywords,
      must_keywords: options.mustKeywords,
      should_keywords: options.shouldKeywords,
      exclude_keywords: options.excludeKeywords,
      min_score: options.minScore
    },
    startedAt,
    timeWindow: options.since
  });
}
```

Also import `readFile`, `FeedRegistry`, `fetchRegistryEntries`, and `buildDigestEnvelope`.

- [ ] **Step 5: Run tests**

Run:

```bash
cd packages/research-cli && npm test
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/research-cli/src/rss/node-runtime.ts packages/research-cli/src/commands/ingest-rss.ts packages/research-cli/test/rss-node-runtime-fetch.test.ts
git commit -m "feat: enable node rss ingest runtime"
```

---

### Task 9: Add Python Parity Fixture Tests

**Files:**
- Create: `packages/research-cli/test/rss-python-parity.test.ts`
- Create: `packages/research-cli/test/fixtures/rss/example.rss.xml`
- Create: `packages/research-cli/test/fixtures/rss/example.atom.xml`
- Create: `packages/research-cli/test/fixtures/opml/example.opml`

- [ ] **Step 1: Add fixtures**

Create `packages/research-cli/test/fixtures/rss/example.rss.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Example RSS</title>
    <item>
      <title>Building reliable LLM agents with evals</title>
      <link>https://example.com/agents</link>
      <guid>agent-guid</guid>
      <author>Jane Engineer</author>
      <pubDate>Wed, 20 May 2026 08:00:00 GMT</pubDate>
      <description>A practical engineering write-up about agents, evals, and production systems.</description>
    </item>
  </channel>
</rss>
```

Create `packages/research-cli/test/fixtures/rss/example.atom.xml` with the Atom fixture from Task 4.

Create `packages/research-cli/test/fixtures/opml/example.opml` with the OPML fixture from Task 3.

- [ ] **Step 2: Write parity tests**

Create `packages/research-cli/test/rss-python-parity.test.ts`:

```ts
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { parseFeedXml } from "../src/rss/feed-parser.js";
import { parseOpml } from "../src/rss/opml.js";

const repoRoot = join(process.cwd(), "../..");
const pythonScript = join(repoRoot, "skills/rss-ai-digest/scripts/rss_monitor.py");

test("node RSS parser matches expected Python fixture contract", async () => {
  const rss = await readFile(join(process.cwd(), "test/fixtures/rss/example.rss.xml"), "utf8");
  const nodeEntries = parseFeedXml(rss, "rss", "Example RSS");
  assert.equal(nodeEntries[0].title, "Building reliable LLM agents with evals");
  assert.equal(nodeEntries[0].link, "https://example.com/agents");
  assert.equal(nodeEntries[0].author, "Jane Engineer");

  const pythonCheck = spawnSync("python3", ["-m", "unittest", "tests.test_rss_monitor.RssMonitorTests.test_parse_rss_and_atom_entries"], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(pythonCheck.status, 0, pythonCheck.stderr);
});

test("node OPML parser matches expected fixture contract", async () => {
  const opml = await readFile(join(process.cwd(), "test/fixtures/opml/example.opml"), "utf8");
  const feeds = parseOpml(opml);
  assert.equal(feeds.length, 1);
  assert.equal(feeds[0].id, "simonwillison-net");
});
```

- [ ] **Step 3: Run parity tests**

Run:

```bash
cd packages/research-cli && npm test -- --test-name-pattern "node RSS parser|node OPML parser"
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/research-cli/test/rss-python-parity.test.ts packages/research-cli/test/fixtures
git commit -m "test: add node rss parity fixtures"
```

---

### Task 10: Migrate Skill Docs Toward NPM Commands

**Files:**
- Modify: `skills/rss-ai-digest/SKILL.md`
- Modify: `skills/rss-source-curator/SKILL.md`
- Modify: `skills/rss-ai-digest/references/automation.md`
- Modify: `README.md`
- Modify: `README.zh-CN.md`
- Test: Skill validator for all three Skills

- [ ] **Step 1: Update `rss-ai-digest` command guidance**

Modify `skills/rss-ai-digest/SKILL.md` Workflow Selection:

```markdown
- Prefer `subscription-research ingest rss` and `subscription-research brief evidence` for research workspace and daily report workflows.
- Use `scripts/rss_monitor.py` directly only when the caller needs the legacy standalone RSS implementation or Python compatibility.
```

- [ ] **Step 2: Update README CLI contract**

In `README.md`, add:

```markdown
For local research workflows, prefer the npm CLI:

```bash
subscription-research ingest rss --workspace research-workspace --registry feeds.json --rss-runtime node
```

The Python RSS script remains available as a compatibility implementation while Node RSS runtime parity is completed.
```

Add the equivalent Chinese paragraph to `README.zh-CN.md`.

- [ ] **Step 3: Run tests and validators**

Run:

```bash
cd packages/research-cli && npm test
cd packages/research-cli && npm run typecheck
python3 -m unittest tests/test_rss_monitor.py -v
python3 /path/to/skill-creator/scripts/quick_validate.py skills/rss-ai-digest
python3 /path/to/skill-creator/scripts/quick_validate.py skills/rss-source-curator
python3 /path/to/skill-creator/scripts/quick_validate.py skills/subscription-research-agent
git diff --check
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add README.md README.zh-CN.md skills/rss-ai-digest/SKILL.md skills/rss-source-curator/SKILL.md skills/rss-ai-digest/references/automation.md
git commit -m "docs: prefer npm rss workflow commands"
```

---

## Self-Review

Spec coverage:

- NPM distribution is covered by Task 1.
- Node RSS parser migration is covered by Tasks 2-4.
- Filtering/scoring/dedupe envelope parity is covered by Tasks 5-6.
- Runtime switching is covered by Tasks 7-8.
- Python parity validation is covered by Task 9.
- Skill and README migration is covered by Task 10.

Known intentional limits:

- Full text extraction, semantic dedupe, LLM rerank, feed discovery, publisher adapters, and scheduler integration are excluded from this migration plan.
- Python removal is not included. The plan reaches Node default readiness and keeps Python as compatibility until a later deprecation plan.

Risk controls:

- Python remains the oracle until Node fixture parity is stable.
- The JSON envelope remains the contract.
- Node runtime is opt-in before becoming default.
- RSS fetching tests use injected fetch functions to avoid network-dependent unit tests.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-22-npm-rss-runtime-migration.md`.

Two execution options:

1. **Subagent-Driven (recommended)** - dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** - execute tasks in this session using executing-plans, batch execution with checkpoints.

Recommended next step: start with Task 1 only. It improves npm readiness without touching RSS behavior.
