import { logger } from "../logger.js";

export interface HackerNewsResult {
  postCount: number;
  topPostTitle: string;
  topPostPoints: number;
  topPostComments: number;
  topPostAge: string;
  communitySignal: "high" | "medium" | "low" | "none";
}

interface HNHit {
  title?: string;
  points?: number;
  num_comments?: number;
  created_at?: string;
}

interface HNSearchResponse {
  hits?: HNHit[];
  nbHits?: number;
}

function calcAge(isoDate: string): string {
  if (!isoDate) return "";
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days < 1) return "today";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months > 1 ? "s" : ""} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years > 1 ? "s" : ""} ago`;
}

function calcCommunitySignal(
  postCount: number,
  topPoints: number,
): HackerNewsResult["communitySignal"] {
  if (postCount === 0) return "none";
  if (postCount >= 10 || topPoints >= 300) return "high";
  if (postCount >= 4 || topPoints >= 50) return "medium";
  return "low";
}

async function searchHN(query: string): Promise<HNSearchResponse> {
  const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=10`;
  const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!response.ok) return {};
  return (await response.json()) as HNSearchResponse;
}

export async function fetchHackerNewsContext(
  title: string,
): Promise<HackerNewsResult> {
  const fallback: HackerNewsResult = {
    postCount: 0,
    topPostTitle: "",
    topPostPoints: 0,
    topPostComments: 0,
    topPostAge: "",
    communitySignal: "none",
  };

  try {
    let data = await searchHN(title);

    // Fallback: try the first meaningful keyword from the title
    if (!data.hits || data.hits.length === 0) {
      const domainKeyword = title
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 3)
        .slice(0, 1)
        .join(" ");
      if (domainKeyword && domainKeyword !== title.toLowerCase()) {
        data = await searchHN(domainKeyword);
      }
    }

    const hits = data.hits ?? [];
    const postCount = hits.length;

    if (postCount === 0) return fallback;

    const top = hits[0];
    const topPostTitle = top.title ?? "";
    const topPostPoints = top.points ?? 0;
    const topPostComments = top.num_comments ?? 0;
    const topPostAge = calcAge(top.created_at ?? "");
    const communitySignal = calcCommunitySignal(postCount, topPostPoints);

    return {
      postCount,
      topPostTitle,
      topPostPoints,
      topPostComments,
      topPostAge,
      communitySignal,
    };
  } catch (err) {
    logger.warn({ err }, "HackerNews API fetch failed");
    return fallback;
  }
}
