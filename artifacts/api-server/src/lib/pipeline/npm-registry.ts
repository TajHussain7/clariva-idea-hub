import { logger } from "../logger.js";

export interface NpmResult {
  packageCount: number;
  topPackages: Array<{
    name: string;
    description: string;
    weeklyDownloads: number;
    version: string;
  }>;
  ecosystemMaturity: "mature" | "growing" | "early" | "none";
}

interface NpmPackage {
  package?: {
    name?: string;
    description?: string;
    version?: string;
    downloads?: { weekly?: number };
  };
}

interface NpmSearchResponse {
  total?: number;
  objects?: NpmPackage[];
}

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "for", "with", "to", "of", "in",
  "on", "at", "is", "are", "that", "this", "it", "i", "we", "you",
  "my", "our", "how", "what", "when", "who", "app", "tool", "platform",
]);

function buildNpmQuery(title: string): string {
  const words = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
  return words.slice(0, 3).join(" ");
}

function calcEcosystemMaturity(packageCount: number): NpmResult["ecosystemMaturity"] {
  if (packageCount === 0) return "none";
  if (packageCount >= 100) return "mature";
  if (packageCount >= 11) return "growing";
  return "early";
}

export async function fetchNpmData(title: string): Promise<NpmResult> {
  const fallback: NpmResult = {
    packageCount: 0,
    topPackages: [],
    ecosystemMaturity: "none",
  };

  try {
    const query = buildNpmQuery(title);
    if (!query) return fallback;

    const url = `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=5`;
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });

    if (!response.ok) {
      logger.warn({ status: response.status }, "npm registry search returned non-OK");
      return fallback;
    }

    const data = (await response.json()) as NpmSearchResponse;
    const packageCount = data.total ?? 0;
    const objects = data.objects ?? [];

    const topPackages = objects.map((obj) => ({
      name: obj.package?.name ?? "",
      description: obj.package?.description ?? "",
      weeklyDownloads: obj.package?.downloads?.weekly ?? 0,
      version: obj.package?.version ?? "",
    }));

    const ecosystemMaturity = calcEcosystemMaturity(packageCount);

    return { packageCount, topPackages, ecosystemMaturity };
  } catch (err) {
    logger.warn({ err }, "npm registry fetch failed");
    return fallback;
  }
}
