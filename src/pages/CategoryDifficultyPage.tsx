import { useEffect, useState } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { PageContainer } from '../components/layout/PageContainer';
import { Button } from '../components/ui/Button';
import { useStudy } from '../state/StudyContext';
import { loadCategory } from '../data/loader';
import { Difficulty, DIFFICULTIES } from '../types';

const DIFFICULTY_META: Record<Difficulty, { color: string; ring: string; description: string }> = {
  Easy: {
    color: 'border-emerald-200 dark:border-emerald-800 hover:border-emerald-400 dark:hover:border-emerald-600 text-emerald-700 dark:text-emerald-300',
    ring: 'focus-visible:ring-emerald-500',
    description: 'Simple loops, single conditionals, straightforward logic.',
  },
  Medium: {
    color: 'border-amber-200 dark:border-amber-800 hover:border-amber-400 dark:hover:border-amber-600 text-amber-700 dark:text-amber-300',
    ring: 'focus-visible:ring-amber-500',
    description: 'Moderate algorithms, recursion, or non-trivial math.',
  },
  Hard: {
    color: 'border-rose-200 dark:border-rose-800 hover:border-rose-400 dark:hover:border-rose-600 text-rose-700 dark:text-rose-300',
    ring: 'focus-visible:ring-rose-500',
    description: 'Tricky algorithms, multi-step reasoning, or unusual bit-tricks.',
  },
};

export default function CategoryDifficultyPage() {
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const { state } = useStudy();

  const [counts,  setCounts]  = useState<Partial<Record<Difficulty, number>>>({});
  const [loading, setLoading] = useState(true);

  if (!state.participant) return <Navigate to="/participant" replace />;

  useEffect(() => {
    if (!category) return;
    setLoading(true);
    loadCategory(category).then(questions => {
      const next: Partial<Record<Difficulty, number>> = {};
      for (const q of questions) {
        const d = q.difficulty as Difficulty;
        next[d] = (next[d] ?? 0) + 1;
      }
      setCounts(next);
      setLoading(false);
    });
  }, [category]);

  const allDone = DIFFICULTIES.every(d => state.completedDifficulties[d]);
  const doneCount = DIFFICULTIES.filter(d => state.completedDifficulties[d]).length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <Header step={3} back="/categories" />
      <PageContainer>

        <div className="mb-6">
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Category
          </span>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">{category}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            You review exactly one Easy, one Medium, and one Hard question across the whole
            study. {doneCount} of 3 done so far. Pick a difficulty to see this category's
            questions at that level.
          </p>
        </div>

        {allDone && (
          <div className="mb-6 flex items-center gap-3 flex-wrap bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-xl px-5 py-4">
            <p className="text-sm text-green-700 dark:text-green-300 flex-1 min-w-[200px]">
              You've completed all 3 required reviews (Easy, Medium, and Hard). Thank you!
            </p>
            <Button size="sm" onClick={() => navigate('/complete')}>Go to summary</Button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24 text-slate-400 dark:text-slate-500 gap-2">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm">Loading…</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {DIFFICULTIES.map(difficulty => {
              const count = counts[difficulty] ?? 0;
              const usedElsewhere = !!state.completedDifficulties[difficulty];
              const disabled = count === 0 || usedElsewhere;
              const meta = DIFFICULTY_META[difficulty];
              return (
                <button
                  key={difficulty}
                  disabled={disabled}
                  onClick={() => navigate(`/categories/${category}/${difficulty}`)}
                  className={`text-left bg-white dark:bg-slate-900 border-2 rounded-2xl p-5 shadow-sm transition-all
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950
                    ${disabled
                      ? 'opacity-50 cursor-not-allowed border-slate-200 dark:border-slate-800'
                      : `hover:shadow-lg hover:-translate-y-0.5 ${meta.color} ${meta.ring}`}`}
                >
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{difficulty}</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                    {meta.description}
                  </p>
                  <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mt-3">
                    {usedElsewhere
                      ? 'Already reviewed (in another category)'
                      : count === 0
                      ? 'No questions at this level in this category'
                      : `${count} question${count === 1 ? '' : 's'}`}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </PageContainer>
    </div>
  );
}
