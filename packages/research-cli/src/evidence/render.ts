import type { EvidenceItem, SourceHealthSummary } from "../types.js";

export interface EvidenceMergeHint {
  merge_key: string;
  primary_title: string;
  related_titles: string[];
  suggestion: string;
}

export interface DailyReportGuidance {
  priority_buckets: {
    lead: string[];
    supporting: string[];
    watch: string[];
  };
  merge_hints: EvidenceMergeHint[];
  style_notes: string[];
  quality_checklist: DailyReportQualityCheck[];
}

export interface DailyReportQualityCheck {
  id: string;
  check: string;
  evidence_hint: string;
}

export interface EvidenceBrief {
  question: string;
  time_window: string;
  generated_at: string;
  sources_scanned: number;
  source_health_summary: SourceHealthSummary;
  evidence_count: number;
  selection_criteria: {
    must_keywords: string[];
    must_keyword_mode?: "any" | "all";
    should_keywords: string[];
    exclude_keywords: string[];
    min_score: number;
  };
  key_signals: string[];
  evidence_items: EvidenceItem[];
  daily_report_guidance: DailyReportGuidance;
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
    `- Selection criteria: must=${brief.selection_criteria.must_keywords.join(", ") || "none"} (${brief.selection_criteria.must_keyword_mode || "any"}); should=${brief.selection_criteria.should_keywords.join(", ") || "none"}`,
    "",
    "## Key Signals",
    "- Agent-fillable from evidence.",
    "",
    "## Daily Report Guidance",
    "### Priority Buckets",
    `- Lead: ${formatTitleList(brief.daily_report_guidance.priority_buckets.lead)}`,
    `- Supporting: ${formatTitleList(brief.daily_report_guidance.priority_buckets.supporting)}`,
    `- Watch: ${formatTitleList(brief.daily_report_guidance.priority_buckets.watch)}`,
    "",
    "### Merge Hints",
    ...formatMergeHints(brief.daily_report_guidance.merge_hints),
    "",
    "### Writing Notes",
    ...brief.daily_report_guidance.style_notes.map((note) => `- ${note}`),
    "",
    "### Quality Checklist",
    ...brief.daily_report_guidance.quality_checklist.map((item) => `- ${item.id}: ${item.check}`),
    "",
    "## Evidence Items"
  ];

  for (const [index, item] of brief.evidence_items.entries()) {
    lines.push(`### ${index + 1}. ${item.title}`);
    lines.push(`- Source: ${item.source}`);
    if (item.original_source) {
      lines.push(`- Original source: ${item.original_source}`);
    }
    if (item.original_url) {
      lines.push(`- Original URL: ${item.original_url}`);
    }
    if (item.commentary_source) {
      lines.push(`- Commentary source: ${item.commentary_source}`);
    }
    lines.push(`- Link: ${item.link}`);
    lines.push(`- Published: ${item.published_at}`);
    lines.push(`- Priority: ${item.priority_bucket}`);
    lines.push(`- Attribution: ${item.attribution_label}`);
    lines.push(`- Merge key: ${item.merge_key}`);
    if (item.low_confidence) {
      lines.push("- Low confidence: review before using as a main claim");
    }
    if (item.summary) {
      lines.push(`- Summary: ${item.summary}`);
    }
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
    lines.push("- Failed sources for maintenance review:");
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

export function buildDailyReportGuidance(items: EvidenceItem[]): DailyReportGuidance {
  const mergeHints = buildMergeHints(items);
  const relatedTitles = new Set(mergeHints.flatMap((hint) => hint.related_titles));
  return {
    priority_buckets: {
      lead: bucketTitles(items, "lead", relatedTitles),
      supporting: bucketTitles(items, "supporting", relatedTitles),
      watch: bucketTitles(items, "watch", relatedTitles)
    },
    merge_hints: mergeHints,
    style_notes: [
      "Write the final daily report in Chinese unless the user asks otherwise.",
      "Merge closely related release notes into one story instead of repeating every package update.",
      "Use source-health details only as brief coverage context; keep maintenance actions out of the daily report.",
      "When a feed item is commentary on another publication, cite the original source and mention the commentary source separately."
    ],
    quality_checklist: DAILY_REPORT_QUALITY_CHECKLIST
  };
}

export const DAILY_REPORT_QUALITY_CHECKLIST: DailyReportQualityCheck[] = [
  {
    id: "source_coverage",
    check: "State scanned, succeeded, failed, and selected evidence counts briefly.",
    evidence_hint: "Use Scope and source_health_summary."
  },
  {
    id: "original_attribution",
    check: "Preserve original source and commentary source boundaries for every main item.",
    evidence_hint: "Use attribution_label, original_source, commentary_source, and original_url."
  },
  {
    id: "duplicate_merge",
    check: "Merge repeated release notes, reposts, and same-event commentary before writing top items.",
    evidence_hint: "Use merge_hints and merge_key."
  },
  {
    id: "noise_filtering",
    check: "Do not promote low-confidence, weak keyword, promotional, or off-theme items as main claims.",
    evidence_hint: "Use low_confidence, why_selected, priority_bucket, and selection criteria."
  },
  {
    id: "chinese_readability",
    check: "Write concise Chinese judgments and summaries, preserving original titles when useful.",
    evidence_hint: "Use style_notes and the user language preference."
  },
  {
    id: "follow_up_quality",
    check: "End with concrete follow-up questions tied to unresolved evidence, not generic research prompts.",
    evidence_hint: "Use gaps, low-confidence items, and repeated source clusters."
  }
];

function bucketTitles(items: EvidenceItem[], bucket: EvidenceItem["priority_bucket"], relatedTitles: Set<string>): string[] {
  return items.filter((item) => item.priority_bucket === bucket && !relatedTitles.has(item.title)).map((item) => item.title);
}

function buildMergeHints(items: EvidenceItem[]): EvidenceMergeHint[] {
  const groups = new Map<string, EvidenceItem[]>();
  for (const item of items) {
    if (!item.merge_key || item.merge_key === "general") continue;
    const group = groups.get(item.merge_key) ?? [];
    group.push(item);
    groups.set(item.merge_key, group);
  }
  return [...groups.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([mergeKey, group]) => ({
      merge_key: mergeKey,
      primary_title: group[0].title,
      related_titles: group.slice(1).map((item) => item.title),
      suggestion: `Treat these as one ${mergeKey} story and cite the strongest item first.`
    }));
}

function formatTitleList(titles: string[]): string {
  if (titles.length === 0) return "none";
  return titles.join("; ");
}

function formatMergeHints(hints: EvidenceMergeHint[]): string[] {
  if (hints.length === 0) return ["- None"];
  return hints.map((hint) => `- ${hint.merge_key}: lead with "${hint.primary_title}"; related: ${hint.related_titles.join("; ")}`);
}
