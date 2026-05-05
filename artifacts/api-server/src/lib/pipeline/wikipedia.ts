import { logger } from "../logger.js";

export interface WikipediaResult {
  found: boolean;
  summary: string;
  maturitySignals: string[];
  pageUrl: string;
}

export async function fetchWikipediaContext(
  title: string,
  domain: string
): Promise<WikipediaResult> {
  const query = `${title} ${domain}`.trim();

  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=1&format=json&origin=*`;

    const searchRes = await fetch(searchUrl, {
      signal: AbortSignal.timeout(6000),
    });

    if (!searchRes.ok) {
      return { found: false, summary: "", maturitySignals: [], pageUrl: "" };
    }

    const searchData = (await searchRes.json()) as {
      query?: { search?: Array<{ title: string; snippet: string }> };
    };

    const hits = searchData?.query?.search ?? [];
    if (hits.length === 0) {
      return { found: false, summary: "", maturitySignals: [], pageUrl: "" };
    }

    const pageTitle = hits[0].title;
    const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitle)}`;

    const summaryRes = await fetch(summaryUrl, {
      signal: AbortSignal.timeout(6000),
    });

    if (!summaryRes.ok) {
      return { found: false, summary: "", maturitySignals: [], pageUrl: "" };
    }

    const summaryData = (await summaryRes.json()) as {
      extract?: string;
      content_urls?: { desktop?: { page?: string } };
    };

    const extract = summaryData.extract ?? "";
    const pageUrl = summaryData.content_urls?.desktop?.page ?? "";

    const maturitySignals: string[] = [];
    const extractLower = extract.toLowerCase();

    if (
      extractLower.includes("billion") ||
      extractLower.includes("trillion")
    ) {
      maturitySignals.push("Large established market");
    }
    if (
      extractLower.includes("founded in") ||
      extractLower.includes("established in")
    ) {
      maturitySignals.push("Domain has historical roots");
    }
    if (
      extractLower.includes("growing") ||
      extractLower.includes("rapidly") ||
      extractLower.includes("emerging")
    ) {
      maturitySignals.push("Market showing growth signals");
    }
    if (extractLower.includes("competition") || extractLower.includes("market")) {
      maturitySignals.push("Competitive market landscape");
    }

    return {
      found: true,
      summary: extract.slice(0, 500),
      maturitySignals,
      pageUrl,
    };
  } catch (err) {
    logger.warn({ err }, "Wikipedia API fetch failed");
    return { found: false, summary: "", maturitySignals: [], pageUrl: "" };
  }
}
