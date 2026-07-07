import { StudyQuestion } from '../../types';
import { Badge } from '../ui/Badge';

interface QuestionCardProps {
  question: StudyQuestion;
  index:    number;
  onClick:  () => void;
}

export function QuestionCard({ question, index, onClick }: QuestionCardProps) {
  return (
    <button
      id={`question-card-${question.id}`}
      onClick={onClick}
      className="w-full text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700
                 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-600
                 hover:-translate-y-0.5 transition-all group
                 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2
                 dark:focus-visible:ring-offset-slate-950"
    >
      <div className="flex items-start gap-3">
        {/* Index number */}
        <span className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400
                         text-xs font-bold flex items-center justify-center shrink-0 mt-0.5
                         group-hover:bg-indigo-100 group-hover:text-indigo-600
                         dark:group-hover:bg-indigo-950 dark:group-hover:text-indigo-300 transition-colors"
          aria-hidden="true"
        >
          {index + 1}
        </span>

        <div className="flex-1 min-w-0 space-y-2">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors leading-snug">
            {question.title}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
            {question.summary}
          </p>
          <div className="flex items-center gap-2 flex-wrap pt-0.5">
            <Badge color="green">{question.difficulty}</Badge>
            {question.acceptanceRate && (
              <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                ~{question.acceptanceRate}%
              </span>
            )}
            <div className="flex gap-1 ml-auto">
              {question.supportedLanguages.map(lang => (
                <span
                  key={lang}
                  className="text-xs font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                >
                  {lang}
                </span>
              ))}
            </div>
          </div>
        </div>

        <svg
          className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 transition-colors shrink-0 mt-0.5"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}
