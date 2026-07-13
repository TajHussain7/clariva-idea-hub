import { useState } from "react";
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  ArrowUpRight,
  RefreshCw,
  Bell,
  Filter,
  Zap,
  Globe,
  BarChart2,
  CheckCircle2,
  ChevronRight,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/* ======================= Types ======================= */
type FilterTab = "all" | "market" | "tech" | "risks" | "opportunities";

interface InsightCard {
  id: number;
  type: "market" | "tech" | "risks" | "opportunities";
  badge: string;
  badgeColor: string;
  title: string;
  body: string;
  metric?: string;
  metricLabel?: string;
  metricTrend?: "up" | "down";
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  timeAgo: string;
  actions?: string[];
  relatedIdea?: string;
}

/* ======================= Mock Insights Data ======================= */
const insights: InsightCard[] = [
  {
    id: 1,
    type: "market",
    badge: "Market Shift",
    badgeColor: "bg-cyan-400/20 text-cyan-400 border-cyan-400/30",
    title: "Generative Design Patent Surge Detected",
    body: "A 40% uptick in patents related to generative manufacturing was detected in the last 30 days. This directly correlates with your \"Zero-Waste Mesh\" and \"Cognitive Tutor VR\" ideas. Market entrants are accelerating — consider updating your competitive analysis.",
    metric: "+40%",
    metricLabel: "Patent filings",
    metricTrend: "up",
    icon: TrendingUp,
    iconBg: "bg-cyan-400/10",
    iconColor: "text-cyan-400",
    timeAgo: "2 hours ago",
    actions: ["Analyze Correlation", "Update Ideas"],
    relatedIdea: "Zero-Waste Mesh",
  },
  {
    id: 2,
    type: "tech",
    badge: "Tech Trend",
    badgeColor: "bg-primary/10 text-primary border-primary/20",
    title: "WebGPU Adoption Accelerating in EdTech",
    body: "Browser-based GPU compute is now supported in 78% of global devices. Your \"Cognitive Tutor VR\" idea could pivot from native VR to in-browser delivery, dramatically reducing go-to-market friction and hardware requirements.",
    metric: "78%",
    metricLabel: "Device support",
    metricTrend: "up",
    icon: Zap,
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    timeAgo: "5 hours ago",
    actions: ["View Tech Report", "Reassess Feasibility"],
    relatedIdea: "Cognitive Tutor VR",
  },
  {
    id: 3,
    type: "risks",
    badge: "Risk Alert",
    badgeColor: "bg-red-500/10 text-red-400 border-red-500/20",
    title: "Regulatory Headwinds: Medical AI in EU",
    body: "The EU AI Act's high-risk classification now includes AI diagnostic tools. Your \"AI Diagnostics Hub\" concept faces new compliance requirements including mandatory human-oversight protocols and audit trail obligations before deployment.",
    metric: "High",
    metricLabel: "Risk level",
    icon: AlertTriangle,
    iconBg: "bg-red-500/10",
    iconColor: "text-red-400",
    timeAgo: "1 day ago",
    actions: ["Review Compliance", "Adjust Strategy"],
    relatedIdea: "AI Diagnostics Hub",
  },
  {
    id: 4,
    type: "opportunities",
    badge: "Opportunity",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    title: "Gig Economy Regulation Opens FinTech Window",
    body: "New US labor rulings classifying platform workers as employees create a 12-month window for financial products targeting this demographic. Your \"Micro-Equity Wallet\" is positioned to capture early market share before incumbents adjust.",
    metric: "$4.2B",
    metricLabel: "Addressable market",
    metricTrend: "up",
    icon: Lightbulb,
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-400",
    timeAgo: "2 days ago",
    actions: ["Explore Market", "Update Pitch"],
    relatedIdea: "Micro-Equity Wallet",
  },
  {
    id: 5,
    type: "market",
    badge: "Market Shift",
    badgeColor: "bg-cyan-400/20 text-cyan-400 border-cyan-400/30",
    title: "Healthcare Data Monetization Platforms Consolidating",
    body: "Three major acquisitions in the medical data space occurred this quarter. Consolidation typically signals either market maturity or a race for a dominant protocol. Your \"AI Diagnostics Hub\" may benefit from positioning as a neutral aggregator rather than a competitor.",
    metric: "3",
    metricLabel: "Major acquisitions",
    icon: Globe,
    iconBg: "bg-cyan-400/10",
    iconColor: "text-cyan-400",
    timeAgo: "3 days ago",
    actions: ["Analyze Landscape"],
    relatedIdea: "AI Diagnostics Hub",
  },
  {
    id: 6,
    type: "opportunities",
    badge: "Opportunity",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    title: "Open-Source LLM Models Reduce AI Costs 60%",
    body: "The latest generation of open-source language models (Llama 3.1, Mistral Large) achieve GPT-4 parity on reasoning tasks at a fraction of the cost. This directly improves the unit economics for any AI-first SaaS idea in your portfolio.",
    metric: "-60%",
    metricLabel: "AI inference cost",
    metricTrend: "down",
    icon: BarChart2,
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-400",
    timeAgo: "4 days ago",
    actions: ["Recalculate Economics"],
  },
];

const filterTabs: { key: FilterTab; label: string; icon: React.ElementType }[] = [
  { key: "all", label: "All Insights", icon: Sparkles },
  { key: "market", label: "Market Shifts", icon: TrendingUp },
  { key: "tech", label: "Tech Trends", icon: Zap },
  { key: "risks", label: "Risks", icon: AlertTriangle },
  { key: "opportunities", label: "Opportunities", icon: Lightbulb },
];

/* ======================= Stat Bar ======================= */
function StatPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col items-center px-5 py-3 bg-card border border-border rounded-xl">
      <span className={`text-2xl font-black tabular-nums ${color}`}>{value}</span>
      <span className="text-xs text-muted-foreground font-medium mt-0.5">{label}</span>
    </div>
  );
}

/* ======================= Insight Card ======================= */
function InsightCardComponent({ card }: { card: InsightCard }) {
  const Icon = card.icon;
  return (
    <Card className="bg-card border-border shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group">
      {/* Top accent bar */}
      <div
        className={`h-0.5 w-full ${
          card.type === "risks"
            ? "bg-red-500"
            : card.type === "opportunities"
            ? "bg-emerald-500"
            : card.type === "tech"
            ? "bg-primary"
            : "bg-cyan-400"
        }`}
      />

      <CardHeader className="pb-3 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${card.iconBg}`}>
              <Icon className={`w-4 h-4 ${card.iconColor}`} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${card.badgeColor}`}
                >
                  {card.badge}
                </span>
                {card.relatedIdea && (
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <ChevronRight className="w-3 h-3" />
                    {card.relatedIdea}
                  </span>
                )}
              </div>
              <CardTitle className="text-base font-semibold leading-snug group-hover:text-primary transition-colors">
                {card.title}
              </CardTitle>
            </div>
          </div>

          {card.metric && (
            <div className="shrink-0 text-right">
              <div
                className={`text-xl font-black tabular-nums ${
                  card.type === "risks"
                    ? "text-red-400"
                    : card.type === "opportunities"
                    ? "text-emerald-400"
                    : card.type === "tech"
                    ? "text-primary"
                    : "text-cyan-400"
                }`}
              >
                {card.metric}
              </div>
              <div className="text-[10px] text-muted-foreground">{card.metricLabel}</div>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">{card.body}</p>

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            {card.timeAgo}
          </div>
          <div className="flex items-center gap-2">
            {card.actions?.map((action, i) => (
              <Button
                key={i}
                size="sm"
                variant={i === 0 ? "default" : "outline"}
                className="h-7 text-xs px-3 gap-1"
              >
                {action}
                {i === 0 && <ArrowUpRight className="w-3 h-3" />}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ======================= AI Insights Feed Page ======================= */
export function Insights() {
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1500);
  };

  const filtered =
    activeFilter === "all" ? insights : insights.filter((i) => i.type === activeFilter);

  const counts = {
    all: insights.length,
    market: insights.filter((i) => i.type === "market").length,
    tech: insights.filter((i) => i.type === "tech").length,
    risks: insights.filter((i) => i.type === "risks").length,
    opportunities: insights.filter((i) => i.type === "opportunities").length,
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ---- Page Header ---- */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "rgba(87,223,254,0.15)" }}
            >
              <Sparkles className="w-4 h-4" style={{ color: "#57dffe" }} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">AI Insights Feed</h1>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            AI-generated market intelligence and proactive alerts for your ideas.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" className="gap-2">
            <Bell className="w-4 h-4" />
            Configure Alerts
          </Button>
        </div>
      </div>

      {/* ---- Stats Row ---- */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatPill label="Total Insights" value={String(insights.length)} color="text-foreground" />
        <StatPill
          label="Opportunities"
          value={String(counts.opportunities)}
          color="text-emerald-500"
        />
        <StatPill label="Risks Detected" value={String(counts.risks)} color="text-red-400" />
        <StatPill
          label="Market Shifts"
          value={String(counts.market)}
          color="text-cyan-400"
        />
      </div>

      {/* ---- AI Banner ---- */}
      <div
        className="rounded-2xl p-6 relative overflow-hidden text-white"
        style={{ background: "linear-gradient(135deg, #0D0C22 0%, #1a1448 60%, #0d1835 100%)" }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6">
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
              AI INTELLIGENCE ENGINE
            </span>
            <h3 className="text-xl font-bold mb-2">Your Ideas Are Being Monitored 24/7</h3>
            <p className="text-slate-300 text-sm leading-relaxed max-w-lg">
              Ideon's intelligence engine continuously scans market signals, patent filings,
              regulatory changes, and GitHub activity to surface insights relevant to your
              idea portfolio. New signals trigger proactive alerts.
            </p>
          </div>
          <div className="flex flex-col gap-3 shrink-0">
            {[
              { label: "Ideas monitored", value: "4" },
              { label: "Signals scanned/day", value: "12,400" },
              { label: "Last scan", value: "2 min ago" },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center justify-between gap-6">
                <span className="text-slate-400 text-xs">{stat.label}</span>
                <span className="text-white font-bold text-sm tabular-nums">{stat.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ---- Filter Tabs ---- */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
        <div className="flex items-center gap-1.5 flex-wrap">
          {filterTabs.map((tab) => {
            const TabIcon = tab.icon;
            const isActive = activeFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 border ${
                  isActive
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                }`}
              >
                <TabIcon className="w-3 h-3" />
                {tab.label}
                <span
                  className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive ? "bg-white/20" : "bg-muted"
                  }`}
                >
                  {counts[tab.key]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ---- Insights List ---- */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-xl border border-dashed border-border">
          <CheckCircle2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold mb-1">No insights in this category</h3>
          <p className="text-sm text-muted-foreground">Check back soon — the engine is scanning.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((card) => (
            <InsightCardComponent key={card.id} card={card} />
          ))}
        </div>
      )}
    </div>
  );
}
