import { readFile } from "node:fs/promises";
import { parseGithubReleaseSignals, type GithubReleaseItem } from "../trends/adapters/github-releases.js";
import { parseHackerNewsSignals, type HackerNewsItem } from "../trends/adapters/hacker-news.js";
import { parseWebUrlListSignals } from "../trends/adapters/web-url-list.js";
import { clusterTrendSignals } from "../trends/cluster.js";
import { getTrendProfile } from "../trends/profiles.js";
import { renderTrendCardsMarkdown } from "../trends/render.js";
import { scoreTrendCandidates } from "../trends/score.js";
import type { PublicTrendCard, TrendProfileId } from "../trends/types.js";

export interface ScanPublicTrendsOptions {
  profile: string;
  window?: string;
  webUrlList?: string;
  hackerNewsItems?: string;
  githubReleases?: string;
  now?: Date;
}

export interface ScanPublicTrendsResult {
  profile: TrendProfileId;
  window: string;
  cards: PublicTrendCard[];
  markdown: string;
}

export async function scanPublicTrends(options: ScanPublicTrendsOptions): Promise<ScanPublicTrendsResult> {
  const profile = getTrendProfile(options.profile);
  const now = options.now ?? new Date();
  const window = options.window ?? "7d";
  const signals = [];

  if (options.webUrlList) {
    signals.push(
      ...parseWebUrlListSignals({
        text: await readFile(options.webUrlList, "utf8"),
        profile,
        now,
        source: options.webUrlList
      })
    );
  }
  if (options.hackerNewsItems) {
    signals.push(
      ...parseHackerNewsSignals({
        items: JSON.parse(await readFile(options.hackerNewsItems, "utf8")) as HackerNewsItem[],
        profile
      })
    );
  }
  if (options.githubReleases) {
    const payload = JSON.parse(await readFile(options.githubReleases, "utf8")) as {
      repo?: string;
      releases?: GithubReleaseItem[];
    };
    signals.push(
      ...parseGithubReleaseSignals({
        repo: payload.repo || "unknown/repo",
        releases: payload.releases ?? [],
        profile
      })
    );
  }

  const candidates = clusterTrendSignals(signals);
  const cards = scoreTrendCandidates({ candidates, profile, window, now });
  return {
    profile: profile.id,
    window,
    cards,
    markdown: renderTrendCardsMarkdown(cards)
  };
}
