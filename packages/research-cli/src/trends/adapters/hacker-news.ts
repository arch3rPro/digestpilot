import type { PublicTrendSignal, TrendProfile } from "../types.js";

export interface HackerNewsItem {
  id: number;
  title: string;
  url?: string;
  time: number;
  score?: number;
  descendants?: number;
}

export function parseHackerNewsSignals(options: {
  items: HackerNewsItem[];
  profile: TrendProfile;
}): PublicTrendSignal[] {
  return options.items.map((item) => ({
    id: `hacker-news:${item.id}`,
    adapter: "hacker-news",
    profile: options.profile.id,
    type: options.profile.id === "product-business" ? "product" : "topic",
    title: item.title,
    url: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
    source: "Hacker News",
    published_at: new Date(item.time * 1000).toISOString(),
    summary: item.title,
    entities: extractSimpleEntities(item.title),
    metrics: {
      score: item.score ?? 0,
      comments: item.descendants ?? 0
    },
    authority: "community",
    raw: item
  }));
}

function extractSimpleEntities(value: string): string[] {
  return [...value.matchAll(/\b[A-Z][A-Za-z0-9-]{2,}\b/g)].map((match) => match[0]).slice(0, 8);
}
