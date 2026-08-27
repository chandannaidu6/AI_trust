import { Difficulty, DIFFICULTIES } from '../../types';

const DIFFICULTY_COLORS: Record<Difficulty, { done: string; pending: string }> = {
  Easy: {
    done:    'bg-emerald-600 border-emerald-600 text-white',
    pending: 'bg-white dark:bg-slate-800 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300',
  },
  Medium: {
    done:    'bg-amber-600 border-amber-600 text-white',
    pending: 'bg-white dark:bg-slate-800 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300',
  },
  Hard: {
    done:    'bg-rose-600 border-rose-600 text-white',
    pending: 'bg-white dark:bg-slate-800 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300',
  },
};

interface DifficultyProgressProps {
  completedDifficulties: Partial<Record<Difficulty, boolean>>;
  /** Optional lead-in line shown above the badges, e.g. "2 more reviews to go." */
  message?: string;
}

// Highlights the "one Easy, one Medium, one Hard" requirement as a glanceable
// row of badges instead of a sentence buried in paragraph text, so it's
// obvious at a glance which difficulties are still outstanding.
export function DifficultyProgress({ completedDifficulties, message }: DifficultyProgressProps) {
  const doneCount = DIFFICULTIES.filter(d => completedDifficulties[d]).length;

  return (
    <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/50 px-4 py-3.5 space-y-2.5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className="text-sm font-bold text-indigo-800 dark:text-indigo-200">
          {doneCount} of 3 required reviews completed
        </span>
        {message && (
          <span className="text-xs text-indigo-600 dark:text-indigo-400">{message}</span>
        )}
      </div>
      <div className="flex gap-2 flex-wrap">
        {DIFFICULTIES.map(d => {
          const done = !!completedDifficulties[d];
          const colors = DIFFICULTY_COLORS[d];
          return (
            <span
              key={d}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                done ? colors.done : colors.pending
              }`}
            >
              {done && (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {d}
              {!done && <span className="opacity-60 font-normal">&middot; not yet done</span>}
            </span>
          );
        })}
      </div>
    </div>
  );
}
