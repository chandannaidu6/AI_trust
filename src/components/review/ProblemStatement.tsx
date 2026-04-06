import { useState } from 'react';
import { StudyQuestion } from '../../types';
import { Badge } from '../ui/Badge';

interface ProblemStatementProps {
  question: StudyQuestion;
  language: string;
}

export function ProblemStatement({ question, language }: ProblemStatementProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex-wrap">
        <span className="font-mono text-xs text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
          {question.id}
        </span>
        <Badge color="green">{question.difficulty}</Badge>
        <Badge color="indigo">{question.category}</Badge>
        {language && language !== '—' && <Badge color="sky">{language}</Badge>}
        {question.acceptanceRate && (
          <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
            ~{question.acceptanceRate}% acceptance
          </span>
        )}

        <button
          onClick={() => setCollapsed(c => !c)}
          aria-expanded={!collapsed}
          aria-controls="problem-body"
          className="ml-auto text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1 transition-colors"
        >
          {collapsed ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              Show problem
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              Hide
            </>
          )}
        </button>
      </div>

      {!collapsed && (
        <div id="problem-body" className="px-5 py-5 space-y-4">
          {/* Study note */}
          <div className="flex items-start gap-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg px-3.5 py-2.5">
            <svg className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-amber-800 dark:text-amber-300 font-medium leading-relaxed">
              All solutions are assumed to pass the same hidden test suite. Tests are not shown.
              Evaluate code quality, clarity, and correctness on its own merits.
            </p>
          </div>

          {/* Title */}
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{question.title}</h2>

          {/* Prompt */}
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{question.paraphrasedPrompt}</p>

          {/* Examples */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {question.examples.map((ex, i) => (
              <div key={i} className="space-y-2">
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    {question.examples.length > 1 ? `Example ${i + 1} — Input` : 'Input'}
                  </p>
                  <pre className="text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-700 dark:text-slate-300 overflow-x-auto">
                    {ex.input}
                  </pre>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Output</p>
                  <pre className="text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-700 dark:text-slate-300 overflow-x-auto">
                    {ex.output}
                  </pre>
                </div>
              </div>
            ))}
          </div>

          {/* Constraints */}
          {question.constraints.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Constraints</p>
              <div className="flex flex-wrap gap-2">
                {question.constraints.map((c, i) => (
                  <span key={i} className="text-xs font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-md">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
