import { useRef, KeyboardEvent } from 'react';
import { SlotLabel, SLOT_LABELS } from '../../types';

const SLOT_STYLES: Record<SlotLabel, { base: string; active: string }> = {
  A: {
    base:   'border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-300 dark:hover:bg-violet-900',
    active: 'border-violet-500 bg-violet-600 text-white shadow-md',
  },
  B: {
    base:   'border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-300 dark:hover:bg-sky-900',
    active: 'border-sky-500 bg-sky-600 text-white shadow-md',
  },
};

interface SolutionSwitcherProps {
  activeSlot: SlotLabel;
  onSelect: (slot: SlotLabel) => void;
  /** Whether each slot's rating *and* comprehension check are both done. */
  done: Partial<Record<SlotLabel, boolean>>;
}

export function SolutionSwitcher({ activeSlot, onSelect, done }: SolutionSwitcherProps) {
  const doneCount = SLOT_LABELS.filter(s => !!done[s]).length;
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Arrow-key navigation through tabs
  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, idx: number) => {
    let next = -1;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      next = (idx + 1) % SLOT_LABELS.length;
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      next = (idx - 1 + SLOT_LABELS.length) % SLOT_LABELS.length;
    }
    if (next !== -1) {
      onSelect(SLOT_LABELS[next]);
      btnRefs.current[next]?.focus();
    }
  };

  return (
    <div
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm px-4 py-3"
      aria-label="Solution navigation"
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          Solutions
        </span>
        <span className="text-xs text-slate-400 dark:text-slate-500 tabular-nums">
          {doneCount} / {SLOT_LABELS.length} done
        </span>
      </div>

      {/* Tab buttons — 2 columns */}
      <div
        role="tablist"
        aria-label="Solution tabs"
        className="grid grid-cols-2 gap-2"
      >
        {SLOT_LABELS.map((slot, idx) => {
          const isActive = slot === activeSlot;
          const isDone   = !!done[slot];
          const style    = SLOT_STYLES[slot];
          return (
            <button
              key={slot}
              ref={el => { btnRefs.current[idx] = el; }}
              role="tab"
              aria-selected={isActive}
              aria-label={`Solution ${slot}${isDone ? ', fully reviewed' : ', not yet fully reviewed'}`}
              tabIndex={isActive ? 0 : -1}
              onKeyDown={e => handleKeyDown(e, idx)}
              onClick={() => onSelect(slot)}
              className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border text-sm font-semibold
                          transition-all focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2
                          dark:focus-visible:ring-offset-slate-900
                          ${isActive ? style.active : style.base}`}
            >
              <span>Solution {slot}</span>
              {isDone && (
                <span
                  className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0
                              ${isActive ? 'bg-white/25' : 'bg-green-500'}`}
                  aria-hidden="true"
                >
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
