import { useEffect, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { PageContainer } from '../components/layout/PageContainer';
import { useStudy } from '../state/StudyContext';
import { loadQuestions } from '../data/loader';

const CATEGORY_META: Record<string, {
  icon: JSX.Element;
  description: string;
  color: {
    card: string;
    icon: string;
    badge: string;
    ring: string;
    active: string;
  };
}> = {
  'String Processing': {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
      </svg>
    ),
    description: 'Trimming, replacing, escaping, formatting, and other text manipulation.',
    color: {
      card:   'border-emerald-200 dark:border-emerald-800 hover:border-emerald-400 dark:hover:border-emerald-600',
      icon:   'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300',
      badge:  'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300',
      ring:   'focus-visible:ring-emerald-500',
      active: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950 ring-2 ring-emerald-200 dark:ring-emerald-800',
    },
  },
  'Data Structures': {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    ),
    description: 'Lists, dicts/maps, sets, and other collection manipulation.',
    color: {
      card:   'border-sky-200 dark:border-sky-800 hover:border-sky-400 dark:hover:border-sky-600',
      icon:   'bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-300',
      badge:  'bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300',
      ring:   'focus-visible:ring-sky-500',
      active: 'border-sky-500 bg-sky-50 dark:bg-sky-950 ring-2 ring-sky-200 dark:ring-sky-800',
    },
  },
  'Parsing & Conversion': {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M8 7h12m0 0l-4-4m4 4l-4 4M16 17H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
    description: 'Parsing structured strings and converting between representations.',
    color: {
      card:   'border-violet-200 dark:border-violet-800 hover:border-violet-400 dark:hover:border-violet-600',
      icon:   'bg-violet-50 dark:bg-violet-950 text-violet-600 dark:text-violet-300',
      badge:  'bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300',
      ring:   'focus-visible:ring-violet-500',
      active: 'border-violet-500 bg-violet-50 dark:bg-violet-950 ring-2 ring-violet-200 dark:ring-violet-800',
    },
  },
  'Math & Numeric': {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
      </svg>
    ),
    description: 'Numeric computation, ratios, statistics, and matrix operations.',
    color: {
      card:   'border-amber-200 dark:border-amber-800 hover:border-amber-400 dark:hover:border-amber-600',
      icon:   'bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-300',
      badge:  'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300',
      ring:   'focus-visible:ring-amber-500',
      active: 'border-amber-500 bg-amber-50 dark:bg-amber-950 ring-2 ring-amber-200 dark:ring-amber-800',
    },
  },
  'Encoding & Checksums': {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    description: 'Hex/byte conversions, hashes, and checksum digit calculations.',
    color: {
      card:   'border-rose-200 dark:border-rose-800 hover:border-rose-400 dark:hover:border-rose-600',
      icon:   'bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-300',
      badge:  'bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-300',
      ring:   'focus-visible:ring-rose-500',
      active: 'border-rose-500 bg-rose-50 dark:bg-rose-950 ring-2 ring-rose-200 dark:ring-rose-800',
    },
  },
  'Date & Time': {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    description: 'Timestamps, durations, and rounding/formatting of dates and times.',
    color: {
      card:   'border-cyan-200 dark:border-cyan-800 hover:border-cyan-400 dark:hover:border-cyan-600',
      icon:   'bg-cyan-50 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-300',
      badge:  'bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300',
      ring:   'focus-visible:ring-cyan-500',
      active: 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950 ring-2 ring-cyan-200 dark:ring-cyan-800',
    },
  },
};

const FALLBACK_META = {
  icon: (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  ),
  description: 'Review problems in this category.',
  color: {
    card:   'border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600',
    icon:   'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
    badge:  'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
    ring:   'focus-visible:ring-slate-500',
    active: 'border-slate-500 bg-slate-50 dark:bg-slate-900 ring-2 ring-slate-200 dark:ring-slate-800',
  },
};

interface CategoryTile {
  id: string;
  questionCount: number;
}

export default function CategorySelectionPage() {
  const navigate = useNavigate();
  const { state, setCategory } = useStudy();
  const [categories, setCategories] = useState<CategoryTile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuestions().then(questions => {
      const counts = new Map<string, number>();
      for (const q of questions) counts.set(q.category, (counts.get(q.category) ?? 0) + 1);
      setCategories(Array.from(counts, ([id, questionCount]) => ({ id, questionCount })));
      setLoading(false);
    });
  }, []);

  // Guard — use declarative Navigate instead of calling navigate() during render
  if (!state.participant) return <Navigate to="/participant" replace />;

  const handleSelect = (id: string) => {
    setCategory(id);
    navigate(`/categories/${id}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <Header step={2} back="/participant" />
      <PageContainer>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Choose a Category</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
            Select the problem category you want to review.
          </p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-24 text-slate-400 dark:text-slate-500 gap-2">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm">Loading categories…</span>
          </div>
        )}

        {!loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {categories.map(cat => {
              const meta = CATEGORY_META[cat.id] ?? FALLBACK_META;
              return (
                <button
                  key={cat.id}
                  onClick={() => handleSelect(cat.id)}
                  className={`text-left bg-white dark:bg-slate-900 border-2 rounded-2xl p-6 shadow-sm
                              transition-all duration-150 hover:shadow-lg hover:-translate-y-0.5
                              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                              dark:focus-visible:ring-offset-slate-950
                              ${meta.color.ring}
                              ${state.selectedCategory === cat.id ? meta.color.active : meta.color.card}`}
                  aria-pressed={state.selectedCategory === cat.id}
                >
                  <div className="space-y-4">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${meta.color.icon}`}>
                      {meta.icon}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{cat.id}</h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                        {meta.description}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${meta.color.badge}`}>
                        {cat.questionCount} questions
                      </span>
                      <svg className="w-5 h-5 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </PageContainer>
    </div>
  );
}
