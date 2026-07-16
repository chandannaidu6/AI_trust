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
import { StudyQuestion, SlotLabel, SlotRating, FinalAssessment, SLOT_LABELS, DIFFICULTIES } from '../types';
import { allRated } from '../utils/helpers';
import { buildExportPayload, submitToSheets, SheetSubmitStatus } from '../utils/export';

// Progress bar for rated-solutions count
const TOTAL_SLOTS = SLOT_LABELS.length;

function RatingProgress({ rated }: { rated: number }) {
  return (
    <div
      role="progressbar"
      aria-valuenow={rated}
      aria-valuemin={0}
      aria-valuemax={TOTAL_SLOTS}
      aria-label={`${rated} of ${TOTAL_SLOTS} solutions rated`}
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Progress</span>
        <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
          {rated} / {TOTAL_SLOTS} solutions rated
        </span>
      </div>
      <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-500 rounded-full transition-all duration-300"
          style={{ width: `${(rated / TOTAL_SLOTS) * 100}%` }}
        />
      </div>
      {rated < TOTAL_SLOTS && (
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
          {TOTAL_SLOTS - rated} more to go before the final assessment unlocks.
        </p>
      )}
    </div>
  );
}

export default function QuestionReviewPage() {
  const { category, questionId } = useParams<{ category: string; questionId: string }>();
  const navigate = useNavigate();
  const {
    state, startReview, setActiveSlot, rateSlot, submitAssessment,
    updateDraftRating, updateDraftAssessment,
  } = useStudy();

  const [question,     setQuestion]     = useState<StudyQuestion | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [started,      setStarted]      = useState(false);
  const [sheetStatus,  setSheetStatus]  = useState<SheetSubmitStatus>('idle');

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

  // Every question supports exactly one language, so there's nothing to ask —
  // start (or resume, if already begun this session) automatically.
  useEffect(() => {
    if (!question || started) return;
    const lang = question.supportedLanguages[0];
    if (!lang) return;
    setStarted(true);
    startReview(question, lang);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question]);

  const language       = question?.supportedLanguages[0] ?? '';
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

  // Would submitting this question's assessment complete all 3 required
  // difficulties (Easy/Medium/Hard)? Computed from state *before* this
  // submission, so it treats this question's own difficulty as "about to be done".
  const willCompleteStudy = !!question &&
    DIFFICULTIES.every(d => d === question.difficulty || state.completedDifficulties[d]);

  const handleAssessment = async (a: FinalAssessment) => {
    submitAssessment(a);
    if (!state.participant || !review) return;

    setSheetStatus('submitting');
    const payload = buildExportPayload(state.participant, { ...review, finalAssessment: a });
    const status = payload ? await submitToSheets(payload) : 'unconfigured';
    setSheetStatus(status);

    // The last of the 3 required reviews finishes the whole study automatically —
    // no separate "finish" click needed.
    if (willCompleteStudy) navigate('/complete');
  };

  const handleFinish = () => navigate('/categories');

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
        <Header step={4} back={`/categories/${category}`} />
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
        <Header step={4} back={`/categories/${category}`} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <p className="text-red-600 dark:text-red-400 text-sm">{error || 'Question not found.'}</p>
            <Button variant="secondary" onClick={() => navigate(`/categories/${category}`)}>
              ← Back to questions
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <Header step={4} back={`/categories/${category}/${question.difficulty}`} />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 space-y-4">

        <ProblemStatement question={question} language={language || '—'} />

        {review && (
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
                draft={review?.draftRatings[activeSlot]}
                onDraftChange={rating => updateDraftRating(activeSlot, rating)}
                onSubmit={handleRate}
              />
            )}

            {allDone && sheetStatus === 'submitting' && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 text-sm text-indigo-700 dark:text-indigo-300">
                <svg className="w-4 h-4 animate-spin shrink-0" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving your responses — please do not close this tab until this finishes.
              </div>
            )}

            {allDone && sheetStatus === 'error' && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
                Could not reach Google Sheets — your response is still saved in this session. You
                can download a backup copy from the summary page.
              </div>
            )}

            {allDone && (
              <FinalAssessmentForm
                ratings={ratings as Record<SlotLabel, SlotRating>}
                existing={review.finalAssessment}
                draft={review.draftAssessment}
                onDraftChange={updateDraftAssessment}
                onSubmit={handleAssessment}
                onNext={handleFinish}
                submitting={sheetStatus === 'submitting'}
                isFinalReview={willCompleteStudy}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
