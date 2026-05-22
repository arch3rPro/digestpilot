import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { extractReadableContent } from "../content/readability.js";
import type { ResearchDatabase } from "../workspace/db.js";
import { openResearchDb } from "../workspace/db.js";
import { getWorkspacePaths } from "../workspace/paths.js";

export interface ContentFetchResponse {
  text(): Promise<string>;
}

export type ContentFetcher = (url: string, init?: RequestInit) => Promise<ContentFetchResponse>;

export interface EnrichArticleContentOptions {
  workspace: string;
  since?: string;
  minScore?: number;
  limit?: number;
  articleId?: string;
  timeout?: number;
  refetch?: boolean;
  fetcher?: ContentFetcher;
}

export interface EnrichArticleContentResult {
  checked: number;
  fetched: number;
  failed: number;
  skipped: number;
  cache_paths: string[];
}

interface ArticleCandidate {
  id: string;
  link: string;
  score: number;
}

export async function enrichArticleContent(options: EnrichArticleContentOptions): Promise<EnrichArticleContentResult> {
  const paths = getWorkspacePaths(options.workspace);
  await mkdir(paths.contentCacheDir, { recursive: true });
  const db = openResearchDb(paths.databasePath);
  try {
    const candidates = selectCandidates(db, options);
    const result: EnrichArticleContentResult = {
      checked: candidates.length,
      fetched: 0,
      failed: 0,
      skipped: 0,
      cache_paths: []
    };

    for (const candidate of candidates) {
      if (!candidate.link) {
        result.skipped += 1;
        continue;
      }
      const cachePath = join(paths.contentCacheDir, `${candidate.id}.json`);
      try {
        const html = await fetchHtml(candidate.link, {
          fetcher: options.fetcher ?? fetch,
          timeoutMs: (options.timeout ?? 20) * 1000
        });
        const readable = extractReadableContent(html, candidate.link);
        const now = new Date().toISOString();
        const payload = {
          article_id: candidate.id,
          url: candidate.link,
          title: readable.title,
          byline: readable.byline,
          site_name: readable.siteName,
          excerpt: readable.excerpt,
          text_content: readable.textContent,
          content_length: readable.contentLength,
          status: "fetched",
          error: "",
          fetched_at: now,
          content_hash: createHash("sha256").update(readable.textContent).digest("hex")
        };
        upsertContent(db, payload);
        await writeFile(cachePath, JSON.stringify(payload, null, 2), "utf8");
        result.cache_paths.push(cachePath);
        result.fetched += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        upsertFailedContent(db, {
          article_id: candidate.id,
          url: candidate.link,
          status: "failed",
          error: message,
          fetched_at: new Date().toISOString()
        });
        result.failed += 1;
      }
    }

    return result;
  } finally {
    db.close();
  }
}

function selectCandidates(db: ResearchDatabase, options: EnrichArticleContentOptions): ArticleCandidate[] {
  const sinceIso = parseSince(options.since);
  return db
    .prepare(
      `
      select a.id, a.link, coalesce(a.score, 0) as score
      from articles a
      left join article_content ac on ac.article_id = a.id
      where a.link is not null
        and a.link != ''
        and coalesce(a.score, 0) >= ?
        and (? is null or a.published_at >= ?)
        and (? is null or a.id = ?)
        and (? = 1 or ac.status is null or ac.status = 'failed')
      order by coalesce(a.score, 0) desc, a.published_at desc, a.title asc
      limit ?
    `
    )
    .all(
      options.minScore ?? 0,
      sinceIso,
      sinceIso,
      options.articleId ?? null,
      options.articleId ?? null,
      options.refetch ? 1 : 0,
      options.limit ?? 20
    ) as ArticleCandidate[];
}

async function fetchHtml(url: string, options: { fetcher: ContentFetcher; timeoutMs: number }): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    const response = await options.fetcher(url, { signal: controller.signal });
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function upsertContent(
  db: ResearchDatabase,
  input: {
    article_id: string;
    url: string;
    title: string;
    byline: string;
    site_name: string;
    excerpt: string;
    text_content: string;
    content_length: number;
    status: string;
    error: string;
    fetched_at: string;
    content_hash: string;
  }
): void {
  const transaction = db.transaction(() => {
    db.prepare(
      `
      insert into article_content (
        article_id, url, title, byline, site_name, excerpt, text_content,
        content_length, status, error, fetched_at, raw_json
      )
      values (
        @article_id, @url, @title, @byline, @site_name, @excerpt, @text_content,
        @content_length, @status, @error, @fetched_at, @raw_json
      )
      on conflict(article_id) do update set
        url = excluded.url,
        title = excluded.title,
        byline = excluded.byline,
        site_name = excluded.site_name,
        excerpt = excluded.excerpt,
        text_content = excluded.text_content,
        content_length = excluded.content_length,
        status = excluded.status,
        error = excluded.error,
        fetched_at = excluded.fetched_at,
        raw_json = excluded.raw_json
    `
    ).run({ ...input, raw_json: JSON.stringify(input) });
    db.prepare("update articles set content_excerpt = ? where id = ?").run(input.excerpt, input.article_id);
  });
  transaction();
}

function upsertFailedContent(
  db: ResearchDatabase,
  input: { article_id: string; url: string; status: string; error: string; fetched_at: string }
): void {
  db.prepare(
    `
    insert into article_content (
      article_id, url, status, error, fetched_at, raw_json
    )
    values (@article_id, @url, @status, @error, @fetched_at, @raw_json)
    on conflict(article_id) do update set
      url = excluded.url,
      status = excluded.status,
      error = excluded.error,
      fetched_at = excluded.fetched_at,
      raw_json = excluded.raw_json
  `
  ).run({ ...input, raw_json: JSON.stringify(input) });
}

function parseSince(value?: string): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  const relative = /^(\d+)([hdw])$/.exec(trimmed);
  if (relative) {
    const amount = Number.parseInt(relative[1], 10);
    const unit = relative[2];
    const hours = unit === "h" ? amount : unit === "d" ? amount * 24 : amount * 24 * 7;
    return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  }
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid since value: ${value}`);
  }
  return date.toISOString();
}
