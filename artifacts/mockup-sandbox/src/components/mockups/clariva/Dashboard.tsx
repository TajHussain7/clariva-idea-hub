import React from "react";
import {
  LayoutDashboard,
  FileText,
  BarChart2,
  Settings,
  Plus,
  Search,
  Bell,
  MoreVertical,
  Activity,
  Database,
  Smartphone,
  Globe,
  Code2,
} from "lucide-react";

export function Dashboard() {
  const ideas = [
    {
      id: 1,
      title: "AI Developer Assistant",
      domain: "DevTools",
      complexity: "High",
      score: 88,
      status: "Analyzed",
      icon: Code2,
      color: "text-indigo-400",
      bg: "bg-indigo-500/10",
    },
    {
      id: 2,
      title: "Micro-SaaS Analytics",
      domain: "B2B SaaS",
      complexity: "Medium",
      score: 74,
      status: "Analyzed",
      icon: BarChart2,
      color: "text-cyan-400",
      bg: "bg-cyan-500/10",
    },
    {
      id: 3,
      title: "Local Event Finder",
      domain: "Consumer",
      complexity: "Low",
      score: 45,
      status: "Analyzed",
      icon: Globe,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
    },
    {
      id: 4,
      title: "Automated CRM Sync",
      domain: "B2B SaaS",
      complexity: "High",
      score: 0,
      status: "Processing",
      icon: Database,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      id: 5,
      title: "Habit Tracker Pro",
      domain: "Mobile App",
      complexity: "Low",
      score: 62,
      status: "Analyzed",
      icon: Smartphone,
      color: "text-rose-400",
      bg: "bg-rose-500/10",
    },
    {
      id: 6,
      title: "Workflow Automation",
      domain: "Productivity",
      complexity: "Medium",
      score: 0,
      status: "Draft",
      icon: Activity,
      color: "text-slate-400",
      bg: "bg-slate-500/10",
    },
  ];

  return (
    <div className="min-h-screen bg-[#0B1120] text-white flex font-sans selection:bg-indigo-500/30">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap');
        .font-heading { font-family: 'Plus Jakarta Sans', sans-serif; }
        .font-sans { font-family: 'Inter', sans-serif; }
        
        .radar-placeholder {
          background: conic-gradient(from 0deg, transparent 0%, rgba(99, 102, 241, 0.1) 20%, rgba(6, 182, 212, 0.2) 50%, rgba(99, 102, 241, 0.1) 80%, transparent 100%);
          border-radius: 50%;
          border: 1px dashed rgba(255,255,255,0.1);
        }
      `,
        }}
      />

      {/* Sidebar */}
      <div className="w-64 bg-[#080E1C] border-r border-white/5 flex flex-col shrink-0">
        <div className="p-6 flex items-center gap-3">
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
          <span className="font-heading font-bold text-xl tracking-tight">
            Clariva
          </span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1">
          <a
            href="#"
            className="flex items-center gap-3 px-3 py-2 rounded-lg bg-indigo-500/10 text-indigo-400 font-medium border-l-2 border-indigo-500 transition-colors"
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </a>
          <a
            href="#"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5 border-l-2 border-transparent transition-colors"
          >
            <FileText className="w-4 h-4" />
            My Ideas
          </a>
          <a
            href="#"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5 border-l-2 border-transparent transition-colors"
          >
            <BarChart2 className="w-4 h-4" />
            Compare
          </a>
        </nav>

        <div className="p-4 border-t border-white/5">
          <a
            href="#"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-colors mb-4"
          >
            <Settings className="w-4 h-4" />
            Settings
          </a>
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-500 flex items-center justify-center text-sm font-bold shadow-inner">
              AL
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">Tajamal Hussain</p>
              <p className="text-xs text-white/40 truncate">Free Plan</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-20 px-8 flex items-center justify-between border-b border-white/5 bg-[#0B1120]/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <h1 className="font-heading text-2xl font-bold">
              Good morning, Alex
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2">
              <Search className="w-4 h-4 text-white/40" />
              <input
                type="text"
                placeholder="Search ideas..."
                className="bg-transparent border-none outline-none text-sm text-white placeholder:text-white/40 w-48"
              />
            </div>
            <button className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/5 transition-colors relative">
              <Bell className="w-4 h-4" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-indigo-500 rounded-full border-2 border-[#0B1120]"></span>
            </button>
            <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-colors shadow-[0_0_15px_rgba(79,70,229,0.3)]">
              <Plus className="w-4 h-4" />
              New Idea
            </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-8">
          {/* Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-white/50 font-medium">Total Ideas</p>
                <p className="text-2xl font-heading font-bold">12</p>
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-white/50 font-medium">Analyzed</p>
                <p className="text-2xl font-heading font-bold">9</p>
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                <BarChart2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-white/50 font-medium">Avg Score</p>
                <p className="text-2xl font-heading font-bold">
                  74<span className="text-lg text-white/40 font-normal">%</span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mb-6">
            <h2 className="font-heading text-xl font-bold">Recent Ideas</h2>
            <div className="flex items-center gap-2">
              <button className="text-sm text-white/60 hover:text-white px-3 py-1 rounded-md transition-colors">
                View All
              </button>
            </div>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ideas.map((idea) => (
              <div
                key={idea.id}
                className="bg-[#0D1426] border border-white/10 rounded-2xl p-5 hover:border-indigo-500/50 transition-colors group flex flex-col h-full relative overflow-hidden"
              >
                {idea.score > 80 && (
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[50px] rounded-full pointer-events-none"></div>
                )}

                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div
                    className={`w-10 h-10 rounded-xl \${idea.bg} \${idea.color} flex items-center justify-center`}
                  >
                    <idea.icon className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-md border 
                      \${idea.status === 'Analyzed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                        idea.status === 'Processing' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                        'bg-white/5 text-white/60 border-white/10'}`}
                    >
                      {idea.status}
                    </span>
                    <button className="text-white/40 hover:text-white transition-colors">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="font-heading font-semibold text-lg mb-2 relative z-10">
                  {idea.title}
                </h3>

                <div className="flex items-center gap-2 mb-6 text-xs relative z-10">
                  <span className="bg-white/5 px-2 py-1 rounded-md text-white/70 border border-white/5">
                    {idea.domain}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-white/20"></span>
                  <span className="text-white/50">
                    {idea.complexity} Complexity
                  </span>
                </div>

                <div className="mt-auto flex items-end justify-between pt-4 border-t border-white/5 relative z-10">
                  {idea.status === "Analyzed" ? (
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 radar-placeholder relative flex items-center justify-center">
                        <div className="absolute inset-0 bg-[#0D1426]/40 rounded-full backdrop-blur-[2px]"></div>
                        <span
                          className={`relative z-10 font-bold \${idea.score > 80 ? 'text-indigo-400' : idea.score > 60 ? 'text-cyan-400' : 'text-white'}`}
                        >
                          {idea.score}
                        </span>
                      </div>
                      <div className="text-sm">
                        <p className="text-white/50 text-xs">Overall Score</p>
                        <p className="font-medium text-white/90">
                          Good Potential
                        </p>
                      </div>
                    </div>
                  ) : idea.status === "Processing" ? (
                    <div className="flex items-center gap-3 w-full">
                      <div className="flex-1 bg-white/5 h-2 rounded-full overflow-hidden">
                        <div className="w-2/3 h-full bg-indigo-500 rounded-full animate-pulse"></div>
                      </div>
                      <span className="text-xs text-white/40 font-mono">
                        65%
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm text-white/40 italic">
                      Awaiting details...
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
