import { useEffect, useState, useCallback, lazy, Suspense } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { ProblemStatement } from '../components/review/ProblemStatement';
import { SolutionSwitcher } from '../components/review/SolutionSwitcher';
const CodeViewer = lazy(() =>
  import('../components/review/CodeViewer').then(m => ({ default: m.CodeViewer }))
);
import { ReviewForm } from '../components/review/ReviewForm';
import { FinalAssessmentForm } from '../components/review/FinalAssessmentForm';
import { Button } from '../components/ui/Button';
import { useStudy } from '../state/StudyContext';
import { loadQuestion } from '../data/loader';
import { StudyQuestion, SlotLabel, SlotRating, FinalAssessment, SLOT_LABELS } from '../types';
import { allRated } from '../utils/helpers';

const LANGUAGES = ['Python', 'Java'];

// Progress bar for rated-solutions count
function RatingProgress({ rated }: { rated: number }) {
  return (
    <div
      role="progressbar"
      aria-valuenow={rated}
      aria-valuemin={0}
      aria-valuemax={4}
      aria-label={`${rated} of 4 solutions rated`}
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Progress</span>
        <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
          {rated} / 4 solutions rated
        </span>
      </div>
      <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-500 rounded-full transition-all duration-300"
          style={{ width: `${(rated / 4) * 100}%` }}
        />
      </div>
      {rated < 4 && (
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
          {4 - rated} more to go before the final assessment unlocks.
        </p>
      )}
    </div>
  );
}

export default function QuestionReviewPage() {
  const { category, questionId } = useParams<{ category: string; questionId: string }>();
  const navigate = useNavigate();
  const { state, startReview, setActiveSlot, rateSlot, submitAssessment } = useStudy();

  const [question,   setQuestion]   = useState<StudyQuestion | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [language,   setLanguage]   = useState('');
  const [langPicked, setLangPicked] = useState(false);

  if (!state.participant) return <Navigate to="/participant" replace />;

  // Load question data
  useEffect(() => {
    if (!questionId) return;
    setLoading(true);
    setError('');
    loadQuestion(questionId)
      .then(q => {
        if (!q) { setError('Question not found.'); return; }
        setQuestion(q);
      })
      .catch(() => setError('Failed to load question data.'))
      .finally(() => setLoading(false));
  }, [questionId]);

  const handleLanguagePick = (lang: string) => {
    if (!question) return;
    setLanguage(lang);
    setLangPicked(true);
    startReview(question, lang);
  };

  const review        = state.review;
  const activeSlot    = review?.activeSlot ?? 'A';
  const ratings       = review?.slotRatings ?? {};
  const ratedCount    = SLOT_LABELS.filter(s => !!ratings[s]).length;
  const allDone       = allRated(ratings);
  const activeSlotData = review?.slots.find(s => s.label === activeSlot);

  const handleRate = useCallback((rating: SlotRating) => {
    rateSlot(activeSlot, rating);
    const next = SLOT_LABELS.find(s => s !== activeSlot && !ratings[s]);
    if (next) setActiveSlot(next);
  }, [activeSlot, ratings, rateSlot, setActiveSlot]);

  const handleAssessment = (a: FinalAssessment) => submitAssessment(a);
  const handleFinish     = () => navigate('/complete');

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
        <Header step={4} back={langPicked ? undefined : `/categories/${category}`} />
        <div className="flex-1 flex items-center justify-center text-slate-400 dark:text-slate-500 gap-2">
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm">Loading…</span>
        </div>
      </div>
    );
  }

  if (error || !question) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
        <Header step={4} back={langPicked ? undefined : `/categories/${category}`} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <p className="text-red-600 dark:text-red-400 text-sm">{error || 'Question not found.'}</p>
            {!langPicked && (
              <Button variant="secondary" onClick={() => navigate(`/categories/${category}`)}>
                ← Back to questions
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <Header step={4} back={langPicked ? undefined : `/categories/${category}`} />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 space-y-4">

        <ProblemStatement question={question} language={language || '—'} />

        {/* Language picker */}
        {!langPicked && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm px-5 py-5">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">
              Choose the language to review
            </p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Select language">
              {LANGUAGES.filter(l => question.supportedLanguages.includes(l)).map(lang => (
                <button
                  key={lang}
                  onClick={() => handleLanguagePick(lang)}
                  className="px-5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600
                             bg-white dark:bg-slate-800 text-sm font-semibold
                             text-slate-700 dark:text-slate-200
                             hover:border-indigo-400 hover:text-indigo-700 hover:bg-indigo-50
                             dark:hover:border-indigo-500 dark:hover:text-indigo-300 dark:hover:bg-indigo-950
                             transition-all focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2
                             dark:focus-visible:ring-offset-slate-900"
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>
        )}

        {langPicked && review && (
          <>
            <SolutionSwitcher
              activeSlot={activeSlot}
              onSelect={setActiveSlot}
              ratings={ratings}
            />

            {activeSlotData && (
              <Suspense fallback={
                <div className="rounded-xl bg-[#161b2e] border border-slate-700/60 h-48 flex items-center justify-center">
                  <svg className="w-4 h-4 animate-spin text-slate-500" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              }>
                <CodeViewer
                  code={activeSlotData.code}
                  language={language}
                  slot={activeSlot}
                />
              </Suspense>
            )}

            <RatingProgress rated={ratedCount} />

            {!allDone && (
              <ReviewForm
                slot={activeSlot}
                existing={ratings[activeSlot]}
                onSubmit={handleRate}
              />
            )}

            {allDone && (
              <FinalAssessmentForm
                ratings={ratings as Record<SlotLabel, SlotRating>}
                existing={review.finalAssessment}
                onSubmit={handleAssessment}
                onNext={handleFinish}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
