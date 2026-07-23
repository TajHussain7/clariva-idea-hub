import { logger } from "../logger.js";

export interface GithubRepo {
  name: string;
  org: string;
  stars: number;
  desc: string;
  lang: string;
  url: string;
  lastPushedAt?: string;
  openIssuesCount?: number;
  contributorCount?: number;
  gapAnalysis?: {
    gap: string;
    opportunity: string;
  };
}

export interface GithubResult {
  repos: GithubRepo[];
  totalCount: number;
  topLanguages: string[];
  avgStars: number;
  relatedTopics: string[];
}

function buildSearchQuery(title: string, description: string): string {
  const stopWords = new Set([
    "a", "an", "the", "and", "or", "but", "for", "with", "to", "of", "in",
    "on", "at", "is", "are", "was", "were", "be", "been", "that", "this",
    "it", "its", "i", "we", "you", "they", "do", "does", "did", "can",
    "could", "will", "would", "should", "have", "has", "had", "my", "your",
    "our", "their", "which", "how", "what", "when", "who",
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

  const keywords = [
    ...new Set([...titleWords.slice(0, 4), ...descWords.slice(0, 3)]),
  ];
  return keywords.slice(0, 5).join(" ");
}

function buildDomainKeyword(title: string): string {
  const stopWords = new Set([
    "a", "an", "the", "and", "or", "for", "with", "to", "of", "in",
    "on", "at", "is", "hub", "idea", "creative", "app", "tool",
  ]);
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stopWords.has(w))
    .slice(0, 1)
    .join("");
}

function getGithubHeaders(): Record<string, string> {
  return {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "Clariva-IdeaValidator/1.0",
    ...(process.env.GITHUB_TOKEN
      ? { Authorization: `token ${process.env.GITHUB_TOKEN}` }
      : {}),
  };
}

interface RawGithubItem {
  name: string;
  owner?: { login?: string };
  stargazers_count?: number;
  description?: string | null;
  language?: string | null;
  html_url?: string;
  pushed_at?: string;
  open_issues_count?: number;
}

async function executeGithubSearch(
  query: string,
): Promise<{ totalCount: number; items: RawGithubItem[] }> {
  try {
    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query + " is:public")}&sort=stars&order=desc&per_page=12`;
    logger.info({ query }, "Executing GitHub Search API query");

    const response = await fetch(url, {
      headers: getGithubHeaders(),
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      logger.warn(
        { status: response.status, statusText: response.statusText },
        "GitHub API non-OK response",
      );
      return { totalCount: 0, items: [] };
    }

    const data = (await response.json()) as {
      total_count: number;
      items: RawGithubItem[];
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

async function fetchTopicsForDomain(domainKeyword: string): Promise<string[]> {
  if (!domainKeyword) return [];
  try {
    const url = `https://api.github.com/search/topics?q=${encodeURIComponent(domainKeyword)}`;
    const response = await fetch(url, {
      headers: {
        ...getGithubHeaders(),
        Accept: "application/vnd.github.mercy-preview+json",
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return [];
    const data = (await response.json()) as {
      items?: Array<{ name?: string }>;
    };
    return (data.items ?? [])
      .slice(0, 3)
      .map((t) => t.name ?? "")
      .filter(Boolean);
  } catch (err) {
    logger.warn({ err }, "GitHub Topics API fetch failed");
    return [];
  }
}

function parseLinkHeaderLastPage(linkHeader: string): number | null {
  // e.g.: <https://api.github.com/repos/.../contributors?page=5>; rel="last"
  const match = linkHeader.match(/[?&]page=(\d+)[^>]*>;\s*rel="last"/);
  if (match && match[1]) return parseInt(match[1], 10);
  return null;
}

async function fetchContributorCount(
  owner: string,
  repo: string,
): Promise<number | undefined> {
  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/contributors?per_page=1&anon=true`;
    const response = await fetch(url, {
      headers: getGithubHeaders(),
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) return undefined;

    const linkHeader = response.headers.get("Link") ?? "";
    if (linkHeader) {
      const lastPage = parseLinkHeaderLastPage(linkHeader);
      if (lastPage !== null) return lastPage;
    }

    const items = (await response.json()) as unknown[];
    return Array.isArray(items) ? items.length : undefined;
  } catch {
    return undefined;
  }
}

export async function fetchGithubData(
  title: string,
  description: string,
): Promise<GithubResult> {
  const specificQuery = buildSearchQuery(title, description);
  const domainKeyword = buildDomainKeyword(title);
  const recencyQuery = specificQuery
    ? `${specificQuery} pushed:>2024-01-01`
    : "";

  // Run 3 parallel searches + topic fetch
  const [specificResult, recencyResult, topicsResult] =
    await Promise.allSettled([
      executeGithubSearch(specificQuery),
      recencyQuery ? executeGithubSearch(recencyQuery) : Promise.resolve({ totalCount: 0, items: [] }),
      fetchTopicsForDomain(domainKeyword),
    ]);

  const specificData =
    specificResult.status === "fulfilled"
      ? specificResult.value
      : { totalCount: 0, items: [] };

  const recencyData =
    recencyResult.status === "fulfilled"
      ? recencyResult.value
      : { totalCount: 0, items: [] };

  const relatedTopics =
    topicsResult.status === "fulfilled" ? topicsResult.value : [];

  // Merge and deduplicate by html_url
  const seenUrls = new Set<string>();
  const mergedItems: RawGithubItem[] = [];

  for (const item of [
    ...specificData.items,
    ...recencyData.items,
  ]) {
    const url = item.html_url ?? "";
    if (url && !seenUrls.has(url)) {
      seenUrls.add(url);
      mergedItems.push(item);
    }
  }

  // Fallback: If 0 or very few results found, try a broader query using title keywords
  let totalCount = specificData.totalCount;
  let finalItems = mergedItems;

  if (finalItems.length < 3) {
    const titleStopWords = new Set([
      "a", "an", "the", "and", "or", "to", "for", "with", "of", "in",
      "on", "at", "is", "hub", "idea", "creative",
    ]);
    const titleQuery = title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !titleStopWords.has(w))
      .slice(0, 4)
      .join(" ");

    if (titleQuery && titleQuery !== specificQuery) {
      logger.info(
        { originalQuery: specificQuery, fallbackQuery: titleQuery },
        "GitHub specific search returned few results. Trying fallback title search.",
      );
      const fallbackResult = await executeGithubSearch(titleQuery);
      if (fallbackResult.items.length > finalItems.length) {
        totalCount = fallbackResult.totalCount;
        for (const item of fallbackResult.items) {
          const url = item.html_url ?? "";
          if (url && !seenUrls.has(url)) {
            seenUrls.add(url);
            finalItems.push(item);
          }
        }
      }
    }
  }

  // Map to GithubRepo — pull pushed_at and open_issues_count from item directly
  const repos: GithubRepo[] = finalItems.map((item) => ({
    name: item.name,
    org: item.owner?.login ?? "Unknown",
    stars: item.stargazers_count ?? 0,
    desc: item.description ?? "",
    lang: item.language ?? "Unknown",
    url: item.html_url ?? "",
    lastPushedAt: item.pushed_at ?? undefined,
    openIssuesCount: item.open_issues_count ?? undefined,
  }));

  // Sort by stars descending
  repos.sort((a, b) => b.stars - a.stars);

  // Fetch contributor counts for top 3 repos only
  const top3 = repos.slice(0, 3);
  const contributorResults = await Promise.allSettled(
    top3.map((r) => fetchContributorCount(r.org, r.name)),
  );

  for (let i = 0; i < top3.length; i++) {
    const res = contributorResults[i];
    if (res.status === "fulfilled" && res.value !== undefined) {
      repos[i].contributorCount = res.value;
    }
  }

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

  logger.info(
    { reposFound: repos.length, totalCount, relatedTopics },
    "GitHub search completed",
  );

  return {
    repos: repos.slice(0, 10),
    totalCount,
    topLanguages,
    avgStars,
    relatedTopics,
  };
}
