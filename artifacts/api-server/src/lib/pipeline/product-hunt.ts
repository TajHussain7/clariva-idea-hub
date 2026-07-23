import { logger } from "../logger.js";

export interface ProductHuntResult {
  available: boolean;
  totalLaunches: number;
  topProducts: Array<{
    name: string;
    tagline: string;
    votes: number;
    createdAt: string;
    url: string;
  }>;
  launchSignal: "saturated" | "validated" | "sparse" | "untapped";
}

interface PHNode {
  name?: string;
  tagline?: string;
  votesCount?: number;
  createdAt?: string;
  website?: string;
}

interface PHResponse {
  data?: {
    posts?: {
      edges?: Array<{ node?: PHNode }>;
      totalCount?: number;
    };
  };
}

function buildDomainKeyword(title: string, domain: string): string {
  if (domain) return domain.split(" ")[0] ?? "";
  const words = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3);
  return words[0] ?? "";
}

function calcLaunchSignal(totalLaunches: number): ProductHuntResult["launchSignal"] {
  if (totalLaunches === 0) return "untapped";
  if (totalLaunches <= 5) return "sparse";
  if (totalLaunches <= 20) return "validated";
  return "saturated";
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(apiKey: string): Promise<string | null> {
  // If apiKey looks like an access token (or is set as Developer Token), use it
  const clientId = process.env.PRODUCT_HUNT_CLIENT_ID || process.env.PRODUCT_HUNT_API_KEY;
  const clientSecret = process.env.PRODUCT_HUNT_CLIENT_SECRET || process.env.PRODUCT_HUNT_API_SECRET;

  // If Client ID & Secret are available and we don't have a valid cached token, exchange them
  if (clientId && clientSecret && clientId !== clientSecret) {
    if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) {
      return cachedToken.token;
    }
    try {
      const res = await fetch("https://api.producthunt.com/v2/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: "client_credentials",
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (res.ok) {
        const data = (await res.json()) as { access_token?: string; expires_in?: number };
        if (data.access_token) {
          cachedToken = {
            token: data.access_token,
            expiresAt: Date.now() + (data.expires_in ?? 86400) * 1000,
          };
          return data.access_token;
        }
      }
    } catch (err) {
      logger.warn({ err }, "Product Hunt OAuth token exchange failed, falling back to direct key");
    }
  }

  // Fall back to direct API key (User Developer Access Token)
  return apiKey;
}

export async function fetchProductHuntData(
  title: string,
  domain: string,
): Promise<ProductHuntResult> {
  const fallback: ProductHuntResult = {
    available: false,
    totalLaunches: 0,
    topProducts: [],
    launchSignal: "untapped",
  };

  const apiKey =
    process.env.PRODUCT_HUNT_API_KEY ||
    process.env.PRODUCT_HUNT_CLIENT_SECRET ||
    process.env.PRODUCT_HUNT_API_SECRET;

  if (!apiKey) {
    logger.info("Product Hunt API keys not set — skipping Product Hunt");
    return fallback;
  }

  const token = await getAccessToken(apiKey);
  if (!token) return fallback;

  const searchTerm = buildDomainKeyword(title, domain);
  if (!searchTerm) return fallback;

  const query = `{
  posts(first: 5, order: VOTES, topic: "${searchTerm}") {
    edges {
      node {
        name
        tagline
        votesCount
        commentsCount
        createdAt
        website
      }
    }
    totalCount
  }
}`;

  try {
    const response = await fetch("https://api.producthunt.com/v2/api/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      logger.warn(
        { status: response.status },
        "Product Hunt API returned non-OK response",
      );
      return fallback;
    }

    const data = (await response.json()) as PHResponse;
    const posts = data.data?.posts;
    const totalLaunches = posts?.totalCount ?? 0;
    const edges = posts?.edges ?? [];

    const topProducts = edges
      .map((e) => ({
        name: e.node?.name ?? "",
        tagline: e.node?.tagline ?? "",
        votes: e.node?.votesCount ?? 0,
        createdAt: e.node?.createdAt ?? "",
        url: e.node?.website ?? "",
      }))
      .filter((p) => p.name);

    const launchSignal = calcLaunchSignal(totalLaunches);

    return {
      available: true,
      totalLaunches,
      topProducts,
      launchSignal,
    };
  } catch (err) {
    logger.warn({ err }, "Product Hunt API fetch failed");
    return fallback;
  }
}
