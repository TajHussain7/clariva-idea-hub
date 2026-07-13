import { useLocation } from "wouter";
import { ArrowLeft, GitCompare, AlertTriangle, Crown, TrendingUp } from "lucide-react";
import { useCompareIdeas, getCompareIdeasQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/* ======================= Score color helpers ======================= */
function scoreColor(score: number) {
  if (score >= 80) return "text-emerald-500";
  if (score >= 60) return "text-primary";
  if (score >= 40) return "text-amber-500";
  return "text-destructive";
}

function trackColor(score: number, isWinner: boolean) {
  if (!isWinner) return "bg-muted-foreground/25";
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-primary";
  if (score >= 40) return "bg-amber-500";
  return "bg-destructive";
}

const metrics = [
  { key: "overallScore",     label: "Overall",    emoji: "⭐" },
  { key: "feasibilityScore", label: "Feasibility", emoji: "✅" },
  { key: "uniquenessScore",  label: "Uniqueness",  emoji: "🔮" },
  { key: "impactScore",      label: "Impact",      emoji: "💥" },
  { key: "innovationScore",  label: "Innovation",  emoji: "🚀" },
];

/* ======================= Compare page ======================= */
export function Compare() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const idsParam = searchParams.get("ids");

  const { data: ideas, isLoading, isError } = useCompareIdeas(
    { ids: idsParam || "" },
    {
      query: {
        enabled: !!idsParam,
        queryKey: getCompareIdeasQueryKey({ ids: idsParam || "" }),
      },
    },
  );

  /* ---- No ideas selected ---- */
  if (!idsParam) {
    return (
      <div className="text-center py-24">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-muted mb-4">
          <GitCompare className="w-7 h-7 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold mb-2">No ideas selected</h2>
        <p className="text-muted-foreground text-sm mb-6">
          Select at least 2 analyzed ideas from the dashboard to compare.
        </p>
        <Link href="/dashboard">
          <Button size="sm" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Return to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  /* ---- Loading ---- */
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-7 w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  /* ---- Error ---- */
  if (isError || !ideas || ideas.length === 0) {
    return (
      <div className="text-center py-24">
        <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Comparison failed</h2>
        <p className="text-muted-foreground text-sm mb-6">
          Could not load the requested ideas.
        </p>
        <Link href="/dashboard">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Go Back
          </Button>
        </Link>
      </div>
    );
  }

  const validIdeas = ideas.filter(
    (i) => i.analysis && i.status === "analyzed",
  );

  if (validIdeas.length < 2) {
    return (
      <div className="text-center py-24">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Analysis incomplete</h2>
        <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto">
          Ensure at least 2 of the selected ideas have completed analysis.
        </p>
        <Link href="/dashboard">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Go Back
          </Button>
        </Link>
      </div>
    );
  }

  /* Find the winner (highest overall score) */
  const maxOverall = Math.max(
    ...validIdeas.map((i) => i.analysis!.overallScore || 0),
  );

  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-500">
      {/* ---- Breadcrumb ---- */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link
          href="/dashboard"
          className="hover:text-foreground transition-colors flex items-center gap-1 font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Dashboard
        </Link>
      </div>

      {/* ---- Header ---- */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <GitCompare className="w-6 h-6 text-primary" />
            Head-to-Head Analysis
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Comparing {validIdeas.length} ideas across 5 performance metrics.
          </p>
        </div>
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border"
          style={{
            backgroundColor: "rgba(87,223,254,0.08)",
            borderColor: "rgba(87,223,254,0.2)",
            color: "#57dffe",
          }}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          {validIdeas.length} ideas compared
        </div>
      </div>

      {/* ---- Comparison Cards ---- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {validIdeas.map((idea) => {
          const a = idea.analysis!;
          const isTopIdea = (a.overallScore || 0) === maxOverall;

          return (
            <Card
              key={idea.id}
              className={`bg-card border-border relative overflow-hidden flex flex-col h-full pi-card-hover ${
                isTopIdea ? "border-primary/40 ring-1 ring-primary/20" : ""
              }`}
              data-testid={`compare-card-${idea.id}`}
            >
              {/* Winner indicator */}
              {isTopIdea && (
                <div className="absolute top-0 inset-x-0 h-0.5 bg-primary" />
              )}

              <CardHeader className="border-b border-border bg-muted/30 pb-4 pt-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-sm font-semibold line-clamp-1">
                      {idea.title}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mt-0.5">
                      {idea.domain}
                    </p>
                  </div>
                  {isTopIdea && (
                    <div className="shrink-0 flex items-center gap-1 px-2 py-1 bg-primary/10 rounded-full border border-primary/20">
                      <Crown className="w-3 h-3 text-primary" />
                      <span className="text-[10px] font-bold text-primary">Top</span>
                    </div>
                  )}
                </div>

                {/* Overall score large display */}
                <div className="flex items-end gap-1 mt-4">
                  <span
                    className={`text-4xl font-black tabular-nums leading-none ${scoreColor(a.overallScore || 0)}`}
                  >
                    {a.overallScore || 0}
                  </span>
                  <span className="text-base text-muted-foreground mb-0.5">/100</span>
                </div>
              </CardHeader>

              <CardContent className="pt-5 flex-1 flex flex-col space-y-5">
                {/* Metric Bars */}
                <div className="space-y-3">
                  {metrics.map((metric) => {
                    const score = (a as any)[metric.key] || 0;
                    const isWinner =
                      score ===
                      Math.max(
                        ...validIdeas.map(
                          (i) => (i.analysis as any)[metric.key] || 0,
                        ),
                      );

                    return (
                      <div key={metric.key} className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span
                            className={`text-xs font-medium ${
                              isWinner ? "text-foreground" : "text-muted-foreground"
                            }`}
                          >
                            {metric.emoji} {metric.label}
                          </span>
                          <span
                            className={`text-xs font-bold tabular-nums ${
                              isWinner
                                ? scoreColor(score)
                                : "text-muted-foreground"
                            }`}
                          >
                            {score}
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${trackColor(score, isWinner)}`}
                            style={{ width: `${score}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex-1" />

                {/* Strength & Risk Snippets */}
                <div className="space-y-3 pt-4 border-t border-border">
                  <div>
                    <p className="text-[11px] font-semibold text-emerald-500 uppercase tracking-wider mb-1">
                      Top Strength
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {a.strengths?.[0]?.desc || "No strengths identified."}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-amber-500 uppercase tracking-wider mb-1">
                      Main Risk
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {a.risks?.[0]?.desc || "No risks identified."}
                    </p>
                  </div>
                </div>

                {/* CTA */}
                <Link href={`/ideas/${idea.id}`} className="block w-full">
                  <Button
                    variant={isTopIdea ? "default" : "outline"}
                    size="sm"
                    className="w-full"
                  >
                    Full Report
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}