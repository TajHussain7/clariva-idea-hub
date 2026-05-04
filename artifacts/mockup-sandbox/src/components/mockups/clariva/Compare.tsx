import React, { useState } from 'react';
import { LayoutDashboard, FileText, BarChart2, Settings, Plus, X, Trophy, ChevronDown, Code2, Database, Smartphone, Activity, Star, TrendingUp, AlertCircle } from 'lucide-react';

const IDEAS = [
  {
    id: 1, title: 'AI Developer Assistant', domain: 'DevTools', complexity: 'High', status: 'Analyzed',
    color: '#818cf8', iconBg: 'bg-indigo-500/20', icon: Code2, iconColor: 'text-indigo-400',
    scores: { uniqueness: 78, feasibility: 85, impact: 92, innovation: 71, overall: 82 },
    tags: ['TypeScript', 'OpenAI', 'GitHub'],
  },
  {
    id: 2, title: 'Micro-SaaS Analytics', domain: 'B2B SaaS', complexity: 'Medium', status: 'Analyzed',
    color: '#34d399', iconBg: 'bg-emerald-500/20', icon: Activity, iconColor: 'text-emerald-400',
    scores: { uniqueness: 65, feasibility: 90, impact: 74, innovation: 58, overall: 72 },
    tags: ['React', 'PostgreSQL', 'Stripe'],
  },
  {
    id: 3, title: 'Local Event Finder', domain: 'Consumer', complexity: 'Low', status: 'Analyzed',
    color: '#f472b6', iconBg: 'bg-pink-500/20', icon: Database, iconColor: 'text-pink-400',
    scores: { uniqueness: 45, feasibility: 88, impact: 60, innovation: 40, overall: 58 },
    tags: ['React Native', 'Maps API'],
  },
];

const DIMENSIONS = [
  { key: 'uniqueness' as const, label: 'Uniqueness', desc: 'How different from existing solutions' },
  { key: 'feasibility' as const, label: 'Feasibility', desc: 'How practical to build' },
  { key: 'impact' as const, label: 'Impact', desc: 'Potential user value' },
  { key: 'innovation' as const, label: 'Innovation', desc: 'Level of creative novelty' },
  { key: 'overall' as const, label: 'Overall Score', desc: 'Composite weighted score', bold: true },
];

function ScoreBar({ value, color, winner }: { value: number; color: string; winner: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, background: color, boxShadow: winner ? `0 0 8px ${color}80` : 'none' }} />
      </div>
      <span className={`text-sm font-mono font-semibold w-8 text-right ${winner ? 'text-white' : 'text-white/60'}`}>{value}</span>
      {winner && <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
    </div>
  );
}

export function Compare() {
  const [selected, setSelected] = useState([0, 1, 2]);
  const [verdictExpanded, setVerdictExpanded] = useState(true);

  const activeIdeas = IDEAS.filter((_, i) => selected.includes(i));
  const winner = activeIdeas.reduce((best, idea) => idea.scores.overall > best.scores.overall ? idea : best, activeIdeas[0]);

  return (
    <div className="min-h-screen bg-[#0B1120] text-white flex font-sans">
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap');
        .font-heading { font-family: 'Plus Jakarta Sans', sans-serif; }
        .font-sans { font-family: 'Inter', sans-serif; }
        .winner-glow { box-shadow: 0 0 0 2px rgba(99,102,241,0.6), 0 0 30px rgba(99,102,241,0.2); }
        .scroll-x::-webkit-scrollbar { height: 4px; } .scroll-x::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius:4px; }
      `}} />

      {/* Sidebar */}
      <div className="w-64 bg-[#080E1C] border-r border-white/5 flex flex-col shrink-0">
        <div className="p-6 flex items-center gap-3">
          <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-indigo-500">
            <path d="M12 2L2 12L12 22L22 12L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 8L8 12L12 16L16 12L12 8Z" fill="currentColor"/>
          </svg>
          <span className="font-heading font-bold text-xl tracking-tight">Clariva</span>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1">
          {[
            { icon: LayoutDashboard, label: 'Dashboard', active: false },
            { icon: FileText, label: 'My Ideas', active: false },
            { icon: BarChart2, label: 'Compare', active: true },
          ].map(({ icon: Icon, label, active }) => (
            <a key={label} href="#" className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium border-l-2 transition-colors ${active ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500' : 'text-white/60 hover:text-white hover:bg-white/5 border-transparent'}`}>
              <Icon className="w-4 h-4" />{label}
            </a>
          ))}
        </nav>
        <div className="p-4 border-t border-white/5">
          <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-colors mb-4">
            <Settings className="w-4 h-4" />Settings
          </a>
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-500 flex items-center justify-center text-sm font-bold">AL</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">Alex Lin</p>
              <p className="text-xs text-white/40 truncate">Free Plan</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="px-8 py-5 border-b border-white/5 bg-[#0B1120]/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-heading text-2xl font-bold">Idea Comparison</h1>
              <p className="text-sm text-white/50 mt-0.5">Comparing {activeIdeas.length} ideas side-by-side</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5">
                <span className="text-sm text-white/50">Add idea</span>
                <ChevronDown className="w-4 h-4 text-white/30" />
              </div>
              <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all">
                <Plus className="w-4 h-4" />Add to Compare
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 space-y-6">
          {/* Idea Selector Pills */}
          <div className="flex gap-3 flex-wrap">
            {IDEAS.map((idea, i) => {
              const isSelected = selected.includes(i);
              return (
                <div key={idea.id} className={`flex items-center gap-2.5 px-4 py-2 rounded-full border text-sm font-medium transition-all ${isSelected ? 'bg-white/10 border-white/20 text-white' : 'bg-white/[0.03] border-white/10 text-white/40'}`}>
                  <idea.icon className={`w-4 h-4 ${idea.iconColor}`} />
                  {idea.title}
                  {isSelected && (
                    <button onClick={() => setSelected(s => s.filter(x => x !== i))} className="ml-1 text-white/40 hover:text-white transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Comparison Table */}
          <div className="overflow-x-auto scroll-x rounded-2xl border border-white/10">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="bg-[#080E1C] border-b border-white/10">
                  <td className="py-4 px-6 w-44">
                    <p className="text-xs text-white/40 uppercase tracking-widest font-medium">Dimension</p>
                  </td>
                  {activeIdeas.map((idea) => (
                    <td key={idea.id} className={`py-4 px-6 ${idea.id === winner.id ? 'winner-glow relative' : ''}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl ${idea.iconBg} flex items-center justify-center`}>
                          <idea.icon className={`w-4 h-4 ${idea.iconColor}`} />
                        </div>
                        <div>
                          <p className="font-heading font-semibold text-sm text-white">{idea.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-white/40">{idea.domain}</span>
                            {idea.id === winner.id && <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full font-medium flex items-center gap-1"><Trophy className="w-2.5 h-2.5" />Best</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Meta rows */}
                {[
                  { label: 'Domain', key: 'domain' as const },
                  { label: 'Complexity', key: 'complexity' as const },
                  { label: 'Status', key: 'status' as const },
                ].map(({ label, key }) => (
                  <tr key={key} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-6">
                      <p className="text-sm text-white/50 font-medium">{label}</p>
                    </td>
                    {activeIdeas.map((idea) => (
                      <td key={idea.id} className="py-3.5 px-6">
                        <span className="text-sm text-white/80 px-2.5 py-1 bg-white/5 border border-white/10 rounded-md">{idea[key]}</span>
                      </td>
                    ))}
                  </tr>
                ))}

                {/* Separator */}
                <tr><td colSpan={activeIdeas.length + 1} className="h-px bg-indigo-500/20" /></tr>

                {/* Score rows */}
                {DIMENSIONS.map(({ key, label, desc, bold }) => (
                  <tr key={key} className={`border-b border-white/5 hover:bg-white/[0.02] transition-colors ${bold ? 'bg-white/[0.02]' : ''}`}>
                    <td className="py-4 px-6">
                      <p className={`text-sm font-medium ${bold ? 'text-white font-semibold' : 'text-white/70'}`}>{label}</p>
                      <p className="text-xs text-white/30 mt-0.5">{desc}</p>
                    </td>
                    {activeIdeas.map((idea) => {
                      const val = idea.scores[key];
                      const isWinner = activeIdeas.every(other => other.scores[key] <= val);
                      return (
                        <td key={idea.id} className="py-4 px-6">
                          <ScoreBar value={val} color={idea.color} winner={isWinner} />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tech Tags Row */}
          <div className="grid grid-cols-3 gap-4">
            {activeIdeas.map((idea) => (
              <div key={idea.id} className="bg-[#0D1426] border border-white/10 rounded-xl p-4">
                <p className="text-xs font-medium text-white/50 mb-3 flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5" />Suggested Stack</p>
                <div className="flex flex-wrap gap-1.5">
                  {idea.tags.map(t => <span key={t} className="text-xs px-2 py-1 bg-white/5 border border-white/10 rounded-full text-white/70 font-mono">{t}</span>)}
                </div>
              </div>
            ))}
          </div>

          {/* AI Verdict */}
          <div className="bg-gradient-to-r from-indigo-600/15 to-cyan-600/10 border border-indigo-500/30 rounded-2xl overflow-hidden">
            <button onClick={() => setVerdictExpanded(!verdictExpanded)} className="w-full flex items-center justify-between px-6 py-4 text-left">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <p className="font-heading font-semibold text-indigo-300">AI Verdict</p>
                  <p className="text-xs text-white/40">Based on multi-dimensional analysis</p>
                </div>
              </div>
              <ChevronDown className={`w-5 h-5 text-white/40 transition-transform ${verdictExpanded ? 'rotate-180' : ''}`} />
            </button>
            {verdictExpanded && (
              <div className="px-6 pb-6 pt-2">
                <div className="flex items-start gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Trophy className="w-4 h-4 text-amber-400" />
                      <p className="font-heading font-semibold text-sm text-amber-300">Recommended: {winner.title}</p>
                      <span className="text-xs px-2 py-0.5 bg-amber-500/20 border border-amber-500/30 rounded-full text-amber-400">{winner.scores.overall}/100</span>
                    </div>
                    <p className="text-sm text-white/70 leading-relaxed max-w-2xl">
                      Based on your three submitted concepts, <strong className="text-white">{winner.title}</strong> shows the strongest overall potential. Its high Impact score (92) indicates significant user value, while its Feasibility rating (85) suggests the technical path is well within reach. The primary risk is market competition from established players — addressed by focusing on deep GitHub integration as a unique distribution moat. Prioritizing this idea is recommended for your next build sprint.
                    </p>
                    <div className="mt-4 flex gap-3">
                      <button className="text-sm px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all font-medium">View Full Analysis</button>
                      <button className="text-sm px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 rounded-lg transition-all">Export Comparison</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
