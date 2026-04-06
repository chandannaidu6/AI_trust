// ─── Raw dataset types — mirror study-dataset.json exactly ──────────────────

export interface StudyDataset {
  schemaVersion: string;
  generatedDate: string;
  studyTitle: string;
  categories: string[];
  totalQuestions: number;
  totalSolutions: number;
  questions: StudyQuestion[];
}

export interface StudyQuestion {
  id: string;
  category: string;
  title: string;
  summary: string;
  paraphrasedPrompt: string;
  examples: Example[];
  difficulty: string;
  acceptanceRate: number | null;
  acceptanceRateAvailable: boolean;
  constraints: string[];
  sourceProblemNumber: number;
  sourcePlatform: string;
  supportedLanguages: string[];
  missingLanguages: string[];
  hasFullCoverage: boolean;
  solutionsByLanguage: Record<string, LangBlock>;
}

export interface Example {
  input: string;
  output: string;
}

export interface LangBlock {
  solutionCount: number;
  hasFullCoverage: boolean;
  solutions: RawSolution[];
}

export interface RawSolution {
  solutionId: string;
  code: string;
  _hidden: HiddenMeta;
}

/** Present in JSON but must never be shown to participants. */
export interface HiddenMeta {
  origin: 'human' | 'ai';
  variantKey: string;
  styleNotes: string;
  sourceRepoOrAuthor: string;
  sourceUrl: string;
  selectionNotes: string;
  generatedBy?: string;
  generationDate?: string;
}
