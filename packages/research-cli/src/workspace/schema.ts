import type { ResearchDatabase } from "./db.js";

const SCHEMA_VERSION = 3;

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
    commentary_source text not null default '',
    original_source text not null default '',
    original_url text not null default '',
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
    run_type text not null default 'evidence',
    question text not null,
    time_window text not null,
    criteria_json text not null,
    stats_json text not null default '{}',
    source_health_summary_json text not null default '{}',
    archived_count integer not null default 0,
    entity_link_count integer not null default 0,
    status text not null default 'completed',
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

    migrateResearchRuns(db);
    migrateArticles(db);

    const row = db
      .prepare("select version from schema_version order by version desc limit 1")
      .get() as { version: number } | undefined;

    if (!row || row.version < SCHEMA_VERSION) {
      db.prepare("insert into schema_version (version, applied_at) values (?, ?)").run(
        SCHEMA_VERSION,
        new Date().toISOString()
      );
    }
  });

  transaction();
}

function migrateArticles(db: ResearchDatabase): void {
  const columns = new Set(
    (db.prepare("pragma table_info(articles)").all() as Array<{ name: string }>).map((column) => column.name)
  );
  const migrations: Array<[string, string]> = [
    ["commentary_source", "alter table articles add column commentary_source text not null default ''"],
    ["original_source", "alter table articles add column original_source text not null default ''"],
    ["original_url", "alter table articles add column original_url text not null default ''"]
  ];

  for (const [column, statement] of migrations) {
    if (!columns.has(column)) {
      db.prepare(statement).run();
    }
  }
}

function migrateResearchRuns(db: ResearchDatabase): void {
  const columns = new Set(
    (db.prepare("pragma table_info(research_runs)").all() as Array<{ name: string }>).map((column) => column.name)
  );
  const migrations: Array<[string, string]> = [
    ["run_type", "alter table research_runs add column run_type text not null default 'evidence'"],
    ["stats_json", "alter table research_runs add column stats_json text not null default '{}'"],
    [
      "source_health_summary_json",
      "alter table research_runs add column source_health_summary_json text not null default '{}'"
    ],
    ["archived_count", "alter table research_runs add column archived_count integer not null default 0"],
    ["entity_link_count", "alter table research_runs add column entity_link_count integer not null default 0"],
    ["status", "alter table research_runs add column status text not null default 'completed'"]
  ];

  for (const [column, statement] of migrations) {
    if (!columns.has(column)) {
      db.prepare(statement).run();
    }
  }
}
