import type { PublicTrendSignal, TrendProfile } from "../types.js";

export interface GithubReleaseItem {
  html_url: string;
  tag_name: string;
  name?: string;
  published_at: string;
  body?: string;
}

export function parseGithubReleaseSignals(options: {
  releases: GithubReleaseItem[];
  repo: string;
  profile: TrendProfile;
}): PublicTrendSignal[] {
  return options.releases.map((release) => ({
    id: `github-releases:${options.repo}:${release.tag_name}`,
    adapter: "github-releases",
    profile: options.profile.id,
    type: "project",
    title: release.name || `${options.repo} ${release.tag_name}`,
    url: release.html_url,
    source: "GitHub Releases",
    published_at: release.published_at,
    summary: release.body || release.name || release.tag_name,
    entities: [options.repo],
    metrics: {},
    authority: "primary",
    raw: release
  }));
}
