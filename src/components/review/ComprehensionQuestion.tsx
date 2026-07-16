import { useState } from 'react';
import { SlotLabel } from '../../types';
import { Button } from '../ui/Button';

const SLOT_ACCENT: Record<SlotLabel, string> = {
  A: 'border-violet-200 dark:border-violet-800',
  B: 'border-sky-200     dark:border-sky-800',
};

interface ComprehensionQuestionProps {
  slot: SlotLabel;
  input: string;
  options: string[];
  onSubmit: (selectedIndex: number) => void;
}

/**
 * An objective "what does this code actually output" check, asked once per
 * solution right after its subjective ratings are submitted. Unlike the
 * ratings above, this has a single correct answer and isn't shown to the
 * participant — it's silently recorded (answer + time taken) to gauge
 * genuine comprehension rather than surface impressions.
 */
export function ComprehensionQuestion({ slot, input, options, onSubmit }: ComprehensionQuestionProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (selected === null || submitted) return;
    setSubmitted(true);
    onSubmit(selected);
  };

  return (
    <section
      className={`rounded-xl border shadow-sm overflow-hidden ${SLOT_ACCENT[slot]}`}
      aria-label={`Comprehension check for Solution ${slot}`}
    >
      <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <svg className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Quick check — Solution {slot}
        </span>
      </div>

      <div className="px-5 py-5 space-y-4 bg-white/70 dark:bg-slate-900/70">
        <div className="space-y-1.5">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            What does this code output for the following input?
          </p>
          <p className="font-mono text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-700 dark:text-slate-200">
            {input}
          </p>
        </div>

        <div className="space-y-2" role="radiogroup" aria-label="Answer options">
          {options.map((opt, i) => (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={selected === i}
              disabled={submitted}
              onClick={() => setSelected(i)}
              className={`w-full text-left px-3.5 py-2.5 text-sm font-mono rounded-lg border transition-all
                focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2
                dark:focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed
                ${selected === i
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-200 dark:ring-indigo-800 ring-offset-1'
                  : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-indigo-300'}`}
            >
              {opt}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 pt-1">
          <Button type="button" onClick={handleSubmit} disabled={selected === null || submitted}>
            {submitted ? 'Answer recorded' : 'Submit Answer'}
          </Button>
          {selected === null && !submitted && (
            <p className="text-xs text-slate-400 dark:text-slate-500">Pick an option to continue.</p>
          )}
        </div>
      </div>
    </section>
  );
}
