import { StudyQuestion } from './dataset';

// ─── Slot labels ──────────────────────────────────────────────────────────────

export type SlotLabel = 'A' | 'B' | 'C' | 'D';
export const SLOT_LABELS: SlotLabel[] = ['A', 'B', 'C', 'D'];

// ─── A single solution as the UI sees it (no _hidden) ────────────────────────

export interface UISlot {
  label: SlotLabel;
  solutionId: string;
  code: string;
}

// ─── Per-slot review rating (8 questions) ────────────────────────────────────

export type AcceptDecision = 'yes' | 'no' | 'needs_changes';

export interface SlotRating {
  readability: number;               // 1–10
  perceivedRobustness: number;       // 1–10
  maintenanceConfidence: number;     // 1–10
  perceivedAuthorCompetence: number; // 1–10
  willingnessToApprove: number;      // 1–5
  hiddenComplexity: number;          // 1–10
  acceptDecision: AcceptDecision | null;
  briefExplanation: string;
}

// ─── Final assessment after reviewing all 4 slots ────────────────────────────

export interface FinalAssessment {
  bestChoice: SlotLabel;
  ranking: SlotLabel[];    // [1st, 2nd, 3rd, 4th]
  explanation: string;
}

// ─── Participant profile ──────────────────────────────────────────────────────

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type Role = 'student' | 'junior' | 'mid' | 'senior' | 'staff' | 'researcher' | 'other';
export type ReviewFrequency = 'never' | 'rarely' | 'monthly' | 'weekly' | 'daily';
export type AIFamiliarity = 'never' | 'aware' | 'occasional' | 'regular' | 'heavy';

export interface ParticipantProfile {
  id: string;
  skillLevel: SkillLevel;
  yearsExperience: string;
  primaryLanguages: string[];
  role: Role;
  reviewFrequency: ReviewFrequency;
  aiFamiliarity: AIFamiliarity;
  languageConfidence: number; // 1–5 for the chosen review language
}

// ─── Active review session (single question, in-memory only) ─────────────────

export interface ReviewSession {
  question: StudyQuestion;
  language: string;
  slots: UISlot[];                                       // randomised A/B/C/D
  slotRatings: Partial<Record<SlotLabel, SlotRating>>;
  finalAssessment: FinalAssessment | null;
  activeSlot: SlotLabel;
  startedAt: Date;
  /** Maps solutionId → human-readable origin label, e.g. "human 1" / "LLM concise" */
  solutionLabels: Record<string, string>;
}

// ─── Full in-memory app state ─────────────────────────────────────────────────

export interface AppState {
  participant: ParticipantProfile | null;
  selectedCategory: string | null;
  review: ReviewSession | null;
}
