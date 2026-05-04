import React, { useState } from 'react';
import { LayoutDashboard, FileText, BarChart2, Settings, Star, AlertTriangle, Lightbulb, CheckCircle, XCircle, ExternalLink, Code2, ArrowLeft, Share2, Download, RefreshCcw, GitBranch, Eye } from 'lucide-react';

const SCORES = [
  { label: 'Uniqueness', value: 78, color: '#818cf8', glow: 'rgba(129,140,248,0.4)', desc: 'Moderate differentiation from existing solutions' },
  { label: 'Feasibility', value: 85, color: '#34d399', glow: 'rgba(52,211,153,0.4)', desc: 'Strong technical and resource viability' },
  { label: 'Impact', value: 92, color: '#06b6d4', glow: 'rgba(6,182,212,0.4)', desc: 'High potential value for target users' },
  { label: 'Innovation', value: 71, color: '#f472b6', glow: 'rgba(244,114,182,0.4)', desc: 'Novel application of existing technologies' },
];

const INSIGHTS = {
  strengths: [
    { title: 'Clear problem-solution fit', desc: 'The pain point is well-defined and your solution directly addresses it without over-engineering.' },
    { title: 'Large addressable market', desc: 'Millions of developers face code review bottlenecks — this targets a universal workflow problem.' },
    { title: 'GitHub integration advantage', desc: 'Meeting developers where they already work dramatically reduces adoption friction.' },
  ],
  weaknesses: [
    { title: 'AI cost at scale', desc: 'LLM inference costs per PR could become prohibitive without aggressive caching or model fine-tuning.' },
    { title: 'Trust and adoption barrier', desc: 'Developers are skeptical of AI suggestions touching their code — requires strong explainability.' },
  ],
  risks: [
    { title: 'GitHub Copilot feature parity', desc: 'Microsoft is actively building PR review into Copilot, which has significant distribution advantage.' },
    { title: 'Enterprise security blockers', desc: 'Sending proprietary code to external APIs will be a hard no for many enterprise engineering teams.' },
  ],
  suggestions: [
    { title: 'Add local-model support', desc: 'Offer an on-premise or local LLM option to unblock enterprise deals from day one.' },
    { title: 'Build explainability UI', desc: 'Every suggestion should cite the exact code pattern and link to relevant documentation.' },
    { title: 'Focus on one language first', desc: 'Go deep on TypeScript/JavaScript — dominate one ecosystem before expanding.' },
  ],
};

const TECH_STACK = ['TypeScript', 'Node.js', 'OpenAI API', 'GitHub API', 'React', 'PostgreSQL', 'Redis', 'Docker'];

const REPOS = [
  { name: 'pr-agent', org: 'Codium-AI', stars: '5.2k', desc: 'AI-powered code review & PR agent with multiple LLM support.', lang: 'Python' },
  { name: 'reviewbot', org: 'sourcegraph', stars: '3.8k', desc: 'Automated code review bots with LLM integration for GitHub.', lang: 'Go' },
  { name: 'openai-code-review', org: 'anc95', stars: '1.2k', desc: 'Use ChatGPT for code review on GitHub Actions workflows.', lang: 'JavaScript' },
  { name: 'coderabbit', org: 'coderabbitai', stars: '890', desc: 'AI code reviews & summaries with line-by-line feedback.', lang: 'TypeScript' },
];

function ScoreRing({ value, color, glow, size = 90 }: { value: number; color: string; glow: string; size?: number }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <svg width={size} height={size} style={{ filter: `drop-shadow(0 0 8px ${glow})` }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="6"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: 'stroke-dashoffset 1s ease' }} />
      <text x={size/2} y={size/2 + 5} textAnchor="middle" fill="white" fontSize="18" fontWeight="700" fontFamily="Plus Jakarta Sans, sans-serif">{value}</text>
    </svg>
  );
}

export function Results() {
  const [tab, setTab] = useState<'strengths' | 'weaknesses' | 'risks' | 'suggestions'>('strengths');

  const tabItems: { key: typeof tab; label: string; icon: React.ElementType; count: number; color: string }[] = [
    { key: 'strengths', label: 'Strengths', icon: CheckCircle, count: INSIGHTS.strengths.length, color: 'text-emerald-400' },
    { key: 'weaknesses', label: 'Weaknesses', icon: AlertTriangle, count: INSIGHTS.weaknesses.length, color: 'text-amber-400' },
    { key: 'risks', label: 'Risks', icon: XCircle, count: INSIGHTS.risks.length, color: 'text-rose-400' },
    { key: 'suggestions', label: 'Suggestions', icon: Lightbulb, count: INSIGHTS.suggestions.length, color: 'text-cyan-400' },
  ];

  const iconMap = { strengths: CheckCircle, weaknesses: AlertTriangle, risks: XCircle, suggestions: Lightbulb };
  const colorMap = { strengths: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', weaknesses: 'text-amber-400 bg-amber-500/10 border-amber-500/20', risks: 'text-rose-400 bg-rose-500/10 border-rose-500/20', suggestions: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' };

  return (
    <div className="min-h-screen bg-[#0B1120] text-white flex font-sans">
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap');
        .font-heading { font-family: 'Plus Jakarta Sans', sans-serif; }
        .font-sans { font-family: 'Inter', sans-serif; }
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
            { icon: FileText, label: 'My Ideas', active: true },
            { icon: BarChart2, label: 'Compare', active: false },
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
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2 text-white/40 text-sm">
                <a href="#" className="hover:text-white transition-colors flex items-center gap-1"><ArrowLeft className="w-3.5 h-3.5" />My Ideas</a>
                <span>/</span>
                <span className="text-white/70">AI Developer Assistant</span>
              </div>
              <h1 className="font-heading text-2xl font-bold">AI Developer Assistant</h1>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs px-2 py-1 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">Developer Tools</span>
                <span className="text-xs px-2 py-1 rounded-md bg-white/5 text-white/60 border border-white/10">High Complexity</span>
                <span className="text-xs text-white/40 flex items-center gap-1"><Eye className="w-3 h-3" />Analyzed 2 minutes ago</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 px-3 py-2 rounded-lg text-sm transition-all"><RefreshCcw className="w-3.5 h-3.5" />Re-analyze</button>
              <button className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 px-3 py-2 rounded-lg text-sm transition-all"><Share2 className="w-3.5 h-3.5" />Share</button>
              <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-lg text-sm transition-all"><Download className="w-3.5 h-3.5" />Export</button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 space-y-8">
          {/* Score Cards */}
          <div className="grid grid-cols-5 gap-4">
            {SCORES.map((s) => (
              <div key={s.label} className="bg-[#0D1426] border border-white/10 rounded-2xl p-5 flex flex-col items-center hover:border-white/20 transition-colors">
                <ScoreRing value={s.value} color={s.color} glow={s.glow} />
                <p className="font-heading font-semibold text-sm mt-3 text-center">{s.label}</p>
                <p className="text-xs text-white/40 text-center mt-1 leading-tight">{s.desc}</p>
              </div>
            ))}
            {/* Overall Score */}
            <div className="bg-gradient-to-br from-indigo-600/20 to-cyan-600/10 border border-indigo-500/30 rounded-2xl p-5 flex flex-col items-center justify-center shadow-[0_0_30px_rgba(79,70,229,0.15)]">
              <p className="text-xs font-medium text-white/50 uppercase tracking-widest mb-2">Overall</p>
              <p className="font-heading font-bold text-5xl text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">82</p>
              <p className="text-white/50 text-sm">/100</p>
              <div className="mt-3 flex items-center gap-1.5">
                {[...Array(5)].map((_, i) => <Star key={i} className={`w-3 h-3 ${i < 4 ? 'text-amber-400 fill-amber-400' : 'text-white/20 fill-white/20'}`} />)}
              </div>
              <p className="text-xs text-white/50 mt-1">Strong Potential</p>
            </div>
          </div>

          {/* Insights */}
          <div className="bg-[#0D1426] border border-white/10 rounded-2xl overflow-hidden">
            <div className="flex border-b border-white/10">
              {tabItems.map(({ key, label, icon: Icon, count, color }) => (
                <button key={key} onClick={() => setTab(key)} className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors border-b-2 ${tab === key ? `${color} border-current` : 'text-white/50 hover:text-white/80 border-transparent'}`}>
                  <Icon className="w-4 h-4" />{label}
                  <span className={`text-[11px] px-1.5 py-0.5 rounded-full border ${tab === key ? `${colorMap[key]}` : 'bg-white/5 border-white/10 text-white/40'}`}>{count}</span>
                </button>
              ))}
            </div>
            <div className="p-6 space-y-4">
              {INSIGHTS[tab].map((item, i) => {
                const Icon = iconMap[tab];
                const cls = colorMap[tab];
                return (
                  <div key={i} className={`flex gap-4 p-4 rounded-xl border ${cls.split(' ').slice(1).join(' ')}`}>
                    <div className={`w-8 h-8 rounded-lg ${cls.split(' ').slice(1).join(' ')} flex items-center justify-center shrink-0`}>
                      <Icon className={`w-4 h-4 ${cls.split(' ')[0]}`} />
                    </div>
                    <div>
                      <p className="font-heading font-semibold text-sm text-white/90 mb-1">{item.title}</p>
                      <p className="text-sm text-white/60 leading-relaxed">{item.desc}</p>
                      {tab === 'suggestions' && TECH_STACK && i === INSIGHTS.suggestions.length - 1 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {TECH_STACK.map(t => (
                            <span key={t} className="text-xs px-2.5 py-1 bg-white/5 border border-white/10 rounded-full text-white/70 font-mono">{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* GitHub Competition */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-white/50" />
                <h2 className="font-heading font-bold text-lg">GitHub Competitive Landscape</h2>
              </div>
              <span className="text-xs text-white/40 bg-white/5 border border-white/10 px-3 py-1 rounded-full">4 similar projects found</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {REPOS.map((repo, i) => (
                <div key={i} className="bg-[#0D1426] border border-white/10 rounded-xl p-5 hover:border-white/20 transition-all group">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Code2 className="w-4 h-4 text-indigo-400" />
                        <p className="font-heading font-semibold text-sm">{repo.org}<span className="text-white/40">/</span>{repo.name}</p>
                      </div>
                      <p className="text-xs text-white/40 mt-0.5">{repo.lang}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-xs text-amber-400">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />{repo.stars}
                      </div>
                      <a href="#" className="text-white/40 hover:text-white transition-colors opacity-0 group-hover:opacity-100"><ExternalLink className="w-3.5 h-3.5" /></a>
                    </div>
                  </div>
                  <p className="text-sm text-white/60 leading-relaxed">{repo.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex gap-3 pb-4">
            <button className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2"><RefreshCcw className="w-4 h-4" />Improve Idea</button>
            <button className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2"><BarChart2 className="w-4 h-4" />Compare with Others</button>
            <button className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(79,70,229,0.3)]"><Download className="w-4 h-4" />Export Report</button>
          </div>
        </main>
      </div>
    </div>
  );
}
