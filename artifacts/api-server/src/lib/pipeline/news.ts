import { logger } from "../logger.js";

export interface NewsResult {
  available: boolean;
  articleCount: number;
  recentArticles: Array<{
    title: string;
    source: string;
    publishedAt: string;
    description: string;
  }>;
  marketHeat: "hot" | "warm" | "cool" | "cold";
}

interface NewsArticle {
  title?: string;
  source?: { name?: string };
  publishedAt?: string;
  description?: string;
}

interface NewsAPIResponse {
  totalResults?: number;
  articles?: NewsArticle[];
}

function calcMarketHeat(totalResults: number): NewsResult["marketHeat"] {
  if (totalResults >= 50) return "hot";
  if (totalResults >= 11) return "warm";
  if (totalResults >= 3) return "cool";
  return "cold";
}

export async function fetchNewsContext(
  title: string,
  domain: string,
): Promise<NewsResult> {
  const fallback: NewsResult = {
    available: false,
    articleCount: 0,
    recentArticles: [],
    marketHeat: "cold",
  };

  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) {
    logger.info("NEWS_API_KEY not set — skipping NewsAPI");
    return fallback;
  }

  try {
    const query = domain || title;
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&pageSize=5&language=en&apiKey=${apiKey}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(7000) });

    if (!response.ok) {
      logger.warn(
        { status: response.status },
        "NewsAPI returned non-OK response",
      );
      return fallback;
    }

    const data = (await response.json()) as NewsAPIResponse;
    const totalResults = data.totalResults ?? 0;
    const articles = data.articles ?? [];

    const recentArticles = articles.map((a) => ({
      title: a.title ?? "",
      source: a.source?.name ?? "",
      publishedAt: a.publishedAt ?? "",
      description: (a.description ?? "").slice(0, 150),
    }));

    const marketHeat = calcMarketHeat(totalResults);

    return {
      available: true,
      articleCount: totalResults,
      recentArticles,
      marketHeat,
    };
  } catch (err) {
    logger.warn({ err }, "NewsAPI fetch failed");
    return fallback;
  }
}
