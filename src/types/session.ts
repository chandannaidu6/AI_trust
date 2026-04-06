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

// ─── Per-slot review rating ───────────────────────────────────────────────────

export interface SlotRating {
  trustScore: number;           // 1–5
  readability: number;          // 1–5
  correctnessConfidence: number; // 1–5
  bugConcern: 'none' | 'minor' | 'major';
  notes: string;
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
