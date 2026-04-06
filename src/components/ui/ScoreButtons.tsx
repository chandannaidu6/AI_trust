import { useRef, KeyboardEvent } from 'react';

interface ScoreButtonsProps {
  value: number;
  onChange: (v: number) => void;
  label: string;
  description?: string;
  min?: number;
  max?: number;
}

export function ScoreButtons({
  value,
  onChange,
  label,
  description,
  min = 1,
  max = 5,
}: ScoreButtonsProps) {
  const range = Array.from({ length: max - min + 1 }, (_, i) => i + min);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, idx: number) => {
    let next = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      next = Math.min(idx + 1, range.length - 1);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      next = Math.max(idx - 1, 0);
    }
    if (next !== -1) {
      onChange(range[next]);
      btnRefs.current[next]?.focus();
    }
  };

  const tabTarget = value >= min && value <= max ? value - min : 0;

  // Smaller buttons for 1–10 scale so they fit on mobile
  const btnCls = max > 5
    ? 'w-8 h-8 rounded-md text-xs font-semibold border transition-all focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-slate-900'
    : 'w-10 h-10 rounded-lg text-sm font-semibold border transition-all focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{label}</span>
        {description && (
          <span className="text-xs text-slate-400 dark:text-slate-500 text-right">{description}</span>
        )}
      </div>
      <div
        className="flex gap-1 flex-wrap"
        role="radiogroup"
        aria-label={label}
        aria-required="true"
      >
        {range.map((n, idx) => (
          <button
            key={n}
            ref={el => { btnRefs.current[idx] = el; }}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} out of ${max}`}
            tabIndex={idx === tabTarget ? 0 : -1}
            onKeyDown={e => handleKeyDown(e, idx)}
            onClick={() => onChange(n)}
            className={`${btnCls} ${
              n <= value
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-400 hover:text-indigo-600 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-600 dark:hover:border-indigo-500 dark:hover:text-indigo-300'
            }`}
          >
            {n}
          </button>
        ))}
        <span className="text-xs text-slate-400 dark:text-slate-500 self-center ml-1 tabular-nums">
          {value > 0 ? `${value}/${max}` : `—/${max}`}
        </span>
      </div>
    </div>
  );
}
