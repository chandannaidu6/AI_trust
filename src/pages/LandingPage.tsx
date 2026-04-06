import { useNavigate } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { Button } from '../components/ui/Button';

const STEPS = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    title: 'Background',
    desc: 'A short survey about your experience and review habits.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    ),
    title: 'Pick a Question',
    desc: 'Choose a problem category and question to review.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
    title: 'Review Code',
    desc: 'Read 4 unlabeled solutions and rate each one independently.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: 'Final Assessment',
    desc: 'Choose the best solution and rank all four.',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950">
      <Header />

      <main className="flex-1 flex flex-col items-center justify-center px-5 py-12 sm:py-16">
        <div className="max-w-2xl w-full space-y-8">

          {/* Badge */}
          <div>
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300
                             bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800
                             rounded-full px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" aria-hidden="true" />
              Software Engineering Research · 2026
            </span>
          </div>

          {/* Headline */}
          <div className="space-y-3">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-slate-100 leading-tight tracking-tight">
              Trust in<br />
              <span className="text-indigo-600 dark:text-indigo-400">AI-Generated Code</span>
            </h1>
            <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 leading-relaxed max-w-xl">
              A blind code review experiment. You will evaluate solutions to well-known
              programming problems — without knowing which were written by humans and which by AI.
            </p>
          </div>

          {/* How it works */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" aria-label="Study steps">
            {STEPS.map((step, i) => (
              <div
                key={i}
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700
                           rounded-xl p-4 space-y-2.5"
              >
                <div className="w-9 h-9 bg-indigo-50 dark:bg-indigo-950 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  {step.icon}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{step.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Blind study notice */}
          <div className="flex items-start gap-3 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-4">
            <svg className="w-4 h-4 text-slate-500 dark:text-slate-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              <strong className="text-slate-700 dark:text-slate-300">Blind study design.</strong>{' '}
              Solutions are labeled A, B, C, D only. No solution is marked as human-written
              or AI-generated. Evaluate code quality on its own merits.
            </p>
          </div>

          {/* CTA */}
          <div className="flex items-center gap-4">
            <Button size="lg" onClick={() => navigate('/participant')}>
              Begin Study →
            </Button>
            <p className="text-xs text-slate-400 dark:text-slate-500">~10–15 minutes</p>
          </div>

          <p className="text-xs text-slate-300 dark:text-slate-600">
            No account required. Responses are held in memory for this session only.
          </p>
        </div>
      </main>
    </div>
  );
}
