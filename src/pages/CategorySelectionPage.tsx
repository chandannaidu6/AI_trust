import { useNavigate, Navigate } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { PageContainer } from '../components/layout/PageContainer';
import { useStudy } from '../state/StudyContext';

const CATEGORIES = [
  {
    id: 'Arrays',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    ),
    description: 'Prefix sums, two-pointer patterns, sliding window, in-place manipulation.',
    color: {
      card:   'border-sky-200 dark:border-sky-800 hover:border-sky-400 dark:hover:border-sky-600',
      icon:   'bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-300',
      badge:  'bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300',
      ring:   'focus-visible:ring-sky-500',
      active: 'border-sky-500 bg-sky-50 dark:bg-sky-950 ring-2 ring-sky-200 dark:ring-sky-800',
    },
    questionCount: 3,
  },
  {
    id: 'Strings',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
      </svg>
    ),
    description: 'Reversal, substring search, character frequency, palindromes.',
    color: {
      card:   'border-emerald-200 dark:border-emerald-800 hover:border-emerald-400 dark:hover:border-emerald-600',
      icon:   'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300',
      badge:  'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300',
      ring:   'focus-visible:ring-emerald-500',
      active: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950 ring-2 ring-emerald-200 dark:ring-emerald-800',
    },
    questionCount: 3,
  },
  {
    id: 'Hashes',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
      </svg>
    ),
    description: 'Hash maps, hash sets, complement lookup, frequency counting.',
    color: {
      card:   'border-violet-200 dark:border-violet-800 hover:border-violet-400 dark:hover:border-violet-600',
      icon:   'bg-violet-50 dark:bg-violet-950 text-violet-600 dark:text-violet-300',
      badge:  'bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300',
      ring:   'focus-visible:ring-violet-500',
      active: 'border-violet-500 bg-violet-50 dark:bg-violet-950 ring-2 ring-violet-200 dark:ring-violet-800',
    },
    questionCount: 3,
  },
];

export default function CategorySelectionPage() {
  const navigate = useNavigate();
  const { state, setCategory } = useStudy();

  // Guard — use declarative Navigate instead of calling navigate() during render
  if (!state.participant) return <Navigate to="/participant" replace />;
  // Lock — once a review is active, send participant back to that question
  if (state.review) {
    return <Navigate to={`/review/${state.review.question.category}/${state.review.question.id}`} replace />;
  }

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
            Select the problem category you want to review. Each category has 10 questions.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => handleSelect(cat.id)}
              className={`text-left bg-white dark:bg-slate-900 border-2 rounded-2xl p-6 shadow-sm
                          transition-all duration-150 hover:shadow-lg hover:-translate-y-0.5
                          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                          dark:focus-visible:ring-offset-slate-950
                          ${cat.color.ring}
                          ${state.selectedCategory === cat.id ? cat.color.active : cat.color.card}`}
              aria-pressed={state.selectedCategory === cat.id}
            >
              <div className="space-y-4">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${cat.color.icon}`}>
                  {cat.icon}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{cat.id}</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                    {cat.description}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cat.color.badge}`}>
                    {cat.questionCount} questions
                  </span>
                  <svg className="w-5 h-5 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>
          ))}
        </div>
      </PageContainer>
    </div>
  );
}
