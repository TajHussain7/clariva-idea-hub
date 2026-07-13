import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Rocket,
  Cpu,
  Globe,
  Target,
  Lightbulb,
  ShieldCheck,
  TrendingUp,
  CheckCircle2,
} from "lucide-react";
import { useCreateIdea, getListIdeasQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";

const submitSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(100, "Title is too long"),
  description: z
    .string()
    .min(20, "Please provide more detail about the idea")
    .max(2000, "Description is too long"),
  domain: z.string().min(2, "Domain is required"),
  complexity: z.number().min(0).max(4),
});

const tips = [
  {
    icon: Target,
    title: "Be Specific",
    desc: "The more precise your hypothesis, the more accurate the analysis. Avoid generic descriptions.",
  },
  {
    icon: Lightbulb,
    title: "Define the Problem",
    desc: "Clearly articulate the pain point your idea solves and who suffers from it.",
  },
  {
    icon: TrendingUp,
    title: "Describe the Market",
    desc: "Mention who your target customer is and the estimated market size if you know it.",
  },
  {
    icon: ShieldCheck,
    title: "Explain the Mechanism",
    desc: "How does your idea actually work? What's the core loop or value delivery mechanism?",
  },
];

const complexityLabels = [
  "Very Simple",
  "Simple",
  "Moderate",
  "Complex",
  "Very Complex",
];

const complexityDescs = [
  "No-code or simple scripts",
  "Basic web or mobile app",
  "Multiple integrations needed",
  "Advanced engineering required",
  "Deep tech / AI / Research",
];

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

  const complexity = form.watch("complexity");

  const onSubmit = (data: z.infer<typeof submitSchema>) => {
    createIdeaMutation.mutate(
      { data },
      {
        onSuccess: (newIdea) => {
          queryClient.invalidateQueries({ queryKey: getListIdeasQueryKey() });
          toast({
            title: "Analysis initiated",
            description:
              "Redirecting you to results while the engine processes your idea.",
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
      },
    );
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">New Analysis</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Submit your startup idea for an honest AI evaluation.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* ===== Main Form (left) ===== */}
        <div className="lg:col-span-3">
          <Card className="bg-card border-border shadow-sm">
            <CardHeader className="border-b border-border pb-5">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Rocket className="w-4 h-4 text-primary" />
                Hypothesis Definition
              </CardTitle>
              <CardDescription className="text-sm">
                Be specific — the engine rewards sharp constraints and punishes
                vagueness.
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-6">
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6"
                >
                  {/* Title */}
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5 text-sm font-medium">
                          <Target className="w-3.5 h-3.5 text-muted-foreground" />
                          Project Name / Title
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. AcmeDB — the database for real-time analytics"
                            className="h-10 bg-background border-border focus-visible:ring-primary/30 focus-visible:border-primary"
                            {...field}
                            data-testid="input-idea-title"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Domain */}
                  <FormField
                    control={form.control}
                    name="domain"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5 text-sm font-medium">
                          <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                          Primary Domain
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. Developer Tools, Fintech, B2B SaaS"
                            className="h-10 bg-background border-border focus-visible:ring-primary/30 focus-visible:border-primary"
                            {...field}
                            data-testid="input-idea-domain"
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          What market does this primarily operate in?
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Description */}
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          Elevator Pitch & Core Mechanics
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe the problem your idea solves, your proposed solution, and who the target user is. Include how it works — the more detail, the better the analysis."
                            className="min-h-[160px] bg-background resize-y border-border focus-visible:ring-primary/30 focus-visible:border-primary text-sm leading-relaxed"
                            {...field}
                            data-testid="textarea-idea-description"
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Aim for 2–3 paragraphs. Detail the core loop.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Complexity Slider */}
                  <FormField
                    control={form.control}
                    name="complexity"
                    render={({ field }) => (
                      <FormItem className="space-y-4 pt-4 border-t border-border">
                        <div className="flex items-center justify-between">
                          <FormLabel className="flex items-center gap-1.5 text-sm font-medium">
                            <Cpu className="w-3.5 h-3.5 text-muted-foreground" />
                            Technical Complexity
                          </FormLabel>
                          <span
                            className="text-xs font-semibold px-2.5 py-1 rounded-full"
                            style={{
                              backgroundColor: "hsl(var(--primary)/0.1)",
                              color: "hsl(var(--primary))",
                            }}
                          >
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
                            className="py-2"
                            data-testid="slider-idea-complexity"
                          />
                        </FormControl>
                        {/* Complexity description */}
                        <div className="flex justify-between text-[11px] text-muted-foreground">
                          <span>No-Code</span>
                          <span>Deep Tech</span>
                        </div>
                        <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 border border-border">
                          {complexityDescs[complexity]}
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Submit */}
                  <div className="pt-2">
                    <Button
                      type="submit"
                      size="default"
                      className="w-full font-semibold gap-2 transition-all duration-150 active:scale-[0.98]"
                      disabled={createIdeaMutation.isPending}
                      data-testid="button-submit-idea"
                    >
                      {createIdeaMutation.isPending ? (
                        "Initializing engine..."
                      ) : (
                        <>
                          <Rocket className="w-4 h-4" />
                          Initiate Analysis
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* ===== Tips Panel (right) ===== */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-0.5">
              Tips for a better analysis
            </h3>
            <p className="text-xs text-muted-foreground">
              Higher quality input yields higher quality results.
            </p>
          </div>

          <div className="space-y-3">
            {tips.map((tip, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-4 bg-card border border-border rounded-xl"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-primary/10">
                  <tip.icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{tip.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {tip.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* What the engine evaluates */}
          <div className="p-4 bg-card border border-border rounded-xl">
            <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">
              Engine evaluates
            </p>
            <div className="space-y-2">
              {[
                { label: "Feasibility", color: "bg-emerald-500" },
                { label: "Market Uniqueness", color: "bg-primary" },
                { label: "Potential Impact", color: "bg-amber-500" },
                { label: "Innovation Index", color: "bg-purple-500" },
              ].map((m) => (
                <div key={m.label} className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{m.label}</span>
                  <div className={`ml-auto w-2 h-2 rounded-full shrink-0 ${m.color}`} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}