import {
  createContext, useContext, useReducer, useCallback, ReactNode,
} from 'react';
import {
  AppState, ParticipantProfile, ReviewSession,
  SlotLabel, SlotRating, FinalAssessment, DraftAssessment, StudyQuestion, UISlot, SLOT_LABELS,
} from '../types';
import { shuffleForSession } from '../utils/randomize';
import { generateId, reviewSessionKey } from '../utils/helpers';

// ─── Action types ─────────────────────────────────────────────────────────────

type Action =
  | { type: 'SET_PARTICIPANT'; payload: ParticipantProfile }
  | { type: 'SET_CATEGORY'; payload: string }
  | { type: 'START_REVIEW'; payload: { question: StudyQuestion; language: string } }
  | { type: 'SET_ACTIVE_SLOT'; payload: SlotLabel }
  | { type: 'RATE_SLOT'; payload: { slot: SlotLabel; rating: SlotRating } }
  | { type: 'SUBMIT_ASSESSMENT'; payload: FinalAssessment }
  | { type: 'UPDATE_DRAFT_RATING'; payload: { slot: SlotLabel; rating: SlotRating } }
  | { type: 'UPDATE_DRAFT_ASSESSMENT'; payload: DraftAssessment }
  | { type: 'SET_LAST_VIEWED_QUESTION'; payload: { category: string; questionId: string } }
  | { type: 'RESET' };

// ─── Reducer ──────────────────────────────────────────────────────────────────

const initial: AppState = {
  participant: null,
  selectedCategory: null,
  review: null,
  reviewsByQuestion: {},
  lastViewedQuestion: {},
};

/** Write the (possibly updated) active review session back into the per-question store. */
function withReview(state: AppState, review: ReviewSession): AppState {
  const key = reviewSessionKey(review.question.id, review.language);
  return {
    ...state,
    review,
    reviewsByQuestion: { ...state.reviewsByQuestion, [key]: review },
  };
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_PARTICIPANT':
      return { ...state, participant: action.payload };

    case 'SET_CATEGORY':
      return { ...state, selectedCategory: action.payload };

    case 'START_REVIEW': {
      const { question, language } = action.payload;

      // If this question+language was already started in this session (submitted or
      // not), resume it as-is instead of wiping out prior ratings/assessment.
      const existingKey = reviewSessionKey(question.id, language);
      const existing = state.reviewsByQuestion[existingKey];
      if (existing) {
        return { ...state, review: existing };
      }

      const pid = state.participant?.id ?? generateId();

      // Pick the solutions for this language and shuffle them
      const block = question.solutionsByLanguage[language];
      if (!block) return state;

      const shuffled = shuffleForSession(block.solutions, pid, question.id, language);

      const slots: UISlot[] = SLOT_LABELS.map((label, i) => ({
        label,
        solutionId: shuffled[i].solutionId,
        code: shuffled[i].code,
      }));

      // Build origin labels from _hidden metadata (in original dataset order so
      // human numbering is stable across participants despite shuffled display order)
      const solutionLabels: Record<string, string> = {};
      let humanCount = 0;
      for (const sol of block.solutions) {
        if (sol._hidden.origin === 'human') {
          humanCount++;
          solutionLabels[sol.solutionId] = `human ${humanCount}`;
        } else {
          // variantKey like "aiConcise" → "LLM concise", "aiReadable" → "LLM readable"
          const variant = sol._hidden.variantKey.replace(/^ai/, '').toLowerCase();
          solutionLabels[sol.solutionId] = `LLM ${variant}`;
        }
      }

      const session: ReviewSession = {
        question,
        language,
        slots,
        slotRatings: {},
        finalAssessment: null,
        activeSlot: 'A',
        startedAt: new Date(),
        solutionLabels,
        draftRatings: {},
        draftAssessment: null,
      };

      return withReview(state, session);
    }

    case 'SET_ACTIVE_SLOT': {
      if (!state.review) return state;
      return withReview(state, { ...state.review, activeSlot: action.payload });
    }

    case 'RATE_SLOT': {
      if (!state.review) return state;
      return withReview(state, {
        ...state.review,
        slotRatings: {
          ...state.review.slotRatings,
          [action.payload.slot]: action.payload.rating,
        },
      });
    }

    case 'SUBMIT_ASSESSMENT': {
      if (!state.review) return state;
      return withReview(state, { ...state.review, finalAssessment: action.payload });
    }

    case 'UPDATE_DRAFT_RATING': {
      if (!state.review) return state;
      return withReview(state, {
        ...state.review,
        draftRatings: {
          ...state.review.draftRatings,
          [action.payload.slot]: action.payload.rating,
        },
      });
    }

    case 'UPDATE_DRAFT_ASSESSMENT': {
      if (!state.review) return state;
      return withReview(state, { ...state.review, draftAssessment: action.payload });
    }

    case 'SET_LAST_VIEWED_QUESTION': {
      const { category, questionId } = action.payload;
      return {
        ...state,
        lastViewedQuestion: { ...state.lastViewedQuestion, [category]: questionId },
      };
    }

    case 'RESET':
      return initial;

    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface StudyContextValue {
  state: AppState;
  setParticipant: (p: ParticipantProfile) => void;
  setCategory: (c: string) => void;
  startReview: (question: StudyQuestion, language: string) => void;
  setActiveSlot: (slot: SlotLabel) => void;
  rateSlot: (slot: SlotLabel, rating: SlotRating) => void;
  submitAssessment: (a: FinalAssessment) => void;
  updateDraftRating: (slot: SlotLabel, rating: SlotRating) => void;
  updateDraftAssessment: (a: DraftAssessment) => void;
  setLastViewedQuestion: (category: string, questionId: string) => void;
  reset: () => void;
}

const StudyContext = createContext<StudyContextValue | null>(null);

export function StudyProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);

  const setParticipant  = useCallback((p: ParticipantProfile) => dispatch({ type: 'SET_PARTICIPANT', payload: p }), []);
  const setCategory     = useCallback((c: string)             => dispatch({ type: 'SET_CATEGORY',   payload: c }), []);
  const startReview     = useCallback((question: StudyQuestion, language: string) =>
    dispatch({ type: 'START_REVIEW', payload: { question, language } }), []);
  const setActiveSlot   = useCallback((slot: SlotLabel)        => dispatch({ type: 'SET_ACTIVE_SLOT', payload: slot }), []);
  const rateSlot        = useCallback((slot: SlotLabel, rating: SlotRating) =>
    dispatch({ type: 'RATE_SLOT', payload: { slot, rating } }), []);
  const submitAssessment = useCallback((a: FinalAssessment)    => dispatch({ type: 'SUBMIT_ASSESSMENT', payload: a }), []);
  const updateDraftRating = useCallback((slot: SlotLabel, rating: SlotRating) =>
    dispatch({ type: 'UPDATE_DRAFT_RATING', payload: { slot, rating } }), []);
  const updateDraftAssessment = useCallback((a: DraftAssessment) =>
    dispatch({ type: 'UPDATE_DRAFT_ASSESSMENT', payload: a }), []);
  const setLastViewedQuestion = useCallback((category: string, questionId: string) =>
    dispatch({ type: 'SET_LAST_VIEWED_QUESTION', payload: { category, questionId } }), []);
  const reset           = useCallback(()                       => dispatch({ type: 'RESET' }), []);

  return (
    <StudyContext.Provider value={{
      state, setParticipant, setCategory, startReview, setActiveSlot, rateSlot,
      submitAssessment, updateDraftRating, updateDraftAssessment, setLastViewedQuestion, reset,
    }}>
      {children}
    </StudyContext.Provider>
  );
}

export function useStudy(): StudyContextValue {
  const ctx = useContext(StudyContext);
  if (!ctx) throw new Error('useStudy must be called inside <StudyProvider>');
  return ctx;
}
