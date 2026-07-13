import { useState } from "react";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import {
  PlusCircle,
  Search,
  GitCompare,
  Activity,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  BarChart2,
  TrendingUp,
  Grid3X3,
  List,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";
import {
  useListIdeas,
  useDeleteIdea,
  getListIdeasQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useGetMe } from "@workspace/api-client-react";
import { getUserInitials } from "@/lib/user";

/* ======================= Status Badge ======================= */
function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "analyzed":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
          <CheckCircle2 className="w-3 h-3" />
          Complete
        </span>
      );
    case "processing":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
          <Activity className="w-3 h-3 animate-pulse" />
          Processing
        </span>
      );
    case "pending":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20">
          <Clock className="w-3 h-3" />
          Pending
        </span>
      );
    case "failed":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/20">
          <AlertCircle className="w-3 h-3" />
          Failed
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border">
          {status}
        </span>
      );
  }
}

/* ======================= Score Color ======================= */
function scoreColor(score: number) {
  if (score >= 80) return "text-emerald-500";
  if (score >= 60) return "text-primary";
  if (score >= 40) return "text-amber-500";
  return "text-destructive";
}

function scoreAccent(score: number) {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-primary";
  if (score >= 40) return "bg-amber-500";
  return "bg-destructive";
}

/* Domain color badge */
const domainColors: Record<string, string> = {
  healthtech: "bg-primary/10 text-primary",
  fintech: "bg-emerald-500/10 text-emerald-600",
  edtech: "bg-amber-500/10 text-amber-600",
  logistics: "bg-purple-500/10 text-purple-600",
  saas: "bg-cyan-500/10 text-cyan-600",
};
function domainColor(domain: string) {
  const key = domain.toLowerCase().replace(/[\s-]/g, "");
  return domainColors[key] || "bg-muted text-muted-foreground";
}

/* ======================= Dashboard ======================= */
export function Dashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const { data: user } = useGetMe();
  const { data: ideas, isLoading } = useListIdeas();
  const deleteMutation = useDeleteIdea();

  const firstName = user?.name?.split(" ")[0] || "there";
  const userInitials = getUserInitials(user?.name);

  const filteredIdeas =
    ideas?.filter(
      (idea) =>
        idea.title.toLowerCase().includes(search.toLowerCase()) ||
        idea.domain.toLowerCase().includes(search.toLowerCase()),
    ) || [];

  /* ---- Stats ---- */
  const totalIdeas = ideas?.length ?? 0;
  const analyzedIdeas =
    ideas?.filter((i) => i.status === "analyzed").length ?? 0;
  const pendingIdeas =
    ideas?.filter((i) => i.status === "pending" || i.status === "processing")
      .length ?? 0;
  const scores =
    ideas
      ?.filter((i) => i.analysis?.overallScore != null)
      .map((i) => i.analysis!.overallScore!) ?? [];
  const avgScore =
    scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

  const handleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleCompare = () => {
    if (selectedIds.length < 2) {
      toast({
        title: "Select at least 2 ideas to compare",
        variant: "destructive",
      });
      return;
    }
    setLocation(`/compare?ids=${selectedIds.join(",")}`);
  };

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this idea?")) {
      deleteMutation.mutate(
        { id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListIdeasQueryKey() });
            toast({ title: "Idea deleted" });
            setSelectedIds((prev) => prev.filter((x) => x !== id));
          },
        },
      );
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ======================================================
          HERO SECTION — matches Stitch "Welcome back" section
          ====================================================== */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex items-start gap-4">
          <Avatar className="h-14 w-14 ring-2 ring-primary/15">
            <AvatarImage
              src={user?.avatarUrl || undefined}
              alt={user?.name || "User avatar"}
            />
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              Welcome back, {firstName}
            </h2>
            <p className="text-muted-foreground mt-1.5">
              {totalIdeas > 0
                ? `You have ${totalIdeas} idea${totalIdeas !== 1 ? "s" : ""} maturing.${analyzedIdeas > 0 ? ` AI has analyzed ${analyzedIdeas}.` : ""}`
                : "Submit your first idea and let AI validate it."}
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {selectedIds.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCompare}
              data-testid="button-compare-selected"
              className="gap-2"
            >
              <GitCompare className="w-4 h-4" />
              Compare ({selectedIds.length})
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => setLocation("/submit")}
            data-testid="button-new-idea"
            className="gap-2 px-5 py-2.5 font-bold shadow-lg"
          >
            <PlusCircle className="w-4 h-4" />+ New Idea
          </Button>
        </div>
      </div>

      {/* ======================================================
          BENTO GRID STATS — matches Stitch stat cards
          ====================================================== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Market Sentiment / AI Score — wide card */}
        <div className="col-span-2 bg-card border border-border rounded-xl shadow-sm p-5 flex items-center justify-between overflow-hidden relative group">
          <div className="relative z-10">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              AI Score Average
            </h4>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-foreground tabular-nums">
                {isLoading ? "—" : avgScore > 0 ? `${avgScore}` : "—"}
              </span>
              {avgScore > 0 && (
                <span className="text-muted-foreground text-sm font-medium">
                  /100
                </span>
              )}
              {avgScore >= 70 && (
                <span className="text-emerald-500 font-semibold text-sm flex items-center gap-0.5">
                  <TrendingUp className="w-3.5 h-3.5" /> Strong
                </span>
              )}
            </div>
          </div>
          <div className="absolute -right-4 top-0 h-full w-48 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
            <BarChart2 className="w-36 h-36 text-primary mt-4" />
          </div>
        </div>

        {/* Total Ideas */}
        <div className="bg-card border border-border rounded-xl shadow-sm p-5">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Saved Ideas
          </h4>
          {isLoading ? (
            <Skeleton className="h-9 w-14" />
          ) : (
            <span className="text-3xl font-black text-foreground tabular-nums">
              {totalIdeas}
            </span>
          )}
        </div>

        {/* Analyzed */}
        <div className="bg-card border border-border rounded-xl shadow-sm p-5">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Analyzed
          </h4>
          {isLoading ? (
            <Skeleton className="h-9 w-14" />
          ) : (
            <span className="text-3xl font-black text-emerald-500 tabular-nums">
              {analyzedIdeas}
            </span>
          )}
        </div>
      </div>

      {/* ======================================================
          RECENT CONCEPTS SECTION — matches Stitch "Recent Concepts"
          ====================================================== */}
      <div>
        {/* Section Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xl font-bold text-foreground">Recent Concepts</h3>
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search ideas..."
                className="pl-8 bg-card border-border h-8 w-52 text-xs focus-visible:ring-primary/30 focus-visible:border-primary"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {/* View toggle */}
            <div className="flex items-center gap-1 border border-border rounded-lg p-1 bg-card">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === "grid"
                    ? "bg-primary text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Grid3X3 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === "list"
                    ? "bg-primary text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile search */}
        <div className="sm:hidden mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search by title or domain..."
              className="pl-9 bg-card border-border focus-visible:ring-primary/30 focus-visible:border-primary"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Skeleton */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="bg-card border-border">
                <CardHeader className="pb-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-3 w-1/3 mt-1" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredIdeas.length === 0 ? (
          /* Empty State */
          <div className="text-center py-20 bg-card rounded-xl border border-dashed border-border">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-muted mb-4">
              <Sparkles className="w-7 h-7 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold mb-2">
              {search ? "No matching ideas" : "No ideas yet"}
            </h2>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto mb-6">
              {search
                ? "Try a different search term."
                : "Submit your first startup idea for AI analysis."}
            </p>
            {!search && (
              <Button
                size="sm"
                onClick={() => setLocation("/submit")}
                className="gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                Submit Your First Idea
              </Button>
            )}
          </div>
        ) : viewMode === "grid" ? (
          /* Grid View — Stitch card design */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredIdeas.map((idea) => {
              const score = idea.analysis?.overallScore;
              const isSelected = selectedIds.includes(idea.id);
              return (
                <div
                  key={idea.id}
                  className={`bg-card rounded-xl border shadow-sm hover:shadow-lg transition-all duration-200 flex flex-col group overflow-hidden relative ${
                    isSelected
                      ? "border-primary/50 ring-2 ring-primary/20"
                      : "border-border hover:border-primary/30"
                  }`}
                  data-testid={`card-idea-${idea.id}`}
                >
                  {/* Score accent line */}
                  {score != null && (
                    <div className={`h-0.5 w-full ${scoreAccent(score)}`} />
                  )}

                  {/* Select checkbox */}
                  <div className="absolute top-3.5 left-3.5 z-10">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleSelect(idea.id)}
                      className="bg-background/90 backdrop-blur border-border"
                      data-testid={`checkbox-select-${idea.id}`}
                    />
                  </div>

                  <Link
                    href={`/ideas/${idea.id}`}
                    className="flex-1 flex flex-col"
                  >
                    <div className="p-5 pl-10 flex-1">
                      {/* Domain badge + score */}
                      <div className="flex justify-between items-start mb-3">
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${domainColor(idea.domain)}`}
                        >
                          {idea.domain}
                        </span>
                        {score != null && (
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black border-2 border-white shadow-sm bg-card ${scoreColor(score)}`}
                          >
                            {score}
                          </div>
                        )}
                      </div>

                      {/* Title */}
                      <h4 className="font-bold text-lg text-foreground mb-2 group-hover:text-primary transition-colors leading-snug">
                        {idea.title}
                      </h4>

                      {/* Description */}
                      <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                        {idea.description}
                      </p>

                      {/* Tags */}
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <StatusBadge status={idea.status} />
                        {idea.analysis?.techStack
                          ?.slice(0, 1)
                          .map((tech: string) => (
                            <span
                              key={tech}
                              className="bg-muted text-muted-foreground text-[11px] font-medium px-2 py-0.5 rounded border border-border"
                            >
                              {tech}
                            </span>
                          ))}
                      </div>
                    </div>

                    {/* Card footer */}
                    <div className="px-5 py-3 border-t border-border flex items-center justify-between bg-muted/20">
                      <span className="text-primary text-sm font-bold hover:underline flex items-center gap-1">
                        View Details
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </span>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleSelect(idea.id);
                        }}
                        className="p-1.5 hover:bg-card rounded-lg text-muted-foreground hover:text-primary transition-all"
                        title="Add to compare"
                      >
                        <GitCompare className="w-4 h-4" />
                      </button>
                    </div>
                  </Link>

                  {/* Delete on hover */}
                  <button
                    onClick={(e) => handleDelete(idea.id, e)}
                    className="absolute top-3.5 right-3.5 p-1 rounded-lg opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all z-10"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          /* List View */
          <div className="space-y-2">
            {filteredIdeas.map((idea) => {
              const score = idea.analysis?.overallScore;
              const isSelected = selectedIds.includes(idea.id);
              return (
                <div
                  key={idea.id}
                  className={`bg-card rounded-xl border shadow-sm hover:shadow-md transition-all flex items-center gap-4 p-4 group ${
                    isSelected
                      ? "border-primary/50 ring-1 ring-primary/20"
                      : "border-border hover:border-primary/30"
                  }`}
                  data-testid={`card-idea-${idea.id}`}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => handleSelect(idea.id)}
                    className="shrink-0"
                    data-testid={`checkbox-select-${idea.id}`}
                  />
                  <Link
                    href={`/ideas/${idea.id}`}
                    className="flex-1 min-w-0 flex items-center gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase ${domainColor(idea.domain)}`}
                        >
                          {idea.domain}
                        </span>
                        <StatusBadge status={idea.status} />
                      </div>
                      <p className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                        {idea.title}
                      </p>
                    </div>
                    {score != null && (
                      <div
                        className={`shrink-0 text-xl font-black tabular-nums ${scoreColor(score)}`}
                      >
                        {score}
                        <span className="text-xs text-muted-foreground font-normal">
                          /100
                        </span>
                      </div>
                    )}
                    <span className="shrink-0 text-xs text-muted-foreground hidden md:block">
                      {format(new Date(idea.createdAt), "MMM d")}
                    </span>
                  </Link>
                  <button
                    onClick={(e) => handleDelete(idea.id, e)}
                    className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all shrink-0"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ======================================================
          AI INSIGHTS BANNER — matches Stitch dark glassmorphism banner
          ====================================================== */}
      {!isLoading && (
        <div
          className="rounded-2xl p-6 md:p-8 relative overflow-hidden text-white"
          style={{
            background:
              "linear-gradient(135deg, #0D0C22 0%, #1a1448 60%, #0d1835 100%)",
          }}
        >
          {/* Background gradient overlay */}
          <div className="absolute inset-0 bg-linear-to-br from-primary/25 to-transparent pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Text content */}
            <div className="flex-1">
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border mb-4"
                style={{
                  backgroundColor: "rgba(87,223,254,0.15)",
                  borderColor: "rgba(87,223,254,0.3)",
                  color: "#57dffe",
                }}
              >
                <Sparkles className="w-3 h-3" />
                AI INSIGHT
              </span>
              <h3 className="text-xl md:text-2xl font-bold mb-3">
                Market Shift Detected: Generative Design
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed max-w-lg mb-5">
                We noticed a 40% uptick in patents related to generative
                manufacturing. This directly correlates with ideas in your
                portfolio. Would you like to update your market analysis?
              </p>
              <div className="flex gap-3">
                <Button
                  size="sm"
                  className="bg-white text-slate-900 hover:bg-slate-100 font-bold gap-1.5 active:scale-95"
                  onClick={() => setLocation("/insights")}
                >
                  View All Insights
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10 font-semibold"
                  onClick={() => setLocation("/insights")}
                >
                  Analyze Correlation
                </Button>
              </div>
            </div>

            {/* Icon visual */}
            <div className="shrink-0 flex justify-center">
              <div className="relative w-32 h-32 md:w-40 md:h-40">
                <div
                  className="absolute inset-0 rounded-full blur-2xl"
                  style={{ backgroundColor: "rgba(87,223,254,0.15)" }}
                />
                <div
                  className="relative w-full h-full rounded-full border flex items-center justify-center"
                  style={{
                    borderColor: "rgba(255,255,255,0.15)",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  <Sparkles
                    className="w-16 h-16 md:w-20 md:h-20"
                    style={{ color: "#57dffe" }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
