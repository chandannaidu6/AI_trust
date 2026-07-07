import { useState, FormEvent } from 'react';
import { SlotLabel, SlotRating, FinalAssessment, DraftAssessment, SLOT_LABELS } from '../../types';
import { avgRating } from '../../utils/helpers';
import { Button } from '../ui/Button';
import { VoiceTextArea } from '../ui/VoiceTextArea';

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
};

interface FinalAssessmentFormProps {
  ratings:  Partial<Record<SlotLabel, SlotRating>>;
  existing?: FinalAssessment | null;
  draft?: DraftAssessment | null;
  onDraftChange: (draft: DraftAssessment) => void;
  onSubmit: (a: FinalAssessment) => void;
  onNext:   () => void;
}

export function FinalAssessmentForm({ ratings, existing, draft, onDraftChange, onSubmit, onNext }: FinalAssessmentFormProps) {
  const [bestChoice,  setBestChoice]  = useState<SlotLabel | null>(existing?.bestChoice ?? draft?.bestChoice ?? null);
  const [explanation, setExplanation] = useState(existing?.explanation ?? draft?.explanation ?? '');
  const [saved,       setSaved]       = useState(!!existing);

  const valid = bestChoice !== null && explanation.trim().length > 0;

  const handleBestChoice = (slot: SlotLabel) => {
    setBestChoice(slot);
    setSaved(false);
    onDraftChange({ bestChoice: slot, explanation });
  };

  const handleExplanation = (text: string) => {
    setExplanation(text);
    setSaved(false);
    onDraftChange({ bestChoice, explanation: text });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    onSubmit({ bestChoice: bestChoice!, explanation });
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
          <div className="grid grid-cols-2 gap-2">
            {SLOT_LABELS.map(slot => {
              const r = ratings[slot];
              if (!r) return null;
              return (
                <div key={slot} className={`rounded-lg border px-3 py-2.5 space-y-1.5 ${SLOT_COLORS[slot].card}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">Solution {slot}</span>
                    <span className="text-sm font-bold tabular-nums">{avgRating(r).toFixed(1)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-xs opacity-80">
                    <div><span className="block opacity-70 text-[10px]">Read.</span>{r.readability}/10</div>
                    <div><span className="block opacity-70 text-[10px]">Robust.</span>{r.perceivedRobustness}/10</div>
                    <div><span className="block opacity-70 text-[10px]">Maint.</span>{r.maintenanceConfidence}/10</div>
                    <div><span className="block opacity-70 text-[10px]">Approve</span>{r.willingnessToApprove}/5</div>
                  </div>
                  <div className={`text-[10px] font-semibold mt-0.5 ${
                    r.acceptDecision === 'yes' ? 'text-green-600 dark:text-green-400' :
                    r.acceptDecision === 'no'  ? 'text-red-500 dark:text-red-400' :
                    'text-amber-600 dark:text-amber-400'
                  }`}>
                    {r.acceptDecision === 'yes' ? '✓ Approve' : r.acceptDecision === 'no' ? '✗ Reject' : r.acceptDecision === 'needs_changes' ? '~ Changes' : '—'}
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
                  onClick={() => handleBestChoice(slot)}
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

          {/* Explanation (spoken) */}
          <div className="space-y-1.5">
            <label htmlFor="final-explanation" className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Why are you accepting this solution?{' '}
              <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
            </label>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Speak your answer naturally — click record and explain your reasoning out loud.
            </p>
            <VoiceTextArea
              id="final-explanation"
              value={explanation}
              onChange={handleExplanation}
              placeholder="e.g. variable naming, edge case handling, algorithm clarity, code length…"
              rows={3}
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
                {bestChoice && !explanation.trim() ? 'Add an explanation.' : ''}
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
