import React, { useState } from "react";
import {
  Mail,
  Lock,
  ArrowRight,
  Github,
  Sparkles,
  Target,
  Zap,
  LayoutDashboard,
  Settings,
  FileText,
  BarChart2,
  Plus,
  BrainCircuit,
} from "lucide-react";

export function Auth() {
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");

  return (
    <div className="min-h-screen bg-[#0B1120] text-white flex font-sans selection:bg-indigo-500/30">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap');
        .font-heading { font-family: 'Plus Jakarta Sans', sans-serif; }
        .font-sans { font-family: 'Inter', sans-serif; }
      `,
        }}
      />

      {/* Left Panel - Brand */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between relative overflow-hidden bg-[#080E1C] border-r border-white/5 p-12">
        {/* Background effects */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-600/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-8 h-8 relative flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-8 h-8 text-indigo-500"
              >
                <path
                  d="M12 2L2 12L12 22L22 12L12 2Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path d="M12 8L8 12L12 16L16 12L12 8Z" fill="currentColor" />
              </svg>
            </div>
            <span className="font-heading font-bold text-2xl tracking-tight text-white">
              Clariva
            </span>
          </div>

          <h1 className="font-heading text-4xl md:text-5xl font-bold leading-tight mb-6 text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">
            Turn raw ideas into
            <br />
            validated concepts.
          </h1>
          <p className="text-lg text-white/60 max-w-md mb-12 leading-relaxed">
            The AI co-pilot for ambitious builders. Evaluate, refine, and
            execute with surgical precision.
          </p>

          <div className="space-y-8">
            {[
              {
                icon: Target,
                title: "Precision Scoring",
                desc: "Multi-dimensional analysis of your product's potential.",
              },
              {
                icon: Zap,
                title: "Market Intelligence",
                desc: "Real-time competitive landscape and positioning insights.",
              },
              {
                icon: BrainCircuit,
                title: "AI Strategy",
                desc: "Actionable recommendations to strengthen your core loop.",
              },
            ].map((feature, i) => (
              <div key={i} className="flex items-start gap-4 group">
                <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:border-indigo-500/50 group-hover:bg-indigo-500/10 transition-colors">
                  <feature.icon className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-white/90 mb-1">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-white/50">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-4 text-sm text-white/40 mt-12">
          <span>© 2024 Clariva Inc.</span>
          <span className="w-1 h-1 rounded-full bg-white/20"></span>
          <a href="#" className="hover:text-white/80 transition-colors">
            Privacy
          </a>
          <span className="w-1 h-1 rounded-full bg-white/20"></span>
          <a href="#" className="hover:text-white/80 transition-colors">
            Terms
          </a>
        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-12 justify-center">
            <div className="w-8 h-8 relative flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-8 h-8 text-indigo-500"
              >
                <path
                  d="M12 2L2 12L12 22L22 12L12 2Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path d="M12 8L8 12L12 16L16 12L12 8Z" fill="currentColor" />
              </svg>
            </div>
            <span className="font-heading font-bold text-2xl tracking-tight text-white">
              Clariva
            </span>
          </div>

          <div className="mb-8 text-center lg:text-left">
            <h2 className="font-heading text-3xl font-bold text-white mb-2">
              Welcome back
            </h2>
            <p className="text-white/50">
              Enter your credentials to access your workspace.
            </p>
          </div>

          {/* Tabs */}
          <div className="flex p-1 bg-white/5 border border-white/10 rounded-lg mb-8">
            <button
              onClick={() => setActiveTab("login")}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all \${activeTab === 'login' ? 'bg-indigo-600 text-white shadow-lg' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => setActiveTab("register")}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all \${activeTab === 'register' ? 'bg-indigo-600 text-white shadow-lg' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
            >
              Create Account
            </button>
          </div>

          {/* Form */}
          <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
            {activeTab === "register" && (
              <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-white/80">
                    Full Name
                  </label>
                  <input
                    type="text"
                    placeholder="Tajamal Hussain"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-white/80">
                    Primary Focus
                  </label>
                  <div className="relative">
                    <select className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all">
                      <option value="" className="bg-[#0B1120]">
                        Select a domain
                      </option>
                      <option value="saas" className="bg-[#0B1120]">
                        B2B SaaS
                      </option>
                      <option value="consumer" className="bg-[#0B1120]">
                        Consumer App
                      </option>
                      <option value="devtools" className="bg-[#0B1120]">
                        Developer Tools
                      </option>
                      <option value="fintech" className="bg-[#0B1120]">
                        Fintech
                      </option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/50">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-white/80">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  placeholder="jane@example.com"
                  className="w-full bg-white/5 border border-white/10 rounded-lg pl-11 pr-4 py-2.5 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-white/80">
                  Password
                </label>
                {activeTab === "login" && (
                  <a
                    href="#"
                    className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    Forgot password?
                  </a>
                )}
              </div>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-lg pl-11 pr-4 py-2.5 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            <button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all mt-4 group">
              {activeTab === "login" ? "Sign In" : "Create Account"}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <div className="mt-8 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#0B1120] px-4 text-white/40 font-medium">
                Or continue with
              </span>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4">
            <button className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 py-2.5 rounded-lg text-sm font-medium transition-all text-white/80">
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Google
            </button>
            <button className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 py-2.5 rounded-lg text-sm font-medium transition-all text-white/80">
              <Github className="w-4 h-4" />
              GitHub
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
