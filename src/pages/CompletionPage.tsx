import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { PageContainer } from '../components/layout/PageContainer';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useStudy } from '../state/StudyContext';
import { SLOT_LABELS } from '../types';
import { avgRating } from '../utils/helpers';
import {
  buildExportPayload,
  downloadExportJSON,
  downloadExportCSV,
  copyExportJSON,
  submitToSheets,
  SheetSubmitStatus,
} from '../utils/export';

const SLOT_COLOR = { A: 'violet', B: 'sky', C: 'emerald', D: 'amber' } as const;

export default function CompletionPage() {
  const navigate = useNavigate();
  const { state, reset } = useStudy();
  const { participant, review, selectedCategory } = state;

  const [copiedJSON,    setCopiedJSON]    = useState(false);
  const [sheetStatus,   setSheetStatus]   = useState<SheetSubmitStatus>('idle');
  const submitted = useRef(false);

  if (!participant || !review) {
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

  const payload    = useMemo(() => buildExportPayload(state), [state]);
  const assessment = review.finalAssessment;
  const ratings    = review.slotRatings;
  const filename   = `code-review-study-${participant.id}`;

  // Auto-submit to Google Sheets exactly once (useRef guard prevents StrictMode double-fire)
  useEffect(() => {
    if (!payload || submitted.current) return;
    submitted.current = true;
    setSheetStatus('submitting');
    submitToSheets(payload).then(setSheetStatus);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCopyJSON = async () => {
    if (!payload) return;
    await copyExportJSON(payload);
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
              Thank you for participating. Please save your responses using the options below.
            </p>
          </div>
        </div>

        {/* ── Google Sheets status banner ─────────────────────────────────── */}
        {sheetStatus === 'submitting' && (
          <div className="flex items-center gap-3 px-4 py-3 mb-4 rounded-xl bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 text-sm text-indigo-700 dark:text-indigo-300">
            <svg className="w-4 h-4 animate-spin shrink-0" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Saving your responses to Google Sheets…
          </div>
        )}

        {sheetStatus === 'success' && (
          <div className="flex items-center gap-3 px-4 py-3 mb-4 rounded-xl bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 text-sm text-green-700 dark:text-green-300">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
            </svg>
            Responses saved to Google Sheets automatically.
          </div>
        )}

        {sheetStatus === 'error' && (
          <div className="flex items-center gap-3 px-4 py-3 mb-4 rounded-xl bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            Could not reach Google Sheets. Please download your responses below as a backup.
          </div>
        )}

        {sheetStatus === 'unconfigured' && (
          <div className="flex items-center gap-3 px-4 py-3 mb-4 rounded-xl bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 text-sm text-amber-700 dark:text-amber-300">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            Google Sheets not configured — add <code className="font-mono bg-amber-100 dark:bg-amber-900 px-1 rounded">VITE_SHEETS_URL</code> to <code className="font-mono bg-amber-100 dark:bg-amber-900 px-1 rounded">.env</code> to enable auto-save.
          </div>
        )}

        {/* ── Session summary ─────────────────────────────────────────────── */}
        <section
          aria-label="Session summary"
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden mb-5"
        >
          <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Session Summary
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-slate-100 dark:divide-slate-800 border-b border-slate-100 dark:border-slate-800">
            {[
              { label: 'Category',    value: selectedCategory ?? '—' },
              { label: 'Question',    value: review.question.id },
              { label: 'Language',    value: review.language },
              { label: 'Role',        value: participant.role },
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
                    <div className="grid grid-cols-3 gap-1 text-xs text-slate-500 dark:text-slate-400">
                      <div><span className="block text-slate-400 dark:text-slate-500 text-[10px]">Trust</span>{r.trustScore}/5</div>
                      <div><span className="block text-slate-400 dark:text-slate-500 text-[10px]">Corr.</span>{r.correctnessConfidence}/5</div>
                      <div><span className="block text-slate-400 dark:text-slate-500 text-[10px]">Read.</span>{r.readability}/5</div>
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
                  <span className="text-xs text-slate-500 dark:text-slate-400">Ranking:</span>
                  <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-200">
                    {assessment.ranking.join(' › ')}
                  </span>
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

        {/* ── Export ──────────────────────────────────────────────────────── */}
        <section
          aria-label="Export responses"
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden mb-8"
        >
          <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Save Your Responses
            </h2>
          </div>
          <div className="px-5 py-4 space-y-3">
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Download your responses before closing this page.
              Your data is held in memory only — it will be lost when you close or refresh.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                size="lg"
                onClick={() => payload && downloadExportJSON(payload, `${filename}.json`)}
                disabled={!payload}
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
                onClick={() => payload && downloadExportCSV(payload, `${filename}.csv`)}
                disabled={!payload}
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
                disabled={!payload}
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
        <div className="flex items-center gap-3 pb-12">
          <Button variant="ghost" onClick={handleRestart}>
            Start a new session
          </Button>
          <p className="text-xs text-slate-300 dark:text-slate-600">
            This will clear all current session data.
          </p>
        </div>

      </PageContainer>
    </div>
  );
}
