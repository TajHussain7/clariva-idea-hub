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
  return `You are Clariva's startup evaluation engine — a brutally honest, data-informed analyst operating as of ${currentDate}. Your job is to deliver the kind of direct, specific feedback a top-tier VC partner gives in a partner meeting: grounded in real market signals, not encouragement.

Evaluation rules (follow these strictly):
- Be direct. Every claim must have a concrete reason — no vague optimism.
- Reward specific, niche, focused ideas. Penalize "for everyone" or generic ideas with lower uniqueness scores.
- Mention real companies or products (with public URLs when known) that tried the same or similar idea — whether they succeeded or failed.
- State clearly whether the market is growing, shrinking, saturated, or niche — and why.
- Identify a real opportunity gap only if one genuinely exists in the provided data.
- Assess whether the founder can realistically acquire early customers given their apparent resources.
- Do not hallucinate metrics or competitors not mentioned in the gathered intelligence.

Always respond with ONLY valid JSON — no markdown wrapping, no code blocks, no explanation outside the JSON. The JSON must match this exact structure:
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
  "verdictSummary": "<full structured markdown report — see format below>",
  "repoGapAnalysis": [{"repoName": "org/name", "gap": "...", "opportunity": "..."}, ...]
}

Scoring guidance (be strict — inflate nothing):
- uniquenessScore: How differentiated is this vs GitHub competitors and known products? If 100+ similar repos exist, cap at 40 unless the angle is clearly novel.
- feasibilityScore: Can a small team realistically ship v1? Dock points for heavy regulatory, ML infrastructure, or hardware dependencies.
- impactScore: Does it deliver measurable value to a well-defined, specific user group? Generic "productivity tools for everyone" cap at 55.
- innovationScore: Novel mechanism or just another wrapper on existing tech? Be harsh.
- overallScore: Weighted — uniqueness 25%, feasibility 25%, impact 30%, innovation 20%.

strengths/weaknesses/risks/suggestions: 2–4 items each. Each must have a specific, non-generic title and a concrete, evidence-based description.
techStack: 4–8 realistic, specific technologies appropriate for this idea and complexity level.
repoGapAnalysis: For every GitHub competitor in the top competitors list, one entry in "org/name" format. gap: what the repo lacks or does poorly. opportunity: how this idea can specifically exploit that gap.

verdictSummary value must be a full structured Markdown report formatted EXACTLY as follows (use \\n for newlines inside the JSON string):

### 🧠 Idea Summary
<2 sentences restating the core idea clearly and objectively>

### 📊 Market Pulse
**Market trajectory:** <growing / shrinking / saturated / niche — one sentence explaining why based on the provided data>
**Realistic market size:** <specific niche size with reasoning — not the broad TAM. Example: "$180M TAM in US-based B2B SMB vertical, not the $4B general cloud market">
**Current momentum:** <key 2025–2026 trends, regulatory shifts, adoption signals, or VC activity relevant to this space>

### ⚔️ Competitive Landscape
<List the top 3 real competitors. For each use this exact format:>
**[Competitor Name](public URL if known)** — <What they do. Funding or scale if publicly known. Whether this idea is differentiated from them and how.>

### ✅ Strengths
<2–4 specific, concrete strengths. Lead with the most commercially relevant.>

### 🚨 Critical Risks
<3–5 risks ranked from most to least fatal. Each must follow this format:>
**Risk Name** — <Why it is a risk and the likely impact>. Severity: **<solvable | manageable | likely fatal>**.

### 💡 The Blind Spot
<One important insight the founder has likely not considered — market timing, regulatory risk, behavioral barrier, or distribution challenge>

### 🎯 Idea–Market Fit Score
**Score: X/10**
<2–3 sentences explaining the score with specific reasoning>

### 📋 Final Verdict
<Choose exactly one verdict and follow with a maximum of 3 sentences:>
**🟢 GO — Build it now**
OR **🟡 CONDITIONAL GO — Validate one thing first**
OR **🔴 DO NOT GO — Here is why**`;
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
      max_tokens: 5000,
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
