import { useState, useMemo } from "react";
import { Link } from "wouter";
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  ArrowUpRight,
  RefreshCw,
  BarChart2,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  distribution: { label: string; value: number; color: string; dot: string }[];
  priorityInsight: {
    title: string;
    body: string;
    impactScore: number;
    ideaId: number;
  } | null;
  topRisk: {
    title: string;
    desc: string;
    ideaTitle: string;
    ideaId: number;
    overallScore: number;
  } | null;
  confidenceData: number[];
  avgScore: number;
  totalIdeas: number;
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
function formatTimeAgo(dateStr: string | Date) {
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

/* ======================= Small Insight Card ======================= */
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

/* ======================= AI Insights Page ======================= */
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
    const empty: ProcessedData = {
      smallInsights: [],
      distribution: [],
      priorityInsight: null,
      topRisk: null,
      confidenceData: [],
      avgScore: 0,
      totalIdeas: 0,
      hasAnyAnalyzed: false,
      hasAnyProcessing: false,
    };

    if (!ideas) return empty;

    const analyzedIdeas = ideas.filter(
      (idea) => idea.status === "analyzed" && idea.analysis,
    );
    const hasAnyProcessing = ideas.some(
      (idea) => idea.status === "processing" || idea.status === "pending",
    );

    if (analyzedIdeas.length === 0) {
      return { ...empty, hasAnyProcessing };
    }

    const list: SmallInsight[] = [];
    let maxOverallIdea = analyzedIdeas[0];
    let highestScore = analyzedIdeas[0].analysis?.overallScore ?? 0;
    let topRisk: ProcessedData["topRisk"] = null;

    for (const idea of analyzedIdeas) {
      const analysis = idea.analysis!;
      const score = analysis.overallScore ?? 0;
      if (score > highestScore) {
        highestScore = score;
        maxOverallIdea = idea;
      }

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

          if (!topRisk) {
            topRisk = {
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

    const priority = maxOverallIdea
      ? {
          title: maxOverallIdea.title,
          body:
            maxOverallIdea.analysis?.verdictSummary?.slice(0, 220) ||
            maxOverallIdea.description ||
            "Highest-rated concept based on overall feasibility, innovation, and impact.",
          impactScore: maxOverallIdea.analysis?.overallScore ?? 0,
          ideaId: maxOverallIdea.id,
        }
      : null;

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
      {
        label: "Risks",
        value: risksCount,
        color: "bg-red-400",
        dot: "bg-red-400",
      },
      {
        label: "Suggestions",
        value: sugCount,
        color: "bg-amber-500",
        dot: "bg-amber-500",
      },
    ];

    const confData = analyzedIdeas
      .slice(-6)
      .map((i) => i.analysis?.overallScore ?? 0);
    while (confData.length < 6) confData.unshift(0);

    const totalScore = analyzedIdeas.reduce(
      (acc, i) => acc + (i.analysis?.overallScore ?? 0),
      0,
    );
    const avgScore = Math.round(totalScore / analyzedIdeas.length);

    return {
      smallInsights: list,
      distribution: dist,
      priorityInsight: priority,
      topRisk,
      confidenceData: confData,
      avgScore,
      totalIdeas: analyzedIdeas.length,
      hasAnyAnalyzed: true,
      hasAnyProcessing,
    };
  }, [ideas]);

  const {
    smallInsights,
    distribution,
    priorityInsight,
    topRisk,
    confidenceData,
    avgScore,
    totalIdeas,
    hasAnyAnalyzed,
    hasAnyProcessing,
  } = processedData;

  const filteredSmall =
    activeFilter === "all"
      ? smallInsights
      : smallInsights.filter((i) => {
          const map: Record<SmallInsight["type"], FilterTab> = {
            opportunity: "opportunities",
            risk: "risks",
            suggestion: "suggestions",
          };
          return map[i.type] === activeFilter;
        });

  /* ---- Loading ---- */
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-end">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-80" />
          </div>
          <Skeleton className="h-9 w-28" />
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

  /* ---- Error ---- */
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

  /* ---- Empty ---- */
  if (!hasAnyAnalyzed) {
    return (
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              AI Insights
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Aggregated signals across all your validated ideas.
            </p>
          </div>
        </div>
        <div className="text-center py-16 bg-card rounded-xl border border-dashed border-border space-y-4">
          <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
          <h3 className="text-lg font-semibold">
            No AI Insights Available Yet
          </h3>
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
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ---- Page Header ---- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            AI Insights
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Aggregated signals across{" "}
            <span className="font-medium text-foreground">{totalIdeas}</span>{" "}
            analyzed idea{totalIdeas !== 1 ? "s" : ""}.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="gap-2 shrink-0"
        >
          <RefreshCw
            className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* ---- Filter Tabs ---- */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {filterTabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveFilter(key)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors border ${
              activeFilter === key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-foreground/20"
            }`}
          >
            {label}
            {key !== "all" && (
              <span
                className={`ml-1.5 text-[11px] font-semibold ${activeFilter === key ? "opacity-70" : "opacity-50"}`}
              >
                {key === "opportunities"
                  ? smallInsights.filter((i) => i.type === "opportunity").length
                  : key === "risks"
                    ? smallInsights.filter((i) => i.type === "risk").length
                    : smallInsights.filter((i) => i.type === "suggestion")
                        .length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ---- Priority Spotlight (only on "all" tab) ---- */}
      {activeFilter === "all" && priorityInsight && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Impact Score card */}
          <div
            className="lg:col-span-2 rounded-2xl p-6 text-white flex flex-col justify-between relative overflow-hidden min-h-[240px]"
            style={{
              background: "linear-gradient(135deg, #0d0c22 0%, #1e1b4b 100%)",
            }}
          >
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                ★ Top Performer
              </span>
            </div>
            <div className="relative z-10 mt-auto">
              <p className="text-xs text-white/50 uppercase tracking-wider mb-1">
                Overall Score
              </p>
              <p className="text-5xl font-black tracking-tight leading-none">
                {priorityInsight.impactScore}
                <span className="text-lg font-normal text-white/40">/100</span>
              </p>
              <p className="text-sm text-white/60 mt-2 line-clamp-1">
                {priorityInsight.title}
              </p>
            </div>
            <div
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 70% 30%, #4338ca 0%, transparent 60%)",
              }}
            />
          </div>

          {/* Best idea details */}
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 flex flex-col justify-between min-h-[240px]">
            <div>
              <span className="inline-block mb-3 text-[10px] font-bold uppercase tracking-widest text-cyan-600 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                Best Opportunity
              </span>
              <h3 className="text-base font-bold text-foreground mb-2">
                {priorityInsight.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">
                {priorityInsight.body}
              </p>
            </div>
            <Link href={`/ideas/${priorityInsight.ideaId}`} asChild>
              <Button
                size="sm"
                className="mt-4 self-start gap-1.5 bg-primary hover:bg-primary/95 text-white"
              >
                View Full Report
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>

          {/* Top Risk card — real data only */}
          <div className="lg:col-span-1 bg-card border border-border rounded-2xl p-6 flex flex-col justify-between min-h-[240px]">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-red-600 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                Top Risk
              </span>
              {topRisk ? (
                <>
                  <h3 className="text-sm font-bold text-foreground mt-3 mb-1.5 line-clamp-2">
                    {topRisk.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                    {topRisk.desc}
                  </p>
                  <p className="text-[11px] text-muted-foreground/70 mt-2">
                    From:{" "}
                    <span className="font-medium text-muted-foreground">
                      {topRisk.ideaTitle}
                    </span>
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground mt-3">
                  No risks detected across your ideas.
                </p>
              )}
            </div>
            {topRisk && (
              <Link
                href={`/ideas/${topRisk.ideaId}`}
                className="mt-4 text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
              >
                View Analysis
                <ArrowUpRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        </div>
      )}

      {/* ---- Insight Feed ---- */}
      {filteredSmall.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {filteredSmall.map((insight) => (
            <SmallInsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      )}

      {filteredSmall.length === 0 && activeFilter !== "all" && (
        <div className="text-center py-16 bg-card rounded-xl border border-dashed border-border">
          <Sparkles className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold mb-1">No {activeFilter} found</h3>
          <p className="text-sm text-muted-foreground">
            Submit more ideas for analysis to generate {activeFilter}.
          </p>
        </div>
      )}

      {/* ---- Distribution + Portfolio Summary (only on "all" tab) ---- */}
      {activeFilter === "all" && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Insight Distribution */}
          <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Insight Distribution
            </p>
            <div className="space-y-3">
              {distribution.map((d) => {
                const total = distribution.reduce((a, b) => a + b.value, 0);
                const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
                return (
                  <div key={d.label}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <span className={`w-2 h-2 rounded-full ${d.dot}`} />
                        {d.label}
                      </span>
                      <span className="font-semibold text-foreground">
                        {d.value}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${d.color}`}
                        style={{
                          width: `${pct}%`,
                          transition: "width 0.5s ease",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* AI Confidence chart (real overallScore data) */}
            <div className="mt-5 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                <BarChart2 className="w-3.5 h-3.5" />
                Score History (last {confidenceData.length} ideas)
              </p>
              <div className="flex items-end gap-1.5 h-16">
                {confidenceData.map((h, i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded-t-sm transition-all ${
                      i === confidenceData.length - 1
                        ? "bg-primary"
                        : "bg-primary/25"
                    }`}
                    style={{ height: `${Math.max(4, h)}%` }}
                    title={`Score: ${h}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Portfolio Overview — real data */}
          <div className="lg:col-span-3 rounded-xl border border-border bg-card p-5 flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Target className="w-3.5 h-3.5 text-primary" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                Portfolio Overview
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="rounded-lg bg-muted/50 border border-border p-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Ideas Analyzed
                </p>
                <p className="text-2xl font-black text-foreground mt-0.5">
                  {totalIdeas}
                </p>
              </div>
              <div className="rounded-lg bg-muted/50 border border-border p-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Avg Score
                </p>
                <p
                  className={`text-2xl font-black mt-0.5 ${
                    avgScore >= 70
                      ? "text-emerald-500"
                      : avgScore >= 50
                        ? "text-amber-500"
                        : "text-destructive"
                  }`}
                >
                  {avgScore}
                  <span className="text-sm font-normal text-muted-foreground">
                    /100
                  </span>
                </p>
              </div>
              <div className="rounded-lg bg-muted/50 border border-border p-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Total Signals
                </p>
                <p className="text-2xl font-black text-foreground mt-0.5">
                  {smallInsights.length}
                </p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed flex-1">
              {avgScore >= 70
                ? "Your portfolio is performing well. Focus on execution — the top-rated idea shows strong market fit signals."
                : avgScore >= 50
                  ? "Mixed signals across your portfolio. Consider strengthening the uniqueness and feasibility of lower-scoring ideas before committing resources."
                  : "Most ideas are scoring below 50. Re-run analysis after sharpening your target niche and differentiators to improve your scores."}
            </p>

            {hasAnyProcessing && (
              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 border border-border">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                One or more ideas are still being analyzed.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
