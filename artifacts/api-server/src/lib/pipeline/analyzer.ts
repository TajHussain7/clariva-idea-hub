import { routeCompletion } from "@workspace/integrations-openrouter-ai";
import { fetchGithubData, type GithubRepo } from "./github.js";
import { fetchWikipediaContext } from "./wikipedia.js";
import { fetchDuckDuckGoContext } from "./duckduckgo.js";
import { runRuleEngine } from "./rules.js";
import { logger } from "../logger.js";

export interface AnalysisResult {
  uniquenessScore: number;
  feasibilityScore: number;
  impactScore: number;
  innovationScore: number;
  overallScore: number;
  strengths: Array<{ title: string; desc: string }>;
  weaknesses: Array<{ title: string; desc: string }>;
  risks: Array<{ title: string; desc: string }>;
  suggestions: Array<{ title: string; desc: string }>;
  githubRepos: GithubRepo[];
  techStack: string[];
  marketContext: string;
  verdictSummary: string;
}

interface AIOutput {
  uniquenessScore: number;
  feasibilityScore: number;
  impactScore: number;
  innovationScore: number;
  overallScore: number;
  strengths: Array<{ title: string; desc: string }>;
  weaknesses: Array<{ title: string; desc: string }>;
  risks: Array<{ title: string; desc: string }>;
  suggestions: Array<{ title: string; desc: string }>;
  techStack: string[];
  verdictSummary: string;
  repoGapAnalysis: Array<{
    repoName: string;
    gap: string;
    opportunity: string;
  }>;
}

function buildSystemPrompt(): string {
  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return `You are Clariva's idea validation engine. You receive rich, pre-gathered context about a startup idea and produce a structured JSON analysis. Your analysis must be grounded in the provided data and current as of ${currentDate} — do not hallucinate metrics or competitors not mentioned. Be direct, specific, and actionable.

Always respond with ONLY valid JSON — no markdown, no explanation, no code blocks. The JSON must match this exact structure:
{
  "uniquenessScore": <integer 0-100>,
  "feasibilityScore": <integer 0-100>,
  "impactScore": <integer 0-100>,
  "innovationScore": <integer 0-100>,
  "overallScore": <integer 0-100>,
  "strengths": [{"title": "...", "desc": "..."}, ...],
  "weaknesses": [{"title": "...", "desc": "..."}, ...],
  "risks": [{"title": "...", "desc": "..."}, ...],
  "suggestions": [{"title": "...", "desc": "..."}, ...],
  "techStack": ["...", ...],
  "verdictSummary": "...",
  "repoGapAnalysis": [{"repoName": "org/name", "gap": "...", "opportunity": "..."}, ...]
}

Scoring guidance:
- uniquenessScore: How differentiated is this from GitHub competitors and known market players?
- feasibilityScore: Can a small team realistically build this given complexity indicators?
- impactScore: How much value does this deliver to the target user?
- innovationScore: Does this use novel approaches or apply existing tech in a new way?
- overallScore: Weighted average (uniqueness 25%, feasibility 25%, impact 30%, innovation 20%)

Each array must have 2-4 items. techStack should list 4-8 realistic technologies. verdictSummary should be 2-3 sentences.
repoGapAnalysis: For every GitHub competitor in the "Top competitors" list, provide one entry using the format "org/name". gap: 1-2 sentences on what the repository lacks, does poorly, or where it falls short for users. opportunity: 1-2 sentences on how the idea being analyzed can differentiate or improve on this specific competitor.`;
}

function buildUserPrompt(
  title: string,
  description: string,
  domain: string,
  complexity: number,
  githubData: Awaited<ReturnType<typeof fetchGithubData>>,
  wikiData: Awaited<ReturnType<typeof fetchWikipediaContext>>,
  ddgData: Awaited<ReturnType<typeof fetchDuckDuckGoContext>>,
  ruleData: ReturnType<typeof runRuleEngine>,
): string {
  const complexityLabels = [
    "Very Simple",
    "Simple",
    "Medium",
    "Complex",
    "Very Complex",
  ];
  const compLabel = complexityLabels[complexity] ?? "Medium";

  const competitorSection =
    githubData.repos.length > 0
      ? githubData.repos
          .slice(0, 5)
          .map(
            (r) =>
              `  - ${r.org}/${r.name} (${r.stars.toLocaleString()} stars, ${r.lang}): ${r.desc}`,
          )
          .join("\n")
      : "  No significant GitHub competitors found.";

  const wikiSection = wikiData.found
    ? `Wikipedia context: ${wikiData.summary.slice(0, 300)}\nMaturity signals: ${wikiData.maturitySignals.join(", ") || "None"}`
    : "Wikipedia: No direct domain article found.";

  const ddgSection = ddgData.abstractText
    ? `Market awareness: ${ddgData.marketAwareness}\nContext: ${ddgData.abstractText.slice(0, 250)}`
    : `Market awareness: ${ddgData.marketAwareness}`;

  return `Analyze this startup idea:

IDEA TITLE: ${title}
DOMAIN: ${domain}
COMPLEXITY: ${compLabel} (${complexity}/4)
DESCRIPTION:
${description}

--- GATHERED INTELLIGENCE ---

GITHUB COMPETITIVE LANDSCAPE:
Total matching repos: ${githubData.totalCount.toLocaleString()}
Top competitors:
${competitorSection}
Top languages used: ${githubData.topLanguages.join(", ") || "Unknown"}
Average star count: ${githubData.avgStars.toLocaleString()}

DOMAIN CONTEXT:
${wikiSection}
${ddgSection}

RULE-BASED SIGNALS:
Innovation keywords detected: ${ruleData.innovationKeywords.join(", ") || "None"}
Market keywords: ${ruleData.marketKeywords.join(", ") || "None"}
Technical depth: ${ruleData.technicalDepth}
Estimated build timeline: ${ruleData.estimatedTimeline}
Feasibility indicators: ${ruleData.feasibilityIndicators.slice(0, 6).join(", ") || "None"}

Now produce the JSON analysis.`;
}

function clampScore(val: unknown, fallback: number): number {
  const n = typeof val === "number" ? val : Number(val);
  if (isNaN(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function parseInsights(val: unknown): Array<{ title: string; desc: string }> {
  if (!Array.isArray(val)) return [];
  return val
    .filter(
      (item): item is { title: string; desc: string } =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as Record<string, unknown>).title === "string" &&
        typeof (item as Record<string, unknown>).desc === "string",
    )
    .slice(0, 5);
}

function fallbackResult(
  githubData: Awaited<ReturnType<typeof fetchGithubData>>,
  ruleData: ReturnType<typeof runRuleEngine>,
): AnalysisResult {
  const uniqueness = Math.max(
    10,
    80 - Math.min(githubData.totalCount / 100, 50),
  );
  const feasibility = Math.max(20, 75 - ruleData.complexityScore / 5);
  const impact = 65;
  const innovation = Math.min(95, 50 + ruleData.innovationKeywords.length * 5);
  const overall = Math.round(
    uniqueness * 0.25 + feasibility * 0.25 + impact * 0.3 + innovation * 0.2,
  );

  return {
    uniquenessScore: Math.round(uniqueness),
    feasibilityScore: Math.round(feasibility),
    impactScore: impact,
    innovationScore: Math.round(innovation),
    overallScore: overall,
    strengths: [
      {
        title: "Clear value proposition",
        desc: "The idea addresses a specific user need.",
      },
      {
        title: "Identifiable target market",
        desc: "The domain has a known audience.",
      },
    ],
    weaknesses: [
      {
        title: "Analysis incomplete",
        desc: "Full AI analysis was unavailable — scores are estimated from metadata.",
      },
    ],
    risks: [
      {
        title: "Market competition",
        desc: `${githubData.totalCount} GitHub projects found in this space.`,
      },
    ],
    suggestions: [
      {
        title: "Re-run analysis",
        desc: "Try re-triggering analysis when AI capacity is available.",
      },
    ],
    githubRepos: githubData.repos,
    techStack: githubData.topLanguages.slice(0, 5),
    marketContext: "Estimated from available data sources.",
    verdictSummary:
      "This idea shows potential. Full AI analysis was unavailable — scores are estimated from competitive data.",
  };
}

export async function analyzeIdea(
  title: string,
  description: string,
  domain: string,
  complexity: number,
): Promise<AnalysisResult> {
  const [githubData, wikiData, ddgData] = await Promise.all([
    fetchGithubData(title, description),
    fetchWikipediaContext(title, domain),
    fetchDuckDuckGoContext(title),
  ]);

  const ruleData = runRuleEngine(title, description, domain, complexity);

  const marketParts: string[] = [];
  if (wikiData.found) {
    marketParts.push(
      `Wikipedia summary: ${wikiData.summary.slice(0, 600)} (Source URL: ${wikiData.pageUrl})`,
    );
  }
  if (ddgData.abstractText) {
    marketParts.push(
      `DuckDuckGo abstract: ${ddgData.abstractText.slice(0, 400)}`,
    );
  }
  if (ddgData.relatedTopics.length > 0) {
    marketParts.push(
      `Related search topics: ${ddgData.relatedTopics.slice(0, 6).join("; ")}`,
    );
  }
  const marketContext =
    marketParts.join(" | ") || "No external market context found.";

  try {
    const prompt = buildUserPrompt(
      title,
      description,
      domain,
      complexity,
      githubData,
      wikiData,
      ddgData,
      ruleData,
    );

    logger.info({ title }, "Sending idea validation request to AI Router");

    const result = await routeCompletion({
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: prompt },
      ],
      max_tokens: 4096,
      temperature: 0.3,
    });

    logger.info(
      {
        modelUsed: result.modelUsed,
        slotUsed: result.slotUsed,
        attemptsTaken: result.attemptsTaken,
      },
      "AI analysis response received from Router",
    );

    const raw = result.content;
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.warn("No JSON found in AI response, using fallback");
      return {
        ...fallbackResult(githubData, ruleData),
        githubRepos: githubData.repos,
        marketContext,
      };
    }

    const parsed = JSON.parse(jsonMatch[0]) as Partial<AIOutput>;

    const uniquenessScore = clampScore(parsed.uniquenessScore, 60);
    const feasibilityScore = clampScore(parsed.feasibilityScore, 70);
    const impactScore = clampScore(parsed.impactScore, 65);
    const innovationScore = clampScore(parsed.innovationScore, 60);
    const overallScore = clampScore(
      parsed.overallScore,
      Math.round(
        uniquenessScore * 0.25 +
          feasibilityScore * 0.25 +
          impactScore * 0.3 +
          innovationScore * 0.2,
      ),
    );

    // Merge AI-generated gap analysis back into each repo by matching org/name
    const gapMap = new Map<string, { gap: string; opportunity: string }>();
    if (Array.isArray(parsed.repoGapAnalysis)) {
      for (const item of parsed.repoGapAnalysis as Array<{
        repoName?: string;
        gap?: string;
        opportunity?: string;
      }>) {
        if (
          typeof item?.repoName === "string" &&
          typeof item?.gap === "string" &&
          typeof item?.opportunity === "string"
        ) {
          gapMap.set(item.repoName.toLowerCase(), {
            gap: item.gap,
            opportunity: item.opportunity,
          });
        }
      }
    }

    const reposWithGap = githubData.repos.map((repo) => {
      const key = `${repo.org}/${repo.name}`.toLowerCase();
      const gapAnalysis = gapMap.get(key);
      return gapAnalysis ? { ...repo, gapAnalysis } : repo;
    });

    return {
      uniquenessScore,
      feasibilityScore,
      impactScore,
      innovationScore,
      overallScore,
      strengths: parseInsights(parsed.strengths),
      weaknesses: parseInsights(parsed.weaknesses),
      risks: parseInsights(parsed.risks),
      suggestions: parseInsights(parsed.suggestions),
      githubRepos: reposWithGap,
      techStack: Array.isArray(parsed.techStack)
        ? (parsed.techStack as string[]).slice(0, 10)
        : githubData.topLanguages,
      marketContext,
      verdictSummary:
        typeof parsed.verdictSummary === "string" ? parsed.verdictSummary : "",
    };
  } catch (err) {
    logger.error(
      { err },
      "AI analysis failed across all slots in router, using fallback scores",
    );
    return { ...fallbackResult(githubData, ruleData), marketContext };
  }
}
