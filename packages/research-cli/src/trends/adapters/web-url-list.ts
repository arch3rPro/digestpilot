import { extractDiscoveryUrls } from "../../rss/discovery.js";
import type { PublicTrendSignal, TrendProfile } from "../types.js";

export function parseWebUrlListSignals(options: {
  text: string;
  profile: TrendProfile;
  now: Date;
  source: string;
}): PublicTrendSignal[] {
  return extractDiscoveryUrls(options.text).map((url, index) => ({
    id: `web-url-list:${options.profile.id}:${index}:${url}`,
    adapter: "web-url-list",
    profile: options.profile.id,
    type: options.profile.id === "product-business" ? "product" : "topic",
    title: url,
    url,
    source: options.source,
    published_at: options.now.toISOString(),
    summary: `Public URL candidate from ${options.source}`,
    entities: [],
    metrics: {},
    authority: "secondary",
    raw: { url }
  }));
}
