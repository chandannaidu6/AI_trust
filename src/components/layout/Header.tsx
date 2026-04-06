import { Fragment } from 'react';
import { Link } from 'react-router-dom';

interface HeaderProps {
  step?: number;
  totalSteps?: number;
  back?: string;
}

const STEPS = ['Background', 'Category', 'Questions', 'Review', 'Complete'];

export function Header({ step, totalSteps = 5, back }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm
                       dark:bg-slate-900 dark:border-slate-700">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">

        {/* Back arrow */}
        {back && (
          <Link
            to={back}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100
                       dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors"
            aria-label="Go back"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
        )}

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </div>
          <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm hidden sm:block">
            Code Review Study
          </span>
        </Link>

        {/* Step progress */}
        {step !== undefined && (
          <nav
            aria-label="Progress"
            className="flex items-center gap-1 ml-auto"
          >
            {/* Mobile: "Step N of 5" text */}
            <span className="text-xs text-slate-500 dark:text-slate-400 sm:hidden">
              Step {step} of {totalSteps}
            </span>

            {/* Desktop: full step dots */}
            <ol className="hidden sm:flex items-center gap-1">
              {STEPS.slice(0, totalSteps).map((label, i) => {
                const n = i + 1;
                const done   = n < step;
                const active = n === step;
                return (
                  <Fragment key={n}>
                    <li className="flex items-center gap-1">
                      <div
                        aria-current={active ? 'step' : undefined}
                        className={`w-6 h-6 rounded-full text-xs font-semibold flex items-center justify-center transition-colors ${
                          done
                            ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300'
                            : active
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                        }`}
                      >
                        {done ? (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <span aria-hidden="true">{n}</span>
                        )}
                        <span className="sr-only">{label}{done ? ' (complete)' : active ? ' (current)' : ''}</span>
                      </div>
                      <span className={`text-xs hidden md:block ${
                        active
                          ? 'text-slate-700 dark:text-slate-200 font-medium'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}>
                        {label}
                      </span>
                    </li>
                    {i < totalSteps - 1 && (
                      <li aria-hidden="true" className={`w-5 h-px ${n < step ? 'bg-indigo-300 dark:bg-indigo-700' : 'bg-slate-200 dark:bg-slate-700'}`} />
                    )}
                  </Fragment>
                );
              })}
            </ol>
          </nav>
        )}
      </div>
    </header>
  );
}
