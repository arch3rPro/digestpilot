import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { renderEvidenceMarkdown, type EvidenceBrief } from "../evidence/render.js";
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
