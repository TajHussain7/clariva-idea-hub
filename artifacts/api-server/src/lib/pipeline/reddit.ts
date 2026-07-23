import { logger } from "../logger.js";

export interface RedditResult {
  postCount: number;
  topPostTitle: string;
  topPostUpvotes: number;
  topPostSubreddit: string;
  topPostAge: string;
  totalUpvotes: number;
  demandSignal: "high" | "medium" | "low" | "none";
}

interface RedditChild {
  data: {
    title?: string;
    score?: number;
    subreddit?: string;
    created_utc?: number;
  };
}

interface RedditSearchResponse {
  data?: {
    children?: RedditChild[];
  };
}

function calcDemandSignal(
  postCount: number,
  totalUpvotes: number,
  topUpvotes: number,
): RedditResult["demandSignal"] {
  if (postCount === 0) return "none";
  if (totalUpvotes > 1000 || topUpvotes > 500) return "high";
  if (postCount >= 4 || (totalUpvotes >= 100 && totalUpvotes <= 1000)) return "medium";
  return "low";
}

async function searchReddit(query: string): Promise<RedditSearchResponse> {
  const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&limit=10&sort=relevance&t=year`;
  const response = await fetch(url, {
    headers: { "User-Agent": "Clariva-IdeaValidator/1.0" },
    signal: AbortSignal.timeout(6000),
  });
  if (!response.ok) return {};
  return (await response.json()) as RedditSearchResponse;
}

export async function fetchRedditContext(
  title: string,
  domain: string,
): Promise<RedditResult> {
  const fallback: RedditResult = {
    postCount: 0,
    topPostTitle: "",
    topPostUpvotes: 0,
    topPostSubreddit: "",
    topPostAge: "",
    totalUpvotes: 0,
    demandSignal: "none",
  };

  try {
    let data = await searchReddit(title);
    let children = data.data?.children ?? [];

    // Fallback: try domain alone
    if (children.length === 0 && domain) {
      data = await searchReddit(domain);
      children = data.data?.children ?? [];
    }

    const postCount = children.length;
    if (postCount === 0) return fallback;

    const top = children[0].data;
    const topPostTitle = top.title ?? "";
    const topPostUpvotes = top.score ?? 0;
    const topPostSubreddit = top.subreddit ?? "";
    const topPostAge = top.created_utc
      ? new Date(top.created_utc * 1000).toISOString()
      : "";
    const totalUpvotes = children.reduce(
      (sum, c) => sum + (c.data.score ?? 0),
      0,
    );
    const demandSignal = calcDemandSignal(postCount, totalUpvotes, topPostUpvotes);

    return {
      postCount,
      topPostTitle,
      topPostUpvotes,
      topPostSubreddit,
      topPostAge,
      totalUpvotes,
      demandSignal,
    };
  } catch (err) {
    logger.warn({ err }, "Reddit API fetch failed");
    return fallback;
  }
}
