import { useState } from "react";
import { useLocation } from "wouter";
import {
  GitCompare,
  AlertTriangle,
  Crown,
  TrendingUp,
  Trophy,
  ChevronDown,
  X,
  ArrowLeft,
} from "lucide-react";
import {
  useCompareIdeas,
  getCompareIdeasQueryKey,
  useListIdeas,
} from "@workspace/api-client-react";
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

/* Score bar used in the comparison table */
function ScoreBar({
  value,
  winner,
}: {
  value: number;
  winner: boolean;
}) {
  const barColor = winner
    ? value >= 80
      ? "bg-emerald-500"
      : value >= 60
        ? "bg-primary"
        : "bg-amber-500"
    : "bg-muted-foreground/25";

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor} ${winner ? "shadow-[0_0_6px_currentColor]" : ""}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span
        className={`text-sm font-mono font-semibold w-8 text-right tabular-nums ${
          winner ? scoreColor(value) : "text-muted-foreground"
        }`}
      >
        {value}
      </span>
      {winner && <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
    </div>
  );
}

const SCORE_DIMENSIONS = [
  { key: "uniquenessScore", label: "Uniqueness", desc: "How different from existing solutions", bold: false },
  { key: "feasibilityScore", label: "Feasibility", desc: "How practical to build", bold: false },
  { key: "impactScore", label: "Impact", desc: "Potential user value", bold: false },
  { key: "innovationScore", label: "Innovation", desc: "Level of creative novelty", bold: false },
  { key: "overallScore", label: "Overall Score", desc: "Composite weighted score", bold: true },
] as const;

/* ======================= Compare page ======================= */
export function Compare() {
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const idsParam = searchParams.get("ids");

  // Parse initial selected IDs from URL
  const initialIds = idsParam
    ? idsParam.split(",").map(Number).filter(Boolean)
    : [];
  const [selectedIds, setSelectedIds] = useState<number[]>(initialIds);
  const [verdictExpanded, setVerdictExpanded] = useState(true);

  // Load all user ideas for the selector
  const { data: allIdeas, isLoading: isLoadingIdeas } = useListIdeas();

  // Only fetch comparison data when ≥2 ideas are selected
  const compareParam = selectedIds.join(",");
  const { data: compareIdeas, isLoading: isLoadingCompare } = useCompareIdeas(
    { ids: compareParam },
    {
      query: {
        enabled: selectedIds.length >= 2,
        queryKey: getCompareIdeasQueryKey({ ids: compareParam }),
      },
    },
  );

  const analyzedIdeas = allIdeas?.filter(
    (i) => i.status === "analyzed" && i.analysis,
  ) ?? [];

  const toggleIdea = (id: number) => {
    let next: number[];
    if (selectedIds.includes(id)) {
      next = selectedIds.filter((x) => x !== id);
    } else {
      next = [...selectedIds, id];
    }
    setSelectedIds(next);
    // Keep URL in sync
    if (next.length > 0) {
      setLocation(`/compare?ids=${next.join(",")}`, { replace: true });
    } else {
      setLocation("/compare", { replace: true });
    }
  };

  const validIdeas =
    compareIdeas?.filter((i) => i.analysis && i.status === "analyzed") ?? [];

  const winner =
    validIdeas.length > 0
      ? validIdeas.reduce(
          (best, idea) =>
            (idea.analysis?.overallScore ?? 0) >
            (best.analysis?.overallScore ?? 0)
              ? idea
              : best,
          validIdeas[0],
        )
      : null;

  return (
    <div className="space-y-6 pb-10 animate-in fade-in duration-500">
      {/* ---- Header ---- */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <GitCompare className="w-6 h-6 text-primary" />
            Idea Comparison
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {selectedIds.length > 0
              ? `Comparing ${selectedIds.length} idea${selectedIds.length > 1 ? "s" : ""} side-by-side`
              : "Select at least 2 analyzed ideas to compare"}
          </p>
        </div>
        {validIdeas.length >= 2 && (
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
        )}
      </div>

      {/* ---- Idea Selector Pills ---- */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Select Ideas to Compare
        </p>
        {isLoadingIdeas ? (
          <div className="flex gap-3 flex-wrap">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-9 w-40 rounded-full" />
            ))}
          </div>
        ) : analyzedIdeas.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-xl border border-dashed border-border">
            <GitCompare className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-semibold mb-1">No analyzed ideas yet</p>
            <p className="text-xs text-muted-foreground mb-4">
              Submit and analyze at least 2 ideas to use comparison.
            </p>
            <Link href="/submit">
              <Button size="sm">Submit an Idea</Button>
            </Link>
          </div>
        ) : (
          <div className="flex gap-2.5 flex-wrap">
            {analyzedIdeas.map((idea) => {
              const isSelected = selectedIds.includes(idea.id);
              return (
                <button
                  key={idea.id}
                  onClick={() => toggleIdea(idea.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                    isSelected
                      ? "bg-primary/10 border-primary/40 text-primary"
                      : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
                  }`}
                >
                  {idea.title}
                  {isSelected && (
                    <X className="w-3.5 h-3.5 ml-0.5 opacity-60 hover:opacity-100" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ---- Need more ideas message ---- */}
      {selectedIds.length === 1 && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-sm text-amber-600 dark:text-amber-400">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          Select at least one more idea to start comparing.
        </div>
      )}

      {/* ---- Loading comparison data ---- */}
      {isLoadingCompare && selectedIds.length >= 2 && (
        <div className="space-y-4">
          <Skeleton className="h-7 w-1/3" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      )}

      {/* ---- Comparison Table ---- */}
      {!isLoadingCompare && validIdeas.length >= 2 && (
        <div className="space-y-5">
          {/* Scrollable table */}
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <td className="py-4 px-5 w-44">
                    <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">
                      Dimension
                    </p>
                  </td>
                  {validIdeas.map((idea) => (
                    <td key={idea.id} className="py-4 px-5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <GitCompare className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-foreground line-clamp-1">
                            {idea.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground">
                              {idea.domain}
                            </span>
                            {winner && idea.id === winner.id && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/20 text-amber-500 border border-amber-500/30 rounded-full font-medium flex items-center gap-1">
                                <Trophy className="w-2.5 h-2.5" />
                                Best
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Meta rows */}
                {(
                  [
                    { label: "Domain", key: "domain" },
                    { label: "Complexity", key: "complexity" },
                  ] as const
                ).map(({ label, key }) => (
                  <tr
                    key={key}
                    className="border-b border-border hover:bg-muted/20 transition-colors"
                  >
                    <td className="py-3.5 px-5">
                      <p className="text-sm text-muted-foreground font-medium">
                        {label}
                      </p>
                    </td>
                    {validIdeas.map((idea) => (
                      <td key={idea.id} className="py-3.5 px-5">
                        <span className="text-sm text-foreground px-2.5 py-1 bg-muted border border-border rounded-md">
                          {(idea as any)[key] ?? "—"}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}

                {/* Separator */}
                <tr>
                  <td
                    colSpan={validIdeas.length + 1}
                    className="h-px bg-primary/15"
                  />
                </tr>

                {/* Score rows */}
                {SCORE_DIMENSIONS.map(({ key, label, desc, bold }) => (
                  <tr
                    key={key}
                    className={`border-b border-border hover:bg-muted/20 transition-colors ${bold ? "bg-muted/20" : ""}`}
                  >
                    <td className="py-4 px-5">
                      <p
                        className={`text-sm font-medium ${bold ? "text-foreground font-semibold" : "text-muted-foreground"}`}
                      >
                        {label}
                      </p>
                      <p className="text-xs text-muted-foreground/60 mt-0.5">
                        {desc}
                      </p>
                    </td>
                    {validIdeas.map((idea) => {
                      const val = (idea.analysis as any)?.[key] ?? 0;
                      const isWinner = validIdeas.every(
                        (other) => ((other.analysis as any)?.[key] ?? 0) <= val,
                      );
                      return (
                        <td key={idea.id} className="py-4 px-5">
                          <ScoreBar value={val} winner={isWinner} />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tech Stack row */}
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: `repeat(${validIdeas.length}, minmax(0, 1fr))`,
            }}
          >
            {validIdeas.map((idea) => (
              <Card key={idea.id} className="bg-card border-border">
                <CardContent className="pt-4 pb-4">
                  <p className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Suggested Stack
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {idea.analysis?.techStack &&
                    idea.analysis.techStack.length > 0 ? (
                      idea.analysis.techStack.map((t: string) => (
                        <span
                          key={t}
                          className="text-xs px-2 py-1 bg-muted border border-border rounded-full text-muted-foreground font-mono"
                        >
                          {t}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        No stack data
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* AI Verdict accordion */}
          {winner && (
            <div
              className="rounded-2xl overflow-hidden border border-primary/30"
              style={{
                background:
                  "linear-gradient(135deg, rgba(79,70,229,0.12) 0%, rgba(99,102,241,0.08) 100%)",
              }}
            >
              <button
                onClick={() => setVerdictExpanded(!verdictExpanded)}
                className="w-full flex items-center justify-between px-6 py-4 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center">
                    <GitCompare className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-primary text-sm">
                      AI Verdict
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Based on multi-dimensional analysis
                    </p>
                  </div>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-muted-foreground transition-transform ${verdictExpanded ? "rotate-180" : ""}`}
                />
              </button>

              {verdictExpanded && (
                <div className="px-6 pb-6 pt-2">
                  <div className="flex items-center gap-2 mb-3">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <p className="font-semibold text-sm text-amber-500">
                      Recommended: {winner.title}
                    </p>
                    <span className="text-xs px-2 py-0.5 bg-amber-500/20 border border-amber-500/30 rounded-full text-amber-500">
                      {winner.analysis?.overallScore ?? 0}/100
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                    {winner.analysis?.verdictSummary ||
                      `Based on your submitted concepts, "${winner.title}" shows the strongest overall potential with the highest composite score across all dimensions.`}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link href={`/ideas/${winner.id}`}>
                      <Button size="sm" className="gap-2">
                        View Full Analysis
                      </Button>
                    </Link>
                    <Button variant="outline" size="sm">
                      Export Comparison
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ---- Error state for compare fetch ---- */}
      {!isLoadingCompare &&
        selectedIds.length >= 2 &&
        compareIdeas &&
        validIdeas.length < 2 && (
          <div className="text-center py-16 bg-card rounded-xl border border-dashed border-border">
            <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
            <h3 className="font-semibold mb-1">Analysis incomplete</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Ensure at least 2 of the selected ideas have completed analysis.
            </p>
          </div>
        )}
    </div>
  );
}