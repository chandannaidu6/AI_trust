import { useState, FormEvent } from 'react';
import { SlotLabel, SlotRating, FinalAssessment, SLOT_LABELS } from '../../types';
import { avgRating } from '../../utils/helpers';
import { Button } from '../ui/Button';

const SLOT_COLORS: Record<SlotLabel, { card: string; btn: string; active: string }> = {
  A: {
    card:   'bg-violet-50  dark:bg-violet-950/50 border-violet-200  dark:border-violet-800  text-violet-800  dark:text-violet-200',
    btn:    'border-violet-200  dark:border-violet-700  bg-white dark:bg-slate-800 text-violet-700 dark:text-violet-300 hover:bg-violet-50  dark:hover:bg-violet-950',
    active: 'bg-violet-600 text-white border-violet-600 shadow-sm',
  },
  B: {
    card:   'bg-sky-50     dark:bg-sky-950/50     border-sky-200     dark:border-sky-800     text-sky-800     dark:text-sky-200',
    btn:    'border-sky-200     dark:border-sky-700     bg-white dark:bg-slate-800 text-sky-700     dark:text-sky-300     hover:bg-sky-50     dark:hover:bg-sky-950',
    active: 'bg-sky-600     text-white border-sky-600     shadow-sm',
  },
  C: {
    card:   'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200',
    btn:    'border-emerald-200 dark:border-emerald-700 bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950',
    active: 'bg-emerald-600 text-white border-emerald-600 shadow-sm',
  },
  D: {
    card:   'bg-amber-50   dark:bg-amber-950/50   border-amber-200   dark:border-amber-800   text-amber-800   dark:text-amber-200',
    btn:    'border-amber-200   dark:border-amber-700   bg-white dark:bg-slate-800 text-amber-700   dark:text-amber-300   hover:bg-amber-50   dark:hover:bg-amber-950',
    active: 'bg-amber-600   text-white border-amber-600   shadow-sm',
  },
};

interface FinalAssessmentFormProps {
  ratings:  Partial<Record<SlotLabel, SlotRating>>;
  existing?: FinalAssessment | null;
  onSubmit: (a: FinalAssessment) => void;
  onNext:   () => void;
}

function RankRow({ pos, current, onChange }: {
  pos:      number;
  current:  SlotLabel | undefined;
  onChange: (slot: SlotLabel) => void;
}) {
  const labels = ['1st — Best', '2nd', '3rd', '4th — Worst'];
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 w-20 shrink-0">
        {labels[pos]}
      </span>
      <div className="flex gap-2">
        {SLOT_LABELS.map(slot => (
          <button
            key={slot}
            type="button"
            aria-pressed={current === slot}
            aria-label={`Rank ${slot} as ${labels[pos]}`}
            onClick={() => onChange(slot)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-all
              focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2
              dark:focus-visible:ring-offset-slate-900
              ${current === slot ? SLOT_COLORS[slot].active : SLOT_COLORS[slot].btn}`}
          >
            {slot}
          </button>
        ))}
      </div>
      {current && (
        <span className="text-xs text-slate-400 dark:text-slate-500">Solution {current}</span>
      )}
    </div>
  );
}

export function FinalAssessmentForm({ ratings, existing, onSubmit, onNext }: FinalAssessmentFormProps) {
  const [bestChoice,  setBestChoice]  = useState<SlotLabel | null>(existing?.bestChoice ?? null);
  const [ranking,     setRanking]     = useState<(SlotLabel | undefined)[]>(
    existing?.ranking ?? [undefined, undefined, undefined, undefined],
  );
  const [explanation, setExplanation] = useState(existing?.explanation ?? '');
  const [saved,       setSaved]       = useState(!!existing);

  const setRankPos = (pos: number, slot: SlotLabel) => {
    const next = [...ranking];
    const prev = next.indexOf(slot);
    if (prev !== -1) next[prev] = undefined;
    next[pos] = slot;
    setRanking(next);
    setSaved(false);
  };

  const rankingComplete = ranking.every(Boolean) && new Set(ranking).size === 4;
  const valid = bestChoice !== null && rankingComplete && explanation.trim().length > 0;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    onSubmit({ bestChoice: bestChoice!, ranking: ranking as SlotLabel[], explanation });
    setSaved(true);
  };

  return (
    <section
      className="bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-xl shadow-sm overflow-hidden"
      aria-label="Final assessment"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-3 bg-indigo-50 dark:bg-indigo-950/50 border-b border-indigo-100 dark:border-indigo-800">
        <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-sm font-semibold text-indigo-800 dark:text-indigo-200">
          All solutions reviewed — Final Assessment
        </span>
      </div>

      <div className="px-5 py-5 space-y-6">

        {/* Rating recap */}
        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
            Your ratings at a glance
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {SLOT_LABELS.map(slot => {
              const r = ratings[slot];
              if (!r) return null;
              return (
                <div key={slot} className={`rounded-lg border px-3 py-2.5 space-y-1 ${SLOT_COLORS[slot].card}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">Solution {slot}</span>
                    <span className="text-sm font-bold tabular-nums">{avgRating(r).toFixed(1)}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-xs opacity-80">
                    <div><span className="block opacity-70 text-[10px]">Trust</span>{r.trustScore}/5</div>
                    <div><span className="block opacity-70 text-[10px]">Corr.</span>{r.correctnessConfidence}/5</div>
                    <div><span className="block opacity-70 text-[10px]">Read.</span>{r.readability}/5</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-6">

          {/* Best choice */}
          <fieldset className="space-y-2 border-0 p-0 m-0">
            <legend className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Which solution would you approve in a real code review?
            </legend>
            <div className="flex gap-2 flex-wrap" role="radiogroup">
              {SLOT_LABELS.map(slot => (
                <button
                  key={slot}
                  type="button"
                  role="radio"
                  aria-checked={bestChoice === slot}
                  onClick={() => { setBestChoice(slot); setSaved(false); }}
                  className={`flex-1 py-2.5 text-sm font-semibold rounded-lg border transition-all
                    focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2
                    dark:focus-visible:ring-offset-slate-900
                    ${bestChoice === slot ? SLOT_COLORS[slot].active : SLOT_COLORS[slot].btn}`}
                >
                  Solution {slot}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Ranking */}
          <fieldset className="space-y-2 border-0 p-0 m-0">
            <legend className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Rank all four solutions
              <span className="text-xs text-slate-400 dark:text-slate-500 font-normal ml-2">
                Click a letter at each position
              </span>
            </legend>
            <div className="space-y-2.5 pt-1">
              {ranking.map((slot, pos) => (
                <RankRow key={pos} pos={pos} current={slot} onChange={s => setRankPos(pos, s)} />
              ))}
            </div>
          </fieldset>

          {/* Explanation */}
          <div className="space-y-1.5">
            <label htmlFor="final-explanation" className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              What most influenced your judgment?{' '}
              <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
            </label>
            <textarea
              id="final-explanation"
              value={explanation}
              onChange={e => { setExplanation(e.target.value); setSaved(false); }}
              placeholder="e.g. variable naming, edge case handling, algorithm clarity, code length…"
              rows={3}
              className="w-full text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5
                         text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800
                         placeholder:text-slate-300 dark:placeholder:text-slate-500
                         focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-slate-100 dark:border-slate-800">
            <Button type="submit" disabled={!valid} size="lg">
              {saved ? 'Update Assessment' : 'Submit Assessment'}
            </Button>
            {!valid && (
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {!bestChoice ? 'Choose a best solution. ' : ''}
                {!rankingComplete ? 'Complete the ranking. ' : ''}
                {bestChoice && rankingComplete && !explanation.trim() ? 'Add an explanation.' : ''}
              </p>
            )}
            {saved && (
              <Button type="button" variant="secondary" size="lg" onClick={onNext}>
                Finish &amp; Export →
              </Button>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}
