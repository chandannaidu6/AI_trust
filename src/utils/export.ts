import { ParticipantProfile, ReviewSession, SlotLabel, SLOT_LABELS } from '../types';
import { avgRating } from './helpers';
import {
  READABILITY_OPTIONS,
  UNDERSTANDABILITY_OPTIONS,
  ROBUSTNESS_OPTIONS,
  MAINTENANCE_OPTIONS,
  COMPETENCE_OPTIONS,
  HIDDEN_COMPLEXITY_OPTIONS,
  labelForValue,
} from './ratingScales';

// ─── Payload types ─────────────────────────────────────────────────────────────

export interface SlotExport {
  solutionId: string;
  originLabel: string;               // "human 1" | "human 2" | "LLM concise" | "LLM readable"
  // The six rating dimensions export as the worded option text the
  // participant actually picked (e.g. "Clean and effortless to read"), not
  // the underlying 1-4 number -- a bare number in the spreadsheet doesn't
  // say what the reviewer meant by it.
  readability: string;
  understandability: string;
  perceivedRobustness: string;
  maintenanceConfidence: string;
  perceivedAuthorCompetence: string;
  hiddenComplexity: string;
  averageScore: number;              // mean of the six underlying 1–4 values, hiddenComplexity inverted
  acceptDecision: string;            // "approve" | "approve_minor" | "needs_major" | "reject"
  briefExplanation: string;
  confusionNotes: string;
  comprehensionSelectedIndex: number | null;
  comprehensionCorrect: boolean | null;
  comprehensionElapsedMs: number | null;
}

export interface ExportPayload {
  meta: {
    sessionId: string;
    exportedAt: string;              // ISO-8601
    studyVersion: string;
  };
  participant: {
    id: string;
    region: string;
    gender: string;
    age: string;
    skillLevel: string;
    yearsExperience: string;
    role: string;
    university: string;
    drawEmail: string;
    reviewFrequency: string;
    aiFamiliarity: string;
  };
  session: {
    category: string;
    questionId: string;
    questionTitle: string;
    difficulty: string;
    language: string;
    startedAt: string;               // ISO-8601
    solutionOrder: string[];         // solutionId at positions [A, B]
    slotMapping: Record<string, string>;
    solutionLabels: Record<string, string>;
  };
  ratings: Partial<Record<SlotLabel, SlotExport>>;
  finalAssessment: {
    bestChoice: SlotLabel;
    bestChoiceSolutionId: string;
    bestChoiceOriginLabel: string;
    explanation: string;
  } | null;
}

// ─── Builder ───────────────────────────────────────────────────────────────────

export function buildExportPayload(
  participant: ParticipantProfile | null,
  review: ReviewSession | null,
): ExportPayload | null {
  if (!participant || !review) return null;

  const slotMapping: Record<string, string> = {};
  for (const s of review.slots) slotMapping[s.label] = s.solutionId;

  const labels = review.solutionLabels ?? {};

  const ratings: Partial<Record<SlotLabel, SlotExport>> = {};
  for (const slot of SLOT_LABELS) {
    const r = review.slotRatings[slot];
    if (r) {
      const sid = slotMapping[slot];
      const comp = review.comprehensionAnswers[slot];
      ratings[slot] = {
        solutionId: sid,
        originLabel: labels[sid] ?? '',
        readability: labelForValue(READABILITY_OPTIONS, r.readability),
        understandability: labelForValue(UNDERSTANDABILITY_OPTIONS, r.understandability),
        perceivedRobustness: labelForValue(ROBUSTNESS_OPTIONS, r.perceivedRobustness),
        maintenanceConfidence: labelForValue(MAINTENANCE_OPTIONS, r.maintenanceConfidence),
        perceivedAuthorCompetence: labelForValue(COMPETENCE_OPTIONS, r.perceivedAuthorCompetence),
        hiddenComplexity: labelForValue(HIDDEN_COMPLEXITY_OPTIONS, r.hiddenComplexity),
        averageScore: parseFloat(avgRating(r).toFixed(2)),
        acceptDecision: r.acceptDecision ?? '',
        briefExplanation: r.briefExplanation,
        confusionNotes: r.confusionNotes,
        comprehensionSelectedIndex: comp?.selectedIndex ?? null,
        comprehensionCorrect: comp?.correct ?? null,
        comprehensionElapsedMs: comp?.elapsedMs ?? null,
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
      studyVersion: '2.0',
    },
    participant: {
      id: participant.id,
      region: participant.region,
      gender: participant.gender,
      age: participant.age,
      skillLevel: participant.skillLevel,
      yearsExperience: participant.yearsExperience,
      role: participant.role,
      university: participant.university,
      drawEmail: participant.drawEmail,
      reviewFrequency: participant.reviewFrequency,
      aiFamiliarity: participant.aiFamiliarity,
    },
    session: {
      category: review.question.category,
      questionId: review.question.id,
      questionTitle: review.question.title,
      difficulty: review.question.difficulty,
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
          explanation: fa.explanation,
        }
      : null,
  };
}

// ─── Export helpers (accept one review or all completed reviews) ──────────────

export function downloadExportJSON(payloads: ExportPayload | ExportPayload[], filename: string): void {
  triggerDownload(
    new Blob([JSON.stringify(payloads, null, 2)], { type: 'application/json' }),
    filename,
  );
}

export function downloadExportCSV(payloads: ExportPayload | ExportPayload[], filename: string): void {
  const rows = (Array.isArray(payloads) ? payloads : [payloads]).map(flattenToCSVRow);
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map(row => headers.map(h => csvCell(row[h])).join(',')),
  ].join('\n');
  triggerDownload(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), filename);
}

export async function copyExportJSON(payloads: ExportPayload | ExportPayload[]): Promise<void> {
  await navigator.clipboard.writeText(JSON.stringify(payloads, null, 2));
}

// ─── Google Sheets submission ──────────────────────────────────────────────────

export type SheetSubmitStatus = 'idle' | 'submitting' | 'success' | 'error' | 'unconfigured';

export async function submitToSheets(payload: ExportPayload): Promise<SheetSubmitStatus> {
  const url = import.meta.env.VITE_SHEETS_URL as string | undefined;
  if (!url) return 'unconfigured';

  const row = flattenToCSVRow(payload);
  try {
    const res = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body:    JSON.stringify(row),
    });
    return res.ok ? 'success' : 'error';
  } catch {
    return 'error';
  }
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
  r['region']             = p.participant.region;
  r['gender']             = p.participant.gender;
  r['age']                = p.participant.age;
  r['skillLevel']         = p.participant.skillLevel;
  r['yearsExperience']    = p.participant.yearsExperience;
  r['role']               = p.participant.role;
  r['university']         = p.participant.university;
  r['drawEmail']          = p.participant.drawEmail;
  r['reviewFrequency']    = p.participant.reviewFrequency;
  r['aiFamiliarity']      = p.participant.aiFamiliarity;
  // session
  r['category']           = p.session.category;
  r['questionId']         = p.session.questionId;
  r['difficulty']         = p.session.difficulty;
  r['language']           = p.session.language;
  r['startedAt']          = p.session.startedAt;
  r['solutionOrder']      = p.session.solutionOrder;
  // per-slot ratings
  for (const slot of SLOT_LABELS) {
    const s = p.ratings[slot];
    r[`slot${slot}_solutionId`]               = s?.solutionId ?? '';
    r[`slot${slot}_originLabel`]              = s?.originLabel ?? '';
    r[`slot${slot}_readability`]              = s?.readability ?? '';
    r[`slot${slot}_understandability`]        = s?.understandability ?? '';
    r[`slot${slot}_perceivedRobustness`]      = s?.perceivedRobustness ?? '';
    r[`slot${slot}_maintenanceConfidence`]    = s?.maintenanceConfidence ?? '';
    r[`slot${slot}_perceivedAuthorCompetence`]= s?.perceivedAuthorCompetence ?? '';
    r[`slot${slot}_hiddenComplexity`]         = s?.hiddenComplexity ?? '';
    r[`slot${slot}_averageScore`]             = s?.averageScore ?? '';
    r[`slot${slot}_acceptDecision`]           = s?.acceptDecision ?? '';
    r[`slot${slot}_briefExplanation`]         = s?.briefExplanation ?? '';
    r[`slot${slot}_confusionNotes`]           = s?.confusionNotes ?? '';
    r[`slot${slot}_comprehensionSelectedIndex`] = s?.comprehensionSelectedIndex ?? '';
    r[`slot${slot}_comprehensionCorrect`]       = s?.comprehensionCorrect ?? '';
    r[`slot${slot}_comprehensionElapsedMs`]     = s?.comprehensionElapsedMs ?? '';
  }
  // final assessment
  r['bestChoice']            = p.finalAssessment?.bestChoice ?? '';
  r['bestChoiceSolutionId']  = p.finalAssessment?.bestChoiceSolutionId ?? '';
  r['bestChoiceOriginLabel'] = p.finalAssessment?.bestChoiceOriginLabel ?? '';
  r['explanation']           = p.finalAssessment?.explanation ?? '';
  return r;
}
