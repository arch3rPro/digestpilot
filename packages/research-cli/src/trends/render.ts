import type { PublicTrendCard } from "./types.js";

export function renderTrendCardsMarkdown(cards: PublicTrendCard[]): string {
  const lines = ["# Public Trend Radar", ""];
  for (const card of cards) {
    lines.push(`## ${card.title}`, "");
    lines.push(`- Profile: ${card.profile}`);
    lines.push(`- Type: ${card.type}`);
    lines.push(`- Score: ${card.score}`);
    lines.push(`- Confidence: ${card.confidence}`);
    lines.push("- Why trending:");
    for (const reason of card.why_trending) lines.push(`  - ${reason}`);
    lines.push("- Primary evidence:");
    for (const signal of card.primary_evidence) lines.push(`  - [${signal.title}](${signal.url})`);
    lines.push("- Community signals:");
    for (const signal of card.community_signals) lines.push(`  - [${signal.title}](${signal.url})`);
    lines.push("");
  }
  return lines.join("\n");
}
