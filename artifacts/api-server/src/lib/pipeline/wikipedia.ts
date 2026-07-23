import { logger } from "../logger.js";

export interface WikipediaResult {
  found: boolean;
  summary: string;
  sectionContext: string;
  maturitySignals: string[];
  pageUrl: string;
}

interface WikiSearchResult {
  title: string;
  snippet: string;
}

interface WikiSearchResponse {
  query?: { search?: WikiSearchResult[] };
}

interface WikiSummaryResponse {
  extract?: string;
  content_urls?: { desktop?: { page?: string } };
}

interface WikiSection {
  title?: string;
  text?: string;
  extract?: string;
}

interface WikiSectionsResponse {
  sections?: WikiSection[];
}

const MARKET_SECTION_KEYWORDS = [
  "market", "industry", "history", "company", "companies", "players",
  "adoption", "regulation", "criticism", "size", "revenue",
];

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s{2,}/g, " ").trim();
}

async function searchWikipedia(query: string): Promise<WikiSearchResult[]> {
  const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=1&format=json&origin=*`;
  const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
  if (!res.ok) return [];
  const data = (await res.json()) as WikiSearchResponse;
  return data.query?.search ?? [];
}

async function fetchSectionContext(pageTitle: string): Promise<string> {
  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/sections/${encodeURIComponent(pageTitle)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return "";

    const data = (await res.json()) as WikiSectionsResponse;
    const sections = data.sections ?? [];

    const relevant = sections.filter((s) => {
      const titleLower = (s.title ?? "").toLowerCase();
      return MARKET_SECTION_KEYWORDS.some((kw) => titleLower.includes(kw));
    });

    const combined = relevant
      .slice(0, 2)
      .map((s) => stripHtml(s.text ?? s.extract ?? ""))
      .join(" ")
      .trim();

    return combined.slice(0, 300);
  } catch {
    return "";
  }
}

function detectMaturitySignals(extractLower: string): string[] {
  const signals: string[] = [];

  if (extractLower.includes("billion") || extractLower.includes("trillion")) {
    signals.push("Large established market");
  }
  if (extractLower.includes("founded in") || extractLower.includes("established in")) {
    signals.push("Domain has historical roots");
  }
  if (
    extractLower.includes("growing") ||
    extractLower.includes("rapidly") ||
    extractLower.includes("emerging")
  ) {
    signals.push("Market showing growth signals");
  }
  if (extractLower.includes("competition") || extractLower.includes("market")) {
    signals.push("Competitive market landscape");
  }
  if (
    extractLower.includes("ipo") ||
    extractLower.includes("went public") ||
    extractLower.includes("publicly traded")
  ) {
    signals.push("Public companies in this space");
  }
  if (extractLower.includes("acquired") || extractLower.includes("acquisition")) {
    signals.push("M&A activity detected");
  }
  if (
    extractLower.includes("regulation") ||
    extractLower.includes("regulated") ||
    extractLower.includes("compliance")
  ) {
    signals.push("Regulated industry");
  }
  if (extractLower.includes("patent") || extractLower.includes("intellectual property")) {
    signals.push("IP-heavy space");
  }
  if (
    extractLower.includes("2024") ||
    extractLower.includes("2025") ||
    extractLower.includes("2026")
  ) {
    signals.push("Recent developments documented");
  }

  return signals;
}

export async function fetchWikipediaContext(
  title: string,
  domain: string,
): Promise<WikipediaResult> {
  const fallback: WikipediaResult = {
    found: false,
    summary: "",
    sectionContext: "",
    maturitySignals: [],
    pageUrl: "",
  };

  try {
    // Try 3 search queries in order
    const queries = [
      `${title} ${domain}`.trim(),
      domain,
      title.split(/\s+/).slice(0, 3).join(" "),
    ].filter((q, idx, arr) => q && arr.indexOf(q) === idx); // deduplicate

    let hits: WikiSearchResult[] = [];
    for (const query of queries) {
      if (!query) continue;
      hits = await searchWikipedia(query);
      if (hits.length > 0) break;
    }

    if (hits.length === 0) return fallback;

    const pageTitle = hits[0].title;
    const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitle)}`;

    const summaryRes = await fetch(summaryUrl, {
      signal: AbortSignal.timeout(6000),
    });

    if (!summaryRes.ok) return fallback;

    const summaryData = (await summaryRes.json()) as WikiSummaryResponse;
    const extract = summaryData.extract ?? "";
    const pageUrl = summaryData.content_urls?.desktop?.page ?? "";
    const extractLower = extract.toLowerCase();

    const maturitySignals = detectMaturitySignals(extractLower);
    const sectionContext = await fetchSectionContext(pageTitle);

    return {
      found: true,
      summary: extract.slice(0, 500),
      sectionContext,
      maturitySignals,
      pageUrl,
    };
  } catch (err) {
    logger.warn({ err }, "Wikipedia API fetch failed");
    return fallback;
  }
}
