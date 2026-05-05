import { logger } from "../logger.js";

export interface DuckDuckGoResult {
  abstractText: string;
  relatedTopics: string[];
  marketAwareness: "high" | "medium" | "low";
}

export async function fetchDuckDuckGoContext(
  title: string
): Promise<DuckDuckGoResult> {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(title)}&format=json&no_html=1&skip_disambig=1`;

    const response = await fetch(url, {
      signal: AbortSignal.timeout(6000),
    });

    if (!response.ok) {
      return { abstractText: "", relatedTopics: [], marketAwareness: "low" };
    }

    const data = (await response.json()) as {
      AbstractText?: string;
      RelatedTopics?: Array<{ Text?: string; Name?: string }>;
    };

    const abstractText = data.AbstractText ?? "";
    const relatedTopics = (data.RelatedTopics ?? [])
      .map((t) => t.Text ?? t.Name ?? "")
      .filter(Boolean)
      .slice(0, 8);

    let marketAwareness: "high" | "medium" | "low" = "low";
    if (abstractText.length > 100 && relatedTopics.length > 4) {
      marketAwareness = "high";
    } else if (abstractText.length > 30 || relatedTopics.length > 1) {
      marketAwareness = "medium";
    }

    return { abstractText, relatedTopics, marketAwareness };
  } catch (err) {
    logger.warn({ err }, "DuckDuckGo API fetch failed");
    return { abstractText: "", relatedTopics: [], marketAwareness: "low" };
  }
}
