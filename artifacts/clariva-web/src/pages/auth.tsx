import { useState } from "react";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Eye,
  EyeOff,
  Check,
  X,
  Lock,
  Mail,
  User,
  BarChart2,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  Zap,
  ArrowRight,
} from "lucide-react";
import { useLogin, useRegister, setAuthTokenGetter } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const passwordValidation = z
  .string()
  .min(8, "Minimum 8 characters")
  .refine((val) => /[A-Z]/.test(val), "One uppercase letter required")
  .refine((val) => /[a-z]/.test(val), "One lowercase letter required")
  .refine((val) => /[0-9]/.test(val), "One number required")
  .refine((val) => /[^A-Za-z0-9]/.test(val), "One special character required");

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: passwordValidation,
  name: z.string().min(2, "Name is required"),
  domain: z.string().optional(),
});

const features = [
  {
    icon: Sparkles,
    title: "AI-Powered Analysis",
    desc: "Deep evaluation of feasibility, uniqueness, and market potential.",
  },
  {
    icon: TrendingUp,
    title: "Competitive Intelligence",
    desc: "Scans GitHub and the web to surface relevant prior art and competitors.",
  },
  {
    icon: ShieldCheck,
    title: "Risk Assessment",
    desc: "Identifies market risks before you commit time or capital.",
  },
  {
    icon: Zap,
    title: "Strategic Pivots",
    desc: "Actionable suggestions to sharpen your hypothesis.",
  },
];

export function Auth() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const loginMutation = useLogin();
  const registerMutation = useRegister();

  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", password: "", name: "", domain: "" },
  });

  const onLogin = (data: z.infer<typeof loginSchema>) => {
    loginMutation.mutate(
      { data },
      {
        onSuccess: (response) => {
          if (response?.token) {
            localStorage.setItem("auth_token", response.token);
            setAuthTokenGetter(() => response.token!);
          }
          queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
          setLocation("/dashboard");
        },
        onError: (error: any) => {
          toast({
            variant: "destructive",
            title: "Login failed",
            description: error?.message || "Invalid credentials",
          });
        },
      },
    );
  };

  const onRegister = (data: z.infer<typeof registerSchema>) => {
    registerMutation.mutate(
      { data },
      {
        onSuccess: (response) => {
          if (response?.token) {
            localStorage.setItem("auth_token", response.token);
            setAuthTokenGetter(() => response.token!);
          }
          queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
          setLocation("/dashboard");
        },
        onError: (error: any) => {
          toast({
            variant: "destructive",
            title: "Registration failed",
            description: error?.message || "Could not create account",
          });
        },
      },
    );
  };

  const registerPassword = registerForm.watch("password") || "";
  const reqs = [
    { label: "8+ characters", met: registerPassword.length >= 8 },
    { label: "Uppercase letter", met: /[A-Z]/.test(registerPassword) },
    { label: "Lowercase letter", met: /[a-z]/.test(registerPassword) },
    { label: "Number", met: /[0-9]/.test(registerPassword) },
    { label: "Special character", met: /[^A-Za-z0-9]/.test(registerPassword) },
  ];

  return (
    <div className="min-h-screen flex">
      {/* ===== Left Brand Panel ===== */}
      <div
        className="hidden lg:flex lg:w-[52%] xl:w-[55%] flex-col justify-between p-10 xl:p-14 relative overflow-hidden pi-brand-panel"
      >
        {/* Decorative blobs */}
        <div
          className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ background: "radial-gradient(circle, #57dffe 0%, #3525cd 60%, transparent 100%)" }}
        />
        <div
          className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full blur-3xl opacity-15 pointer-events-none"
          style={{ background: "radial-gradient(circle, #4f46e5 0%, transparent 70%)" }}
        />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div
            className="w-10 h-10 flex items-center justify-center rounded-xl"
            style={{ backgroundColor: "#57dffe" }}
          >
            <Sparkles className="w-5 h-5" style={{ color: "#0D0C22" }} />
          </div>
          <div>
            <span className="text-2xl font-black text-white tracking-tight">Clariva</span>
            <p className="text-xs text-slate-400 font-medium tracking-wide">AI-Powered SaaS</p>
          </div>
        </div>

        {/* Hero */}
        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-4xl xl:text-5xl font-black text-white leading-[1.1] tracking-tight">
              Validate Ideas.
              <br />
              <span style={{ color: "#57dffe" }}>Kill Bad Bets.</span>
              <br />
              Ship with Confidence.
            </h2>
            <p className="mt-5 text-slate-300 text-lg leading-relaxed max-w-md">
              Clariva's AI engine gives your startup hypothesis a brutal, honest evaluation before you spend a single hour building.
            </p>
          </div>

          {/* Feature list */}
          <div className="grid grid-cols-1 gap-4">
            {features.map((f) => (
              <div key={f.title} className="flex items-start gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                  style={{ backgroundColor: "rgba(87,223,254,0.12)", border: "1px solid rgba(87,223,254,0.2)" }}
                >
                  <f.icon className="w-4 h-4" style={{ color: "#57dffe" }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{f.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Social proof */}
        <div className="relative z-10 flex items-center gap-4">
          <div className="flex -space-x-2">
            {["#3525cd", "#57dffe", "#4f46e5", "#22c55e"].map((c, i) => (
              <div
                key={i}
                className="w-8 h-8 rounded-full border-2 border-[#0D0C22] flex items-center justify-center text-xs font-bold text-white"
                style={{ backgroundColor: c }}
              >
                {String.fromCharCode(65 + i)}
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400">
            <span className="text-white font-semibold">1,200+ founders</span> already validating their ideas
          </p>
        </div>
      </div>

      {/* ===== Right Form Panel ===== */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16 bg-background relative">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2.5 mb-8">
          <div
            className="w-9 h-9 flex items-center justify-center rounded-xl"
            style={{ backgroundColor: "hsl(var(--primary))" }}
          >
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-2xl font-black tracking-tight">Clariva</span>
        </div>

        <div className="max-w-sm w-full mx-auto">
          {/* Status indicator */}
          <div className="flex items-center gap-2 mb-6">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              System Online
            </span>
          </div>

          <h2 className="text-3xl font-bold tracking-tight text-foreground mb-1">
            Welcome back
          </h2>
          <p className="text-muted-foreground text-sm mb-8">
            Sign in to your account or create a new one to get started.
          </p>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-7 bg-muted rounded-lg p-1">
              <TabsTrigger value="login" className="rounded-md font-semibold text-sm">
                Sign In
              </TabsTrigger>
              <TabsTrigger value="register" className="rounded-md font-semibold text-sm">
                Create Account
              </TabsTrigger>
            </TabsList>

            {/* ===== Login Tab ===== */}
            <TabsContent value="login">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Email Address</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                            <Input
                              type="email"
                              placeholder="you@example.com"
                              {...field}
                              data-testid="input-login-email"
                              className="pl-10 h-10 border-border focus-visible:ring-primary/30 focus-visible:border-primary"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel className="text-sm font-medium">Password</FormLabel>
                          <button
                            type="button"
                            className="text-xs text-primary hover:underline font-medium"
                          >
                            Forgot password?
                          </button>
                        </div>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                            <Input
                              type={showLoginPassword ? "text" : "password"}
                              placeholder="••••••••"
                              {...field}
                              data-testid="input-login-password"
                              className="pl-10 pr-10 h-10 border-border focus-visible:ring-primary/30 focus-visible:border-primary"
                            />
                            <button
                              type="button"
                              onClick={() => setShowLoginPassword(!showLoginPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                            >
                              {showLoginPassword ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full h-10 font-semibold mt-2 gap-2 transition-all duration-150 active:scale-[0.98]"
                    disabled={loginMutation.isPending}
                    data-testid="button-login-submit"
                  >
                    {loginMutation.isPending ? (
                      "Authenticating..."
                    ) : (
                      <>
                        Login to Dashboard <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>

                  {/* OR divider */}
                  <div className="relative py-2 flex items-center">
                    <div className="flex-grow border-t border-border" />
                    <span className="flex-shrink mx-4 text-xs font-semibold text-muted-foreground">OR</span>
                    <div className="flex-grow border-t border-border" />
                  </div>

                  {/* Google button */}
                  <button
                    type="button"
                    className="w-full h-10 flex items-center justify-center gap-2.5 border border-border rounded-lg bg-card text-sm font-medium text-foreground hover:bg-muted transition-colors active:scale-[0.98]"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Continue with Google
                  </button>
                </form>
              </Form>
            </TabsContent>

            {/* ===== Register Tab ===== */}
            <TabsContent value="register">
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                  <FormField
                    control={registerForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Full Name</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                            <Input
                              placeholder="Alex Chen"
                              {...field}
                              data-testid="input-register-name"
                              className="pl-10 h-10 border-border focus-visible:ring-primary/30 focus-visible:border-primary"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Email Address</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                            <Input
                              type="email"
                              placeholder="you@example.com"
                              {...field}
                              data-testid="input-register-email"
                              className="pl-10 h-10 border-border focus-visible:ring-primary/30 focus-visible:border-primary"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                            <Input
                              type={showRegisterPassword ? "text" : "password"}
                              placeholder="••••••••"
                              {...field}
                              data-testid="input-register-password"
                              className="pl-10 pr-10 h-10 border-border focus-visible:ring-primary/30 focus-visible:border-primary"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setShowRegisterPassword(!showRegisterPassword)
                              }
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                            >
                              {showRegisterPassword ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                        {/* Password strength grid */}
                        <div className="mt-2.5 p-3 bg-muted/40 rounded-lg border border-border/60">
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                            {reqs.map((req, i) => (
                              <div
                                key={i}
                                className={`flex items-center gap-1.5 text-xs transition-colors duration-200 ${
                                  req.met ? "text-emerald-500 font-medium" : "text-muted-foreground"
                                }`}
                              >
                                {req.met ? (
                                  <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                                ) : (
                                  <X className="w-3 h-3 text-muted-foreground/40 shrink-0" />
                                )}
                                <span>{req.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="domain"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          Industry Domain{" "}
                          <span className="text-muted-foreground font-normal">(optional)</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. Fintech, DevTools, B2B SaaS"
                            {...field}
                            data-testid="input-register-domain"
                            className="h-10 border-border focus-visible:ring-primary/30 focus-visible:border-primary"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full h-10 font-semibold mt-2 gap-2 transition-all duration-150 active:scale-[0.98]"
                    disabled={registerMutation.isPending}
                    data-testid="button-register-submit"
                  >
                    {registerMutation.isPending ? (
                      "Creating account..."
                    ) : (
                      <>
                        Create Account <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>

          {/* Legal footer */}
          <div className="mt-6 pt-5 border-t border-border text-center space-y-3">
            <p className="text-xs text-muted-foreground">
              By continuing, you agree to our{" "}
              <span className="text-primary font-medium hover:underline cursor-pointer">Terms of Service</span>{" "}
              and{" "}
              <span className="text-primary font-medium hover:underline cursor-pointer">Privacy Policy</span>.
            </p>
            <div className="flex justify-center gap-4">
              <span className="text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors">Privacy Policy</span>
              <span className="text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors">Terms of Service</span>
              <span className="text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors">Contact Support</span>
            </div>
          </div>
        </div>

        {/* Clariva brand footer */}
        <div className="mt-8 flex justify-center items-center gap-2 text-muted-foreground">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="font-black text-foreground text-sm tracking-tight">Clariva</span>
          <span className="w-1 h-1 rounded-full bg-muted-foreground" />
          <span className="text-xs">AI-Powered Insights v2.4</span>
        </div>
      </div>
    </div>
  );
}
