import { routeCompletion } from "@workspace/integrations-openrouter-ai";
import { logger } from "../logger.js";

export interface GeneratedChallenge {
  title: string;
  description: string;
  domain: string;
  evaluationFocus: string;
  startsAt: Date;
  endsAt: Date;
}

interface AIOutput {
  title: string;
  description: string;
  domain: string;
  evaluationFocus: string;
  durationDays: number;
}

// Domain rotation to ensure variety
const DOMAINS = [
  "Health & Wellness",
  "Finance & Economy",
  "Education & Learning",
  "Sustainability & Environment",
  "Technology & Innovation",
  "Social Impact & Community",
  "Entertainment & Media",
  "Productivity & Tools",
];

// Fallback challenges if AI fails
const FALLBACK_CHALLENGES: Array<Omit<GeneratedChallenge, "startsAt" | "endsAt">> = [
  {
    title: "AI-Powered Health Assistant Challenge",
    description: "Design an innovative health and wellness solution that leverages artificial intelligence to improve daily health monitoring, preventive care, or patient-doctor communication. Consider accessibility, privacy, and real-world usability in your approach.\n\nThe best ideas will demonstrate clear value to specific user groups, technical feasibility, and a thoughtful approach to health data privacy.",
    domain: "Health & Wellness",
    evaluationFocus: "Innovation in health tech, privacy considerations, clear user value proposition, and realistic implementation path.",
  },
  {
    title: "Financial Inclusion Challenge",
    description: "Create a solution that brings financial services, education, or opportunities to underserved communities. Think beyond traditional banking—consider microfinance, financial literacy, alternative credit scoring, or accessible investment platforms.\n\nWinning ideas will show deep understanding of the target market, address real barriers to financial access, and present a viable business model.",
    domain: "Finance & Economy",
    evaluationFocus: "Market understanding, social impact potential, business model viability, and practical accessibility.",
  },
  {
    title: "Sustainable Living Innovation Challenge",
    description: "Develop an idea that helps individuals or communities reduce their environmental footprint in their daily lives. Focus on practical, adoptable solutions for energy, waste, transportation, or consumption habits.\n\nThe strongest submissions will balance environmental impact with user convenience and economic feasibility.",
    domain: "Sustainability & Environment",
    evaluationFocus: "Environmental impact measurement, user adoption feasibility, scalability, and economic sustainability.",
  },
  {
    title: "Modern Education Transformation",
    description: "Reimagine how people learn and acquire skills in the digital age. Address gaps in traditional education, workplace training, or lifelong learning. Consider personalization, engagement, accessibility, and measurable outcomes.\n\nTop ideas will demonstrate understanding of learning science, clear differentiation from existing solutions, and a path to meaningful adoption.",
    domain: "Education & Learning",
    evaluationFocus: "Learning effectiveness, engagement mechanisms, accessibility, and clear differentiation from existing edtech.",
  },
  {
    title: "Community Connection Challenge",
    description: "Build solutions that strengthen local communities, foster meaningful connections, or address social isolation. Think about bringing neighbors together, supporting local businesses, or facilitating community-driven initiatives.\n\nWinning concepts will show genuine understanding of community dynamics, sustainable engagement models, and scalable approaches.",
    domain: "Social Impact & Community",
    evaluationFocus: "Community engagement potential, sustainability of social connections, scalability, and measurable social impact.",
  },
];

function buildSystemPrompt(recentDomains: string[]): string {
  const avoidDomains = recentDomains.length > 0 
    ? `\n\nIMPORTANT: Avoid these recently used domains to ensure variety: ${recentDomains.join(", ")}`
    : "";
  
  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `You are a creative challenge designer for an innovation platform. Your job is to generate engaging, specific, and actionable weekly challenges that inspire innovative startup ideas.

Current date: ${currentDate}${avoidDomains}

Challenge Design Principles:
- Be specific and focused. Avoid generic "solve world hunger" type challenges.
- Target a concrete problem space with clear evaluation criteria.
- Balance ambition with feasibility—challenges should inspire but remain achievable.
- Encourage innovation while staying grounded in real market needs.
- Make the challenge accessible to diverse skill levels.
- Focus on 2025-2026 relevant problems and emerging opportunities.

Response Format (MUST be valid JSON, no markdown):
{
  "title": "<50 characters, engaging and specific>",
  "description": "<2-3 paragraphs explaining the problem space, what makes a great solution, and what participants should consider>",
  "domain": "<one of: Health & Wellness, Finance & Economy, Education & Learning, Sustainability & Environment, Technology & Innovation, Social Impact & Community, Entertainment & Media, Productivity & Tools>",
  "evaluationFocus": "<1-2 sentences explaining what criteria will determine the winning idea>",
  "durationDays": 7
}

Guidelines:
- Title should be catchy but professional (e.g., "AI-Powered Health Assistant Challenge", "Financial Inclusion Innovation")
- Description should be 200-400 words, structured with clear paragraphs
- Domain must be one of the listed options
- EvaluationFocus should set clear expectations for what makes a winning submission
- Always use 7 days duration

Generate a creative, timely, and inspiring challenge.`;
}

function buildUserPrompt(preferredDomain?: string): string {
  if (preferredDomain) {
    return `Generate a new weekly challenge focused on the "${preferredDomain}" domain. Make it specific, actionable, and relevant to current market trends and opportunities.`;
  }
  return "Generate a new weekly challenge. Choose a domain that would be timely and engaging for startup founders and innovators. Consider current trends, emerging technologies, and pressing societal needs.";
}

function validateAIOutput(data: unknown): data is AIOutput {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;
  
  return (
    typeof obj.title === "string" &&
    obj.title.length > 0 &&
    obj.title.length <= 100 &&
    typeof obj.description === "string" &&
    obj.description.length >= 100 &&
    obj.description.length <= 2000 &&
    typeof obj.domain === "string" &&
    DOMAINS.includes(obj.domain) &&
    typeof obj.evaluationFocus === "string" &&
    obj.evaluationFocus.length > 0 &&
    typeof obj.durationDays === "number" &&
    obj.durationDays === 7
  );
}

function calculateChallengeDates(startImmediate: boolean = true): { startsAt: Date; endsAt: Date } {
  const now = new Date();
  
  let startsAt: Date;
  if (startImmediate) {
    startsAt = now;
  } else {
    // Start on next Monday at 00:00 UTC
    const dayOfWeek = now.getUTCDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    startsAt = new Date(now);
    startsAt.setUTCDate(now.getUTCDate() + daysUntilMonday);
    startsAt.setUTCHours(0, 0, 0, 0);
  }
  
  // End 7 days after start
  const endsAt = new Date(startsAt);
  endsAt.setUTCDate(startsAt.getUTCDate() + 7);
  
  return { startsAt, endsAt };
}

function selectFallbackChallenge(recentDomains: string[]): Omit<GeneratedChallenge, "startsAt" | "endsAt"> {
  // Try to find a challenge in a domain we haven't used recently
  const unusedChallenges = FALLBACK_CHALLENGES.filter(
    c => !recentDomains.includes(c.domain)
  );
  
  if (unusedChallenges.length > 0) {
    return unusedChallenges[Math.floor(Math.random() * unusedChallenges.length)];
  }
  
  // If all domains used recently, just pick randomly
  return FALLBACK_CHALLENGES[Math.floor(Math.random() * FALLBACK_CHALLENGES.length)];
}

/**
 * Generate a new weekly challenge using AI with fallback to predefined templates
 * @param recentDomains Array of recently used domains to avoid repetition
 * @param preferredDomain Optional specific domain to target
 * @param startImmediate If true, challenge starts immediately; if false, starts next Monday
 */
export async function generateChallenge(
  recentDomains: string[] = [],
  preferredDomain?: string,
  startImmediate: boolean = true,
): Promise<GeneratedChallenge> {
  logger.info(
    { recentDomains, preferredDomain, startImmediate },
    "Generating new weekly challenge"
  );

  const dates = calculateChallengeDates(startImmediate);

  try {
    const systemPrompt = buildSystemPrompt(recentDomains);
    const userPrompt = buildUserPrompt(preferredDomain);

    logger.info("Requesting challenge generation from AI Router");

    const result = await routeCompletion({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 1500,
      temperature: 0.8, // Higher temperature for more creative challenges
    });

    logger.info(
      {
        modelUsed: result.modelUsed,
        slotUsed: result.slotUsed,
      },
      "AI challenge generation response received"
    );

    // Extract JSON from response
    const raw = result.content;
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      logger.warn("No JSON found in AI response, using fallback challenge");
      const fallback = selectFallbackChallenge(recentDomains);
      return { ...fallback, ...dates };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!validateAIOutput(parsed)) {
      logger.warn(
        { parsed },
        "AI response failed validation, using fallback challenge"
      );
      const fallback = selectFallbackChallenge(recentDomains);
      return { ...fallback, ...dates };
    }

    logger.info(
      { title: parsed.title, domain: parsed.domain },
      "Challenge generated successfully via AI"
    );

    return {
      title: parsed.title,
      description: parsed.description,
      domain: parsed.domain,
      evaluationFocus: parsed.evaluationFocus,
      ...dates,
    };
  } catch (err) {
    logger.error(
      { err },
      "AI challenge generation failed, using fallback challenge"
    );
    const fallback = selectFallbackChallenge(recentDomains);
    return { ...fallback, ...dates };
  }
}

/**
 * Get next preferred domain based on rotation and recent usage
 */
export function getNextDomain(recentDomains: string[]): string {
  const unusedDomains = DOMAINS.filter(d => !recentDomains.includes(d));
  
  if (unusedDomains.length > 0) {
    return unusedDomains[0]; // Return first unused domain in rotation
  }
  
  // All domains used recently, start rotation over
  return DOMAINS[0];
}
