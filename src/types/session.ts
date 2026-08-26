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

// ─── Per-slot review rating (9 questions) ────────────────────────────────────

export type AcceptDecision = 'approve' | 'approve_minor' | 'needs_major' | 'reject';

export interface SlotRating {
  readability: number;               // 1–4, worded scale (see WordScale/ReviewForm)
  understandability: number;         // 1–4, worded scale
  perceivedRobustness: number;       // 1–4, worded scale
  maintenanceConfidence: number;     // 1–4, worded scale
  perceivedAuthorCompetence: number; // 1–4, worded scale
  hiddenComplexity: number;          // 1–4, worded scale (higher = worse; inverted when averaged into a score)
  acceptDecision: AcceptDecision | null;
  briefExplanation: string;
  /** Optional — anything about the code the reviewer didn't understand. */
  confusionNotes: string;
}

// ─── Per-slot objective comprehension check ──────────────────────────────────

export interface ComprehensionAnswer {
  selectedIndex: number;
  correct: boolean;
  elapsedMs: number;
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
export type Gender = 'man' | 'woman' | 'prefer_not_to_say';

export interface ParticipantProfile {
  id: string;
  skillLevel: SkillLevel;
  yearsExperience: string;
  role: Role;
  reviewFrequency: ReviewFrequency;
  aiFamiliarity: AIFamiliarity;
  region: string;               // e.g. "Fort Collins, CO, USA"
  gender: Gender;
  age: string;                  // bracket, e.g. "25–34"
  /** Only collected (and only meaningful) when role === 'student'. */
  university: string;
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
  /** Epoch ms when the subjective rating for a slot was submitted — the comprehension
   *  question's timer for that slot starts here and stops when it's answered. */
  comprehensionStartedAt: Partial<Record<SlotLabel, number>>;
  comprehensionAnswers: Partial<Record<SlotLabel, ComprehensionAnswer>>;
  /** Epoch ms of the last successful Sheets submission for this review's final
   *  assessment, or null if it's never been sent. Used to avoid writing a
   *  duplicate row if "Submit"/"Update Assessment" is triggered again with an
   *  unchanged assessment (e.g. after a reload made the UI look unsaved). */
  sheetsSubmittedAt: number | null;
}

// ─── Difficulty gating ─────────────────────────────────────────────────────────

export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export const DIFFICULTIES: Difficulty[] = ['Easy', 'Medium', 'Hard'];

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
  /** Difficulties whose final assessment has been submitted, study-wide (not
   *  per-category) — once a difficulty is done, it's locked everywhere: a
   *  participant reviews exactly one Easy, one Medium, and one Hard question
   *  total, drawn from any category. */
  completedDifficulties: Partial<Record<Difficulty, boolean>>;
}
