# Local-First Subscription Research Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `v0.3.0` local-first subscription research Agent foundation with a Node/TypeScript CLI, SQLite-backed research workspace, evidence brief workflow, and a high-level `subscription-research-agent` Skill.

**Architecture:** Add a Node/TypeScript CLI under `packages/research-cli/` that owns workspace management, SQLite schema, entity extraction, article archive, and evidence brief rendering. Keep the existing Python RSS CLI as the RSS worker for `v0.3`; the Node CLI calls it through subprocess and consumes its JSON envelope.

**Tech Stack:** Node.js, TypeScript, `commander`, `better-sqlite3`, built-in `node:test`, Python RSS worker, SQLite, JSONL, Markdown, standard Skill layout.

---

## Scope Guard

This plan implements the `v0.3` MVP only:

- Local checkout CLI, not npm publishing.
- SQLite plus JSONL plus Markdown, not a hosted service.
- Evidence brief generation, not final memo generation.
- Rule/config entity extraction, not LLM extraction.
- RSS ingest through the existing Python worker, not TypeScript RSS rewriting.

## File Structure

- Create: `packages/research-cli/package.json`
  - CLI package metadata, bin entry, dependencies, build/test scripts.
- Create: `packages/research-cli/tsconfig.json`
  - TypeScript compiler settings for Node ESM output.
- Create: `packages/research-cli/src/cli.ts`
  - Commander entrypoint and command registration.
- Create: `packages/research-cli/src/commands/init.ts`
  - `subscription-research init`.
- Create: `packages/research-cli/src/commands/ingest-rss.ts`
  - `subscription-research ingest rss`.
- Create: `packages/research-cli/src/commands/brief-evidence.ts`
  - `subscription-research brief evidence`.
- Create: `packages/research-cli/src/workspace/paths.ts`
  - Workspace path resolution and directory list.
- Create: `packages/research-cli/src/workspace/db.ts`
  - SQLite open/close helpers.
- Create: `packages/research-cli/src/workspace/schema.ts`
  - SQLite schema creation and version row.
- Create: `packages/research-cli/src/workspace/config.ts`
  - Default config file creation.
- Create: `packages/research-cli/src/rss/python-worker.ts`
  - Subprocess wrapper for `rss_monitor.py`.
- Create: `packages/research-cli/src/articles/archive.ts`
  - JSONL append and SQLite upsert for sources/articles/topics.
- Create: `packages/research-cli/src/entities/config.ts`
  - Entity config loading and normalization.
- Create: `packages/research-cli/src/entities/extract.ts`
  - Known entity matching and candidate extraction.
- Create: `packages/research-cli/src/evidence/select.ts`
  - Evidence item selection from SQLite.
- Create: `packages/research-cli/src/evidence/render.ts`
  - Evidence brief Markdown and JSON rendering.
- Create: `packages/research-cli/src/types.ts`
  - Shared TypeScript interfaces.
- Create: `packages/research-cli/test/*.test.ts`
  - Node test coverage for workspace, entities, ingest, and evidence brief.
- Create: `skills/subscription-research-agent/SKILL.md`
  - Research orchestration Skill entrypoint.
- Create: `skills/subscription-research-agent/agents/openai.yaml`
  - Optional UI metadata.
- Create: `skills/subscription-research-agent/references/research-workspace.md`
  - Workspace structure and data model reference.
- Create: `skills/subscription-research-agent/references/evidence-brief.md`
  - Evidence brief contract.
- Modify: `README.md`
  - Add research Agent positioning and CLI package overview.
- Modify: `README.zh-CN.md`
  - Mirror high-level research Agent positioning.
- Modify: `CHANGELOG.md`
  - Add `v0.3.0 - Unreleased`.
- Modify: `docs/project-status.zh-CN.md`
  - Add v0.3 planned scope and local-first research Agent positioning.
- Modify: `AGENTS.md`
  - Add Node CLI package and `subscription-research-agent` guidance.

---

## Task 1: Scaffold Node CLI Package

**Files:**
- Create: `packages/research-cli/package.json`
- Create: `packages/research-cli/tsconfig.json`
- Create: `packages/research-cli/src/cli.ts`
- Create: `packages/research-cli/src/types.ts`

- [ ] **Step 1: Create package metadata**

Create `packages/research-cli/package.json`:

```json
{
  "name": "@subscription-research/cli",
  "version": "0.3.0",
  "private": true,
  "description": "Local-first subscription research workspace CLI.",
  "type": "module",
  "bin": {
    "subscription-research": "./dist/cli.js"
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "npm run build && node --test dist/test/*.test.js",
    "typecheck": "tsc -p tsconfig.json --noEmit"
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

- [ ] **Step 2: Create TypeScript config**

Create `packages/research-cli/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "rootDir": ".",
    "outDir": "dist",
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts", "test/**/*.ts"]
}
```

- [ ] **Step 3: Create shared types**

Create `packages/research-cli/src/types.ts`:

```ts
export interface RssDigestEntry {
  title?: string;
  link?: string;
  author?: string;
  published_at?: string;
  summary?: string;
  feed_id?: string;
  feed_title?: string;
  topic?: string;
  score?: number;
  score_reasons?: string[];
  matched_keywords?: string[];
  matched_must_keywords?: string[];
  matched_should_keywords?: string[];
  raw?: unknown;
}

export interface RssDigestEnvelope {
  entries: RssDigestEntry[];
  failures?: Array<Record<string, unknown>>;
  health?: Record<string, unknown>;
  stats?: Record<string, number>;
  generated_at?: string;
}

export interface WorkspacePaths {
  root: string;
  dataDir: string;
  notesDir: string;
  briefsDir: string;
  exportsDir: string;
  jsonExportsDir: string;
  configDir: string;
  databasePath: string;
  articlesJsonlPath: string;
  sourcesJsonPath: string;
  sourceHealthPath: string;
  seenPath: string;
  workspaceConfigPath: string;
  entitiesConfigPath: string;
  topicsConfigPath: string;
  researchRulesPath: string;
}

export interface EvidenceItem {
  article_id: string;
  title: string;
  link: string;
  source: string;
  published_at: string;
  topic: string;
  entities: string[];
  score: number;
  why_selected: string[];
  evidence_type: string;
  usefulness: string;
}
```

- [ ] **Step 4: Create CLI entrypoint**

Create `packages/research-cli/src/cli.ts`:

```ts
#!/usr/bin/env node
import { Command } from "commander";

const program = new Command();

program
  .name("subscription-research")
  .description("Local-first subscription research workspace CLI.")
  .version("0.3.0");

program
  .command("init")
  .description("Initialize a local research workspace.")
  .requiredOption("--workspace <path>", "Workspace directory")
  .action(async () => {
    throw new Error("init command is not wired yet");
  });

program
  .command("ingest")
  .description("Ingest subscription channel data.")
  .argument("<channel>", "Channel type, for v0.3 use rss")
  .requiredOption("--workspace <path>", "Workspace directory")
  .action(async () => {
    throw new Error("ingest command is not wired yet");
  });

program
  .command("brief")
  .description("Generate research briefs.")
  .argument("<kind>", "Brief type, for v0.3 use evidence")
  .requiredOption("--workspace <path>", "Workspace directory")
  .requiredOption("--question <text>", "Research question")
  .action(async () => {
    throw new Error("brief command is not wired yet");
  });

await program.parseAsync(process.argv);
```

- [ ] **Step 5: Install package dependencies**

Run:

```bash
cd packages/research-cli
npm install
```

Expected: `package-lock.json` is created and dependencies install successfully.

- [ ] **Step 6: Build package**

Run:

```bash
cd packages/research-cli
npm run build
```

Expected: PASS and `dist/src/cli.js` exists. The bin path will be corrected in Task 2 when build layout is verified.

- [ ] **Step 7: Commit scaffold**

Run:

```bash
git add packages/research-cli
git commit -m "feat: scaffold subscription research cli"
```

---

## Task 2: Workspace Paths, Config, And SQLite Schema

**Files:**
- Create: `packages/research-cli/src/workspace/paths.ts`
- Create: `packages/research-cli/src/workspace/config.ts`
- Create: `packages/research-cli/src/workspace/db.ts`
- Create: `packages/research-cli/src/workspace/schema.ts`
- Create: `packages/research-cli/src/commands/init.ts`
- Create: `packages/research-cli/test/workspace.test.ts`
- Modify: `packages/research-cli/src/cli.ts`
- Modify: `packages/research-cli/package.json`

- [ ] **Step 1: Write failing workspace init test**

Create `packages/research-cli/test/workspace.test.ts`:

```ts
import assert from "node:assert/strict";
import { mkdtemp, rm, stat, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import Database from "better-sqlite3";
import { initWorkspace } from "../src/commands/init.js";

test("initWorkspace creates directories, config files, and schema", async () => {
  const root = await mkdtemp(join(tmpdir(), "subscription-research-"));
  const workspace = join(root, "workspace");
  try {
    await initWorkspace({ workspace });

    for (const path of [
      "data",
      "notes/briefs",
      "notes/daily",
      "notes/weekly",
      "notes/topics",
      "notes/entities",
      "notes/memos",
      "exports/markdown",
      "exports/json",
      "exports/opml",
      "config"
    ]) {
      assert.equal((await stat(join(workspace, path))).isDirectory(), true);
    }

    const workspaceConfig = JSON.parse(await readFile(join(workspace, "config/workspace.json"), "utf8"));
    assert.equal(workspaceConfig.schema_version, 1);

    const db = new Database(join(workspace, "data/research.db"), { readonly: true });
    try {
      const tables = db.prepare("select name from sqlite_master where type = 'table' order by name").all() as Array<{ name: string }>;
      assert.deepEqual(
        tables.map((row) => row.name),
        [
          "article_entities",
          "article_topics",
          "articles",
          "entities",
          "evidence_items",
          "research_runs",
          "schema_version",
          "sources",
          "topics"
        ]
      );
    } finally {
      db.close();
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run test to verify RED**

Run:

```bash
cd packages/research-cli
npm test -- --test-name-pattern initWorkspace
```

Expected: FAIL because `src/commands/init.ts` does not exist.

- [ ] **Step 3: Implement workspace paths**

Create `packages/research-cli/src/workspace/paths.ts`:

```ts
import { resolve, join } from "node:path";
import type { WorkspacePaths } from "../types.js";

export function getWorkspacePaths(workspace: string): WorkspacePaths {
  const root = resolve(workspace);
  const dataDir = join(root, "data");
  const notesDir = join(root, "notes");
  const exportsDir = join(root, "exports");
  const configDir = join(root, "config");
  return {
    root,
    dataDir,
    notesDir,
    briefsDir: join(notesDir, "briefs"),
    exportsDir,
    jsonExportsDir: join(exportsDir, "json"),
    configDir,
    databasePath: join(dataDir, "research.db"),
    articlesJsonlPath: join(dataDir, "articles.jsonl"),
    sourcesJsonPath: join(dataDir, "sources.json"),
    sourceHealthPath: join(dataDir, "source-health.json"),
    seenPath: join(dataDir, "seen.json"),
    workspaceConfigPath: join(configDir, "workspace.json"),
    entitiesConfigPath: join(configDir, "entities.json"),
    topicsConfigPath: join(configDir, "topics.json"),
    researchRulesPath: join(configDir, "research-rules.json")
  };
}

export function workspaceDirectories(paths: WorkspacePaths): string[] {
  return [
    paths.dataDir,
    paths.briefsDir,
    `${paths.notesDir}/daily`,
    `${paths.notesDir}/weekly`,
    `${paths.notesDir}/topics`,
    `${paths.notesDir}/entities`,
    `${paths.notesDir}/memos`,
    `${paths.exportsDir}/markdown`,
    paths.jsonExportsDir,
    `${paths.exportsDir}/opml`,
    paths.configDir
  ];
}
```

- [ ] **Step 4: Implement default config writers**

Create `packages/research-cli/src/workspace/config.ts`:

```ts
import { writeFile, access } from "node:fs/promises";
import type { WorkspacePaths } from "../types.js";

async function writeJsonIfMissing(path: string, value: unknown): Promise<void> {
  try {
    await access(path);
  } catch {
    await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  }
}

export async function writeDefaultConfigs(paths: WorkspacePaths): Promise<void> {
  await writeJsonIfMissing(paths.workspaceConfigPath, {
    schema_version: 1,
    created_by: "subscription-research",
    notes_style: "standard-markdown"
  });
  await writeJsonIfMissing(paths.entitiesConfigPath, { entities: [] });
  await writeJsonIfMissing(paths.topicsConfigPath, { topics: [] });
  await writeJsonIfMissing(paths.researchRulesPath, {
    default_time_window: "7d",
    min_score: 7,
    evidence_limit: 20
  });
}
```

- [ ] **Step 5: Implement database open helper**

Create `packages/research-cli/src/workspace/db.ts`:

```ts
import Database from "better-sqlite3";

export type ResearchDatabase = Database.Database;

export function openResearchDb(path: string): ResearchDatabase {
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}
```

- [ ] **Step 6: Implement schema**

Create `packages/research-cli/src/workspace/schema.ts`:

```ts
import type { ResearchDatabase } from "./db.js";

const statements = [
  `create table if not exists schema_version (
    version integer not null,
    applied_at text not null
  )`,
  `create table if not exists sources (
    id text primary key,
    title text not null,
    url text not null,
    type text not null default 'rss',
    language text,
    category_json text not null default '[]',
    base_score integer,
    status text,
    reliability_score real,
    last_success_at text,
    last_error_at text,
    created_at text not null,
    updated_at text not null
  )`,
  `create table if not exists articles (
    id text primary key,
    source_id text,
    title text not null,
    link text,
    author text,
    published_at text,
    summary text,
    content_excerpt text,
    topic text,
    score integer,
    score_reasons_json text not null default '[]',
    raw_json text not null,
    first_seen_at text not null,
    last_seen_at text not null,
    foreign key(source_id) references sources(id)
  )`,
  `create table if not exists entities (
    id text primary key,
    name text not null,
    type text not null,
    aliases_json text not null default '[]',
    confidence text not null,
    source text not null,
    status text not null,
    created_at text not null,
    updated_at text not null
  )`,
  `create table if not exists article_entities (
    article_id text not null,
    entity_id text not null,
    match_text text not null,
    match_source text not null,
    confidence text not null,
    primary key(article_id, entity_id, match_text),
    foreign key(article_id) references articles(id),
    foreign key(entity_id) references entities(id)
  )`,
  `create table if not exists topics (
    id text primary key,
    name text not null,
    description text,
    keywords_json text not null default '[]',
    status text not null,
    created_at text not null,
    updated_at text not null
  )`,
  `create table if not exists article_topics (
    article_id text not null,
    topic_id text not null,
    match_source text not null,
    confidence text not null,
    primary key(article_id, topic_id),
    foreign key(article_id) references articles(id),
    foreign key(topic_id) references topics(id)
  )`,
  `create table if not exists research_runs (
    id text primary key,
    question text not null,
    time_window text not null,
    criteria_json text not null,
    started_at text not null,
    completed_at text,
    output_markdown_path text,
    output_json_path text
  )`,
  `create table if not exists evidence_items (
    run_id text not null,
    article_id text not null,
    rank integer not null,
    score integer not null,
    why_selected_json text not null,
    evidence_type text not null,
    usefulness text not null,
    primary key(run_id, article_id),
    foreign key(run_id) references research_runs(id),
    foreign key(article_id) references articles(id)
  )`
];

export function applySchema(db: ResearchDatabase): void {
  const transaction = db.transaction(() => {
    for (const statement of statements) {
      db.prepare(statement).run();
    }
    const row = db.prepare("select version from schema_version order by version desc limit 1").get() as { version: number } | undefined;
    if (!row) {
      db.prepare("insert into schema_version (version, applied_at) values (?, ?)").run(1, new Date().toISOString());
    }
  });
  transaction();
}
```

- [ ] **Step 7: Implement init command**

Create `packages/research-cli/src/commands/init.ts`:

```ts
import { mkdir } from "node:fs/promises";
import { getWorkspacePaths, workspaceDirectories } from "../workspace/paths.js";
import { writeDefaultConfigs } from "../workspace/config.js";
import { openResearchDb } from "../workspace/db.js";
import { applySchema } from "../workspace/schema.js";

export interface InitOptions {
  workspace: string;
}

export async function initWorkspace(options: InitOptions): Promise<void> {
  const paths = getWorkspacePaths(options.workspace);
  for (const directory of workspaceDirectories(paths)) {
    await mkdir(directory, { recursive: true });
  }
  await writeDefaultConfigs(paths);
  const db = openResearchDb(paths.databasePath);
  try {
    applySchema(db);
  } finally {
    db.close();
  }
}
```

- [ ] **Step 8: Wire CLI init command**

Modify `packages/research-cli/src/cli.ts`:

```ts
#!/usr/bin/env node
import { Command } from "commander";
import { initWorkspace } from "./commands/init.js";

const program = new Command();

program
  .name("subscription-research")
  .description("Local-first subscription research workspace CLI.")
  .version("0.3.0");

program
  .command("init")
  .description("Initialize a local research workspace.")
  .requiredOption("--workspace <path>", "Workspace directory")
  .action(async (options: { workspace: string }) => {
    await initWorkspace(options);
  });

program
  .command("ingest")
  .description("Ingest subscription channel data.")
  .argument("<channel>", "Channel type, for v0.3 use rss")
  .requiredOption("--workspace <path>", "Workspace directory")
  .action(async () => {
    throw new Error("ingest command is not wired yet");
  });

program
  .command("brief")
  .description("Generate research briefs.")
  .argument("<kind>", "Brief type, for v0.3 use evidence")
  .requiredOption("--workspace <path>", "Workspace directory")
  .requiredOption("--question <text>", "Research question")
  .action(async () => {
    throw new Error("brief command is not wired yet");
  });

await program.parseAsync(process.argv);
```

- [ ] **Step 9: Run workspace tests**

Run:

```bash
cd packages/research-cli
npm test -- --test-name-pattern initWorkspace
```

Expected: PASS.

- [ ] **Step 10: Commit workspace init**

Run:

```bash
git add packages/research-cli
git commit -m "feat: add research workspace init"
```

---

## Task 3: RSS Worker Wrapper And Article Archive

**Files:**
- Create: `packages/research-cli/src/rss/python-worker.ts`
- Create: `packages/research-cli/src/articles/archive.ts`
- Create: `packages/research-cli/src/commands/ingest-rss.ts`
- Create: `packages/research-cli/test/ingest-rss.test.ts`
- Modify: `packages/research-cli/src/cli.ts`

- [ ] **Step 1: Write failing ingest test**

Create `packages/research-cli/test/ingest-rss.test.ts`:

```ts
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import Database from "better-sqlite3";
import { initWorkspace } from "../src/commands/init.js";
import { ingestRssEnvelope } from "../src/commands/ingest-rss.js";
import type { RssDigestEnvelope } from "../src/types.js";

test("ingestRssEnvelope archives entries to JSONL and SQLite", async () => {
  const root = await mkdtemp(join(tmpdir(), "subscription-research-"));
  const workspace = join(root, "workspace");
  try {
    await initWorkspace({ workspace });
    const envelope: RssDigestEnvelope = {
      entries: [
        {
          title: "LLM evals in production",
          link: "https://example.com/llm-evals",
          feed_id: "ai-feed",
          feed_title: "AI Feed",
          published_at: "2026-05-21T00:00:00Z",
          summary: "Benchmark and reliability notes.",
          topic: "AI / LLM",
          score: 9,
          score_reasons: ["should_keyword_match"]
        }
      ],
      failures: [],
      health: {},
      stats: { feeds_success: 1 },
      generated_at: "2026-05-21T00:00:00Z"
    };

    const result = await ingestRssEnvelope({ workspace, envelope });
    assert.equal(result.entriesArchived, 1);

    const jsonl = await readFile(join(workspace, "data/articles.jsonl"), "utf8");
    assert.match(jsonl, /LLM evals in production/);

    const db = new Database(join(workspace, "data/research.db"), { readonly: true });
    try {
      const article = db.prepare("select title, topic, score from articles").get() as { title: string; topic: string; score: number };
      assert.equal(article.title, "LLM evals in production");
      assert.equal(article.topic, "AI / LLM");
      assert.equal(article.score, 9);
    } finally {
      db.close();
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run ingest test to verify RED**

Run:

```bash
cd packages/research-cli
npm test -- --test-name-pattern ingestRssEnvelope
```

Expected: FAIL because `src/commands/ingest-rss.ts` does not exist.

- [ ] **Step 3: Implement Python worker wrapper**

Create `packages/research-cli/src/rss/python-worker.ts`:

```ts
import { spawn } from "node:child_process";
import type { RssDigestEnvelope } from "../types.js";

export interface RunRssDigestOptions {
  python?: string;
  scriptPath: string;
  registry: string;
  state: string;
  health?: string;
  since?: string;
  keywords?: string;
  mustKeywords?: string;
  shouldKeywords?: string;
  excludeKeywords?: string;
  minScore?: number;
}

export async function runRssDigest(options: RunRssDigestOptions): Promise<RssDigestEnvelope> {
  const args = [
    options.scriptPath,
    "digest",
    "--registry",
    options.registry,
    "--state",
    options.state,
    "--format",
    "json"
  ];
  if (options.health) args.push("--health", options.health);
  if (options.since) args.push("--since", options.since);
  if (options.keywords) args.push("--keywords", options.keywords);
  if (options.mustKeywords) args.push("--must-keywords", options.mustKeywords);
  if (options.shouldKeywords) args.push("--should-keywords", options.shouldKeywords);
  if (options.excludeKeywords) args.push("--exclude-keywords", options.excludeKeywords);
  if (typeof options.minScore === "number") args.push("--min-score", String(options.minScore));

  const python = options.python ?? "python3";
  const output = await runProcess(python, args);
  return JSON.parse(output) as RssDigestEnvelope;
}

function runProcess(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout);
        return;
      }
      reject(new Error(`${command} exited with code ${code}: ${stderr}`));
    });
  });
}
```

- [ ] **Step 4: Implement article archive**

Create `packages/research-cli/src/articles/archive.ts`:

```ts
import { appendFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import type { ResearchDatabase } from "../workspace/db.js";
import type { RssDigestEntry, WorkspacePaths } from "../types.js";

export interface ArchiveResult {
  entriesArchived: number;
}

export async function archiveEntries(paths: WorkspacePaths, db: ResearchDatabase, entries: RssDigestEntry[]): Promise<ArchiveResult> {
  const now = new Date().toISOString();
  const upsertSource = db.prepare(`
    insert into sources (id, title, url, type, category_json, created_at, updated_at)
    values (@id, @title, @url, 'rss', '[]', @now, @now)
    on conflict(id) do update set title = excluded.title, updated_at = excluded.updated_at
  `);
  const upsertArticle = db.prepare(`
    insert into articles (
      id, source_id, title, link, author, published_at, summary, content_excerpt,
      topic, score, score_reasons_json, raw_json, first_seen_at, last_seen_at
    )
    values (
      @id, @source_id, @title, @link, @author, @published_at, @summary, @content_excerpt,
      @topic, @score, @score_reasons_json, @raw_json, @now, @now
    )
    on conflict(id) do update set
      score = excluded.score,
      topic = excluded.topic,
      score_reasons_json = excluded.score_reasons_json,
      raw_json = excluded.raw_json,
      last_seen_at = excluded.last_seen_at
  `);

  const transaction = db.transaction((items: RssDigestEntry[]) => {
    for (const entry of items) {
      const sourceId = entry.feed_id || "unknown";
      upsertSource.run({
        id: sourceId,
        title: entry.feed_title || sourceId,
        url: "",
        now
      });
      upsertArticle.run({
        id: articleId(entry),
        source_id: sourceId,
        title: entry.title || "Untitled",
        link: entry.link || "",
        author: entry.author || "",
        published_at: entry.published_at || "",
        summary: entry.summary || "",
        content_excerpt: entry.summary || "",
        topic: entry.topic || "Other",
        score: entry.score ?? 0,
        score_reasons_json: JSON.stringify(entry.score_reasons || []),
        raw_json: JSON.stringify(entry),
        now
      });
    }
  });
  transaction(entries);

  if (entries.length > 0) {
    await appendFile(paths.articlesJsonlPath, entries.map((entry) => JSON.stringify(entry)).join("\n") + "\n", "utf8");
  }
  return { entriesArchived: entries.length };
}

export function articleId(entry: RssDigestEntry): string {
  const basis = entry.link || `${entry.feed_id || ""}:${entry.title || ""}:${entry.published_at || ""}`;
  return createHash("sha256").update(basis).digest("hex");
}
```

- [ ] **Step 5: Implement ingest command helper**

Create `packages/research-cli/src/commands/ingest-rss.ts`:

```ts
import type { RssDigestEnvelope } from "../types.js";
import { archiveEntries, type ArchiveResult } from "../articles/archive.js";
import { getWorkspacePaths } from "../workspace/paths.js";
import { openResearchDb } from "../workspace/db.js";

export interface IngestRssEnvelopeOptions {
  workspace: string;
  envelope: RssDigestEnvelope;
}

export async function ingestRssEnvelope(options: IngestRssEnvelopeOptions): Promise<ArchiveResult> {
  const paths = getWorkspacePaths(options.workspace);
  const db = openResearchDb(paths.databasePath);
  try {
    return await archiveEntries(paths, db, options.envelope.entries || []);
  } finally {
    db.close();
  }
}
```

- [ ] **Step 6: Run ingest test to verify GREEN**

Run:

```bash
cd packages/research-cli
npm test -- --test-name-pattern ingestRssEnvelope
```

Expected: PASS.

- [ ] **Step 7: Commit ingest archive**

Run:

```bash
git add packages/research-cli
git commit -m "feat: archive rss entries in research workspace"
```

---

## Task 4: Entity Config And Rule Extraction

**Files:**
- Create: `packages/research-cli/src/entities/config.ts`
- Create: `packages/research-cli/src/entities/extract.ts`
- Create: `packages/research-cli/test/entities.test.ts`

- [ ] **Step 1: Write failing entity extraction tests**

Create `packages/research-cli/test/entities.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { extractEntities } from "../src/entities/extract.js";

test("extractEntities matches known entities by aliases", () => {
  const entities = extractEntities(
    {
      title: "OpenAI ships GPT-5 eval tooling",
      summary: "ChatGPT reliability updates."
    },
    {
      entities: [
        {
          id: "openai",
          name: "OpenAI",
          aliases: ["OpenAI", "ChatGPT", "GPT-5"],
          type: "company",
          tags: ["ai"]
        }
      ]
    }
  );

  assert.equal(entities[0].id, "openai");
  assert.equal(entities[0].confidence, "high");
  assert.equal(entities[0].source, "config");
});

test("extractEntities returns rule candidates", () => {
  const entities = extractEntities(
    {
      title: "LangGraph adds MCP support",
      summary: "New Agent SDK examples."
    },
    { entities: [] }
  );

  assert.ok(entities.some((entity) => entity.name === "LangGraph" && entity.source === "rule"));
  assert.ok(entities.some((entity) => entity.name === "MCP" && entity.source === "rule"));
});
```

- [ ] **Step 2: Run entity tests to verify RED**

Run:

```bash
cd packages/research-cli
npm test -- --test-name-pattern extractEntities
```

Expected: FAIL because entity modules do not exist.

- [ ] **Step 3: Implement entity config types**

Create `packages/research-cli/src/entities/config.ts`:

```ts
export interface EntityConfig {
  entities: KnownEntity[];
}

export interface KnownEntity {
  id: string;
  name: string;
  aliases: string[];
  type: string;
  tags?: string[];
}

export interface ExtractedEntity {
  id?: string;
  name: string;
  type: string;
  confidence: "high" | "medium";
  source: "config" | "rule";
  matchText: string;
}
```

- [ ] **Step 4: Implement extraction**

Create `packages/research-cli/src/entities/extract.ts`:

```ts
import type { EntityConfig, ExtractedEntity } from "./config.js";

export interface EntityInput {
  title?: string;
  summary?: string;
}

export function extractEntities(input: EntityInput, config: EntityConfig): ExtractedEntity[] {
  const text = `${input.title || ""} ${input.summary || ""}`;
  const results = new Map<string, ExtractedEntity>();

  for (const entity of config.entities) {
    for (const alias of entity.aliases) {
      if (containsPhrase(text, alias)) {
        results.set(entity.id, {
          id: entity.id,
          name: entity.name,
          type: entity.type,
          confidence: "high",
          source: "config",
          matchText: alias
        });
        break;
      }
    }
  }

  for (const candidate of extractCandidateNames(text)) {
    const key = `candidate:${candidate}`;
    if (!Array.from(results.values()).some((entity) => entity.name === candidate || entity.matchText === candidate)) {
      results.set(key, {
        name: candidate,
        type: "candidate",
        confidence: "medium",
        source: "rule",
        matchText: candidate
      });
    }
  }

  return Array.from(results.values());
}

function containsPhrase(text: string, phrase: string): boolean {
  return text.toLowerCase().includes(phrase.toLowerCase());
}

function extractCandidateNames(text: string): string[] {
  const candidates = new Set<string>();
  const patterns = [
    /\b[A-Z]{2,}(?:-[0-9]+)?\b/g,
    /\b[A-Z][a-z]+(?:[A-Z][a-z0-9]+)+\b/g,
    /\b[A-Z][A-Za-z]+(?:\s+[0-9]+)\b/g,
    /\b[a-z0-9-]+\/[a-z0-9._-]+\b/gi
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      candidates.add(match[0]);
    }
  }
  return Array.from(candidates).sort();
}
```

- [ ] **Step 5: Run entity tests to verify GREEN**

Run:

```bash
cd packages/research-cli
npm test -- --test-name-pattern extractEntities
```

Expected: PASS.

- [ ] **Step 6: Commit entity extraction**

Run:

```bash
git add packages/research-cli
git commit -m "feat: add research entity extraction"
```

---

## Task 5: Evidence Selection And Rendering

**Files:**
- Create: `packages/research-cli/src/evidence/select.ts`
- Create: `packages/research-cli/src/evidence/render.ts`
- Create: `packages/research-cli/src/commands/brief-evidence.ts`
- Create: `packages/research-cli/test/evidence.test.ts`
- Modify: `packages/research-cli/src/cli.ts`

- [ ] **Step 1: Write failing evidence brief test**

Create `packages/research-cli/test/evidence.test.ts`:

```ts
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { initWorkspace } from "../src/commands/init.js";
import { ingestRssEnvelope } from "../src/commands/ingest-rss.js";
import { createEvidenceBrief } from "../src/commands/brief-evidence.js";

test("createEvidenceBrief writes markdown and JSON evidence outputs", async () => {
  const root = await mkdtemp(join(tmpdir(), "subscription-research-"));
  const workspace = join(root, "workspace");
  try {
    await initWorkspace({ workspace });
    await ingestRssEnvelope({
      workspace,
      envelope: {
        entries: [
          {
            title: "LLM evals in production",
            link: "https://example.com/llm-evals",
            feed_id: "ai-feed",
            feed_title: "AI Feed",
            published_at: "2026-05-21T00:00:00Z",
            summary: "Benchmark reliability notes.",
            topic: "AI / LLM",
            score: 9,
            score_reasons: ["should_keyword_match"]
          }
        ]
      }
    });

    const result = await createEvidenceBrief({
      workspace,
      question: "最近 LLM evals 有哪些新进展？",
      since: "7d",
      mustKeywords: "llm,evals",
      shouldKeywords: "benchmark,reliability",
      limit: 10
    });

    const markdown = await readFile(result.markdownPath, "utf8");
    const json = JSON.parse(await readFile(result.jsonPath, "utf8"));
    assert.match(markdown, /# Evidence Brief:/);
    assert.match(markdown, /LLM evals in production/);
    assert.equal(json.evidence_items.length, 1);
    assert.equal(json.question, "最近 LLM evals 有哪些新进展？");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run evidence test to verify RED**

Run:

```bash
cd packages/research-cli
npm test -- --test-name-pattern createEvidenceBrief
```

Expected: FAIL because `brief-evidence.ts` does not exist.

- [ ] **Step 3: Implement evidence selection**

Create `packages/research-cli/src/evidence/select.ts`:

```ts
import type { ResearchDatabase } from "../workspace/db.js";
import type { EvidenceItem } from "../types.js";

export interface SelectEvidenceOptions {
  question: string;
  mustKeywords?: string;
  shouldKeywords?: string;
  limit: number;
}

export function selectEvidence(db: ResearchDatabase, options: SelectEvidenceOptions): EvidenceItem[] {
  const terms = [...splitCsv(options.mustKeywords), ...splitCsv(options.shouldKeywords)];
  const rows = db.prepare(`
    select a.id, a.title, a.link, a.published_at, a.topic, a.score, a.score_reasons_json, s.title as source
    from articles a
    left join sources s on s.id = a.source_id
    order by a.score desc, a.published_at desc, a.title asc
    limit ?
  `).all(options.limit) as Array<Record<string, unknown>>;

  return rows
    .filter((row) => matchesTerms(`${row.title || ""} ${row.topic || ""}`, terms))
    .map((row) => ({
      article_id: String(row.id),
      title: String(row.title || ""),
      link: String(row.link || ""),
      source: String(row.source || ""),
      published_at: String(row.published_at || ""),
      topic: String(row.topic || "Other"),
      entities: [],
      score: Number(row.score || 0),
      why_selected: JSON.parse(String(row.score_reasons_json || "[]")) as string[],
      evidence_type: "analysis",
      usefulness: Number(row.score || 0) >= 8 ? "high" : "medium"
    }));
}

function splitCsv(value?: string): string[] {
  return (value || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function matchesTerms(text: string, terms: string[]): boolean {
  if (terms.length === 0) return true;
  const lowered = text.toLowerCase();
  return terms.some((term) => lowered.includes(term));
}
```

- [ ] **Step 4: Implement evidence renderers**

Create `packages/research-cli/src/evidence/render.ts`:

```ts
import type { EvidenceItem } from "../types.js";

export interface EvidenceBrief {
  question: string;
  time_window: string;
  generated_at: string;
  sources_scanned: number;
  evidence_count: number;
  selection_criteria: {
    must_keywords: string[];
    should_keywords: string[];
    exclude_keywords: string[];
    min_score: number;
  };
  key_signals: string[];
  evidence_items: EvidenceItem[];
  source_notes: Record<string, unknown>;
  gaps: string[];
  suggested_next_questions: string[];
}

export function renderEvidenceMarkdown(brief: EvidenceBrief): string {
  const lines = [
    `# Evidence Brief: ${brief.question}`,
    "",
    "## Scope",
    `- Question: ${brief.question}`,
    `- Time window: ${brief.time_window}`,
    `- Generated at: ${brief.generated_at}`,
    `- Sources scanned: ${brief.sources_scanned}`,
    `- Evidence items: ${brief.evidence_count}`,
    `- Selection criteria: must=${brief.selection_criteria.must_keywords.join(", ") || "none"}; should=${brief.selection_criteria.should_keywords.join(", ") || "none"}`,
    "",
    "## Key Signals",
    "- Agent-fillable from evidence.",
    "",
    "## Evidence Items"
  ];
  brief.evidence_items.forEach((item, index) => {
    lines.push(`### ${index + 1}. ${item.title}`);
    lines.push(`- Source: ${item.source}`);
    lines.push(`- Link: ${item.link}`);
    lines.push(`- Published: ${item.published_at}`);
    lines.push(`- Topic: ${item.topic}`);
    lines.push(`- Entities: ${item.entities.join(", ") || "none"}`);
    lines.push(`- Score: ${item.score}`);
    lines.push(`- Why selected: ${item.why_selected.join(", ") || "matched filters"}`);
    lines.push(`- Evidence type: ${item.evidence_type}`);
    lines.push(`- Usefulness: ${item.usefulness}`);
    lines.push("");
  });
  lines.push("## Source Notes", "- Strong sources:", "- Weak/noisy sources:", "- Failed sources:", "");
  lines.push("## Gaps", "- Missing perspectives:", "- Thin evidence:", "- Sources to add:", "");
  lines.push("## Suggested Next Questions", "- Agent-fillable from evidence.");
  return `${lines.join("\n")}\n`;
}
```

- [ ] **Step 5: Implement brief command helper**

Create `packages/research-cli/src/commands/brief-evidence.ts`:

```ts
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { getWorkspacePaths } from "../workspace/paths.js";
import { openResearchDb } from "../workspace/db.js";
import { selectEvidence } from "../evidence/select.js";
import { renderEvidenceMarkdown, type EvidenceBrief } from "../evidence/render.js";

export interface CreateEvidenceBriefOptions {
  workspace: string;
  question: string;
  since: string;
  mustKeywords?: string;
  shouldKeywords?: string;
  excludeKeywords?: string;
  minScore?: number;
  limit: number;
}

export async function createEvidenceBrief(options: CreateEvidenceBriefOptions): Promise<{ markdownPath: string; jsonPath: string }> {
  const paths = getWorkspacePaths(options.workspace);
  const db = openResearchDb(paths.databasePath);
  try {
    const evidence = selectEvidence(db, {
      question: options.question,
      mustKeywords: options.mustKeywords,
      shouldKeywords: options.shouldKeywords,
      limit: options.limit
    });
    const now = new Date().toISOString();
    const brief: EvidenceBrief = {
      question: options.question,
      time_window: options.since,
      generated_at: now,
      sources_scanned: Number((db.prepare("select count(*) as count from sources").get() as { count: number }).count),
      evidence_count: evidence.length,
      selection_criteria: {
        must_keywords: splitCsv(options.mustKeywords),
        should_keywords: splitCsv(options.shouldKeywords),
        exclude_keywords: splitCsv(options.excludeKeywords),
        min_score: options.minScore ?? 7
      },
      key_signals: [],
      evidence_items: evidence,
      source_notes: {},
      gaps: [],
      suggested_next_questions: []
    };
    const runId = randomUUID();
    const slug = slugify(options.question).slice(0, 80) || "evidence";
    const markdownPath = join(paths.briefsDir, `${now.slice(0, 10)}-${slug}.md`);
    const jsonPath = join(paths.jsonExportsDir, `${now.slice(0, 10)}-${slug}.json`);
    await mkdir(paths.briefsDir, { recursive: true });
    await mkdir(paths.jsonExportsDir, { recursive: true });
    await writeFile(markdownPath, renderEvidenceMarkdown(brief), "utf8");
    await writeFile(jsonPath, `${JSON.stringify(brief, null, 2)}\n`, "utf8");
    db.prepare(`
      insert into research_runs (id, question, time_window, criteria_json, started_at, completed_at, output_markdown_path, output_json_path)
      values (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(runId, options.question, options.since, JSON.stringify(brief.selection_criteria), now, now, markdownPath, jsonPath);
    const insertEvidence = db.prepare(`
      insert into evidence_items (run_id, article_id, rank, score, why_selected_json, evidence_type, usefulness)
      values (?, ?, ?, ?, ?, ?, ?)
    `);
    evidence.forEach((item, index) => {
      insertEvidence.run(runId, item.article_id, index + 1, item.score, JSON.stringify(item.why_selected), item.evidence_type, item.usefulness);
    });
    return { markdownPath, jsonPath };
  } finally {
    db.close();
  }
}

function splitCsv(value?: string): string[] {
  return (value || "").split(",").map((item) => item.trim()).filter(Boolean);
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
```

- [ ] **Step 6: Run evidence test to verify GREEN**

Run:

```bash
cd packages/research-cli
npm test -- --test-name-pattern createEvidenceBrief
```

Expected: PASS.

- [ ] **Step 7: Commit evidence brief**

Run:

```bash
git add packages/research-cli
git commit -m "feat: generate evidence briefs"
```

---

## Task 6: Subscription Research Skill Package

**Files:**
- Create: `skills/subscription-research-agent/SKILL.md`
- Create: `skills/subscription-research-agent/agents/openai.yaml`
- Create: `skills/subscription-research-agent/references/research-workspace.md`
- Create: `skills/subscription-research-agent/references/evidence-brief.md`

- [ ] **Step 1: Validate missing Skill fails**

Run:

```bash
python3 ~/.codex/skills/.system/skill-creator/scripts/quick_validate.py skills/subscription-research-agent
```

Expected: FAIL because the Skill does not exist yet.

- [ ] **Step 2: Create Skill entrypoint**

Create `skills/subscription-research-agent/SKILL.md`:

```markdown
---
name: subscription-research-agent
description: Use when an agent needs to run local-first research workflows from subscription sources, initialize a research workspace, archive evidence, generate evidence briefs, or prepare source-backed context for a research memo.
---

# Subscription Research Agent

## Overview

Use this skill to orchestrate local-first research workflows around subscription information channels. The deterministic tools prepare evidence packages; the active Agent writes final analysis from that evidence when the user asks.

## Workflow Selection

- For RSS article discovery or digest generation, use `rss-ai-digest`.
- For source quality and registry maintenance, use `rss-source-curator`.
- For local research workspace setup, run `subscription-research init`.
- For archiving RSS results into the research workspace, run `subscription-research ingest rss`.
- For source-backed research context, run `subscription-research brief evidence`.
- For workspace structure, read `references/research-workspace.md`.
- For evidence brief fields, read `references/evidence-brief.md`.

## Core Commands

Initialize a workspace:

```bash
subscription-research init --workspace research-workspace
```

Generate an evidence brief:

```bash
subscription-research brief evidence \
  --workspace research-workspace \
  --question "What changed in LLM evals this week?" \
  --since 7d \
  --must-keywords "llm,evals" \
  --should-keywords "benchmark,reliability,agent"
```

## Boundaries

This skill does not promise a final research conclusion from deterministic tooling alone. Treat generated briefs as evidence packages. The Agent should cite evidence items when writing a memo or report.
```

- [ ] **Step 3: Create OpenAI metadata**

Create `skills/subscription-research-agent/agents/openai.yaml`:

```yaml
interface:
  display_name: "Subscription Research Agent"
  short_description: "Prepare local evidence briefs from subscription sources."
  default_prompt: "Use $subscription-research-agent to prepare an evidence brief for my research question from local subscription sources."
```

- [ ] **Step 4: Create workspace reference**

Create `skills/subscription-research-agent/references/research-workspace.md`:

````markdown
# Research Workspace

The workspace is local-first and portable. It uses SQLite for queryable memory, JSONL for article archive, JSON for configuration, and Markdown for human-readable briefs.

```text
research-workspace/
├── data/
│   ├── research.db
│   ├── articles.jsonl
│   ├── sources.json
│   ├── source-health.json
│   └── seen.json
├── notes/
│   └── briefs/
├── exports/
│   └── json/
└── config/
    ├── workspace.json
    ├── entities.json
    ├── topics.json
    └── research-rules.json
```

Do not assume Obsidian. Markdown output should remain standard Markdown by default.
````

- [ ] **Step 5: Create evidence brief reference**

Create `skills/subscription-research-agent/references/evidence-brief.md`:

```markdown
# Evidence Brief

An evidence brief is not the final research memo. It is a source-backed context package for an Agent.

Required sections:

- Scope
- Key Signals
- Evidence Items
- Source Notes
- Gaps
- Suggested Next Questions

Each evidence item should include title, source, link, published date, topic, entities, score, selection reason, evidence type, and usefulness.

The deterministic CLI may leave `Key Signals` and `Suggested Next Questions` as agent-fillable sections. The Agent should fill them after reading the evidence.
```

- [ ] **Step 6: Validate Skill**

Run:

```bash
python3 ~/.codex/skills/.system/skill-creator/scripts/quick_validate.py skills/subscription-research-agent
```

Expected: PASS with `Skill is valid!`.

- [ ] **Step 7: Commit Skill**

Run:

```bash
git add skills/subscription-research-agent
git commit -m "feat: add subscription research agent skill"
```

---

## Task 7: Project Documentation For v0.3

**Files:**
- Modify: `README.md`
- Modify: `README.zh-CN.md`
- Modify: `AGENTS.md`
- Modify: `CHANGELOG.md`
- Modify: `docs/project-status.zh-CN.md`
- Modify: `.gitignore`

- [ ] **Step 1: Update `.gitignore`**

Add:

```gitignore
# Research workspace runtime outputs
research-workspace/
*.sqlite-wal
*.sqlite-shm
packages/research-cli/dist/
packages/research-cli/node_modules/
```

- [ ] **Step 2: Update README current skills**

Add `subscription-research-agent` to the current workspace Skill table:

```markdown
| `subscription-research-agent` | Orchestrate local-first evidence briefs from subscription sources for research workflows. |
```

Add a CLI package section:

```markdown
## Research CLI

`packages/research-cli/` provides the local-first `subscription-research` CLI. It manages research workspaces, SQLite schema, RSS evidence ingestion, entity extraction, and evidence brief generation. For `v0.3`, it calls the existing Python RSS worker instead of rewriting RSS parsing in TypeScript.
```

- [ ] **Step 3: Update Chinese README**

Add matching Chinese text:

```markdown
| `subscription-research-agent` | 围绕订阅来源编排本地优先 evidence brief，用于研究工作流。 |

## Research CLI

`packages/research-cli/` 提供本地优先的 `subscription-research` CLI。它负责 research workspace、SQLite schema、RSS evidence ingest、entity extraction 和 evidence brief 生成。`v0.3` 阶段继续调用现有 Python RSS worker，不重写 RSS parser。
```

- [ ] **Step 4: Update AGENTS.md**

Add repository layout bullets:

```markdown
- `skills/subscription-research-agent/SKILL.md`: local-first research orchestration Skill entrypoint.
- `packages/research-cli/`: Node/TypeScript CLI for research workspace, SQLite, ingestion archive, and evidence brief generation.
```

Add development commands:

```bash
cd packages/research-cli && npm test
```

- [ ] **Step 5: Update CHANGELOG.md**

Add:

```markdown
## v0.3.0 - Unreleased

### Added

- Added the `subscription-research-agent` Skill for local-first evidence research workflows.
- Added the `packages/research-cli` Node/TypeScript CLI package.
- Added SQLite-backed research workspace initialization.
- Added RSS evidence archiving and evidence brief generation.

### Changed

- Expanded the project direction from an RSS Skills suite toward a local-first subscription research Agent toolkit.
```

- [ ] **Step 6: Update project status**

In `docs/project-status.zh-CN.md`, add a section:

```markdown
### Local-first Subscription Research Agent

- `v0.3` 引入 `subscription-research-agent` 作为研究编排 Skill。
- 新增 Node/TypeScript `subscription-research` CLI。
- 本地 research workspace 使用 SQLite、JSONL、JSON 和 Markdown。
- CLI 生成 evidence brief，不直接生成最终研究报告。
```

- [ ] **Step 7: Run documentation checks**

Run:

```bash
rg -n "(/Users/[^[:space:]]+|/private[/]tmp|My[-]Skills|T[D]B|TO[D]O)" README.md README.zh-CN.md AGENTS.md CHANGELOG.md docs/project-status.zh-CN.md skills/subscription-research-agent/SKILL.md
git diff --check
```

Expected: no matches from `rg`; `git diff --check` exits successfully.

- [ ] **Step 8: Commit docs**

Run:

```bash
git add README.md README.zh-CN.md AGENTS.md CHANGELOG.md docs/project-status.zh-CN.md .gitignore
git commit -m "docs: document subscription research agent"
```

---

## Task 8: Final Verification

**Files:**
- Read: all changed files
- No expected code creation unless verification exposes a concrete issue

- [ ] **Step 1: Run Python RSS tests**

Run:

```bash
python3 -m unittest tests/test_rss_monitor.py -v
```

Expected: all tests pass.

- [ ] **Step 2: Run Node CLI tests**

Run:

```bash
cd packages/research-cli
npm test
```

Expected: all tests pass.

- [ ] **Step 3: Validate all Skills**

Run:

```bash
python3 ~/.codex/skills/.system/skill-creator/scripts/quick_validate.py skills/rss-ai-digest
python3 ~/.codex/skills/.system/skill-creator/scripts/quick_validate.py skills/rss-source-curator
python3 ~/.codex/skills/.system/skill-creator/scripts/quick_validate.py skills/subscription-research-agent
```

Expected: each returns `Skill is valid!`.

- [ ] **Step 4: Verify no generated runtime outputs are tracked**

Run:

```bash
git status --short
find packages/research-cli -maxdepth 2 \( -name node_modules -o -name dist \) -print
```

Expected: no uncommitted files except intentional source changes before final commit; generated `node_modules` and `dist` are not staged.

- [ ] **Step 5: Run whitespace check**

Run:

```bash
git diff --check
```

Expected: no output.

- [ ] **Step 6: Commit final fixes if needed**

If final verification required fixes, stage the touched source, Skill, or documentation paths from the v0.3 implementation, then commit them:

```bash
git add packages/research-cli skills/subscription-research-agent README.md README.zh-CN.md AGENTS.md CHANGELOG.md docs/project-status.zh-CN.md .gitignore
git commit -m "chore: finalize subscription research agent foundation"
```

- [ ] **Step 7: Report completion**

Report:

```text
v0.3 local-first subscription research Agent foundation complete locally.

Validated:
- Python RSS tests
- Node research CLI tests
- all Skill validators
- git diff --check

Release/tag not created.
```
