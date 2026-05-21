import type { EvidenceItem, SourceHealthSummary } from "../types.js";

export interface EvidenceBrief {
  question: string;
  time_window: string;
  generated_at: string;
  sources_scanned: number;
  source_health_summary: SourceHealthSummary;
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
    `- Source health: ${brief.source_health_summary.succeeded} succeeded, ${brief.source_health_summary.failed} failed`,
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

  lines.push("## Source Notes", "- Strong sources:", "- Weak/noisy sources:");
  if (brief.source_health_summary.failed_sample.length > 0) {
    lines.push("- Failed sources:");
    for (const item of brief.source_health_summary.failed_sample) {
      lines.push(`  - ${item.id}: ${item.error}`);
    }
  } else {
    lines.push("- Failed sources: none recorded");
  }
  lines.push("");
  lines.push("## Gaps", "- Missing perspectives:", "- Thin evidence:", "- Sources to add:", "");
  lines.push("## Suggested Next Questions", "- Agent-fillable from evidence.");
  return `${lines.join("\n")}\n`;
}
