import React, { useState } from 'react';
import { LayoutDashboard, FileText, BarChart2, Settings, ChevronRight, Lightbulb, Cpu, Globe, ShoppingBag, Smartphone, Code2, Database, Activity, Headphones, Leaf, GraduationCap, Briefcase, CheckCircle2, Sparkles } from 'lucide-react';

const DOMAINS = [
  { label: 'B2B SaaS', icon: Database },
  { label: 'Consumer App', icon: Smartphone },
  { label: 'Developer Tools', icon: Code2 },
  { label: 'Fintech', icon: Activity },
  { label: 'E-commerce', icon: ShoppingBag },
  { label: 'Health & Wellness', icon: Leaf },
  { label: 'EdTech', icon: GraduationCap },
  { label: 'Productivity', icon: Briefcase },
  { label: 'AI / ML', icon: Cpu },
  { label: 'Global / Platform', icon: Globe },
];

const STEPS = ['Basics', 'Describe', 'Review'];

const TIPS = [
  { title: 'Be specific', desc: 'Avoid vague language — describe the exact problem and who experiences it.' },
  { title: 'Include the "why now"', desc: 'Explain what makes this the right moment to build this.' },
  { title: 'Mention competitors', desc: 'Naming existing alternatives helps our AI benchmark your uniqueness.' },
  { title: 'Define your user', desc: 'Who is the primary beneficiary? Role, context, and pain point.' },
];

export function Submit() {
  const [step, setStep] = useState(0);
  const [complexity, setComplexity] = useState(2);
  const [domain, setDomain] = useState('B2B SaaS');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const complexityLabels = ['Very Simple', 'Simple', 'Medium', 'Complex', 'Very Complex'];

  const handleSubmit = () => {
    setSubmitting(true);
    setTimeout(() => setSubmitting(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0B1120] text-white flex font-sans">
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap');
        .font-heading { font-family: 'Plus Jakarta Sans', sans-serif; }
        .font-sans { font-family: 'Inter', sans-serif; }
        .slider-thumb::-webkit-slider-thumb { appearance: none; width: 18px; height: 18px; border-radius: 50%; background: #4f46e5; border: 2px solid #818cf8; cursor: pointer; box-shadow: 0 0 10px rgba(79,70,229,0.5); }
        .slider-thumb::-webkit-slider-runnable-track { background: rgba(255,255,255,0.08); border-radius: 4px; height: 4px; }
        textarea::-webkit-scrollbar { width: 4px; } textarea::-webkit-scrollbar-track { background: transparent; } textarea::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
      `}} />

      {/* Sidebar */}
      <div className="w-64 bg-[#080E1C] border-r border-white/5 flex flex-col shrink-0">
        <div className="p-6 flex items-center gap-3">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-indigo-500">
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
        <header className="h-20 px-8 flex items-center justify-between border-b border-white/5 bg-[#0B1120]/80 backdrop-blur-md sticky top-0 z-10">
          <div>
            <p className="text-xs text-white/40 uppercase tracking-widest font-medium mb-1">New Submission</p>
            <h1 className="font-heading text-2xl font-bold">Submit an Idea</h1>
          </div>
          {/* Progress Steps */}
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => (
              <React.Fragment key={s}>
                <button onClick={() => i <= step && setStep(i)} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${i === step ? 'bg-indigo-600 text-white' : i < step ? 'bg-indigo-500/20 text-indigo-400' : 'text-white/40'}`}>
                  {i < step ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px]">{i + 1}</span>}
                  {s}
                </button>
                {i < STEPS.length - 1 && <div className={`w-8 h-px ${i < step ? 'bg-indigo-500' : 'bg-white/10'}`} />}
              </React.Fragment>
            ))}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto p-8 grid grid-cols-3 gap-8">
            {/* Form Area */}
            <div className="col-span-2 space-y-6">

              {step === 0 && (
                <div className="space-y-6">
                  <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-1.5">Idea Title <span className="text-indigo-400">*</span></label>
                      <input
                        type="text"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="e.g., AI-powered code review assistant"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                      />
                      <p className="text-xs text-white/40 mt-1.5">Be concise — 5 to 10 words works best.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-3">Domain / Category <span className="text-indigo-400">*</span></label>
                      <div className="grid grid-cols-2 gap-2">
                        {DOMAINS.map(({ label, icon: Icon }) => (
                          <button
                            key={label}
                            onClick={() => setDomain(label)}
                            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${domain === label ? 'border-indigo-500 bg-indigo-500/15 text-indigo-300' : 'border-white/10 bg-white/[0.03] text-white/60 hover:text-white hover:border-white/20'}`}
                          >
                            <Icon className="w-4 h-4" />{label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-3">Complexity Level</label>
                      <input
                        type="range" min={0} max={4} value={complexity}
                        onChange={e => setComplexity(Number(e.target.value))}
                        className="w-full slider-thumb accent-indigo-600 cursor-pointer"
                      />
                      <div className="flex justify-between mt-2">
                        {complexityLabels.map((l, i) => (
                          <span key={l} className={`text-xs transition-colors ${i === complexity ? 'text-indigo-400 font-semibold' : 'text-white/30'}`}>{l}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setStep(1)} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-all group">
                    Continue to Description <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-6">
                  <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-1.5">Describe Your Idea <span className="text-indigo-400">*</span></label>
                      <p className="text-xs text-white/40 mb-3">Cover the problem, your solution, target users, and what makes it unique.</p>
                      <textarea
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="Describe the problem you're solving, who experiences it, your proposed solution, and why it's better than what exists today..."
                        rows={10}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all resize-none text-sm leading-relaxed"
                      />
                      <div className="flex justify-between mt-2">
                        <p className="text-xs text-white/30">Minimum 100 characters for best analysis</p>
                        <p className={`text-xs font-mono ${description.length > 100 ? 'text-emerald-400' : 'text-white/40'}`}>{description.length} chars</p>
                      </div>
                    </div>
                    <div className="border-t border-white/10 pt-4">
                      <p className="text-xs text-white/50 mb-3 flex items-center gap-2"><Sparkles className="w-3.5 h-3.5 text-cyan-400" /> AI prompt suggestions</p>
                      <div className="flex flex-wrap gap-2">
                        {['What problem does this solve?', 'Who is the target user?', 'What\'s the key differentiator?', 'Why build this now?'].map(prompt => (
                          <button key={prompt} onClick={() => setDescription(d => d ? d + ' ' + prompt : prompt)} className="text-xs px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-white/60 hover:text-cyan-400 hover:border-cyan-500/30 transition-colors">{prompt}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setStep(0)} className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 font-medium py-3 rounded-xl transition-all">Back</button>
                    <button onClick={() => setStep(2)} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-all group">
                      Review & Submit <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
                    <h3 className="font-heading font-semibold mb-5 text-white/90">Summary Review</h3>
                    <div className="space-y-4">
                      {[
                        { label: 'Title', value: title || 'AI-powered code review assistant' },
                        { label: 'Domain', value: domain },
                        { label: 'Complexity', value: complexityLabels[complexity] },
                        { label: 'Description', value: description || 'A tool that uses large language models to automatically review code diffs, surface security vulnerabilities, suggest performance improvements, and explain architectural patterns. Integrates directly into GitHub PRs, reducing review time by 60% and enabling solo developers to maintain code quality at team scale.', long: true },
                      ].map(({ label, value, long }) => (
                        <div key={label} className={`flex ${long ? 'flex-col gap-2' : 'items-center justify-between'} py-3 border-b border-white/5 last:border-0`}>
                          <span className="text-sm text-white/50 font-medium">{label}</span>
                          <span className={`text-sm text-white/90 ${long ? 'leading-relaxed' : 'text-right max-w-xs'}`}>{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-5 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Cpu className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                      <p className="font-heading font-semibold text-indigo-300 mb-1">AI analysis ready</p>
                      <p className="text-sm text-white/60 leading-relaxed">Once submitted, Clariva will analyze your idea across 4 dimensions — Uniqueness, Feasibility, Impact, and Innovation — and search GitHub for competitive positioning data. Results typically arrive within 15–30 seconds.</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => setStep(1)} className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 font-medium py-3 rounded-xl transition-all">Back</button>
                    <button onClick={handleSubmit} disabled={submitting} className="flex-[2] bg-indigo-600 hover:bg-indigo-500 disabled:opacity-70 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)]">
                      {submitting ? (
                        <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Analyzing...</>
                      ) : (
                        <><Sparkles className="w-4 h-4" /> Submit for Analysis</>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Tips Panel */}
            <div className="space-y-4">
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Lightbulb className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-heading font-semibold text-white/80">What makes a great idea description?</h3>
                </div>
                <div className="space-y-4">
                  {TIPS.map((tip, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-[10px] text-indigo-400 font-bold">{i + 1}</span>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-white/80 mb-0.5">{tip.title}</p>
                        <p className="text-xs text-white/40 leading-relaxed">{tip.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
                <p className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-3">Example idea</p>
                <p className="text-sm text-white/80 leading-relaxed italic">"A Chrome extension for freelance designers that automatically compresses and formats files before client delivery — solving the #1 complaint of back-and-forth revision cycles."</p>
              </div>

              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <p className="text-xs text-emerald-300/80 leading-relaxed">All idea data is encrypted and never shared without your permission.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
