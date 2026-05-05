import { useLocation } from "wouter";
import { ArrowLeft, GitCompare, AlertTriangle } from "lucide-react";
import { useCompareIdeas, getCompareIdeasQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function Compare() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const idsParam = searchParams.get("ids");
  
  const { data: ideas, isLoading, isError } = useCompareIdeas(
    { ids: idsParam || "" },
    { query: { enabled: !!idsParam, queryKey: getCompareIdeasQueryKey({ ids: idsParam || "" }) } }
  );

  if (!idsParam) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold">No ideas selected for comparison</h2>
        <Link href="/dashboard"><Button className="mt-4">Return to Dashboard</Button></Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-1/3" />
        <div className="grid grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (isError || !ideas || ideas.length === 0) {
    return (
      <div className="text-center py-20">
        <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
        <h2 className="text-2xl font-bold">Comparison failed</h2>
        <p className="text-muted-foreground mt-2">Could not load the requested ideas.</p>
        <Link href="/dashboard"><Button className="mt-4" variant="outline">Go Back</Button></Link>
      </div>
    );
  }

  const validIdeas = ideas.filter(i => i.analysis && i.status === 'done');

  if (validIdeas.length < 2) {
    return (
      <div className="text-center py-20">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold">Analysis incomplete</h2>
        <p className="text-muted-foreground mt-2">Ensure at least 2 of the selected ideas have completed their analysis.</p>
        <Link href="/dashboard"><Button className="mt-4" variant="outline">Go Back</Button></Link>
      </div>
    );
  }

  // Get scores dynamically for all ideas to find the winner for each category
  const metrics = [
    { key: 'overallScore', label: 'Overall', color: 'text-primary' },
    { key: 'feasibilityScore', label: 'Feasibility', color: 'text-emerald-400' },
    { key: 'uniquenessScore', label: 'Uniqueness', color: 'text-blue-400' },
    { key: 'impactScore', label: 'Impact', color: 'text-amber-400' },
    { key: 'innovationScore', label: 'Innovation', color: 'text-purple-400' },
  ];

  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-500">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Link href="/dashboard" className="hover:text-foreground transition-colors flex items-center">
          <ArrowLeft className="w-4 h-4 mr-1" /> Dashboard
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <GitCompare className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Head-to-Head Analysis</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {validIdeas.map(idea => {
          const a = idea.analysis!;
          return (
            <Card key={idea.id} className="bg-card border-border relative overflow-hidden flex flex-col h-full" data-testid={`compare-card-${idea.id}`}>
              {/* If it's the highest overall score, add a visual indicator */}
              {a.overallScore === Math.max(...validIdeas.map(i => i.analysis!.overallScore || 0)) && (
                <div className="absolute top-0 inset-x-0 h-1 bg-emerald-400" />
              )}
              
              <CardHeader className="border-b border-border bg-muted/20">
                <CardTitle className="line-clamp-1">{idea.title}</CardTitle>
                <div className="text-xs font-mono text-muted-foreground">{idea.domain}</div>
              </CardHeader>
              
              <CardContent className="pt-6 flex-1 flex flex-col space-y-6">
                
                {/* Scores */}
                <div className="space-y-4">
                  {metrics.map(metric => {
                    const score = (a as any)[metric.key] || 0;
                    // Check if this idea has the highest score for this metric among validIdeas
                    const isWinner = score === Math.max(...validIdeas.map(i => (i.analysis as any)[metric.key] || 0));
                    
                    return (
                      <div key={metric.key} className="flex justify-between items-center group">
                        <span className={`text-sm ${isWinner ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>
                          {metric.label}
                        </span>
                        <div className="flex items-center gap-3 w-1/2">
                          <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${isWinner ? metric.color.replace('text-', 'bg-') : 'bg-muted-foreground/30'}`} 
                              style={{ width: `${score}%` }} 
                            />
                          </div>
                          <span className={`font-mono text-sm w-8 text-right ${isWinner ? metric.color + ' font-bold' : 'text-muted-foreground'}`}>
                            {score}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex-1" />

                {/* Summaries */}
                <div className="space-y-4 pt-4 border-t border-border text-sm">
                  <div>
                    <span className="font-bold text-emerald-400 mb-1 block">Top Strength</span>
                    <p className="text-muted-foreground line-clamp-2">
                      {a.strengths?.[0]?.desc || "No strengths identified."}
                    </p>
                  </div>
                  <div>
                    <span className="font-bold text-amber-400 mb-1 block">Main Risk</span>
                    <p className="text-muted-foreground line-clamp-2">
                      {a.risks?.[0]?.desc || "No risks identified."}
                    </p>
                  </div>
                </div>

                <Link href={`/ideas/${idea.id}`} className="block w-full">
                  <Button variant="secondary" className="w-full mt-4">Full Details</Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}