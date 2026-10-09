import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { PageContainer } from '../components/layout/PageContainer';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useStudy } from '../state/StudyContext';
import { SLOT_LABELS, DIFFICULTIES, ReviewSession } from '../types';
import { avgRating } from '../utils/helpers';
import {
  buildExportPayload,
  downloadExportJSON,
  downloadExportCSV,
  copyExportJSON,
  ExportPayload,
} from '../utils/export';

const SLOT_COLOR = { A: 'violet', B: 'sky' } as const;

// The drawing page is a separate deployment with its own storage, so an
// email address entered there can never be linked back to study answers.
// It only opens for someone who arrives with a valid, freshly-minted
// token (see api/raffle-token.js) -- the bare URL on its own shows a
// locked message, not the entry form.
const RAFFLE_URL = import.meta.env.VITE_RAFFLE_URL ?? 'https://email-alpha-red.vercel.app';

type RaffleLinkState =
  | { status: 'idle' | 'loading' }
  | { status: 'ready'; url: string }
  | { status: 'error' };

function ReviewSummaryCard({ review }: { review: ReviewSession }) {
  const assessment = review.finalAssessment;
  const ratings = review.slotRatings;
  return (
    <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden mb-5">
      <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
        <Badge color="green">{review.question.difficulty}</Badge>
        <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {review.question.category} · {review.question.title}
        </h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-slate-100 dark:divide-slate-800 border-b border-slate-100 dark:border-slate-800">
        {[
          { label: 'Category',   value: review.question.category },
          { label: 'Question',   value: review.question.id },
          { label: 'Language',   value: review.language },
          { label: 'Difficulty', value: review.question.difficulty },
        ].map(item => (
          <div key={item.label} className="px-4 py-3.5">
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-0.5">{item.label}</p>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="px-5 py-4 space-y-3">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Your Ratings
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {SLOT_LABELS.map(slot => {
            const r = ratings[slot];
            if (!r) return (
              <div key={slot} className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 px-3 py-3 flex items-center justify-center">
                <span className="text-xs text-slate-300 dark:text-slate-600">Not rated</span>
              </div>
            );
            return (
              <div key={slot} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge color={SLOT_COLOR[slot]}>Solution {slot}</Badge>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200 tabular-nums">
                    {avgRating(r).toFixed(1)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                  <div><span className="block text-slate-400 dark:text-slate-500 text-[10px]">Read.</span>{r.readability}/4</div>
                  <div><span className="block text-slate-400 dark:text-slate-500 text-[10px]">Underst.</span>{r.understandability}/4</div>
                  <div><span className="block text-slate-400 dark:text-slate-500 text-[10px]">Robust.</span>{r.perceivedRobustness}/4</div>
                  <div><span className="block text-slate-400 dark:text-slate-500 text-[10px]">Decision</span>{r.acceptDecision ?? '-'}</div>
                </div>
              </div>
            );
          })}
        </div>

        {assessment && (
          <div className="pt-3 mt-1 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Final Assessment</p>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs text-slate-500 dark:text-slate-400">Best:</span>
              <Badge color={SLOT_COLOR[assessment.bestChoice]}>Solution {assessment.bestChoice}</Badge>
            </div>
            {assessment.explanation && (
              <p className="text-xs text-slate-500 dark:text-slate-400 italic border-l-2 border-slate-200 dark:border-slate-600 pl-3 leading-relaxed">
                "{assessment.explanation}"
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export default function CompletionPage() {
  const navigate = useNavigate();
  const { state, reset } = useStudy();
  const { participant, reviewsByQuestion, completedDifficulties } = state;

  const [copiedJSON, setCopiedJSON] = useState(false);

  const completedReviews = useMemo(
    () => Object.values(reviewsByQuestion).filter((r): r is ReviewSession => !!r.finalAssessment),
    [reviewsByQuestion],
  );
  const allRequiredDone = DIFFICULTIES.every(d => completedDifficulties[d]);

  const [raffleLink, setRaffleLink] = useState<RaffleLinkState>({ status: 'idle' });

  // Mint the one-time drawing link only once the participant has actually
  // finished all three required reviews -- matches the consent form's
  // "completing the review with valid answers" eligibility line.
  useEffect(() => {
    if (!allRequiredDone || !participant) return;
    let cancelled = false;
    setRaffleLink({ status: 'loading' });
    fetch('/api/raffle-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participantId: participant.id }),
    })
      .then(res => (res.ok ? res.json() : Promise.reject(new Error('request failed'))))
      .then((data: { token?: string }) => {
        if (cancelled || !data.token) throw new Error('missing token');
        setRaffleLink({ status: 'ready', url: `${RAFFLE_URL}/?t=${encodeURIComponent(data.token)}` });
      })
      .catch(() => {
        if (!cancelled) setRaffleLink({ status: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [allRequiredDone, participant]);

  if (!participant || completedReviews.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <p className="text-slate-500 dark:text-slate-400 text-sm">No active session found.</p>
            <Button onClick={() => navigate('/')}>Return to start</Button>
          </div>
        </div>
      </div>
    );
  }

  const payloads = completedReviews
    .map(r => buildExportPayload(participant, r))
    .filter((p): p is ExportPayload => !!p);
  const filename = `code-review-study-${participant.id}`;

  const handleCopyJSON = async () => {
    if (payloads.length === 0) return;
    await copyExportJSON(payloads);
    setCopiedJSON(true);
    setTimeout(() => setCopiedJSON(false), 2500);
  };

  const handleRestart = () => {
    reset();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <Header step={5} />
      <PageContainer narrow>

        {/* ── Thank you ──────────────────────────────────────────────────── */}
        <div className="flex items-center gap-4 py-8">
          <div className="w-14 h-14 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center shrink-0">
            <svg className="w-7 h-7 text-green-600 dark:text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Study Complete</h1>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">
              Thank you for participating. Your responses were saved automatically as you
              completed each review.
            </p>
          </div>
        </div>

        {/* ── Gift card drawing ──────────────────────────────────────────── */}
        {allRequiredDone && (
          <section
            aria-label="Gift card drawing"
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden mb-6"
          >
            <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Gift Card Drawing (Optional)
              </h2>
            </div>
            <div className="px-5 py-4 space-y-3">
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                If you would like to enter the drawing for a $100 gift card, use the link below.
                It opens a separate page that asks only for your email address. Your email is not
                connected to the answers you gave above, is used only to send the gift card if you
                win, and is deleted once the drawing is complete. You do not have to enter the
                drawing.
              </p>
              {raffleLink.status === 'ready' && (
                <a
                  href={raffleLink.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 font-semibold text-sm px-6 py-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                >
                  Enter the gift card drawing
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </a>
              )}
              {raffleLink.status === 'loading' && (
                <p className="text-xs text-slate-400 dark:text-slate-500">Preparing your drawing link…</p>
              )}
              {raffleLink.status === 'error' && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Couldn't prepare your drawing link right now. Refreshing this page will try again.
                </p>
              )}
            </div>
          </section>
        )}

        {!allRequiredDone && (
          <div className="flex items-center gap-3 px-4 py-3 mb-4 rounded-xl bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 text-sm text-amber-700 dark:text-amber-300">
            You've only completed {completedReviews.length} of the 3 required reviews (Easy,
            Medium, Hard).{' '}
            <button className="underline font-semibold" onClick={() => navigate('/categories')}>
              Continue reviewing
            </button>
          </div>
        )}

        {completedReviews.map(r => (
          <ReviewSummaryCard key={r.question.id} review={r} />
        ))}

        {/* ── Export ──────────────────────────────────────────────────────── */}
        <section
          aria-label="Export responses"
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden mb-8"
        >
          <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Personal Backup Copy
            </h2>
          </div>
          <div className="px-5 py-4 space-y-3">
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Your responses were already sent to the study's storage as you completed each
              review. These buttons just give you a personal copy. Your data is held in memory
              only and will be lost when you close or refresh this page.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                size="lg"
                onClick={() => downloadExportJSON(payloads, `${filename}.json`)}
                className="flex-1 justify-center"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download JSON
              </Button>

              <Button
                variant="secondary"
                size="lg"
                onClick={() => downloadExportCSV(payloads, `${filename}.csv`)}
                className="flex-1 justify-center"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 10h18M3 14h18M10 3v18M14 3v18" />
                </svg>
                Download CSV
              </Button>

              <Button
                variant="secondary"
                size="lg"
                onClick={handleCopyJSON}
                className="flex-1 justify-center"
              >
                {copiedJSON ? (
                  <>
                    <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy JSON
                  </>
                )}
              </Button>
            </div>
          </div>
        </section>

        {/* ── Restart ─────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 pb-12">
          <Button variant="ghost" onClick={handleRestart}>
            Start a new session
          </Button>
          <p className="text-xs text-slate-300 dark:text-slate-600 basis-full sm:basis-auto">
            Only start a new session if a different participant is using this device now.
          </p>
        </div>

      </PageContainer>
    </div>
  );
}
