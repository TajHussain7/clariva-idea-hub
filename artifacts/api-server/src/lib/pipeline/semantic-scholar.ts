import { logger } from "../logger.js";

export interface SemanticScholarResult {
  queried: boolean;
  paperCount: number;
  mostCitedPaperTitle: string;
  mostCitedPaperYear: number;
  mostCitations: number;
  researchMaturity: "cutting-edge" | "emerging" | "established" | "foundational";
}

interface SSPaper {
  title?: string;
  year?: number;
  citationCount?: number;
}

interface SSResponse {
  total?: number;
  data?: SSPaper[];
}

const TECH_TRIGGER_KEYWORDS = [
  "ai", "machine learning", "neural", "algorithm", "model",
  "biotech", "quantum", "blockchain", "robotics", "deep learning",
  "natural language", "computer vision", "generative", "llm",
];

function isTechIdea(title: string, description: string): boolean {
  const text = `${title} ${description}`.toLowerCase();
  return TECH_TRIGGER_KEYWORDS.some((kw) => text.includes(kw));
}

function calcResearchMaturity(
  paperCount: number,
  mostRecentYear: number,
): SemanticScholarResult["researchMaturity"] {
  if (paperCount >= 5000) return "foundational";
  if (paperCount >= 500) return "established";
  if (paperCount >= 50) return "emerging";
  // Also cutting-edge if very recent
  if (mostRecentYear >= 2024) return "cutting-edge";
  return "cutting-edge";
}

export async function fetchSemanticScholarData(
  title: string,
  description: string,
): Promise<SemanticScholarResult> {
  const fallback: SemanticScholarResult = {
    queried: false,
    paperCount: 0,
    mostCitedPaperTitle: "",
    mostCitedPaperYear: 0,
    mostCitations: 0,
    researchMaturity: "cutting-edge",
  };

  if (!isTechIdea(title, description)) {
    return fallback;
  }

  try {
    const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(title)}&limit=5&fields=title,year,citationCount`;
    const response = await fetch(url, { signal: AbortSignal.timeout(7000) });

    if (!response.ok) {
      logger.warn(
        { status: response.status },
        "Semantic Scholar API returned non-OK response",
      );
      return { ...fallback, queried: true };
    }

    const data = (await response.json()) as SSResponse;
    const papers = data.data ?? [];
    const paperCount = data.total ?? 0;

    if (papers.length === 0) {
      return { ...fallback, queried: true, paperCount };
    }

    // Find the most cited paper
    const mostCited = papers.reduce<SSPaper>((best, p) => {
      return (p.citationCount ?? 0) > (best.citationCount ?? 0) ? p : best;
    }, papers[0]);

    const mostCitedPaperTitle = mostCited.title ?? "";
    const mostCitedPaperYear = mostCited.year ?? 0;
    const mostCitations = mostCited.citationCount ?? 0;
    const researchMaturity = calcResearchMaturity(paperCount, mostCitedPaperYear);

    return {
      queried: true,
      paperCount,
      mostCitedPaperTitle,
      mostCitedPaperYear,
      mostCitations,
      researchMaturity,
    };
  } catch (err) {
    logger.warn({ err }, "Semantic Scholar API fetch failed");
    return { ...fallback, queried: true };
  }
}
