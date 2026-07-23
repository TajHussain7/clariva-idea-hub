import { useState } from "react";
import { Link } from "wouter";
import {
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  Lightbulb,
  Activity,
  CheckCircle2,
  ChevronRight,
  Star,
  Code2,
  FileDown,
  Wand2,
  Loader2,
  ArrowRight,
  Globe,
  Sparkles,
  XCircle,
  GitBranch,
  ExternalLink,
  TrendingDown,
  Zap,
  FileText,
  BarChart2,
  Target,
  ClipboardList,
  Users,
  AlertCircle,
  ShieldAlert,
  Database,
  Calendar,
  GitPullRequest,
  Info,
  Newspaper,
  Package,
  Search,
  MessageSquare,
  Radio,
  CheckCircle,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  usePivotSuggestions,
  type PivotSuggestion,
} from "@/hooks/use-pivot-suggestions";

type InsightTab =
  | "strengths"
  | "weaknesses"
  | "risks"
  | "suggestions"
  | "techStack";

/* ======================= SVG Radar Chart ======================= */
function RadarChart({
  scores,
}: {
  scores: { label: string; value: number }[];
}) {
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const r = 72;
  const n = scores.length;
  const angles = scores.map((_, i) => (2 * Math.PI * i) / n - Math.PI / 2);
  const gridLevels = [0.25, 0.5, 0.75, 1.0];

  const pointAt = (angle: number, fraction: number) => ({
    x: cx + r * fraction * Math.cos(angle),
    y: cy + r * fraction * Math.sin(angle),
  });

  const dataPoints = scores.map((s, i) =>
    pointAt(angles[i], Math.min((s.value || 0) / 100, 1)),
  );
  const dataPath =
    dataPoints
      .map(
        (p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`,
      )
      .join(" ") + " Z";

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label="Market viability radar chart">
      {gridLevels.map((f, gi) => {
        const pts = angles.map((a) => pointAt(a, f));
        const d =
          pts
            .map(
              (p, i) =>
                `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`,
            )
            .join(" ") + " Z";
        return (
          <path
            key={gi}
            d={d}
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.1"
            strokeWidth="1"
          />
        );
      })}
      {angles.map((a, i) => {
        const end = pointAt(a, 1);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={end.x.toFixed(1)}
            y2={end.y.toFixed(1)}
            stroke="currentColor"
            strokeOpacity="0.1"
            strokeWidth="1"
          />
        );
      })}
      <path
        d={dataPath}
        fill="rgba(99,102,241,0.25)"
        stroke="rgb(99,102,241)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {dataPoints.map((p, i) => (
        <circle
          key={i}
          cx={p.x.toFixed(1)}
          cy={p.y.toFixed(1)}
          r="4"
          fill="rgb(99,102,241)"
        />
      ))}
      {scores.map((s, i) => {
        const lp = pointAt(angles[i], 1.22);
        return (
          <text
            key={i}
            x={lp.x.toFixed(1)}
            y={lp.y.toFixed(1)}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="9"
            fontWeight="600"
            fill="currentColor"
            fillOpacity="0.6"
            style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}
          >
            {s.label.slice(0, 3).toUpperCase()}
          </text>
        );
      })}
    </svg>
  );
}

/* ======================= Score helpers ======================= */
function scoreColor(score: number) {
  if (score >= 80) return "text-emerald-500";
  if (score >= 60) return "text-primary";
  if (score >= 40) return "text-amber-500";
  return "text-destructive";
}

/* ======================= Markdown Renderer ======================= */

// Maps emoji prefixes in section headings to Lucide icon components
const SECTION_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  "🧠": FileText,
  "📊": BarChart2,
  "⚔️": GitBranch,
  "✅": CheckCircle2,
  "🚨": ShieldAlert,
  "💡": Lightbulb,
  "🎯": Target,
  "📋": ClipboardList,
};

function stripLeadingEmoji(text: string): { icon: React.ComponentType<{ className?: string }> | null; clean: string } {
  for (const [emoji, Icon] of Object.entries(SECTION_ICON_MAP)) {
    if (text.startsWith(emoji)) {
      return { icon: Icon, clean: text.slice(emoji.length).trim() };
    }
  }
  // Generic emoji strip (any leading emoji char)
  const cleaned = text.replace(/^[\p{Emoji}]+\s*/u, "");
  return { icon: null, clean: cleaned || text };
}

function parseInline(text: string): React.ReactNode[] {
  // Order matters: handle **[text](url)** first, then **bold**, *italic*, [link](url)
  const parts = text.split(
    /(\*\*\[[^\]]+\]\([^)]+\)\*\*|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g,
  );
  return parts.map((part, i) => {
    // **[text](url)** — bold link
    const boldLinkMatch = part.match(/^\*\*\[([^\]]+)\]\(([^)]+)\)\*\*$/);
    if (boldLinkMatch) {
      return (
        <a
          key={i}
          href={boldLinkMatch[2]}
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-primary hover:underline inline-flex items-center gap-0.5"
        >
          {boldLinkMatch[1]}
          <ExternalLink className="w-3 h-3 opacity-60" />
        </a>
      );
    }
    // **bold**
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    // *italic*
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return (
        <em key={i} className="italic text-muted-foreground">
          {part.slice(1, -1)}
        </em>
      );
    }
    // [text](url)
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <a
          key={i}
          href={linkMatch[2]}
          target="_blank"
          rel="noreferrer"
          className="text-primary hover:underline inline-flex items-center gap-0.5 font-medium"
        >
          {linkMatch[1]}
          <ExternalLink className="w-3 h-3 opacity-60" />
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function MarkdownReport({ content }: { content: string }) {
  if (!content || content.trim().length < 20) return null;

  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let listBuffer: React.ReactNode[] = [];
  let keyIdx = 0;

  const key = () => `md-${keyIdx++}`;

  const flushList = () => {
    if (listBuffer.length === 0) return;
    elements.push(
      <ul key={key()} className="space-y-2 my-2 pl-1">
        {listBuffer}
      </ul>,
    );
    listBuffer = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trimEnd();

    // H3 section header — strip emoji, use icon
    if (line.startsWith("### ")) {
      flushList();
      const rawText = line.slice(4).trim();
      const { icon: SectionIcon, clean } = stripLeadingEmoji(rawText);
      elements.push(
        <div key={key()} className="mt-7 mb-3 first:mt-0">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2 pb-2.5 border-b border-border">
            {SectionIcon && (
              <span className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center shrink-0">
                <SectionIcon className="w-3 h-3 text-primary" />
              </span>
            )}
            {clean}
          </h3>
        </div>,
      );
      continue;
    }

    // H4 sub-header
    if (line.startsWith("#### ")) {
      flushList();
      elements.push(
        <h4
          key={key()}
          className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-3 mb-1"
        >
          {line.slice(5).trim()}
        </h4>,
      );
      continue;
    }

    // Verdict lines — replace emoji with Lucide icons
    const isGo = line.includes("🟢") || line.toUpperCase().includes("GO — BUILD");
    const isConditional = line.includes("🟡") || line.toUpperCase().includes("CONDITIONAL GO");
    const isNoGo = line.includes("🔴") || line.toUpperCase().includes("DO NOT GO");
    if (isGo || isConditional || isNoGo) {
      flushList();
      const bg = isGo
        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
        : isConditional
          ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400"
          : "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400";
      const VerdictIcon = isGo ? CheckCircle : isConditional ? AlertCircle : XCircle;
      const cleaned = line
        .replace(/🟢|🟡|🔴/g, "")
        .replace(/\*\*/g, "")
        .trim();
      elements.push(
        <div
          key={key()}
          className={`rounded-lg border px-4 py-3 font-semibold text-sm mt-2 flex items-center gap-2.5 ${bg}`}
        >
          <VerdictIcon className="w-4 h-4 shrink-0" />
          {cleaned}
        </div>,
      );
      continue;
    }

    // Idea–Market Fit Score line
    if (/\*\*Score:\s*\d+\/10\*\*/.test(line)) {
      flushList();
      const scoreMatch = line.match(/Score:\s*(\d+)\/10/);
      const score = scoreMatch ? parseInt(scoreMatch[1]) : null;
      const sColor =
        score !== null
          ? score >= 7
            ? "text-emerald-500"
            : score >= 5
              ? "text-amber-500"
              : "text-destructive"
          : "text-foreground";
      elements.push(
        <div
          key={key()}
          className="flex items-center gap-4 my-3 p-3.5 rounded-xl bg-muted/50 border border-border"
        >
          <Target className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Idea–Market Fit
          </span>
          <span className={`text-3xl font-black tabular-nums ${sColor}`}>
            {score}
            <span className="text-base font-normal text-muted-foreground">
              /10
            </span>
          </span>
        </div>,
      );
      continue;
    }

    // List items (- or * or numbered)
    if (/^[\*\-]\s+/.test(line) || /^\d+\.\s+/.test(line)) {
      const text = line.replace(/^[\*\-]\s+/, "").replace(/^\d+\.\s+/, "");
      listBuffer.push(
        <li
          key={key()}
          className="flex items-start gap-2 text-sm text-muted-foreground leading-relaxed"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 shrink-0 mt-[7px]" />
          <span className="min-w-0">{parseInline(text)}</span>
        </li>,
      );
      continue;
    }

    // Empty line
    if (!line.trim()) {
      flushList();
      continue;
    }

    // Regular paragraph
    flushList();
    elements.push(
      <p key={key()} className="text-sm text-muted-foreground leading-relaxed">
        {parseInline(line)}
      </p>,
    );
  }

  flushList();
  return <div className="space-y-1">{elements}</div>;
}

/* ======================= Repo Card ======================= */
function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days < 1) return "today";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}yr ago`;
}

function RepoCard({ repo }: { repo: any }) {
  const [gapOpen, setGapOpen] = useState(false);
  const pushedLabel = repo.lastPushedAt ? timeAgo(repo.lastPushedAt) : null;

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between gap-2 mb-1">
        <a
          href={repo.url}
          target="_blank"
          rel="noreferrer"
          className="text-sm font-semibold text-primary hover:underline truncate flex items-center gap-1"
        >
          {repo.org}/{repo.name}
          <ExternalLink className="w-3 h-3 shrink-0 opacity-60" />
        </a>
        <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground shrink-0">
          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
          {repo.stars >= 1000
            ? (repo.stars / 1000).toFixed(1) + "k"
            : repo.stars}
        </span>
      </div>
      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-1.5">
        {repo.desc}
      </p>
      {/* Metadata row */}
      <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
        <span className="text-[11px] font-medium text-primary/70 bg-primary/5 rounded-full px-2 py-0.5">
          {repo.lang}
        </span>
        {pushedLabel && (
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-muted rounded-full px-2 py-0.5">
            <Calendar className="w-2.5 h-2.5" />
            {pushedLabel}
          </span>
        )}
        {repo.contributorCount != null && (
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-muted rounded-full px-2 py-0.5">
            <Users className="w-2.5 h-2.5" />
            {repo.contributorCount >= 1000
              ? (repo.contributorCount / 1000).toFixed(1) + "k"
              : repo.contributorCount}{" "}
            contributors
          </span>
        )}
        {repo.openIssuesCount != null && (
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-muted rounded-full px-2 py-0.5">
            <GitPullRequest className="w-2.5 h-2.5" />
            {repo.openIssuesCount} issues
          </span>
        )}
        {repo.gapAnalysis && (
          <button
            onClick={() => setGapOpen((v) => !v)}
            className="text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded-full px-2 py-0.5 hover:bg-amber-500/20 transition-colors"
            aria-label={gapOpen ? "Hide gap analysis" : "Show gap analysis"}
          >
            {gapOpen ? "Hide gap" : "Gap analysis"}
          </button>
        )}
      </div>
      {gapOpen && repo.gapAnalysis && (
        <div className="mt-2.5 rounded-md border border-amber-500/20 bg-amber-500/5 p-3 space-y-2 animate-in fade-in duration-200">
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0 mt-0.5">
              <TrendingDown className="w-3 h-3 text-amber-500" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-0.5">
                What it lacks
              </p>
              <p className="text-xs text-foreground leading-relaxed">
                {repo.gapAnalysis.gap}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0 mt-0.5">
              <Zap className="w-3 h-3 text-emerald-500" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-0.5">
                Your opportunity
              </p>
              <p className="text-xs text-foreground leading-relaxed">
                {repo.gapAnalysis.opportunity}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ======================= Data Confidence Badge ======================= */
interface DataConfidence {
  score: number;
  sourcesWithData: string[];
  sourcesEmpty: string[];
  note: string;
}

function DataConfidenceBadge({ dc }: { dc: DataConfidence }) {
  const [open, setOpen] = useState(false);
  const color =
    dc.score >= 70
      ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
      : dc.score >= 40
        ? "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20"
        : "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20";

  return (
    <div className="relative inline-flex">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="View data confidence details"
        className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${color} cursor-pointer select-none`}
      >
        <Database className="w-3 h-3" />
        {dc.score}% data confidence
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-2 z-50 w-72 rounded-xl border border-border bg-popover shadow-xl p-3.5 space-y-3 animate-in fade-in duration-150">
          <p className="text-xs font-semibold text-foreground">
            Data sources used in this analysis
          </p>
          {dc.sourcesWithData.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1.5">
                Returned data ({dc.sourcesWithData.length})
              </p>
              <div className="flex flex-wrap gap-1">
                {dc.sourcesWithData.map((s) => (
                  <span
                    key={s}
                    className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
          {dc.sourcesEmpty.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                No data ({dc.sourcesEmpty.length})
              </p>
              <div className="flex flex-wrap gap-1">
                {dc.sourcesEmpty.map((s) => (
                  <span
                    key={s}
                    className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ======================= Source Signals Grid ======================= */
const SOURCE_META: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; label: string; color: string }
> = {
  Wikipedia: { icon: Globe, label: "Wikipedia", color: "text-blue-500" },
  DuckDuckGo: { icon: Search, label: "Web Search", color: "text-sky-500" },
  HackerNews: { icon: Radio, label: "Hacker News", color: "text-orange-500" },
  Reddit: { icon: MessageSquare, label: "Reddit", color: "text-rose-500" },
  npm: { icon: Package, label: "npm", color: "text-red-500" },
  BraveSearch: { icon: Search, label: "Brave Search", color: "text-orange-400" },
  NewsAPI: { icon: Newspaper, label: "News", color: "text-violet-500" },
  ProductHunt: { icon: Target, label: "Product Hunt", color: "text-amber-500" },
  SemanticScholar: { icon: FileText, label: "Research Papers", color: "text-indigo-500" },
  GitHub: { icon: GitBranch, label: "GitHub", color: "text-foreground" },
};

function SourceSignalsGrid({ marketContext }: { marketContext: string }) {
  if (!marketContext || marketContext === "No external market context found.")
    return null;

  // Parse pipe-separated segments
  const segments = marketContext.split(" | ").filter(Boolean);

  // Map each segment to a structured card
  const cards = segments.map((seg, i) => {
    // Try to match a known source prefix
    const matchedKey = Object.keys(SOURCE_META).find((k) =>
      seg.toLowerCase().startsWith(k.toLowerCase()),
    );
    const meta = matchedKey ? SOURCE_META[matchedKey] : null;
    const Icon = meta?.icon ?? Info;
    const label = meta?.label ?? "Source";
    const color = meta?.color ?? "text-muted-foreground";

    // Extract the value part after the colon
    const colonIdx = seg.indexOf(":");
    const value = colonIdx >= 0 ? seg.slice(colonIdx + 1).trim() : seg;

    return (
      <div
        key={i}
        className="rounded-lg border border-border bg-muted/30 p-3 flex items-start gap-2.5"
      >
        <div className={`shrink-0 mt-0.5 ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
            {label}
          </p>
          <p className="text-xs text-foreground leading-relaxed line-clamp-2">
            {value}
          </p>
        </div>
      </div>
    );
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
      {cards}
    </div>
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

      {isSuccess && data && data.pivots.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in slide-in-from-bottom-4 duration-500 fade-in">
          {data.pivots.map((pivot: PivotSuggestion, i: number) => (
            <Card
              key={i}
              className="bg-card border-border hover:border-primary/30 flex flex-col transition-colors"
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

/* ======================= All Repos Dialog ======================= */
function AllReposDialog({
  open,
  onOpenChange,
  repos,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  repos: any[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <GitBranch className="w-4 h-4 text-muted-foreground" />
            All Competitive Repositories
            <span className="ml-auto text-xs font-normal text-muted-foreground px-2 py-0.5 rounded-full bg-muted border border-border">
              {repos.length} repo{repos.length !== 1 ? "s" : ""}
            </span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-1">
          {repos.map((repo: any, i: number) => (
            <RepoCard key={i} repo={repo} />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ======================= Results Page ======================= */
export function Results({ id }: { id: number }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const analyzeMutation = useAnalyzeIdea();
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [insightTab, setInsightTab] = useState<InsightTab>("strengths");
  const [showAllRepos, setShowAllRepos] = useState(false);

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
    } catch {
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
        <Skeleton className="h-96 w-full" />
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
  const dc = (a as any)?.dataConfidence as DataConfidence | null | undefined;

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
          <div className="flex items-center gap-2 flex-wrap mb-2">
            {isAnalyzed && (
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-primary/10 text-primary border border-primary/20">
                Analysis Complete
              </span>
            )}
            {isAnalyzed && dc && <DataConfidenceBadge dc={dc} />}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {idea.title}
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-2xl mt-1">
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
          {/* ---- AI Pivot Suggestions (only for low scores) ---- */}
          <PivotSuggestionsPanel
            ideaId={id}
            feasibilityScore={a.feasibilityScore}
            uniquenessScore={a.uniquenessScore}
          />

          {/* ---- Score Overview: Radar + Score Boxes ---- */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Market Viability Radar */}
            <Card className="bg-card border-border shadow-sm">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-muted-foreground" />
                  Market Viability
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5 flex flex-col items-center gap-5">
                <div className="text-foreground">
                  <RadarChart
                    scores={[
                      { label: "Innovation", value: a.innovationScore ?? 0 },
                      { label: "Impact", value: a.impactScore ?? 0 },
                      { label: "Feasibility", value: a.feasibilityScore ?? 0 },
                      { label: "Uniqueness", value: a.uniquenessScore ?? 0 },
                    ]}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 w-full">
                  <div className="rounded-lg bg-muted/50 border border-border p-3">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Overall Score
                    </p>
                    <p
                      className={`text-2xl font-black tabular-nums mt-0.5 ${scoreColor(a.overallScore ?? 0)}`}
                    >
                      {((a.overallScore ?? 0) / 10).toFixed(1)}
                      <span className="text-sm font-normal text-muted-foreground">
                        /10
                      </span>
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/50 border border-border p-3">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Confidence
                    </p>
                    <p
                      className={`text-2xl font-black mt-0.5 ${
                        (a.overallScore ?? 0) >= 70
                          ? "text-emerald-500"
                          : (a.overallScore ?? 0) >= 50
                            ? "text-amber-500"
                            : "text-destructive"
                      }`}
                    >
                      {(a.overallScore ?? 0) >= 70
                        ? "High"
                        : (a.overallScore ?? 0) >= 50
                          ? "Medium"
                          : "Low"}
                    </p>
                  </div>
                </div>
                {/* Score breakdown */}
                <div className="grid grid-cols-2 gap-2 w-full">
                  {[
                    { label: "Uniqueness", val: a.uniquenessScore },
                    { label: "Feasibility", val: a.feasibilityScore },
                    { label: "Impact", val: a.impactScore },
                    { label: "Innovation", val: a.innovationScore },
                  ].map(({ label, val }) => (
                    <div key={label} className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground font-medium">
                          {label}
                        </span>
                        <span className={`font-bold ${scoreColor(val ?? 0)}`}>
                          {val ?? 0}
                        </span>
                      </div>
                      <Progress value={val ?? 0} className="h-1" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Competitive Repositories */}
            <Card className="bg-card border-border shadow-sm">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-muted-foreground" />
                  Competitive Repositories
                  {a.githubRepos && a.githubRepos.length > 3 && (
                    <button
                      onClick={() => setShowAllRepos(true)}
                      className="ml-auto text-xs font-medium text-primary hover:underline flex items-center gap-1"
                      aria-label={`View all ${a.githubRepos.length} repositories`}
                    >
                      View All ({a.githubRepos.length})
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {a.githubRepos && a.githubRepos.length > 0 ? (
                  a.githubRepos
                    .slice(0, 3)
                    .map((repo: any, i: number) => (
                      <RepoCard key={i} repo={repo} />
                    ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No competitive repositories found.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* All Repos Dialog */}
          {a.githubRepos && (
            <AllReposDialog
              open={showAllRepos}
              onOpenChange={setShowAllRepos}
              repos={a.githubRepos}
            />
          )}

          {/* ---- Full AI Analysis Report ---- */}
          {a.verdictSummary && a.verdictSummary.trim().length > 20 && (
            <Card className="bg-card border-border shadow-sm overflow-hidden">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="w-3.5 h-3.5 text-primary" />
                  </div>
                  AI Analysis Report
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                    Clariva Engine
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5 pb-6">
                <MarkdownReport content={a.verdictSummary} />
              </CardContent>
            </Card>
          )}

          {/* ---- Quick Insights Tabs ---- */}
          <Card className="bg-card border-border shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-sm font-semibold text-foreground">
                Quick Insights
              </CardTitle>
            </CardHeader>
            {/* Tab Bar */}
            <div className="flex border-b border-border overflow-x-auto">
              {[
                {
                  key: "strengths" as InsightTab,
                  label: "Strengths",
                  icon: CheckCircle2,
                  color: "text-emerald-500",
                  activeColor: "border-emerald-500",
                },
                {
                  key: "weaknesses" as InsightTab,
                  label: "Weaknesses",
                  icon: AlertTriangle,
                  color: "text-amber-500",
                  activeColor: "border-amber-500",
                },
                {
                  key: "risks" as InsightTab,
                  label: "Risks",
                  icon: XCircle,
                  color: "text-destructive",
                  activeColor: "border-destructive",
                },
                {
                  key: "suggestions" as InsightTab,
                  label: "Suggestions",
                  icon: Lightbulb,
                  color: "text-primary",
                  activeColor: "border-primary",
                },
                {
                  key: "techStack" as InsightTab,
                  label: "Tech Stack",
                  icon: Code2,
                  color: "text-purple-500",
                  activeColor: "border-purple-500",
                },
              ].map(({ key, label, icon: Icon, color, activeColor }) => (
                <button
                  key={key}
                  onClick={() => setInsightTab(key)}
                  aria-label={`Show ${label}`}
                  aria-selected={insightTab === key}
                  role="tab"
                  className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                    insightTab === key
                      ? `${color} ${activeColor} bg-muted/30`
                      : "text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/20"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="p-5 space-y-3">
              {insightTab !== "techStack" &&
                (() => {
                  const items: any[] =
                    insightTab === "strengths"
                      ? (a.strengths ?? [])
                      : insightTab === "weaknesses"
                        ? (a.weaknesses ?? [])
                        : insightTab === "risks"
                          ? (a.risks ?? [])
                          : (a.suggestions ?? []);
                  const IconMap = {
                    strengths: CheckCircle2,
                    weaknesses: AlertTriangle,
                    risks: XCircle,
                    suggestions: Lightbulb,
                  };
                  const Icon = IconMap[insightTab as keyof typeof IconMap];
                  const colorMap: Record<string, string> = {
                    strengths: "text-emerald-500",
                    weaknesses: "text-amber-500",
                    risks: "text-destructive",
                    suggestions: "text-primary",
                  };
                  return items.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {items.map((item: any, i: number) => (
                        <div
                          key={i}
                          className="flex gap-3 p-3 rounded-lg bg-muted/30 border border-border"
                        >
                          <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                            <Icon
                              className={`w-3 h-3 ${colorMap[insightTab]}`}
                            />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {item.title}
                            </p>
                            <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                              {item.desc}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No items available.
                    </p>
                  );
                })()}

              {insightTab === "techStack" && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {a.techStack && a.techStack.length > 0 ? (
                    a.techStack.map((tech: string, i: number) => (
                      <span
                        key={i}
                        className="px-3 py-1.5 rounded-full text-xs font-medium bg-muted text-foreground border border-border"
                      >
                        {tech}
                      </span>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No tech stack recommendations available.
                    </p>
                  )}
                </div>
              )}
            </div>
          </Card>

          {/* ---- Market Intelligence ---- */}
          {a.marketContext && (
            <Card className="bg-card border-border">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
                    <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  Market Intelligence
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5">
                <SourceSignalsGrid marketContext={a.marketContext} />
              </CardContent>
            </Card>
          )}

          {/* ---- Bottom Action Bar ---- */}
          <div className="flex justify-end pt-2">
            <Button
              className="gap-2"
              onClick={handleReanalyze}
              disabled={analyzeMutation.isPending}
              style={{
                background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
              }}
            >
              <Sparkles className="w-4 h-4" />
              Improve Idea with AI
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
