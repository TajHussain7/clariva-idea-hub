import { logger } from "../logger.js";

export interface GithubRepo {
  name: string;
  org: string;
  stars: number;
  desc: string;
  lang: string;
  url: string;
}

export interface GithubResult {
  repos: GithubRepo[];
  totalCount: number;
  topLanguages: string[];
  avgStars: number;
}

function buildSearchQuery(title: string, description: string): string {
  const stopWords = new Set([
    "a", "an", "the", "and", "or", "but", "for", "with", "to", "of",
    "in", "on", "at", "is", "are", "was", "were", "be", "been", "that",
    "this", "it", "its", "i", "we", "you", "they", "do", "does", "did",
    "can", "could", "will", "would", "should", "have", "has", "had",
    "my", "your", "our", "their", "which", "how", "what", "when", "who",
  ]);

  const titleWords = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));

  const descWords = description
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 4 && !stopWords.has(w));

  const keywords = [...new Set([...titleWords.slice(0, 4), ...descWords.slice(0, 3)])];
  return keywords.slice(0, 5).join(" ");
}

async function executeGithubSearch(query: string): Promise<{ totalCount: number; items: any[] }> {
  try {
    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query + " is:public")}&sort=stars&order=desc&per_page=12`;
    
    logger.info({ query }, "Executing GitHub Search API query");

    const response = await fetch(url, {
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "Clariva-IdeaValidator/1.0",
        ...(process.env.GITHUB_TOKEN
          ? { Authorization: `token ${process.env.GITHUB_TOKEN}` }
          : {}),
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      logger.warn({ status: response.status, statusText: response.statusText }, "GitHub API non-OK response");
      return { totalCount: 0, items: [] };
    }

    const data = (await response.json()) as {
      total_count: number;
      items: any[];
    };
    return {
      totalCount: data.total_count ?? 0,
      items: data.items ?? [],
    };
  } catch (err) {
    logger.warn({ err, query }, "GitHub API query execution failed");
    return { totalCount: 0, items: [] };
  }
}

export async function fetchGithubData(
  title: string,
  description: string
): Promise<GithubResult> {
  const specificQuery = buildSearchQuery(title, description);
  
  // 1. Try specific query
  let { totalCount, items } = await executeGithubSearch(specificQuery);
  
  // 2. Fallback: If 0 or very few results found, try a broader query using title keywords
  if (items.length < 3) {
    const titleStopWords = new Set(["a", "an", "the", "and", "or", "to", "for", "with", "of", "in", "on", "at", "is", "hub", "idea", "creative"]);
    const titleQuery = title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !titleStopWords.has(w))
      .slice(0, 4)
      .join(" ");

    if (titleQuery && titleQuery !== specificQuery) {
      logger.info({ originalQuery: specificQuery, fallbackQuery: titleQuery }, "GitHub specific search returned few results. Trying fallback title search.");
      const fallbackResult = await executeGithubSearch(titleQuery);
      if (fallbackResult.items.length > items.length) {
        totalCount = fallbackResult.totalCount;
        items = fallbackResult.items;
      }
    }
  }

  const repos: GithubRepo[] = items.map((item) => ({
    name: item.name,
    org: item.owner?.login ?? "Unknown",
    stars: item.stargazers_count ?? 0,
    desc: item.description ?? "",
    lang: item.language ?? "Unknown",
    url: item.html_url ?? "",
  }));

  const langCounts: Record<string, number> = {};
  for (const repo of repos) {
    if (repo.lang && repo.lang !== "Unknown") {
      langCounts[repo.lang] = (langCounts[repo.lang] ?? 0) + 1;
    }
  }

  const topLanguages = Object.entries(langCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([lang]) => lang);

  const avgStars =
    repos.length > 0
      ? Math.round(repos.reduce((s, r) => s + r.stars, 0) / repos.length)
      : 0;

  logger.info({ reposFound: repos.length, totalCount }, "GitHub search completed");

  return {
    repos: repos.slice(0, 8),
    totalCount,
    topLanguages,
    avgStars,
  };
}
