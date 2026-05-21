import { createHash } from "node:crypto";
import { appendFile } from "node:fs/promises";
import type { ExtractedEntity } from "../entities/config.js";
import { extractEntities } from "../entities/extract.js";
import type { ResearchDatabase } from "../workspace/db.js";
import type { RssDigestEntry, WorkspacePaths } from "../types.js";
import type { EntityConfig } from "../entities/config.js";

export interface ArchiveResult {
  entriesArchived: number;
  entitiesLinked: number;
}

export interface ArchiveOptions {
  entityConfig?: EntityConfig;
}

export async function archiveEntries(
  paths: WorkspacePaths,
  db: ResearchDatabase,
  entries: RssDigestEntry[],
  options: ArchiveOptions = {}
): Promise<ArchiveResult> {
  const now = new Date().toISOString();
  let entitiesLinked = 0;
  const entityConfig = options.entityConfig ?? { entities: [] };

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
      title = excluded.title,
      author = excluded.author,
      published_at = excluded.published_at,
      summary = excluded.summary,
      content_excerpt = excluded.content_excerpt,
      score = excluded.score,
      topic = excluded.topic,
      score_reasons_json = excluded.score_reasons_json,
      raw_json = excluded.raw_json,
      last_seen_at = excluded.last_seen_at
  `);
  const upsertEntity = db.prepare(`
    insert into entities (id, name, type, aliases_json, confidence, source, status, created_at, updated_at)
    values (@id, @name, @type, @aliases_json, @confidence, @source, 'active', @now, @now)
    on conflict(id) do update set
      name = excluded.name,
      type = excluded.type,
      confidence = excluded.confidence,
      source = excluded.source,
      updated_at = excluded.updated_at
  `);
  const linkEntity = db.prepare(`
    insert or ignore into article_entities (article_id, entity_id, match_text, match_source, confidence)
    values (@article_id, @entity_id, @match_text, @match_source, @confidence)
  `);

  const transaction = db.transaction((items: RssDigestEntry[]) => {
    for (const entry of items) {
      const sourceId = entry.feed_id || "unknown";
      const id = articleId(entry);
      upsertSource.run({
        id: sourceId,
        title: entry.feed_title || sourceId,
        url: "",
        now
      });
      upsertArticle.run({
        id,
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

      for (const entity of extractEntities({ title: entry.title, summary: entry.summary }, entityConfig)) {
        const entityId = entityIdFor(entity);
        upsertEntity.run({
          id: entityId,
          name: entity.name,
          type: entity.type,
          aliases_json: JSON.stringify(entity.id ? [entity.matchText] : []),
          confidence: entity.confidence,
          source: entity.source,
          now
        });
        const result = linkEntity.run({
          article_id: id,
          entity_id: entityId,
          match_text: entity.matchText,
          match_source: entity.source,
          confidence: entity.confidence
        });
        entitiesLinked += Number(result.changes);
      }
    }
  });
  transaction(entries);

  if (entries.length > 0) {
    await appendFile(paths.articlesJsonlPath, entries.map((entry) => JSON.stringify(entry)).join("\n") + "\n", "utf8");
  }
  return { entriesArchived: entries.length, entitiesLinked };
}

export function articleId(entry: RssDigestEntry): string {
  const basis = entry.link || `${entry.feed_id || ""}:${entry.title || ""}:${entry.published_at || ""}`;
  return createHash("sha256").update(basis).digest("hex");
}

function entityIdFor(entity: ExtractedEntity): string {
  if (entity.id) return entity.id;
  return `candidate:${createHash("sha256").update(entity.name.toLowerCase()).digest("hex").slice(0, 16)}`;
}
