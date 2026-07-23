export interface RuleBasedSignals {
  complexityScore: number;
  innovationKeywords: string[];
  feasibilityIndicators: string[];
  marketKeywords: string[];
  technicalDepth: "low" | "medium" | "high";
  estimatedTimeline: string;
  regulatoryRiskKeywords: string[];
  monetizationSignals: string[];
  networkEffectSignals: string[];
  hardComplexityFlags: string[];
}

const INNOVATION_KEYWORDS = [
  "ai", "machine learning", "neural", "blockchain", "decentralized",
  "autonomous", "generative", "real-time", "personalized", "adaptive",
  "predictive", "intelligent", "automated", "smart", "novel", "unique",
  "proprietary", "patent", "breakthrough", "disruptive", "revolutionary",
  "cutting-edge", "next-generation", "innovative", "first-of-its-kind",
];

const FEASIBILITY_POSITIVE = [
  "api", "open source", "existing", "proven", "standard", "common",
  "well-known", "established", "available", "accessible", "simple",
  "straightforward", "basic", "traditional", "conventional",
];

const FEASIBILITY_NEGATIVE = [
  "quantum", "nuclear", "requires hardware", "physical device",
  "manufacturing", "regulatory approval", "fda", "patent-protected",
  "proprietary algorithm", "custom chip", "satellite",
];

const MARKET_KEYWORDS = [
  "b2b", "b2c", "saas", "enterprise", "consumer", "startup", "smb",
  "developer", "business", "professional", "freelance", "agency",
  "healthcare", "finance", "education", "retail", "logistics",
];

const REGULATORY_RISK_KEYWORDS = [
  "hipaa", "gdpr", "fda", "fda approval", "sec", "finra", "banking license",
  "medical device", "clinical trial", "prescription", "controlled substance",
  "pii", "personal health", "financial advice", "investment advice", "insurance license",
];

const MONETIZATION_SIGNAL_KEYWORDS = [
  "subscription", "freemium", "marketplace fee", "transaction fee", "usage-based",
  "per seat", "enterprise plan", "api pricing", "white-label", "licensing fee",
  "advertising revenue", "data licensing", "commission",
];

const NETWORK_EFFECT_KEYWORDS = [
  "network effect", "two-sided", "viral loop", "user-generated", "peer-to-peer",
  "community-driven", "platform flywheel", "switching cost", "lock-in", "ecosystem",
];

const HARD_COMPLEXITY_KEYWORDS = [
  "quantum", "nuclear", "satellite", "autonomous vehicle", "surgical robot",
  "requires fda clearance", "clinical validation", "custom hardware", "asic",
  "physical manufacturing", "solve for everyone", "universal solution",
];

const COMPLEXITY_MAP: Record<number, { label: string; penalty: number }> = {
  0: { label: "Very Simple", penalty: -10 },
  1: { label: "Simple", penalty: -5 },
  2: { label: "Medium", penalty: 0 },
  3: { label: "Complex", penalty: 5 },
  4: { label: "Very Complex", penalty: 10 },
};

export function runRuleEngine(
  title: string,
  description: string,
  domain: string,
  complexity: number,
): RuleBasedSignals {
  const text = `${title} ${description} ${domain}`.toLowerCase();

  const innovationKeywords = INNOVATION_KEYWORDS.filter((kw) =>
    text.includes(kw),
  );

  const feasibilityPositive = FEASIBILITY_POSITIVE.filter((kw) =>
    text.includes(kw),
  );
  const feasibilityNegative = FEASIBILITY_NEGATIVE.filter((kw) =>
    text.includes(kw),
  );
  const feasibilityIndicators = [
    ...feasibilityPositive.map((k) => `+ ${k}`),
    ...feasibilityNegative.map((k) => `- ${k}`),
  ];

  const marketKeywords = MARKET_KEYWORDS.filter((kw) => text.includes(kw));

  const regulatoryRiskKeywords = REGULATORY_RISK_KEYWORDS.filter((kw) =>
    text.includes(kw),
  );

  const monetizationSignals = MONETIZATION_SIGNAL_KEYWORDS.filter((kw) =>
    text.includes(kw),
  );

  const networkEffectSignals = NETWORK_EFFECT_KEYWORDS.filter((kw) =>
    text.includes(kw),
  );

  const hardComplexityFlags = HARD_COMPLEXITY_KEYWORDS.filter((kw) =>
    text.includes(kw),
  );

  const wordCount = description.split(/\s+/).filter(Boolean).length;
  let technicalDepth: "low" | "medium" | "high" = "low";
  if (wordCount > 200 || complexity >= 3) technicalDepth = "high";
  else if (wordCount > 80 || complexity >= 2) technicalDepth = "medium";

  const complexityPenalty = COMPLEXITY_MAP[complexity]?.penalty ?? 0;

  // Hard complexity penalty: -15 per flag, capped at -30 total
  const hardPenalty = Math.min(hardComplexityFlags.length * 15, 30);

  const complexityScore = Math.max(
    10,
    Math.min(
      95,
      60 + complexityPenalty + innovationKeywords.length * 3 - hardPenalty,
    ),
  );

  const timelineMap: Record<number, string> = {
    0: "1–2 weeks",
    1: "1–2 months",
    2: "2–4 months",
    3: "4–8 months",
    4: "8–18 months",
  };
  const estimatedTimeline = timelineMap[complexity] ?? "Unknown";

  return {
    complexityScore,
    innovationKeywords,
    feasibilityIndicators,
    marketKeywords,
    technicalDepth,
    estimatedTimeline,
    regulatoryRiskKeywords,
    monetizationSignals,
    networkEffectSignals,
    hardComplexityFlags,
  };
}
