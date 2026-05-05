import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Rocket, Cpu, Globe, Target } from "lucide-react";
import { useCreateIdea, getListIdeasQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";

const submitSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100, "Title is too long"),
  description: z.string().min(20, "Please provide more detail about the idea").max(2000, "Description is too long"),
  domain: z.string().min(2, "Domain is required"),
  complexity: z.number().min(0).max(4),
});

export function Submit() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createIdeaMutation = useCreateIdea();

  const form = useForm<z.infer<typeof submitSchema>>({
    resolver: zodResolver(submitSchema),
    defaultValues: {
      title: "",
      description: "",
      domain: "",
      complexity: 2,
    },
  });

  const onSubmit = (data: z.infer<typeof submitSchema>) => {
    createIdeaMutation.mutate({ data }, {
      onSuccess: (newIdea) => {
        queryClient.invalidateQueries({ queryKey: getListIdeasQueryKey() });
        toast({
          title: "Idea submitted",
          description: "Analysis has started. You'll be redirected to the results page.",
        });
        setLocation(`/ideas/${newIdea.id}`);
      },
      onError: (error: any) => {
        toast({
          variant: "destructive",
          title: "Submission failed",
          description: error?.message || "Could not submit idea",
        });
      },
    });
  };

  const complexityLabels = ["Very Simple", "Simple", "Moderate", "Complex", "Very Complex"];

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">New Analysis</h1>
        <p className="text-muted-foreground mt-1">Submit your startup idea for a brutal, honest evaluation by the engine.</p>
      </div>

      <Card className="bg-card border-border shadow-lg">
        <CardHeader className="bg-muted/50 border-b border-border pb-6">
          <CardTitle className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-primary" />
            Hypothesis Definition
          </CardTitle>
          <CardDescription>
            Be specific. The engine punishes vagueness and rewards sharp constraints.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground flex items-center gap-2">
                      <Target className="w-4 h-4 text-muted-foreground" />
                      Project Name / Title
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. AcmeDB - The database for X" className="bg-background" {...field} data-testid="input-idea-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="domain"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground flex items-center gap-2">
                      <Globe className="w-4 h-4 text-muted-foreground" />
                      Primary Domain
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Developer Tools, Fintech, B2B SaaS" className="bg-background" {...field} data-testid="input-idea-domain" />
                    </FormControl>
                    <FormDescription>What market does this primarily operate in?</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Elevator Pitch & Core Mechanics</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe the problem, your proposed solution, and who the target user is. Be as detailed as possible about HOW it works." 
                        className="min-h-[150px] bg-background resize-y" 
                        {...field} 
                        data-testid="textarea-idea-description" 
                      />
                    </FormControl>
                    <FormDescription>
                      Aim for 2-3 paragraphs. Detail the core loop.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="complexity"
                render={({ field }) => (
                  <FormItem className="space-y-4 pt-4 border-t border-border">
                    <div className="flex justify-between items-center">
                      <FormLabel className="text-foreground flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-muted-foreground" />
                        Technical Complexity
                      </FormLabel>
                      <span className="font-mono text-sm text-primary font-bold bg-primary/10 px-2 py-1 rounded">
                        {complexityLabels[field.value]}
                      </span>
                    </div>
                    <FormControl>
                      <Slider
                        min={0}
                        max={4}
                        step={1}
                        defaultValue={[field.value]}
                        onValueChange={(vals) => field.onChange(vals[0])}
                        className="py-4"
                        data-testid="slider-idea-complexity"
                      />
                    </FormControl>
                    <div className="flex justify-between text-xs text-muted-foreground font-mono">
                      <span>No-Code / Simple</span>
                      <span>Deep Tech / AI</span>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="pt-6 flex justify-end">
                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full sm:w-auto font-bold tracking-wide"
                  disabled={createIdeaMutation.isPending}
                  data-testid="button-submit-idea"
                >
                  {createIdeaMutation.isPending ? (
                    "INITIALIZING ENGINE..."
                  ) : (
                    <>
                      <Rocket className="w-4 h-4 mr-2" />
                      INITIATE ANALYSIS
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}