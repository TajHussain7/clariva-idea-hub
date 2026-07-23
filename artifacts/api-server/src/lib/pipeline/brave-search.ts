import { logger } from "../logger.js";

export interface BraveSearchResult {
  available: boolean;
  resultCount: number;
  topResults: Array<{
    title: string;
    url: string;
    description: string;
    age: string;
  }>;
  marketAwareness: "high" | "medium" | "low";
}

interface BraveWebResult {
  title?: string;
  url?: string;
  description?: string;
  age?: string;
}

interface BraveAPIResponse {
  web?: {
    results?: BraveWebResult[];
    totalCount?: number;
  };
}

const MAJOR_PUBLICATION_DOMAINS = [
  "techcrunch",
  "forbes",
  "bloomberg",
  "wired",
  "theverge",
  "wsj",
  "nytimes",
  "ft.com",
  "businessinsider",
  "venturebeat",
];

function calcMarketAwareness(
  resultCount: number,
  topResults: BraveSearchResult["topResults"],
): BraveSearchResult["marketAwareness"] {
  const hasMajorPub = topResults.some((r) =>
    MAJOR_PUBLICATION_DOMAINS.some((domain) => r.url.includes(domain)),
  );
  if (resultCount >= 7 || hasMajorPub) return "high";
  if (resultCount >= 3) return "medium";
  return "low";
}

export async function fetchBraveSearchContext(
  title: string,
): Promise<BraveSearchResult> {
  const fallback: BraveSearchResult = {
    available: false,
    resultCount: 0,
    topResults: [],
    marketAwareness: "low",
  };

  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) {
    logger.info("BRAVE_SEARCH_API_KEY not set — skipping Brave Search");
    return fallback;
  }

  try {
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(title)}&count=5`;
    const response = await fetch(url, {
      headers: {
        "X-Subscription-Token": apiKey,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      logger.warn(
        { status: response.status },
        "Brave Search API returned non-OK response",
      );
      return fallback;
    }

    const data = (await response.json()) as BraveAPIResponse;
    const results = data.web?.results ?? [];
    const resultCount = results.length;

    const topResults = results.map((r) => ({
      title: r.title ?? "",
      url: r.url ?? "",
      description: r.description ?? "",
      age: r.age ?? "",
    }));

    const marketAwareness = calcMarketAwareness(resultCount, topResults);

    return {
      available: true,
      resultCount,
      topResults,
      marketAwareness,
    };
  } catch (err) {
    logger.warn({ err }, "Brave Search API fetch failed");
    return fallback;
  }
}
