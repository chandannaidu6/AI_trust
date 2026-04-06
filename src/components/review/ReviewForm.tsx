import { useState, useEffect, FormEvent } from 'react';
import { SlotLabel, SlotRating } from '../../types';
import { ScoreButtons } from '../ui/ScoreButtons';
import { Button } from '../ui/Button';

const SLOT_ACCENT: Record<SlotLabel, string> = {
  A: 'border-violet-200 dark:border-violet-800',
  B: 'border-sky-200     dark:border-sky-800',
  C: 'border-emerald-200 dark:border-emerald-800',
  D: 'border-amber-200   dark:border-amber-800',
};

// Explicit active classes per option — avoids dynamically constructed class strings
// that Tailwind's static analyser cannot detect and will not include in the bundle.
const BUG_OPTIONS = [
  {
    value:      'none'  as const,
    label:      'No concerns',
    inactiveCls: 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-green-400 hover:text-green-700',
    activeCls:   'border-green-500 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 ring-2 ring-green-200 dark:ring-green-800 ring-offset-1',
  },
  {
    value:      'minor' as const,
    label:      'Minor concerns',
    inactiveCls: 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-amber-400 hover:text-amber-700',
    activeCls:   'border-amber-500 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 ring-2 ring-amber-200 dark:ring-amber-800 ring-offset-1',
  },
  {
    value:      'major' as const,
    label:      'Significant concerns',
    inactiveCls: 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-red-400 hover:text-red-700',
    activeCls:   'border-red-500 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 ring-2 ring-red-200 dark:ring-red-800 ring-offset-1',
  },
] as const;

const DEFAULT: SlotRating = {
  trustScore:            0,
  readability:           0,
  correctnessConfidence: 0,
  bugConcern:            'none',
  notes:                 '',
};

interface ReviewFormProps {
  slot:      SlotLabel;
  existing?: SlotRating;
  onSubmit:  (rating: SlotRating) => void;
}

export function ReviewForm({ slot, existing, onSubmit }: ReviewFormProps) {
  const [form,  setForm]  = useState<SlotRating>(existing ?? DEFAULT);
  const [saved, setSaved] = useState(!!existing);

  // Reset when navigating to a different slot tab
  useEffect(() => {
    setForm(existing ?? DEFAULT);
    setSaved(!!existing);
  }, [slot, existing]);

  const valid =
    form.trustScore > 0 &&
    form.readability > 0 &&
    form.correctnessConfidence > 0;

  const set = <K extends keyof SlotRating>(key: K, val: SlotRating[K]) => {
    setForm(f => ({ ...f, [key]: val }));
    setSaved(false);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    onSubmit(form);
    setSaved(true);
  };

  const missing = [
    form.trustScore            === 0 && 'Trust',
    form.correctnessConfidence === 0 && 'Correctness',
    form.readability           === 0 && 'Readability',
  ].filter(Boolean);

  return (
    <section
      className={`rounded-xl border shadow-sm overflow-hidden ${SLOT_ACCENT[slot]}`}
      aria-label={`Review form for Solution ${slot}`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <svg className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Rate Solution {slot}
        </span>
        {saved && (
          <span className="ml-auto flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Saved
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} noValidate className="px-5 py-5 space-y-6 bg-white/70 dark:bg-slate-900/70">
        {/* Required ratings */}
        <fieldset className="space-y-5 border-0 p-0 m-0">
          <legend className="sr-only">Required ratings for Solution {slot}</legend>
          <ScoreButtons
            label="Trust"
            description="How much do you trust this solution is correct?"
            value={form.trustScore}
            onChange={v => set('trustScore', v)}
          />
          <ScoreButtons
            label="Correctness"
            description="Does it handle all edge cases?"
            value={form.correctnessConfidence}
            onChange={v => set('correctnessConfidence', v)}
          />
          <ScoreButtons
            label="Readability"
            description="How easy is this to read and follow?"
            value={form.readability}
            onChange={v => set('readability', v)}
          />
        </fieldset>

        {/* Bug concern */}
        <div className="space-y-2">
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Bug concern
          </span>
          <div className="flex gap-2 flex-wrap" role="radiogroup" aria-label="Bug concern level">
            {BUG_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={form.bugConcern === opt.value}
                onClick={() => set('bugConcern', opt.value)}
                className={`px-3.5 py-2 text-xs font-medium rounded-lg border transition-all
                  focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2
                  dark:focus-visible:ring-offset-slate-900
                  ${form.bugConcern === opt.value ? opt.activeCls : opt.inactiveCls}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <label
            htmlFor={`notes-${slot}`}
            className="text-sm font-semibold text-slate-800 dark:text-slate-200"
          >
            Notes{' '}
            <span className="text-slate-400 dark:text-slate-500 font-normal">(optional)</span>
          </label>
          <textarea
            id={`notes-${slot}`}
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            placeholder="What stood out? Any specific observations…"
            rows={2}
            className="w-full text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5
                       text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800
                       placeholder:text-slate-300 dark:placeholder:text-slate-500
                       focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                       resize-none"
          />
        </div>

        {/* Submit */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Button type="submit" disabled={!valid}>
            {saved ? 'Update Rating' : 'Save Rating'}
          </Button>
          {!valid && missing.length > 0 && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Please rate:{' '}
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {missing.join(', ')}
              </span>
            </p>
          )}
        </div>
      </form>
    </section>
  );
}
