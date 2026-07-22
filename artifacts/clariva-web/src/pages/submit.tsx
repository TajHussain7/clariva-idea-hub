import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Rocket,
  Target,
  Lightbulb,
  ShieldCheck,
  TrendingUp,
  CheckCircle2,
  X,
  ArrowRight,
  Compass,
  BookOpen,
} from "lucide-react";
import {
  useCreateIdea,
  getListIdeasQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const DRAFT_KEY = "clariva:submit-draft";

const domainOptions = [
  "SaaS",
  "Fintech",
  "Healthcare",
  "EdTech",
  "Logistics",
  "Consumer",
  "Developer Tools",
  "Other",
];

const complexityOptions = [
  { value: 1, label: "Low" },
  { value: 2, label: "Med" },
  { value: 3, label: "High" },
] as const;

const submitSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(100, "Title is too long"),
  domain: z.string().min(2, "Domain is required"),
  domainOther: z.string().optional(),
  complexity: z.number().min(1).max(3),
  description: z
    .string()
    .min(20, "Please provide more detail about the idea")
    .max(2000, "Description is too long"),
});

type SubmitFormValues = z.infer<typeof submitSchema>;

const tips = [
  {
    icon: Target,
    text: "Be specific about the problem. High-level pain points get generic feedback.",
  },
  {
    icon: Lightbulb,
    text: "Mention your target audience. Who exactly is this for?",
  },
  {
    icon: ShieldCheck,
    text: "Include potential technical hurdles you anticipate.",
  },
];

const resources = [
  { label: "Ideation Framework", icon: Compass },
  { label: "Market Fit Guide", icon: BookOpen },
];

export function Submit() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createIdeaMutation = useCreateIdea();

  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  const form = useForm<SubmitFormValues>({
    resolver: zodResolver(submitSchema),
    defaultValues: {
      title: "",
      domain: "SaaS",
      domainOther: "",
      complexity: 2,
      description: "",
    },
  });

  // Restore a locally-saved draft, if any.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft.title) form.setValue("title", draft.title);
        if (draft.domain) form.setValue("domain", draft.domain);
        if (draft.domainOther) form.setValue("domainOther", draft.domainOther);
        if (draft.complexity) form.setValue("complexity", draft.complexity);
        if (draft.description) form.setValue("description", draft.description);
        if (Array.isArray(draft.tags)) setTags(draft.tags);
      }
    } catch {
      // ignore malformed drafts
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const domain = form.watch("domain");
  const complexity = form.watch("complexity");

  const addTag = (value?: string) => {
    const v = (value ?? tagInput).trim();
    if (v && !tags.includes(v) && tags.length < 8) {
      setTags((prev) => [...prev, v]);
    }
    setTagInput("");
  };

  const removeTag = (t: string) => setTags(tags.filter((tag) => tag !== t));

  const handleSaveDraft = () => {
    const values = form.getValues();
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...values, tags }));
    toast({
      title: "Draft saved",
      description:
        "Your idea is saved on this device — come back anytime to finish it.",
    });
  };

  const onSubmit = (values: SubmitFormValues) => {
    const resolvedDomain =
      values.domain === "Other" && values.domainOther?.trim()
        ? values.domainOther.trim()
        : values.domain;

    const description =
      tags.length > 0
        ? `${values.description}\n\nTags: ${tags.join(", ")}`
        : values.description;

    createIdeaMutation.mutate(
      {
        data: {
          title: values.title,
          description,
          domain: resolvedDomain,
          complexity: values.complexity,
        },
      },
      {
        onSuccess: (newIdea) => {
          queryClient.invalidateQueries({ queryKey: getListIdeasQueryKey() });
          localStorage.removeItem(DRAFT_KEY);
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
        <h1 className="text-2xl font-bold tracking-tight">Submit New Idea</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Let's refine your concept with AI-powered analysis.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* ===== Main Form (left) ===== */}
        <div className="lg:col-span-3">
          <Card className="bg-card border-border shadow-sm">
            <CardContent className="pt-6">
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6"
                >
                  {/* Idea Title */}
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          Idea Title
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Decentralized Cloud for Designers"
                            className="h-10 bg-background border-border focus-visible:ring-primary/30 focus-visible:border-primary"
                            {...field}
                            data-testid="input-idea-title"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Domain + Complexity row */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="domain"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            Domain
                          </FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger
                                className="h-10 bg-background border-border"
                                data-testid="select-idea-domain"
                              >
                                <SelectValue placeholder="Select a domain" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {domainOptions.map((d) => (
                                <SelectItem key={d} value={d}>
                                  {d}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="complexity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            Complexity
                          </FormLabel>
                          <FormControl>
                            <div className="grid grid-cols-3 gap-2">
                              {complexityOptions.map((opt) => (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => field.onChange(opt.value)}
                                  className={`h-10 rounded-md text-sm font-semibold border transition-colors ${
                                    complexity === opt.value
                                      ? "bg-primary text-primary-foreground border-primary"
                                      : "bg-background text-foreground border-border hover:border-primary/40"
                                  }`}
                                  data-testid={`button-complexity-${opt.label.toLowerCase()}`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Domain Other */}
                  {domain === "Other" && (
                    <FormField
                      control={form.control}
                      name="domainOther"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            Specify domain
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., Climate Tech"
                              className="h-10 bg-background border-border"
                              {...field}
                              data-testid="input-idea-domain-other"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Description */}
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          Description
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe the problem you are solving and your unique solution..."
                            className="min-h-[160px] bg-background resize-y border-border focus-visible:ring-primary/30 focus-visible:border-primary text-sm leading-relaxed"
                            {...field}
                            data-testid="textarea-idea-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Optional Tags */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Optional Tags (Press Enter)
                    </label>
                    <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-md border border-border bg-background min-h-10">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="rounded-full hover:bg-primary/20 p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                      <input
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addTag();
                          }
                        }}
                        placeholder={tags.length === 0 ? "Add tags..." : ""}
                        className="flex-1 min-w-[100px] bg-transparent text-sm outline-none py-1"
                        data-testid="input-idea-tags"
                      />
                    </div>
                  </div>

                  {/* Form Actions */}
                  <div className="flex items-center justify-end gap-3 pt-2 border-t border-border mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSaveDraft}
                      disabled={createIdeaMutation.isPending}
                    >
                      Save Draft
                    </Button>
                    <Button
                      type="submit"
                      size="default"
                      className="gap-2 transition-all duration-150 active:scale-[0.98]"
                      disabled={createIdeaMutation.isPending}
                      data-testid="button-submit-idea"
                    >
                      {createIdeaMutation.isPending ? (
                        "Initializing engine..."
                      ) : (
                        <>
                          <Rocket className="w-4 h-4" />
                          Analyze Idea
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
          <Card className="bg-card border-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Lightbulb className="w-4 h-4" />
                Tips for Better Ideas
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              {tips.map((tip, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {tip.text}
                  </p>
                </div>
              ))}

              <div className="pt-3 mt-1 border-t border-border space-y-2.5">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Resources
                </p>
                {resources.map((r) => (
                  <button
                    key={r.label}
                    type="button"
                    className="w-full flex items-center justify-between text-sm text-foreground hover:text-primary transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <r.icon className="w-3.5 h-3.5 text-muted-foreground" />
                      {r.label}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Inspiration banner */}
          <div
            className="relative rounded-xl overflow-hidden h-40 flex items-end p-4 text-white"
            style={{
              background:
                "linear-gradient(135deg, rgba(13,12,34,0.55), rgba(30,20,72,0.75)), radial-gradient(circle at 30% 20%, rgba(99,102,241,0.5), transparent 60%), #14122b",
            }}
          >
            <div className="relative z-10">
              <p className="text-sm font-bold">Need Inspiration?</p>
              <p className="text-xs text-slate-300 mt-0.5">
                Explore the top-rated community concepts.
              </p>
            </div>
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage:
                  "radial-gradient(ellipse at 60% 30%, rgba(99,102,241,0.6) 0%, transparent 50%)",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
