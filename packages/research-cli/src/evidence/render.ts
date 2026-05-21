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

  for (const [index, item] of brief.evidence_items.entries()) {
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
  }

  lines.push("## Source Notes", "- Strong sources:", "- Weak/noisy sources:", "- Failed sources:", "");
  lines.push("## Gaps", "- Missing perspectives:", "- Thin evidence:", "- Sources to add:", "");
  lines.push("## Suggested Next Questions", "- Agent-fillable from evidence.");
  return `${lines.join("\n")}\n`;
}
