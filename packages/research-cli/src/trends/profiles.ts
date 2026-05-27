import type { TrendProfile, TrendProfileId } from "./types.js";

const profiles: Record<TrendProfileId, TrendProfile> = {
  "ai-tech": {
    id: "ai-tech",
    title: "AI Technical Trends",
    description: "Public trends around AI systems, models, developer tooling, research, and infrastructure.",
    weights: {
      freshness: 1.1,
      velocity: 1.1,
      cross_source: 1.2,
      authority: 1.4,
      discussion: 0.8,
      relevance: 1.3,
      novelty: 1,
      evidence_depth: 1.4
    },
    keywords: [
      "agent",
      "agents",
      "llm",
      "model",
      "inference",
      "eval",
      "benchmark",
      "rag",
      "mcp",
      "workflow",
      "dataset"
    ],
    preferredSignalTypes: ["project", "paper", "model", "dataset", "topic", "ecosystem"]
  },
  "product-business": {
    id: "product-business",
    title: "Product and Business Trends",
    description: "Public trends around AI products, launches, packaging, pricing, adoption, and market moves.",
    weights: {
      freshness: 1.2,
      velocity: 1.2,
      cross_source: 1.2,
      authority: 1.1,
      discussion: 1.1,
      relevance: 1.4,
      novelty: 1.1,
      evidence_depth: 1
    },
    keywords: [
      "launch",
      "pricing",
      "product",
      "workflow",
      "integration",
      "automation",
      "assistant",
      "copilot",
      "growth",
      "retention"
    ],
    preferredSignalTypes: ["product", "company", "event", "topic"]
  }
};

export function listTrendProfiles(): TrendProfile[] {
  return Object.values(profiles);
}

export function getTrendProfile(value: string): TrendProfile {
  if (value === "ai-tech" || value === "product-business") return profiles[value];
  throw new Error(`Unsupported trend profile: ${value}`);
}
