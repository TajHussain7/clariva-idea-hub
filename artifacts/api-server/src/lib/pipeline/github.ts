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

export async function fetchGithubData(
  title: string,
  description: string
): Promise<GithubResult> {
  const query = buildSearchQuery(title, description);

  try {
    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=8`;

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
      logger.warn({ status: response.status }, "GitHub API non-OK response");
      return { repos: [], totalCount: 0, topLanguages: [], avgStars: 0 };
    }

    const data = (await response.json()) as {
      total_count: number;
      items: Array<{
        name: string;
        owner: { login: string };
        stargazers_count: number;
        description: string | null;
        language: string | null;
        html_url: string;
      }>;
    };

    const repos: GithubRepo[] = (data.items ?? []).map((item) => ({
      name: item.name,
      org: item.owner.login,
      stars: item.stargazers_count,
      desc: item.description ?? "",
      lang: item.language ?? "Unknown",
      url: item.html_url,
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

    return {
      repos: repos.slice(0, 6),
      totalCount: data.total_count ?? 0,
      topLanguages,
      avgStars,
    };
  } catch (err) {
    logger.warn({ err }, "GitHub API fetch failed");
    return { repos: [], totalCount: 0, topLanguages: [], avgStars: 0 };
  }
}
