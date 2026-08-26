interface WordScaleOption {
  value: number;
  label: string;
}

interface WordScaleProps {
  label: string;
  description?: string;
  value: number;
  onChange: (v: number) => void;
  options: WordScaleOption[];
  /** For a dimension where the first option is the *good* answer (e.g.
   * hidden complexity, where 1 = none), flip the red→green ramp so color
   * still tracks "bad → good" left to right instead of "low → high". */
  reverseColors?: boolean;
}

// Same 4-stage color ramp used for the accept-decision question, ordered to
// match each question's own options array — so for a question where a low
// number is the *good* answer (hidden complexity), pass options with the
// colors already in the right order rather than assuming "high = green".
const RAMP_CLASSES = [
  {
    inactive: 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-red-400 hover:text-red-700',
    active:   'border-red-500 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 ring-2 ring-red-200 dark:ring-red-800 ring-offset-1',
  },
  {
    inactive: 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-amber-400 hover:text-amber-700',
    active:   'border-amber-500 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 ring-2 ring-amber-200 dark:ring-amber-800 ring-offset-1',
  },
  {
    inactive: 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-lime-400 hover:text-lime-700',
    active:   'border-lime-500 bg-lime-50 dark:bg-lime-950 text-lime-700 dark:text-lime-300 ring-2 ring-lime-200 dark:ring-lime-800 ring-offset-1',
  },
  {
    inactive: 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-green-400 hover:text-green-700',
    active:   'border-green-500 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 ring-2 ring-green-200 dark:ring-green-800 ring-offset-1',
  },
];

export function WordScale({ label, description, value, onChange, options, reverseColors }: WordScaleProps) {
  const question = description || label;

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{question}</p>
      <div className="flex gap-2 flex-wrap" role="radiogroup" aria-label={question} aria-required="true">
        {options.map((opt, idx) => {
          const rampIdx = reverseColors ? options.length - 1 - idx : idx;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={value === opt.value}
              onClick={() => onChange(opt.value)}
              className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all text-left
                focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2
                dark:focus-visible:ring-offset-slate-900
                ${value === opt.value ? RAMP_CLASSES[rampIdx].active : RAMP_CLASSES[rampIdx].inactive}`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
