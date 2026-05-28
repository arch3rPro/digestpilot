import { mkdir, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import type { GithubReleaseItem } from "../trends/adapters/github-releases.js";
import type { HackerNewsItem } from "../trends/adapters/hacker-news.js";
import { getTrendProfile } from "../trends/profiles.js";
import type { TrendProfileId } from "../trends/types.js";

export interface FetchPublicTrendInputsOptions {
  outputDir: string;
  profile?: string;
  windowDays?: number;
  hackerNewsQueries?: string[];
  githubRepos?: string[];
  limit?: number;
  now?: Date;
  fetcher?: typeof fetch;
}

export interface GithubReleasePayload {
  repo: string;
  releases: GithubReleaseItem[];
}

export interface FetchPublicTrendInputsResult {
  profile: TrendProfileId;
  window_days: number;
  generated_at: string;
  output_dir: string;
  files: {
    hacker_news_items: string;
    github_releases: string;
    web_url_list: string;
    fetch_summary: string;
  };
  sources: {
    hacker_news: {
      queries: string[];
      items: number;
    };
    github: Array<{
      repo: string;
      source: "rest" | "atom";
      releases: number;
      error?: string;
    }>;
    web_url_list: {
      urls: number;
    };
  };
}

interface HackerNewsAlgoliaHit {
  objectID?: string;
  title?: string;
  url?: string;
  created_at_i?: number;
  points?: number;
  num_comments?: number;
}

interface GithubRestRelease {
  html_url?: string;
  tag_name?: string;
  name?: string;
  published_at?: string;
  body?: string;
}

export async function fetchPublicTrendInputs(options: FetchPublicTrendInputsOptions): Promise<FetchPublicTrendInputsResult> {
  const profile = getTrendProfile(options.profile ?? "ai-tech");
  const now = options.now ?? new Date();
  const fetcher = options.fetcher ?? fetch;
  const windowDays = options.windowDays ?? 7;
  const limit = options.limit ?? 30;
  const hackerNewsQueries = options.hackerNewsQueries?.length ? options.hackerNewsQueries : defaultHackerNewsQueries(profile.id);
  const githubRepos = options.githubRepos?.length ? options.githubRepos : defaultGithubRepos(profile.id);

  await mkdir(options.outputDir, { recursive: true });

  const hnItems = await fetchHackerNewsItems({
    queries: hackerNewsQueries,
    windowDays,
    limit,
    now,
    fetcher
  });
  const githubResults = await Promise.all(githubRepos.map((repo) => fetchGithubReleases({ repo, fetcher })));

  const urls = hnItems
    .map((item) => item.url)
    .filter((url): url is string => typeof url === "string" && url.startsWith("http"))
    .slice(0, Math.min(20, limit));

  const hnPath = join(options.outputDir, "hn-items.json");
  const githubPath = join(options.outputDir, "github-releases.json");
  const urlPath = join(options.outputDir, "web-url-list.md");
  const summaryPath = join(options.outputDir, "fetch-summary.json");

  await writeFile(hnPath, JSON.stringify(hnItems, null, 2), "utf8");
  await writeFile(githubPath, JSON.stringify({ repos: githubResults.map((result) => result.payload) }, null, 2), "utf8");
  await writeFile(urlPath, urls.map((url) => `- ${url}`).join("\n") + (urls.length ? "\n" : ""), "utf8");

  const result: FetchPublicTrendInputsResult = {
    profile: profile.id,
    window_days: windowDays,
    generated_at: now.toISOString(),
    output_dir: options.outputDir,
    files: {
      hacker_news_items: hnPath,
      github_releases: githubPath,
      web_url_list: urlPath,
      fetch_summary: summaryPath
    },
    sources: {
      hacker_news: {
        queries: hackerNewsQueries,
        items: hnItems.length
      },
      github: githubResults.map(({ payload, source, error }) => ({
        repo: payload.repo,
        source,
        releases: payload.releases.length,
        ...(error ? { error } : {})
      })),
      web_url_list: {
        urls: urls.length
      }
    }
  };

  await writeFile(summaryPath, JSON.stringify(result, null, 2), "utf8");
  return result;
}

async function fetchHackerNewsItems(options: {
  queries: string[];
  windowDays: number;
  limit: number;
  now: Date;
  fetcher: typeof fetch;
}): Promise<HackerNewsItem[]> {
  const sinceSeconds = Math.floor((options.now.getTime() - options.windowDays * 24 * 60 * 60 * 1000) / 1000);
  const items = new Map<string, HackerNewsItem>();
  for (const query of options.queries) {
    const url = new URL("https://hn.algolia.com/api/v1/search_by_date");
    url.searchParams.set("tags", "story");
    url.searchParams.set("query", query);
    url.searchParams.set("hitsPerPage", String(Math.max(options.limit, 20)));
    url.searchParams.set("numericFilters", `created_at_i>${sinceSeconds}`);
    const payload = (await fetchJson(url.toString(), options.fetcher)) as { hits?: HackerNewsAlgoliaHit[] };
    for (const hit of payload.hits ?? []) {
      if (!hit.objectID || !hit.title) continue;
      items.set(hit.objectID, {
        id: Number(hit.objectID),
        title: hit.title,
        url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
        time: hit.created_at_i ?? sinceSeconds,
        score: hit.points ?? 0,
        descendants: hit.num_comments ?? 0
      });
    }
  }
  return [...items.values()]
    .sort((a, b) => trendWeight(b) - trendWeight(a))
    .slice(0, options.limit);
}

function trendWeight(item: HackerNewsItem): number {
  return (item.score ?? 0) + (item.descendants ?? 0) * 2;
}

async function fetchGithubReleases(options: {
  repo: string;
  fetcher: typeof fetch;
}): Promise<{ payload: GithubReleasePayload; source: "rest" | "atom"; error?: string }> {
  try {
    const releases = (await fetchJson(`https://api.github.com/repos/${options.repo}/releases?per_page=10`, options.fetcher)) as GithubRestRelease[];
    return {
      payload: {
        repo: options.repo,
        releases: releases.map((release) => ({
          html_url: release.html_url || `https://github.com/${options.repo}/releases`,
          tag_name: release.tag_name || basename(release.html_url || ""),
          name: release.name,
          published_at: release.published_at || new Date().toISOString(),
          body: release.body
        }))
      },
      source: "rest"
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const atom = await fetchText(`https://github.com/${options.repo}/releases.atom`, options.fetcher);
    return {
      payload: {
        repo: options.repo,
        releases: parseGithubReleaseAtom(atom, options.repo)
      },
      source: "atom",
      error: message
    };
  }
}

async function fetchJson(url: string, fetcher: typeof fetch): Promise<unknown> {
  const response = await fetcher(url, { headers: { "user-agent": "DigestPilot/0.3 public-trend-radar" } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.json();
}

async function fetchText(url: string, fetcher: typeof fetch): Promise<string> {
  const response = await fetcher(url, { headers: { "user-agent": "DigestPilot/0.3 public-trend-radar" } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.text();
}

function parseGithubReleaseAtom(xml: string, repo: string): GithubReleaseItem[] {
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].slice(0, 10).map((entry) => {
    const block = entry[1];
    const title = decodeXml(block.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim() ?? "");
    const updated = block.match(/<updated>([\s\S]*?)<\/updated>/)?.[1]?.trim() ?? new Date().toISOString();
    const link = block.match(/<link[^>]*href="([^"]+)"/)?.[1] ?? `https://github.com/${repo}/releases`;
    const content = decodeXml(block.match(/<content[^>]*>([\s\S]*?)<\/content>/)?.[1]?.trim() ?? title);
    return {
      html_url: link,
      tag_name: title.split(/\s+/).at(-1) || title || basename(link),
      name: title,
      published_at: updated,
      body: content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").slice(0, 1200)
    };
  });
}

function decodeXml(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function defaultHackerNewsQueries(profile: TrendProfileId): string[] {
  if (profile === "product-business") return ["AI product", "AI startup", "launch", "pricing"];
  return ["AI agent", "LLM", "MCP", "AI coding"];
}

function defaultGithubRepos(profile: TrendProfileId): string[] {
  if (profile === "product-business") return ["vercel/ai"];
  return ["vercel/ai"];
}
