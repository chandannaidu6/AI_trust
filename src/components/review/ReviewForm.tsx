import { useState, useEffect, FormEvent } from 'react';
import { SlotLabel, SlotRating, AcceptDecision } from '../../types';
import { ScoreButtons } from '../ui/ScoreButtons';
import { Button } from '../ui/Button';

const SLOT_ACCENT: Record<SlotLabel, string> = {
  A: 'border-violet-200 dark:border-violet-800',
  B: 'border-sky-200     dark:border-sky-800',
};

const ACCEPT_OPTIONS: {
  value: AcceptDecision;
  label: string;
  inactiveCls: string;
  activeCls: string;
}[] = [
  {
    value: 'yes',
    label: 'Yes, approve',
    inactiveCls: 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-green-400 hover:text-green-700',
    activeCls:   'border-green-500 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 ring-2 ring-green-200 dark:ring-green-800 ring-offset-1',
  },
  {
    value: 'needs_changes',
    label: 'Needs changes',
    inactiveCls: 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-amber-400 hover:text-amber-700',
    activeCls:   'border-amber-500 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 ring-2 ring-amber-200 dark:ring-amber-800 ring-offset-1',
  },
  {
    value: 'no',
    label: 'No, reject',
    inactiveCls: 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-red-400 hover:text-red-700',
    activeCls:   'border-red-500 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 ring-2 ring-red-200 dark:ring-red-800 ring-offset-1',
  },
];

const MIN_EXPLANATION_LENGTH = 25;

const DEFAULT: SlotRating = {
  readability:               0,
  perceivedRobustness:       0,
  maintenanceConfidence:     0,
  perceivedAuthorCompetence: 0,
  willingnessToApprove:      0,
  hiddenComplexity:          0,
  acceptDecision:            null,
  briefExplanation:          '',
};

interface ReviewFormProps {
  slot:      SlotLabel;
  existing?: SlotRating;
  draft?: SlotRating;
  onDraftChange: (rating: SlotRating) => void;
  onSubmit:  (rating: SlotRating) => void;
}

export function ReviewForm({ slot, existing, draft, onDraftChange, onSubmit }: ReviewFormProps) {
  const [form,  setForm]  = useState<SlotRating>(existing ?? draft ?? DEFAULT);
  const [saved, setSaved] = useState(!!existing);

  // Only resync when switching slots — not on every keystroke, or a draft
  // auto-save would fight with in-progress typing.
  useEffect(() => {
    setForm(existing ?? draft ?? DEFAULT);
    setSaved(!!existing);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slot]);

  const numericComplete =
    form.readability > 0 &&
    form.perceivedRobustness > 0 &&
    form.maintenanceConfidence > 0 &&
    form.perceivedAuthorCompetence > 0 &&
    form.willingnessToApprove > 0 &&
    form.hiddenComplexity > 0;

  const explanationLength = form.briefExplanation.trim().length;
  const explanationValid = explanationLength >= MIN_EXPLANATION_LENGTH;
  const valid = numericComplete && form.acceptDecision !== null && explanationValid;

  const set = <K extends keyof SlotRating>(key: K, val: SlotRating[K]) => {
    const next = { ...form, [key]: val };
    setForm(next);
    setSaved(false);
    onDraftChange(next);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    onSubmit(form);
    setSaved(true);
  };

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

        {/* Q1–Q4: 1–10 scales */}
        <fieldset className="space-y-5 border-0 p-0 m-0">
          <legend className="sr-only">Code quality ratings for Solution {slot}</legend>
          <ScoreButtons
            label="Readability"
            description="How easy is this code to visually read and navigate?"
            value={form.readability}
            onChange={v => set('readability', v)}
            max={10}
          />
          <ScoreButtons
            label="Perceived robustness"
            description="How confident are you that this code handles edge cases and unusual inputs correctly?"
            value={form.perceivedRobustness}
            onChange={v => set('perceivedRobustness', v)}
            max={10}
          />
          <ScoreButtons
            label="Maintenance confidence"
            description="How confident would you be modifying or extending this code six months from now?"
            value={form.maintenanceConfidence}
            onChange={v => set('maintenanceConfidence', v)}
            max={10}
          />
          <ScoreButtons
            label="Perceived author competence"
            description="Based on this code alone, how skilled does the author appear to be?"
            value={form.perceivedAuthorCompetence}
            onChange={v => set('perceivedAuthorCompetence', v)}
            max={10}
          />
        </fieldset>

        {/* Q5: Willingness to approve 1–5 */}
        <ScoreButtons
          label="Willingness to approve"
          description="Would you approve this code in a real code review at work? (1 = definitely not · 5 = definitely yes)"
          value={form.willingnessToApprove}
          onChange={v => set('willingnessToApprove', v)}
          max={5}
        />

        {/* Q6: Hidden complexity 1–10 */}
        <ScoreButtons
          label="Hidden complexity"
          description="How much non-obvious complexity or subtle risk is lurking beneath the surface of this code? (Higher means worse: more hidden risk.)"
          value={form.hiddenComplexity}
          onChange={v => set('hiddenComplexity', v)}
          max={10}
        />

        {/* Q7: Accept decision */}
        <div className="space-y-2">
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Would you accept this code?{' '}
            <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
          </span>
          <div className="flex gap-2 flex-wrap" role="radiogroup" aria-label="Accept decision">
            {ACCEPT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={form.acceptDecision === opt.value}
                onClick={() => set('acceptDecision', opt.value)}
                className={`px-3.5 py-2 text-xs font-medium rounded-lg border transition-all
                  focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2
                  dark:focus-visible:ring-offset-slate-900
                  ${form.acceptDecision === opt.value ? opt.activeCls : opt.inactiveCls}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Q8: Brief explanation */}
        <div className="space-y-1.5">
          <label
            htmlFor={`explanation-${slot}`}
            className="text-sm font-semibold text-slate-800 dark:text-slate-200"
          >
            Briefly explain why you would or would not accept this code{' '}
            <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
          </label>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            At least {MIN_EXPLANATION_LENGTH} characters. Give a real reason, not just "yes" or "looks fine".
          </p>
          <textarea
            id={`explanation-${slot}`}
            value={form.briefExplanation}
            onChange={e => set('briefExplanation', e.target.value)}
            placeholder="e.g. clear naming but risky edge case handling, overly complex for the problem…"
            rows={2}
            className="w-full text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5
                       text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800
                       placeholder:text-slate-300 dark:placeholder:text-slate-500
                       focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                       resize-none"
          />
          <p className={`text-xs text-right ${explanationValid ? 'text-green-600 dark:text-green-400' : 'text-slate-400 dark:text-slate-500'}`}>
            {explanationLength} / {MIN_EXPLANATION_LENGTH} characters minimum
          </p>
        </div>

        {/* Submit */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Button type="submit" disabled={!valid}>
            {saved ? 'Update Rating' : 'Save Rating'}
          </Button>
          {!valid && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {!numericComplete && 'Complete all ratings. '}
              {numericComplete && !form.acceptDecision && 'Choose accept/reject. '}
              {numericComplete && form.acceptDecision && !explanationValid &&
                (explanationLength === 0
                  ? 'Add a brief explanation.'
                  : `Add ${MIN_EXPLANATION_LENGTH - explanationLength} more character${MIN_EXPLANATION_LENGTH - explanationLength === 1 ? '' : 's'} to your explanation.`)}
            </p>
          )}
        </div>
      </form>
    </section>
  );
}
