import { useState } from "react";
import { Link } from "wouter";
import {
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  Lightbulb,
  TrendingUp,
  ShieldAlert,
  Terminal,
  Activity,
  CheckCircle2,
  ChevronRight,
  Github,
  Star,
  Code2,
  FileDown,
  Wand2,
  Loader2,
  ArrowRight,
  Globe,
} from "lucide-react";
import {
  useGetIdea,
  useAnalyzeIdea,
  getGetIdeaQueryKey,
  fetcher,
} from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { PublishIdeaModal } from "@/components/publish-idea-modal";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  usePivotSuggestions,
  type PivotSuggestion,
} from "@/hooks/use-pivot-suggestions";

/* ======================= Score helpers ======================= */
function scoreColor(score: number) {
  if (score >= 80) return "text-emerald-500";
  if (score >= 60) return "text-primary";
  if (score >= 40) return "text-amber-500";
  return "text-destructive";
}

function scoreLabel(score: number) {
  if (score >= 80)
    return {
      label: "Excellent",
      color: "text-emerald-500",
      bg: "bg-emerald-500/10 border-emerald-500/20",
    };
  if (score >= 60)
    return {
      label: "Good",
      color: "text-primary",
      bg: "bg-primary/10 border-primary/20",
    };
  if (score >= 40)
    return {
      label: "Fair",
      color: "text-amber-500",
      bg: "bg-amber-500/10 border-amber-500/20",
    };
  return {
    label: "Poor",
    color: "text-destructive",
    bg: "bg-destructive/10 border-destructive/20",
  };
}

function ScoreBar({
  label,
  score,
  colorClass,
  trackClass,
}: {
  label: string;
  score: number | undefined | null;
  colorClass: string;
  trackClass: string;
}) {
  if (score == null) return null;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className={`font-bold tabular-nums text-sm ${colorClass}`}>
          {score}
          <span className="text-muted-foreground font-normal text-xs">
            /100
          </span>
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${trackClass}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

/* ======================= Insight Card ======================= */
function InsightCard({
  items,
  icon: Icon,
  title,
  accentClass,
  iconColorClass,
  iconBgClass,
}: {
  items: any[] | undefined | null;
  icon: any;
  title: string;
  accentClass: string;
  iconColorClass: string;
  iconBgClass: string;
}) {
  if (!items || items.length === 0) return null;
  return (
    <Card
      className={`bg-card border-border h-full overflow-hidden ${accentClass}`}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center ${iconBgClass}`}
          >
            <Icon className={`w-3.5 h-3.5 ${iconColorClass}`} />
          </div>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {items.map((item, i) => (
            <li key={i} className="space-y-0.5">
              <div className="font-semibold text-sm text-foreground">
                {item.title}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {item.desc}
              </p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

/* ======================= Pivot Suggestions Panel ======================= */
function PivotSuggestionsPanel({
  ideaId,
  feasibilityScore,
  uniquenessScore,
}: {
  ideaId: number;
  feasibilityScore: number | null | undefined;
  uniquenessScore: number | null | undefined;
}) {
  const isLowScore =
    (feasibilityScore != null && feasibilityScore < 50) ||
    (uniquenessScore != null && uniquenessScore < 50);

  const { mutate, isPending, data, error, isSuccess } = usePivotSuggestions();
  const [hasTriggered, setHasTriggered] = useState(false);

  if (!isLowScore) return null;

  const handleGenerate = () => {
    setHasTriggered(true);
    mutate(ideaId);
  };

  const weakLabels: string[] = [];
  if (feasibilityScore != null && feasibilityScore < 50)
    weakLabels.push("Feasibility");
  if (uniquenessScore != null && uniquenessScore < 50)
    weakLabels.push("Uniqueness");

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* Header card */}
      <Card className="bg-amber-500/5 border-amber-500/20 overflow-hidden">
        <div className="h-0.5 w-full bg-gradient-to-r from-amber-400 via-primary to-amber-400" />
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Wand2 className="w-3.5 h-3.5 text-amber-500" />
            </div>
            AI Pivot Suggestions
            <span className="ml-auto text-xs font-normal text-muted-foreground px-2 py-0.5 rounded-full bg-muted border border-border">
              {weakLabels.join(" & ")} score{weakLabels.length > 1 ? "s" : ""}{" "}
              low
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-5">
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            Your idea scored below 50 on{" "}
            <span className="font-semibold text-amber-500">
              {weakLabels.join(" and ")}
            </span>
            . Generate 3 concrete, targeted pivot directions to strengthen it.
          </p>

          {!hasTriggered && (
            <Button
              onClick={handleGenerate}
              size="sm"
              className="gap-2 bg-primary hover:bg-primary/90"
            >
              <Wand2 className="w-4 h-4" />
              Generate Pivot Suggestions
            </Button>
          )}

          {isPending && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              Analyzing your idea and generating targeted pivots…
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="w-4 h-4" />
              {error.message ||
                "Failed to generate suggestions. Please try again."}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGenerate}
                className="ml-2 h-7 text-xs"
              >
                Retry
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {isSuccess && data && data.pivots.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in slide-in-from-bottom-4 duration-500 fade-in">
          {data.pivots.map((pivot: PivotSuggestion, i: number) => (
            <Card
              key={i}
              className="bg-card border-border pi-card-hover hover:border-primary/30 flex flex-col"
            >
              <CardHeader className="pb-2 pt-4">
                <div className="flex items-start gap-2">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                    {i + 1}
                  </span>
                  <CardTitle className="text-sm font-semibold leading-snug text-foreground">
                    {pivot.title}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-3 pb-4">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {pivot.desc}
                </p>
                {pivot.rationale && (
                  <div className="flex items-start gap-1.5 pt-1 border-t border-border">
                    <ArrowRight className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                    <p className="text-xs text-primary/80 leading-relaxed">
                      {pivot.rationale}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {isSuccess && data && data.pivots.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No pivot suggestions were generated. Try re-running the analysis
          first.
        </p>
      )}
    </div>
  );
}

/* ======================= Results Page ======================= */
export function Results({ id }: { id: number }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const analyzeMutation = useAnalyzeIdea();
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [publishModalOpen, setPublishModalOpen] = useState(false);

  const { data: publishStatus } = useQuery<{
    published: boolean;
    publicIdea: { id: number; isAnonymous: boolean } | null;
  }>({
    queryKey: ["feed-status", id],
    queryFn: () => fetcher(`/api/feed/status/${id}`),
    enabled: !!id,
  });

  const {
    data: idea,
    isLoading,
    isError,
  } = useGetIdea(id, {
    query: {
      enabled: !!id,
      queryKey: getGetIdeaQueryKey(id),
      refetchInterval: (query) => {
        const status = query.state.data?.status;
        if (!status || status === "analyzed" || status === "failed")
          return false;
        return 3000;
      },
    },
  });

  const handleReanalyze = () => {
    analyzeMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Analysis restarted" });
          queryClient.invalidateQueries({ queryKey: getGetIdeaQueryKey(id) });
        },
      },
    );
  };

  const handleExportPdf = async () => {
    if (!idea || !idea.analysis) return;
    setIsExportingPdf(true);
    try {
      // Dynamic import to keep initial bundle lean
      const { exportIdeaAnalysisPdf } = await import("@/lib/pdf-export");
      exportIdeaAnalysisPdf({
        title: idea.title,
        description: idea.description,
        domain: idea.domain,
        createdAt: idea.createdAt,
        analysis: {
          overallScore: idea.analysis.overallScore,
          feasibilityScore: idea.analysis.feasibilityScore,
          uniquenessScore: idea.analysis.uniquenessScore,
          impactScore: idea.analysis.impactScore,
          innovationScore: idea.analysis.innovationScore,
          verdictSummary: idea.analysis.verdictSummary,
          strengths: idea.analysis.strengths,
          weaknesses: idea.analysis.weaknesses,
          risks: idea.analysis.risks,
          suggestions: idea.analysis.suggestions,
          techStack: idea.analysis.techStack,
          githubRepos: idea.analysis.githubRepos,
          marketContext: idea.analysis.marketContext,
        },
      });
      toast({ title: "PDF exported successfully" });
    } catch (err) {
      toast({ title: "PDF export failed", variant: "destructive" });
    } finally {
      setIsExportingPdf(false);
    }
  };

  /* ---- Loading ---- */
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-1/4" />
        <Skeleton className="h-28 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  /* ---- Error ---- */
  if (isError || !idea) {
    return (
      <div className="text-center py-20">
        <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
        <h2 className="text-xl font-bold">Error loading idea</h2>
        <Button
          onClick={() => window.history.back()}
          className="mt-4"
          variant="outline"
        >
          Go Back
        </Button>
      </div>
    );
  }

  const isProcessing =
    idea.status === "pending" || idea.status === "processing";
  const hasFailed = idea.status === "failed";
  const isAnalyzed = idea.status === "analyzed";
  const a = idea.analysis;

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
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="truncate max-w-[200px] text-foreground font-medium">
          {idea.title}
        </span>
      </div>

      {/* ---- Page Header ---- */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {idea.title}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border uppercase tracking-wider">
              {idea.domain}
            </span>
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-2xl">
            {idea.description}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {isAnalyzed && a && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              className="gap-2"
              data-testid="button-export-pdf"
            >
              {isExportingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileDown className="w-4 h-4" />
              )}
              Export PDF
            </Button>
          )}

          {isAnalyzed && (
            <Button
              variant={publishStatus?.published ? "default" : "outline"}
              size="sm"
              onClick={() => setPublishModalOpen(true)}
              className="gap-2"
              data-testid="button-publish"
            >
              <Globe className="w-4 h-4" />
              {publishStatus?.published ? "Published" : "Publish"}
            </Button>
          )}

          {!isProcessing && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleReanalyze}
              disabled={analyzeMutation.isPending}
              className="gap-2"
              data-testid="button-reanalyze"
            >
              <RefreshCw
                className={`w-4 h-4 ${analyzeMutation.isPending ? "animate-spin" : ""}`}
              />
              Re-run Analysis
            </Button>
          )}
        </div>
      </div>

      {/* Publish Modal */}
      <PublishIdeaModal
        ideaId={id}
        ideaTitle={idea.title}
        isPublished={publishStatus?.published ?? false}
        isAnonymous={publishStatus?.publicIdea?.isAnonymous}
        open={publishModalOpen}
        onOpenChange={setPublishModalOpen}
        onSuccess={() =>
          queryClient.invalidateQueries({ queryKey: ["feed-status", id] })
        }
      />

      {/* ---- Processing State ---- */}
      {isProcessing && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-8 pb-8 flex flex-col items-center justify-center text-center space-y-5">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl pi-pulse-ring" />
              <div className="w-16 h-16 rounded-full border-2 border-primary/30 flex items-center justify-center relative">
                <Activity className="w-7 h-7 text-primary animate-pulse" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">
                Engine is processing...
              </h3>
              <p className="text-muted-foreground text-sm mt-1">
                Scanning market, crawling repos, evaluating feasibility.
              </p>
            </div>
            <div className="w-full max-w-sm space-y-1.5">
              <Progress
                value={idea.status === "processing" ? 66 : 33}
                className="h-1.5"
              />
              <p className="text-xs text-muted-foreground text-right">
                {idea.status === "processing" ? "66%" : "33%"} complete
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ---- Failed State ---- */}
      {hasFailed && (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="pt-8 flex flex-col items-center text-center space-y-3">
            <AlertTriangle className="w-10 h-10 text-destructive" />
            <h3 className="text-lg font-bold text-foreground">
              Analysis Failed
            </h3>
            <p className="text-muted-foreground text-sm">
              The engine encountered an error processing this request.
            </p>
            <Button
              onClick={handleReanalyze}
              className="mt-2"
              variant="destructive"
              size="sm"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ---- Analyzed Results ---- */}
      {isAnalyzed && a && (
        <div className="space-y-6 animate-in slide-in-from-bottom-6 duration-500 fade-in">
          {/* Top section: Score + Verdict */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Score Card */}
            <Card className="lg:col-span-1 bg-card border-border shadow-sm overflow-hidden">
              <div className="h-0.5 w-full bg-primary" />
              <CardHeader className="pb-2 pt-5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Overall Verdict
                </p>
                <div className="flex items-end gap-1.5 mt-3">
                  <span
                    className={`text-7xl font-black tabular-nums leading-none ${scoreColor(a.overallScore || 0)}`}
                  >
                    {a.overallScore}
                  </span>
                  <span className="text-xl text-muted-foreground mb-2">
                    /100
                  </span>
                </div>
                {/* Label badge */}
                {(() => {
                  const sl = scoreLabel(a.overallScore || 0);
                  return (
                    <span
                      className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${sl.bg} ${sl.color}`}
                    >
                      {sl.label}
                    </span>
                  );
                })()}
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <ScoreBar
                  label="Feasibility"
                  score={a.feasibilityScore}
                  colorClass="text-emerald-500"
                  trackClass="bg-emerald-500"
                />
                <ScoreBar
                  label="Uniqueness"
                  score={a.uniquenessScore}
                  colorClass="text-primary"
                  trackClass="bg-primary"
                />
                <ScoreBar
                  label="Impact"
                  score={a.impactScore}
                  colorClass="text-amber-500"
                  trackClass="bg-amber-500"
                />
                <ScoreBar
                  label="Innovation"
                  score={a.innovationScore}
                  colorClass="text-purple-500"
                  trackClass="bg-purple-500"
                />
              </CardContent>
            </Card>

            {/* Verdict + Tech Stack */}
            <Card className="lg:col-span-2 bg-card border-border shadow-sm flex flex-col">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Terminal className="w-3.5 h-3.5 text-primary" />
                  </div>
                  Engine Verdict
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between pt-5">
                <p className="text-base leading-relaxed text-foreground font-medium">
                  {a.verdictSummary}
                </p>

                {a.techStack && a.techStack.length > 0 && (
                  <div className="mt-6 pt-5 border-t border-border">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Code2 className="w-3.5 h-3.5" />
                      Recommended Stack
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {a.techStack.map((tech: string, i: number) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border hover:text-foreground transition-colors"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ---- AI Pivot Suggestions (shown when scores are low) ---- */}
          <PivotSuggestionsPanel
            ideaId={id}
            feasibilityScore={a.feasibilityScore}
            uniquenessScore={a.uniquenessScore}
          />

          {/* Deep Insights Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <InsightCard
              items={a.strengths}
              icon={TrendingUp}
              title="Strengths"
              accentClass="pi-insight-card-strength"
              iconColorClass="text-emerald-500"
              iconBgClass="bg-emerald-500/10"
            />
            <InsightCard
              items={a.weaknesses}
              icon={AlertTriangle}
              title="Weaknesses"
              accentClass="pi-insight-card-weakness"
              iconColorClass="text-amber-500"
              iconBgClass="bg-amber-500/10"
            />
            <InsightCard
              items={a.risks}
              icon={ShieldAlert}
              title="Market Risks"
              accentClass="pi-insight-card-risk"
              iconColorClass="text-destructive"
              iconBgClass="bg-destructive/10"
            />
            <InsightCard
              items={a.suggestions}
              icon={Lightbulb}
              title="Strategic Pivots"
              accentClass="pi-insight-card-pivot"
              iconColorClass="text-primary"
              iconBgClass="bg-primary/10"
            />
          </div>

          {/* GitHub / Prior Art */}
          {a.githubRepos && a.githubRepos.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold flex items-center gap-2">
                <Github className="w-4 h-4" />
                Relevant Prior Art (GitHub)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {a.githubRepos.map((repo: any, i: number) => (
                  <Card
                    key={i}
                    className="bg-card border-border pi-card-hover hover:border-primary/30"
                  >
                    <CardHeader className="pb-2 pt-4">
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <a
                            href={repo.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-semibold hover:underline hover:text-primary truncate block"
                          >
                            {repo.org}/{repo.name}
                          </a>
                        </div>
                        <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground shrink-0 bg-muted border border-border rounded-full px-2 py-0.5">
                          <Star className="w-3 h-3" />
                          {repo.stars >= 1000
                            ? (repo.stars / 1000).toFixed(1) + "k"
                            : repo.stars}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-4">
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-2">
                        {repo.desc}
                      </p>
                      <span className="text-[11px] font-medium text-primary/70 bg-primary/5 rounded-full px-2 py-0.5">
                        {repo.lang}
                      </span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Market Context */}
          {a.marketContext && (
            <Card className="bg-card border-border">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
                    <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  Market Context
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5">
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {a.marketContext}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
