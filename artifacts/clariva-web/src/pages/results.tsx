import { useState, useEffect } from "react";
import { Link } from "wouter";
import { 
  ArrowLeft, RefreshCw, AlertTriangle, Lightbulb, TrendingUp, ShieldAlert,
  Terminal, Activity, CheckCircle2, ChevronRight, Github
} from "lucide-react";
import { useGetIdea, useAnalyzeIdea, getGetIdeaQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

function ScoreBar({ label, score, colorClass }: { label: string, score: number | undefined | null, colorClass: string }) {
  if (score === undefined || score === null) return null;
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className={`font-mono font-bold ${colorClass}`}>{score}/100</span>
      </div>
      <Progress value={score} className="h-2" />
    </div>
  );
}

function InsightList({ items, icon: Icon, title, colorClass }: { items: any[] | undefined | null, icon: any, title: string, colorClass: string }) {
  if (!items || items.length === 0) return null;
  return (
    <Card className="bg-card border-border overflow-hidden h-full">
      <div className={`h-1 w-full ${colorClass.replace('text-', 'bg-')}`} />
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Icon className={`w-5 h-5 ${colorClass}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {items.map((item, i) => (
            <li key={i} className="space-y-1">
              <div className="font-medium text-foreground text-sm flex items-start gap-2">
                <span className={`mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 ${colorClass.replace('text-', 'bg-')}`} />
                {item.title}
              </div>
              <p className="text-sm text-muted-foreground pl-3.5 leading-relaxed">{item.desc}</p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function Results({ id }: { id: number }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const analyzeMutation = useAnalyzeIdea();

  const { data: idea, isLoading, isError } = useGetIdea(id, {
    query: {
      enabled: !!id,
      queryKey: getGetIdeaQueryKey(id),
      refetchInterval: (query) => {
        const status = query.state.data?.status;
        return (status === 'pending' || status === 'processing') ? 3000 : false;
      }
    }
  });

  const handleReanalyze = () => {
    analyzeMutation.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Analysis restarted" });
        queryClient.invalidateQueries({ queryKey: getGetIdeaQueryKey(id) });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (isError || !idea) {
    return (
      <div className="text-center py-20">
        <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
        <h2 className="text-2xl font-bold">Error loading idea</h2>
        <Button onClick={() => window.history.back()} className="mt-4" variant="outline">Go Back</Button>
      </div>
    );
  }

  const isProcessing = idea.status === 'pending' || idea.status === 'processing';
  const hasFailed = idea.status === 'failed';
  const a = idea.analysis;

  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-500">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Link href="/dashboard" className="hover:text-foreground transition-colors flex items-center">
          <ArrowLeft className="w-4 h-4 mr-1" /> Dashboard
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="truncate max-w-[200px]">{idea.title}</span>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{idea.title}</h1>
            <Badge variant="outline" className="font-mono bg-card">{idea.domain}</Badge>
          </div>
          <p className="text-muted-foreground max-w-3xl">{idea.description}</p>
        </div>
        
        {!isProcessing && (
          <Button 
            variant="outline" 
            onClick={handleReanalyze} 
            disabled={analyzeMutation.isPending}
            className="shrink-0"
            data-testid="button-reanalyze"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${analyzeMutation.isPending ? 'animate-spin' : ''}`} />
            Re-run Analysis
          </Button>
        )}
      </div>

      {isProcessing && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6 pb-6 flex flex-col items-center justify-center text-center space-y-4">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
              <Activity className="w-12 h-12 text-primary relative animate-pulse" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">Engine is processing...</h3>
              <p className="text-muted-foreground mt-2">Crawling repos, scanning market, evaluating feasibility.</p>
            </div>
            <div className="w-full max-w-md pt-4">
              <Progress value={idea.status === 'processing' ? 66 : 33} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {hasFailed && (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="pt-6 flex flex-col items-center text-center space-y-2">
            <AlertTriangle className="w-10 h-10 text-destructive" />
            <h3 className="text-xl font-bold text-foreground">Analysis Failed</h3>
            <p className="text-muted-foreground">The engine encountered an error processing this request.</p>
            <Button onClick={handleReanalyze} className="mt-4" variant="destructive">Try Again</Button>
          </CardContent>
        </Card>
      )}

      {idea.status === 'done' && a && (
        <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-700 fade-in">
          
          {/* Top Overview Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Scores Card */}
            <Card className="lg:col-span-1 bg-card border-border shadow-lg overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-bl-full -z-10" />
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-mono text-muted-foreground uppercase tracking-wider">Overall Verdict</CardTitle>
                <div className="flex items-end gap-2 mt-2">
                  <span className={`text-6xl font-black tracking-tighter ${
                    (a.overallScore || 0) >= 80 ? 'text-emerald-400' : 
                    (a.overallScore || 0) >= 60 ? 'text-primary' : 
                    (a.overallScore || 0) >= 40 ? 'text-amber-400' : 'text-destructive'
                  }`}>
                    {a.overallScore}
                  </span>
                  <span className="text-2xl text-muted-foreground font-mono mb-1.5">/100</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 pt-4">
                <ScoreBar label="Feasibility" score={a.feasibilityScore} colorClass="text-emerald-400" />
                <ScoreBar label="Uniqueness" score={a.uniquenessScore} colorClass="text-primary" />
                <ScoreBar label="Impact" score={a.impactScore} colorClass="text-amber-400" />
                <ScoreBar label="Innovation" score={a.innovationScore} colorClass="text-purple-400" />
              </CardContent>
            </Card>

            {/* Summary & Tech Card */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="bg-card border-border h-full flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-primary" />
                    Engine Verdict
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between">
                  <p className="text-lg leading-relaxed text-foreground/90 font-medium">
                    {a.verdictSummary}
                  </p>
                  
                  {a.techStack && a.techStack.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-border">
                      <h4 className="text-sm font-mono text-muted-foreground mb-3 uppercase tracking-wider">Recommended Stack</h4>
                      <div className="flex flex-wrap gap-2">
                        {a.techStack.map((tech, i) => (
                          <Badge key={i} variant="secondary" className="font-mono bg-muted text-muted-foreground hover:text-foreground">
                            {tech}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Deep Insights Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InsightList items={a.strengths} icon={TrendingUp} title="Strengths" colorClass="text-emerald-400" />
            <InsightList items={a.weaknesses} icon={AlertTriangle} title="Weaknesses" colorClass="text-amber-400" />
            <InsightList items={a.risks} icon={ShieldAlert} title="Market Risks" colorClass="text-destructive" />
            <InsightList items={a.suggestions} icon={Lightbulb} title="Strategic Pivots" colorClass="text-primary" />
          </div>

          {/* Competitor / GitHub Context */}
          {a.githubRepos && a.githubRepos.length > 0 && (
            <div className="space-y-4 pt-4">
              <h3 className="text-xl font-bold flex items-center gap-2 text-foreground">
                <Github className="w-5 h-5" /> Relevant Prior Art (GitHub)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {a.githubRepos.map((repo, i) => (
                  <Card key={i} className="bg-card border-border hover:border-primary/30 transition-colors">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-base truncate pr-2">
                          <a href={repo.url} target="_blank" rel="noreferrer" className="hover:underline hover:text-primary">
                            {repo.org}/{repo.name}
                          </a>
                        </CardTitle>
                        <Badge variant="outline" className="font-mono bg-muted shrink-0">
                          ★ {repo.stars >= 1000 ? (repo.stars/1000).toFixed(1)+'k' : repo.stars}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{repo.desc}</p>
                      <div className="text-xs font-mono text-primary/70">{repo.lang}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
          
          {a.marketContext && (
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg">Market Context</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{a.marketContext}</p>
              </CardContent>
            </Card>
          )}
          
        </div>
      )}
    </div>
  );
}