import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { renderEvidenceMarkdown, type EvidenceBrief, type SourceHealthSummary } from "../evidence/render.js";
import { selectEvidence } from "../evidence/select.js";
import { openResearchDb } from "../workspace/db.js";
import { getWorkspacePaths } from "../workspace/paths.js";

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

export async function createEvidenceBrief(
  options: CreateEvidenceBriefOptions
): Promise<{ markdownPath: string; jsonPath: string }> {
  const paths = getWorkspacePaths(options.workspace);
  const db = openResearchDb(paths.databasePath);
  try {
    const evidence = selectEvidence(db, {
      question: options.question,
      mustKeywords: options.mustKeywords,
      shouldKeywords: options.shouldKeywords,
      excludeKeywords: options.excludeKeywords,
      since: options.since,
      minScore: options.minScore,
      limit: options.limit
    });
    const now = new Date().toISOString();
    const sourceHealthSummary = await loadSourceHealthSummary(paths.sourceHealthPath);
    const brief: EvidenceBrief = {
      question: options.question,
      time_window: options.since,
      generated_at: now,
      sources_scanned: sourceHealthSummary.checked || Number((db.prepare("select count(*) as count from sources").get() as { count: number }).count),
      source_health_summary: sourceHealthSummary,
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
    const filenameBase = `${now.slice(0, 10)}-${slug}-${runId.slice(0, 8)}`;
    const markdownPath = join(paths.briefsDir, `${filenameBase}.md`);
    const jsonPath = join(paths.jsonExportsDir, `${filenameBase}.json`);
    await mkdir(paths.briefsDir, { recursive: true });
    await mkdir(paths.jsonExportsDir, { recursive: true });
    await writeFile(markdownPath, renderEvidenceMarkdown(brief), "utf8");
    await writeFile(jsonPath, `${JSON.stringify(brief, null, 2)}\n`, "utf8");

    db.prepare(
      `
      insert into research_runs (id, question, time_window, criteria_json, started_at, completed_at, output_markdown_path, output_json_path)
      values (?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(runId, options.question, options.since, JSON.stringify(brief.selection_criteria), now, now, markdownPath, jsonPath);
    const insertEvidence = db.prepare(
      `
      insert into evidence_items (run_id, article_id, rank, score, why_selected_json, evidence_type, usefulness)
      values (?, ?, ?, ?, ?, ?, ?)
    `
    );
    evidence.forEach((item, index) => {
      insertEvidence.run(
        runId,
        item.article_id,
        index + 1,
        item.score,
        JSON.stringify(item.why_selected),
        item.evidence_type,
        item.usefulness
      );
    });

    return { markdownPath, jsonPath };
  } finally {
    db.close();
  }
}

function splitCsv(value?: string): string[] {
  return (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function loadSourceHealthSummary(path: string): Promise<SourceHealthSummary> {
  try {
    const health = JSON.parse(await readFile(path, "utf8")) as Record<string, Record<string, unknown>>;
    const entries = Object.entries(health);
    const failed = entries.filter(([, value]) => Number(value.failure_count || 0) > 0 || value.status === "failing");
    const succeeded = entries.filter(
      ([, value]) =>
        Number(value.success_count || 0) > 0 ||
        value.status === "healthy" ||
        (typeof value.last_success_at === "string" && Number(value.failure_count || 0) === 0)
    );
    return {
      checked: entries.length,
      succeeded: succeeded.length,
      failed: failed.length,
      failed_sample: failed.slice(0, 10).map(([id, value]) => ({
        id,
        error: String(value.last_error || "unknown error")
      }))
    };
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return { checked: 0, succeeded: 0, failed: 0, failed_sample: [] };
    }
    throw error;
  }
}
