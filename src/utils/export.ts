import { AppState, SlotLabel, SLOT_LABELS } from '../types';
import { avgRating } from './helpers';

// ─── Payload types ─────────────────────────────────────────────────────────────

export interface SlotExport {
  solutionId: string;
  originLabel: string;             // "human 1" | "human 2" | "LLM concise" | "LLM readable"
  trustScore: number;
  readability: number;
  correctnessConfidence: number;
  averageScore: number;
  bugConcern: 'none' | 'minor' | 'major';
  notes: string;
}

export interface ExportPayload {
  meta: {
    sessionId: string;
    exportedAt: string;           // ISO-8601
    studyVersion: string;
  };
  participant: {
    id: string;
    skillLevel: string;
    yearsExperience: string;
    primaryLanguages: string[];
    role: string;
    reviewFrequency: string;
    aiFamiliarity: string;
    languageConfidence: number;   // 1–5
  };
  session: {
    category: string;
    questionId: string;
    questionTitle: string;
    language: string;
    startedAt: string;            // ISO-8601
    solutionOrder: string[];      // solutionId at positions [A, B, C, D]
    slotMapping: Record<string, string>; // "A" → solutionId, …
    solutionLabels: Record<string, string>; // solutionId → "human 1" | "LLM concise" | …
  };
  ratings: Partial<Record<SlotLabel, SlotExport>>;
  finalAssessment: {
    bestChoice: SlotLabel;
    bestChoiceSolutionId: string;
    bestChoiceOriginLabel: string;   // "human 1" | "LLM concise" | …
    ranking: SlotLabel[];            // [1st, 2nd, 3rd, 4th]
    rankingSolutionIds: string[];
    rankingOriginLabels: string[];   // origin label for each ranked position
    rankingSummary: string;          // "A > C > B > D"
    explanation: string;
  } | null;
}

// ─── Builder ───────────────────────────────────────────────────────────────────

export function buildExportPayload(state: AppState): ExportPayload | null {
  const { participant, review, selectedCategory } = state;
  if (!participant || !review) return null;

  const slotMapping: Record<string, string> = {};
  for (const s of review.slots) slotMapping[s.label] = s.solutionId;

  const labels = review.solutionLabels ?? {};

  const ratings: Partial<Record<SlotLabel, SlotExport>> = {};
  for (const slot of SLOT_LABELS) {
    const r = review.slotRatings[slot];
    if (r) {
      const sid = slotMapping[slot];
      ratings[slot] = {
        solutionId: sid,
        originLabel: labels[sid] ?? '',
        trustScore: r.trustScore,
        readability: r.readability,
        correctnessConfidence: r.correctnessConfidence,
        averageScore: parseFloat(avgRating(r).toFixed(2)),
        bugConcern: r.bugConcern,
        notes: r.notes,
      };
    }
  }

  const fa = review.finalAssessment;
  const startedAt =
    review.startedAt instanceof Date
      ? review.startedAt.toISOString()
      : new Date(review.startedAt).toISOString();

  return {
    meta: {
      sessionId: participant.id,
      exportedAt: new Date().toISOString(),
      studyVersion: '1.0',
    },
    participant: {
      id: participant.id,
      skillLevel: participant.skillLevel,
      yearsExperience: participant.yearsExperience,
      primaryLanguages: participant.primaryLanguages,
      role: participant.role,
      reviewFrequency: participant.reviewFrequency,
      aiFamiliarity: participant.aiFamiliarity,
      languageConfidence: participant.languageConfidence,
    },
    session: {
      category: selectedCategory ?? '',
      questionId: review.question.id,
      questionTitle: review.question.title,
      language: review.language,
      startedAt,
      solutionOrder: SLOT_LABELS.map(s => slotMapping[s]),
      slotMapping,
      solutionLabels: labels,
    },
    ratings,
    finalAssessment: fa
      ? {
          bestChoice: fa.bestChoice,
          bestChoiceSolutionId: slotMapping[fa.bestChoice],
          bestChoiceOriginLabel: labels[slotMapping[fa.bestChoice]] ?? '',
          ranking: fa.ranking,
          rankingSolutionIds: fa.ranking.map(s => slotMapping[s]),
          rankingOriginLabels: fa.ranking.map(s => labels[slotMapping[s]] ?? ''),
          rankingSummary: fa.ranking.join(' > '),
          explanation: fa.explanation,
        }
      : null,
  };
}

// ─── Export helpers ────────────────────────────────────────────────────────────

export function downloadExportJSON(payload: ExportPayload, filename: string): void {
  triggerDownload(
    new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }),
    filename,
  );
}

export function downloadExportCSV(payload: ExportPayload, filename: string): void {
  const row = flattenToCSVRow(payload);
  const headers = Object.keys(row);
  const values = headers.map(h => csvCell(row[h]));
  const csv = [headers.join(','), values.join(',')].join('\n');
  triggerDownload(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), filename);
}

export async function copyExportJSON(payload: ExportPayload): Promise<void> {
  await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
}

// ─── Google Sheets submission ──────────────────────────────────────────────────

export type SheetSubmitStatus = 'idle' | 'submitting' | 'success' | 'error' | 'unconfigured';

/**
 * POST the flat CSV row to a Google Apps Script web endpoint.
 * The script writes it as a new row in your Google Sheet.
 *
 * Set VITE_SHEETS_URL in .env to enable. If unset, returns 'unconfigured'.
 */
export async function submitToSheets(payload: ExportPayload): Promise<SheetSubmitStatus> {
  const url = import.meta.env.VITE_SHEETS_URL as string | undefined;
  if (!url) return 'unconfigured';

  const row = flattenToCSVRow(payload);
  try {
    const res = await fetch(url, {
      method:  'POST',
      // Google Apps Script doPost requires text/plain to avoid a CORS preflight
      // that Apps Script cannot respond to correctly.
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body:    JSON.stringify(row),
    });
    return res.ok ? 'success' : 'error';
  } catch {
    return 'error';
  }
}

/** Build the URL query-string fragment used for Qualtrics Embedded Data handoff. */
export function buildQualtricsParams(payload: ExportPayload): string {
  const fa = payload.finalAssessment;
  const params: Record<string, string> = {
    sessionId: payload.meta.sessionId,
    category: payload.session.category,
    questionId: payload.session.questionId,
    language: payload.session.language,
    solutionOrder: payload.session.solutionOrder.join(','),
    selectedBestSolution: fa?.bestChoice ?? '',
    rankingSummary: fa?.rankingSummary ?? '',
  };
  return new URLSearchParams(params).toString();
}

// ─── Internals ─────────────────────────────────────────────────────────────────

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = Array.isArray(value) ? value.join('; ') : String(value);
  return /[,"\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function flattenToCSVRow(p: ExportPayload): Record<string, unknown> {
  const r: Record<string, unknown> = {};
  // meta
  r['sessionId']          = p.meta.sessionId;
  r['exportedAt']         = p.meta.exportedAt;
  r['studyVersion']       = p.meta.studyVersion;
  // participant
  r['skillLevel']         = p.participant.skillLevel;
  r['yearsExperience']    = p.participant.yearsExperience;
  r['primaryLanguages']   = p.participant.primaryLanguages;
  r['role']               = p.participant.role;
  r['reviewFrequency']    = p.participant.reviewFrequency;
  r['aiFamiliarity']      = p.participant.aiFamiliarity;
  r['languageConfidence'] = p.participant.languageConfidence;
  // session
  r['category']           = p.session.category;
  r['questionId']         = p.session.questionId;
  r['language']           = p.session.language;
  r['startedAt']          = p.session.startedAt;
  r['solutionOrder']      = p.session.solutionOrder;
  // per-slot ratings
  for (const slot of SLOT_LABELS) {
    const rating = p.ratings[slot];
    r[`slot${slot}_solutionId`]            = rating?.solutionId ?? '';
    r[`slot${slot}_originLabel`]           = rating?.originLabel ?? '';
    r[`slot${slot}_trustScore`]            = rating?.trustScore ?? '';
    r[`slot${slot}_readability`]           = rating?.readability ?? '';
    r[`slot${slot}_correctnessConfidence`] = rating?.correctnessConfidence ?? '';
    r[`slot${slot}_averageScore`]          = rating?.averageScore ?? '';
    r[`slot${slot}_bugConcern`]            = rating?.bugConcern ?? '';
    r[`slot${slot}_notes`]                 = rating?.notes ?? '';
  }
  // final assessment
  r['bestChoice']              = p.finalAssessment?.bestChoice ?? '';
  r['bestChoiceSolutionId']    = p.finalAssessment?.bestChoiceSolutionId ?? '';
  r['bestChoiceOriginLabel']   = p.finalAssessment?.bestChoiceOriginLabel ?? '';
  r['rankingSummary']          = p.finalAssessment?.rankingSummary ?? '';
  r['rankingSolutionIds']      = p.finalAssessment?.rankingSolutionIds ?? '';
  r['rankingOriginLabels']     = p.finalAssessment?.rankingOriginLabels ?? '';
  r['explanation']             = p.finalAssessment?.explanation ?? '';
  return r;
}
