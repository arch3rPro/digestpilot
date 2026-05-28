import { TOPIC_ORDER, sortScoredEntries } from "./scoring.js";
import type { NodeDigestEnvelope, RssEntry, SourceCurationResult, SourcePatchResult } from "./types.js";

export function renderJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function renderMarkdownDigest(entries: RssEntry[], title = "RSS AI Digest"): string {
  const lines = [`## ${title}`, ""];
  const ranked = sortScoredEntries(entries);
  if (ranked.length === 0) {
    lines.push("No matching entries found.");
    return `${lines.join("\n")}\n`;
  }
  ranked.forEach((entry, index) => lines.push(...renderMarkdownEntryLines(index + 1, entry)));
  return `${lines.join("\n")}\n`;
}

export function renderMarkdownDigestResult(result: NodeDigestEnvelope, title = "RSS AI Digest"): string {
  const entries = sortScoredEntries(result.entries ?? []);
  const groups = groupEntriesByTopic(entries);
  const topTopics = TOPIC_ORDER.filter((topic) => (groups[topic] ?? []).length > 0).slice(0, 3);
  const lines = [titleLine(title), "", "### Overview", ""];
  lines.push(`- Reported entries: ${entries.length}`);
  lines.push(`- Top topics: ${topTopics.length ? topTopics.join(", ") : "None"}`);
  lines.push("", "### Top Picks", "");
  if (entries.length > 0) {
    entries.slice(0, 5).forEach((entry, index) => lines.push(...renderMarkdownEntryLines(index + 1, entry)));
  } else {
    lines.push("No matching entries found.");
  }

  for (const topic of TOPIC_ORDER) {
    const topicEntries = groups[topic] ?? [];
    if (topicEntries.length === 0) continue;
    lines.push("", `### ${topic}`, "");
    topicEntries.forEach((entry, index) => lines.push(...renderMarkdownEntryLines(index + 1, entry)));
  }

  return `${lines.join("\n")}\n`;
}

export function renderMarkdownSourceCuration(curation: SourceCurationResult): string {
  const lines = ["## RSS Source Curation", ""];
  if (Object.keys(curation.summary).length > 0) {
    lines.push("### Summary", "");
    for (const [action, count] of Object.entries(curation.summary).sort(([left], [right]) => left.localeCompare(right))) {
      lines.push(`- ${action}: ${count}`);
    }
    lines.push("");
  }
  if (curation.actions.length === 0) {
    lines.push("No source curation actions.");
    return `${lines.join("\n")}\n`;
  }
  lines.push("### Actions", "");
  for (const item of curation.actions) {
    const patchText = Object.keys(item.registry_patch).length ? JSON.stringify(item.registry_patch) : "{}";
    lines.push(`- \`${item.action}\` \`${item.id}\` - ${item.title}`);
    lines.push(`  - Status: ${item.status} / Score: ${item.score}/10`);
    lines.push(`  - Reason: ${item.reason}`);
    if (item.last_error) lines.push(`  - Last error: ${item.last_error}`);
    lines.push(`  - Registry patch: \`${patchText}\``);
  }
  return `${lines.join("\n")}\n`;
}

export function renderMarkdownSourcePatchResult(result: SourcePatchResult): string {
  const lines = ["## RSS Source Patch", ""];
  lines.push(`- Mode: ${result.dry_run ? "dry-run" : "apply"}`);
  lines.push(`- Set: ${result.summary.set}`);
  lines.push(`- Remove: ${result.summary.remove}`);
  lines.push(`- Skipped: ${result.summary.skipped}`);
  if (result.operations.length > 0) {
    lines.push("", "### Operations", "");
    result.operations.forEach((operation) => lines.push(`- \`${operation.action}\` \`${operation.id}\``));
  }
  if (result.skipped.length > 0) {
    lines.push("", "### Skipped", "");
    result.skipped.forEach((item) => lines.push(`- \`${item.id}\`: ${item.reason}`));
  }
  return `${lines.join("\n")}\n`;
}

function renderMarkdownEntryLines(index: number, entry: RssEntry): string[] {
  const reasons = entry.score_reasons?.join(", ") || "matched filters";
  const lines = [`${index}. [${entry.title || "Untitled"}](${entry.link || ""})`];
  lines.push(`   - Score: ${entry.score ?? 0}/10`);
  lines.push(`   - Source: ${entry.feed_title || entry.feed_id || ""}`);
  if (entry.author) lines.push(`   - Author: ${entry.author}`);
  lines.push(`   - Reason: ${reasons}`);
  return lines;
}

function groupEntriesByTopic(entries: RssEntry[]): Record<string, RssEntry[]> {
  const groups: Record<string, RssEntry[]> = Object.fromEntries(TOPIC_ORDER.map((topic) => [topic, []]));
  for (const entry of entries) {
    const topic = entry.topic || "Other";
    groups[topic] ??= [];
    groups[topic].push(entry);
  }
  return groups;
}

function titleLine(title: string): string {
  return title.startsWith("## ") ? title : `## ${title}`;
}
