import { useState } from "react";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import { PlusCircle, Search, GitCompare, Activity, CheckCircle2, Clock, AlertCircle, XCircle, BarChart2 } from "lucide-react";
import { useListIdeas, useDeleteIdea, getListIdeasQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'done':
      return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20"><CheckCircle2 className="w-3 h-3 mr-1" /> Complete</Badge>;
    case 'processing':
      return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20"><Activity className="w-3 h-3 mr-1 animate-pulse" /> Processing</Badge>;
    case 'pending':
      return <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
    case 'failed':
      return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20"><AlertCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function Dashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const { data: ideas, isLoading } = useListIdeas();
  const deleteMutation = useDeleteIdea();

  const filteredIdeas = ideas?.filter(idea => 
    idea.title.toLowerCase().includes(search.toLowerCase()) || 
    idea.domain.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const handleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleCompare = () => {
    if (selectedIds.length < 2) {
      toast({ title: "Select at least 2 ideas to compare", variant: "destructive" });
      return;
    }
    setLocation(`/compare?ids=${selectedIds.join(",")}`);
  };

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this idea?")) {
      deleteMutation.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListIdeasQueryKey() });
          toast({ title: "Idea deleted" });
          setSelectedIds(prev => prev.filter(x => x !== id));
        }
      });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Idea Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage and track your startup hypotheses.</p>
        </div>
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <Button variant="secondary" onClick={handleCompare} data-testid="button-compare-selected">
              <GitCompare className="w-4 h-4 mr-2" />
              Compare ({selectedIds.length})
            </Button>
          )}
          <Button onClick={() => setLocation("/submit")} data-testid="button-new-idea">
            <PlusCircle className="w-4 h-4 mr-2" />
            New Analysis
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Search ideas by title or domain..." 
          className="pl-10 bg-card border-border"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="bg-card">
              <CardHeader className="pb-2"><Skeleton className="h-6 w-3/4" /></CardHeader>
              <CardContent><Skeleton className="h-20 w-full" /></CardContent>
            </Card>
          ))}
        </div>
      ) : filteredIdeas.length === 0 ? (
        <div className="text-center py-20 bg-card/50 rounded-xl border border-dashed border-border">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
            <BarChart2 className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold mb-2">No ideas found</h2>
          <p className="text-muted-foreground max-w-md mx-auto mb-6">
            {search ? "No ideas match your search criteria." : "You haven't submitted any ideas for analysis yet. Start by creating a new analysis."}
          </p>
          {!search && (
            <Button onClick={() => setLocation("/submit")}>
              <PlusCircle className="w-4 h-4 mr-2" />
              Submit Your First Idea
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredIdeas.map((idea) => {
            const score = idea.analysis?.overallScore;
            return (
              <div key={idea.id} className="relative group" data-testid={`card-idea-${idea.id}`}>
                <div className="absolute top-4 left-4 z-10">
                  <Checkbox 
                    checked={selectedIds.includes(idea.id)}
                    onCheckedChange={() => handleSelect(idea.id)}
                    className="bg-background/80 backdrop-blur"
                    data-testid={`checkbox-select-${idea.id}`}
                  />
                </div>
                <Link href={`/ideas/${idea.id}`}>
                  <Card className="bg-card hover:border-primary/50 transition-all cursor-pointer h-full flex flex-col overflow-hidden group-hover:shadow-md group-hover:shadow-primary/5">
                    <CardHeader className="pb-3 pl-12">
                      <div className="flex justify-between items-start">
                        <CardTitle className="line-clamp-1 text-lg group-hover:text-primary transition-colors">{idea.title}</CardTitle>
                        <div className="flex items-center gap-2" onClick={e => e.preventDefault()}>
                          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity" onClick={(e) => handleDelete(idea.id, e)}>
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <CardDescription className="font-mono text-xs mt-1">{idea.domain}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                        {idea.description}
                      </p>
                      
                      <div className="mt-auto pt-4 border-t border-border flex items-center justify-between">
                        <StatusBadge status={idea.status} />
                        
                        {score !== undefined && score !== null ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground uppercase tracking-wider font-mono">Score</span>
                            <span className={`font-mono font-bold text-lg ${
                              score >= 80 ? 'text-emerald-400' : 
                              score >= 60 ? 'text-primary' : 
                              score >= 40 ? 'text-amber-400' : 'text-destructive'
                            }`}>{score}</span>
                          </div>
                        ) : null}
                      </div>
                    </CardContent>
                    <CardFooter className="py-3 bg-muted/30 text-xs text-muted-foreground border-t border-border">
                      Submitted {format(new Date(idea.createdAt), 'MMM d, yyyy')}
                    </CardFooter>
                  </Card>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}