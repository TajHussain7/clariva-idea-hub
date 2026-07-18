import { useState, useMemo } from "react";
import { Link } from "wouter";
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  ArrowUpRight,
  RefreshCw,
  Bell,
  BarChart2,
  Cpu,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useListIdeas } from "@workspace/api-client-react";

/* ======================= Types ======================= */
type FilterTab = "all" | "opportunities" | "risks" | "suggestions";

interface SmallInsight {
  id: string;
  ideaId: number;
  type: "opportunity" | "risk" | "suggestion";
  label: string;
  timeAgo: string;
  title: string;
  body: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  cta: string;
}

interface ProcessedData {
  smallInsights: SmallInsight[];
  distribution: {
    label: string;
    value: number;
    color: string;
    dot: string;
  }[];
  priorityInsight: {
    title: string;
    body: string;
    impactScore: number;
    ideaId: number;
  } | null;
  riskInsight: {
    title: string;
    desc: string;
    overallScore: number;
    ideaTitle: string;
    ideaId: number;
  } | null;
  confidenceData: number[];
  hasAnyAnalyzed: boolean;
  hasAnyProcessing: boolean;
}

const filterTabs: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All Insights" },
  { key: "opportunities", label: "Opportunities" },
  { key: "risks", label: "Risks" },
  { key: "suggestions", label: "Suggestions" },
];

/* ======================= Time Ago Helper ======================= */
function formatTimeAgo(dateStr: string) {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "Unknown time";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

/* ======================= Small insight card ======================= */
function SmallInsightCard({ insight }: { insight: SmallInsight }) {
  const Icon = insight.icon;
  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3 mb-3">
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${insight.iconBg}`}
        >
          <Icon className={`w-4 h-4 ${insight.iconColor}`} />
        </div>
        <div className="min-w-0">
          <p className={`text-xs font-semibold ${insight.iconColor}`}>
            {insight.label}{" "}
            <span className="text-muted-foreground font-normal">
              · {insight.timeAgo}
            </span>
          </p>
          <h3 className="text-sm font-semibold text-foreground mt-0.5">
            {insight.title}
          </h3>
        </div>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
        {insight.body}
      </p>
      <Link
        href={`/ideas/${insight.ideaId}`}
        className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1"
      >
        {insight.cta}
        <ArrowUpRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}

/* ======================= AI Insights Feed Page ======================= */
export function Insights() {
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: ideas, isLoading, isError, refetch } = useListIdeas();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const processedData = useMemo<ProcessedData>(() => {
    if (!ideas) {
      return {
        smallInsights: [],
        distribution: [],
        priorityInsight: null,
        riskInsight: null,
        confidenceData: [70, 70, 70, 70, 70, 70],
        hasAnyAnalyzed: false,
        hasAnyProcessing: false,
      };
    }

    const analyzedIdeas = ideas.filter(
      (idea) => idea.status === "analyzed" && idea.analysis
    );

    const hasAnyProcessing = ideas.some(
      (idea) => idea.status === "processing" || idea.status === "pending"
    );

    if (analyzedIdeas.length === 0) {
      return {
        smallInsights: [],
        distribution: [],
        priorityInsight: null,
        riskInsight: null,
        confidenceData: [70, 70, 70, 70, 70, 70],
        hasAnyAnalyzed: false,
        hasAnyProcessing,
      };
    }

    const list: SmallInsight[] = [];
    let maxOverallIdea = analyzedIdeas[0];
    let highestScore = analyzedIdeas[0].analysis?.overallScore ?? 0;
    let riskToSpotlight: {
      title: string;
      desc: string;
      overallScore: number;
      ideaTitle: string;
      ideaId: number;
    } | null = null;

    for (const idea of analyzedIdeas) {
      const analysis = idea.analysis!;
      const score = analysis.overallScore ?? 0;
      if (score > highestScore) {
        highestScore = score;
        maxOverallIdea = idea;
      }

      // Aggregate strengths -> opportunities
      if (analysis.strengths) {
        analysis.strengths.forEach((item, index) => {
          list.push({
            id: `opportunity-${idea.id}-${index}`,
            ideaId: idea.id,
            type: "opportunity",
            label: "Opportunity",
            timeAgo: formatTimeAgo(idea.createdAt),
            title: item.title,
            body: item.desc,
            icon: TrendingUp,
            iconBg: "bg-emerald-500/10",
            iconColor: "text-emerald-500",
            cta: "View Idea Details",
          });
        });
      }

      // Aggregate suggestions -> suggestions
      if (analysis.suggestions) {
        analysis.suggestions.forEach((item, index) => {
          list.push({
            id: `suggestion-${idea.id}-${index}`,
            ideaId: idea.id,
            type: "suggestion",
            label: "Suggestion",
            timeAgo: formatTimeAgo(idea.createdAt),
            title: item.title,
            body: item.desc,
            icon: Lightbulb,
            iconBg: "bg-amber-500/10",
            iconColor: "text-amber-500",
            cta: "View Idea Details",
          });
        });
      }

      // Aggregate risks -> risks
      if (analysis.risks) {
        for (const [index, item] of analysis.risks.entries()) {
          list.push({
            id: `risk-${idea.id}-${index}`,
            ideaId: idea.id,
            type: "risk",
            label: "Risk",
            timeAgo: formatTimeAgo(idea.createdAt),
            title: item.title,
            body: item.desc,
            icon: AlertTriangle,
            iconBg: "bg-red-500/10",
            iconColor: "text-red-500",
            cta: "View Idea Details",
          });

          if (!riskToSpotlight) {
            riskToSpotlight = {
              title: item.title,
              desc: item.desc,
              overallScore: analysis.overallScore ?? 0,
              ideaTitle: idea.title,
              ideaId: idea.id,
            };
          }
        }
      }
    }

    // Priority Insight spotlight
    const priority = maxOverallIdea
      ? {
          title: maxOverallIdea.title,
          body:
            maxOverallIdea.analysis?.verdictSummary ||
            maxOverallIdea.description ||
            "Highest-rated strategic concept based on overall feasibility, innovation, and impact.",
          impactScore: maxOverallIdea.analysis?.overallScore ?? 0,
          ideaId: maxOverallIdea.id,
        }
      : null;

    // Distribution calculation
    const oppsCount = list.filter((i) => i.type === "opportunity").length;
    const sugCount = list.filter((i) => i.type === "suggestion").length;
    const risksCount = list.filter((i) => i.type === "risk").length;

    const dist = [
      {
        label: "Opportunities",
        value: oppsCount,
        color: "bg-emerald-500",
        dot: "bg-emerald-500",
      },
      { label: "Risks", value: risksCount, color: "bg-red-400", dot: "bg-red-400" },
      {
        label: "Suggestions",
        value: sugCount,
        color: "bg-amber-500",
        dot: "bg-amber-500",
      },
    ];

    // Confidence chart: last 6 analyzed ideas overallScore (or default 70)
    const confData = analyzedIdeas
      .slice(-6)
      .map((i) => i.analysis?.overallScore ?? 70);
    while (confData.length < 6) {
      confData.unshift(70);
    }

    return {
      smallInsights: list,
      distribution: dist,
      priorityInsight: priority,
      riskInsight: riskToSpotlight,
      confidenceData: confData,
      hasAnyAnalyzed: true,
      hasAnyProcessing,
    };
  }, [ideas]);

  const {
    smallInsights,
    distribution,
    priorityInsight,
    riskInsight,
    confidenceData,
    hasAnyAnalyzed,
    hasAnyProcessing,
  } = processedData;

  const filteredSmall =
    activeFilter === "all"
      ? smallInsights
      : smallInsights.filter((i) => {
          const typeToTabMap: Record<SmallInsight["type"], FilterTab> = {
            opportunity: "opportunities",
            risk: "risks",
            suggestion: "suggestions",
          };
          return typeToTabMap[i.type] === activeFilter;
        });

  const showPriority =
    activeFilter === "all" || activeFilter === "opportunities";
  const showRisk = activeFilter === "all" || activeFilter === "risks";

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-end">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-80" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-full" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <Skeleton className="lg:col-span-3 h-[220px] rounded-2xl" />
          <Skeleton className="lg:col-span-2 h-[220px] rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-16 bg-card rounded-xl border border-border">
        <AlertTriangle className="w-10 h-10 text-destructive mx-auto mb-3" />
        <h3 className="font-semibold mb-1">Failed to load insights</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Please check your connection and try again.
        </p>
        <Button onClick={handleRefresh}>Retry</Button>
      </div>
    );
  }

  if (!hasAnyAnalyzed) {
    return (
      <div className="text-center py-16 bg-card rounded-xl border border-dashed border-border space-y-4">
        <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
        <h3 className="text-lg font-semibold">No AI Insights Available Yet</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          {hasAnyProcessing
            ? "Your ideas are currently being analyzed by the AI engine. This usually takes less than a minute."
            : "Clariva generates actionable recommendations, opportunity assessments, and risk reviews once you submit ideas for validation."}
        </p>
        {!hasAnyProcessing && (
          <Link href="/submit" asChild>
            <Button className="gap-2">
              Submit Your First Idea
              <ArrowUpRight className="w-4 h-4" />
            </Button>
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ---- Priority Spotlight (3-Column Grid) ---- */}
      {activeFilter === "all" && priorityInsight && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Column 1: Impact Score visual box (Left, 1.5/5 width span) */}
          <div
            className="lg:col-span-2 rounded-2xl p-6 text-white flex flex-col justify-between relative overflow-hidden min-h-[240px]"
            style={{
              background: "linear-gradient(135deg, #0d0c22 0%, #1e1b4b 100%)",
            }}
          >
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                ★ Priority
              </span>
            </div>
            <div className="relative z-10 mt-auto">
              <p className="text-xs text-white/50 uppercase tracking-wider">Impact Score</p>
              <p className="text-5xl font-black tracking-tight leading-none mt-1">
                {priorityInsight.impactScore}<span className="text-lg font-normal text-white/40">/100</span>
              </p>
            </div>
            {/* Visual background element */}
            <div
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                backgroundImage: "radial-gradient(circle at 70% 30%, #4338ca 0%, transparent 60%)",
              }}
            />
          </div>

          {/* Column 2: Opportunity strategy details (Center, 2/5 width span) */}
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 flex flex-col justify-between min-h-[240px]">
            <div>
              <span className="inline-block mb-3 text-[10px] font-bold uppercase tracking-widest text-cyan-600 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                Opportunity
              </span>
              <h3 className="text-base font-bold text-foreground mb-2">
                {priorityInsight.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {priorityInsight.body}
              </p>
            </div>
            <div className="flex items-center gap-4 mt-6">
              <Link href={`/ideas/${priorityInsight.ideaId}`} asChild>
                <Button size="sm" className="bg-primary hover:bg-primary/95 text-white">
                  Execute Strategy
                </Button>
              </Link>
              <Link
                href={`/ideas/${priorityInsight.ideaId}`}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                View Detailed Report
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Column 3: Risk Alert (Right, 1.5/5 width span) */}
          <div className="lg:col-span-1 bg-card border border-border rounded-2xl p-6 flex flex-col justify-between min-h-[240px]">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-red-600 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                  Risk
                </span>
                <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
              </div>
              <h3 className="text-sm font-bold text-foreground mb-1.5 line-clamp-1">
                Churn Prediction Alert
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                {riskInsight?.desc || "Enterprise segments are indicating potential churn indicators."}
              </p>
            </div>
            <div className="mt-4">
              <div className="rounded-lg bg-muted/40 border border-border px-3 py-2 flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Affected ARR</span>
                <span className="text-xs font-bold text-red-500 font-mono">-$142,000</span>
              </div>
              {/* Progress bar */}
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden mb-3">
                <div className="h-full bg-red-500 rounded-full" style={{ width: "70%" }} />
              </div>
              <Button variant="outline" size="sm" className="w-full text-xs">
                Start Outreach
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Suggestion / Opportunity grid ---- */}
      {filteredSmall.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {filteredSmall.map((insight) => (
            <SmallInsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      )}

      {filteredSmall.length === 0 && !showPriority && !showRisk && (
        <div className="text-center py-16 bg-card rounded-xl border border-dashed border-border">
          <Sparkles className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold mb-1">No insights in this category</h3>
          <p className="text-sm text-muted-foreground">
            Check back soon — the engine is scanning.
          </p>
        </div>
      )}

      {/* ---- Distribution + System notice ---- */}
      {activeFilter === "all" && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Insight Distribution
            </p>
            <div className="space-y-3">
              {distribution.map((d) => (
                <div
                  key={d.label}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <span className={`w-2 h-2 rounded-full ${d.dot}`} />
                    {d.label}
                  </span>
                  <span className="font-semibold text-foreground">
                    {d.value}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-5 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                <BarChart2 className="w-3.5 h-3.5" />
                AI Model Confidence
              </p>
              <div className="flex items-end gap-1.5 h-16">
                {confidenceData.map((h, i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded-t-sm ${i === 2 ? "bg-primary" : "bg-primary/20"}`}
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 rounded-xl border border-border bg-card p-5 flex flex-col">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2 text-primary text-xs font-semibold">
                <Cpu className="w-3.5 h-3.5" />
                System Notice
                <span className="text-muted-foreground font-normal">
                  · 1 day ago
                </span>
              </div>
              <Badge variant="secondary" className="text-[10px]">
                New model v4.2
              </Badge>
            </div>
            <h3 className="text-sm font-semibold mb-2">
              Enhanced Predictive Accuracy
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4 flex-1">
              Clariva's core AI has been updated. Insights now include "External
              Market Context" providing a 360-degree view of your competitive
              landscape and macro-economic factors.
            </p>
            <div className="flex items-center gap-3">
              <Button size="sm" variant="outline">
                Learn More
              </Button>
              <button className="text-sm text-muted-foreground hover:text-foreground">
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
