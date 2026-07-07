import { StudyQuestion } from './dataset';

// ─── Slot labels ──────────────────────────────────────────────────────────────

export type SlotLabel = 'A' | 'B';
export const SLOT_LABELS: SlotLabel[] = ['A', 'B'];

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

// ─── Final assessment after reviewing both slots ─────────────────────────────

export interface FinalAssessment {
  bestChoice: SlotLabel;
  explanation: string;
}

/** In-progress (not yet submitted) final assessment answers. */
export interface DraftAssessment {
  bestChoice: SlotLabel | null;
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
  slots: UISlot[];                                       // randomised A/B
  slotRatings: Partial<Record<SlotLabel, SlotRating>>;
  finalAssessment: FinalAssessment | null;
  activeSlot: SlotLabel;
  startedAt: Date;
  /** Maps solutionId → human-readable origin label, e.g. "human 1" / "LLM concise" */
  solutionLabels: Record<string, string>;
  /** Unsaved in-progress form values, kept so navigating away and back doesn't lose them. */
  draftRatings: Partial<Record<SlotLabel, SlotRating>>;
  draftAssessment: DraftAssessment | null;
}

// ─── Full in-memory app state ─────────────────────────────────────────────────

export interface AppState {
  participant: ParticipantProfile | null;
  selectedCategory: string | null;
  review: ReviewSession | null;
  /** In-progress (possibly unsubmitted) review sessions, keyed by `${questionId}::${language}`,
   *  so navigating away and back to the same question restores prior answers for this session. */
  reviewsByQuestion: Record<string, ReviewSession>;
  /** Last question opened per category, so the question list can scroll back to it. */
  lastViewedQuestion: Record<string, string>;
}
