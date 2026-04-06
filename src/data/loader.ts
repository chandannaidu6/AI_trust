import { StudyDataset, StudyQuestion } from '../types';

let _cache: StudyDataset | null = null;

export async function loadDataset(): Promise<StudyDataset> {
  if (_cache) return _cache;
  const res = await fetch('/data/study-dataset.json');
  if (!res.ok) throw new Error(`Failed to load dataset: ${res.status}`);
  _cache = (await res.json()) as StudyDataset;
  return _cache;
}

export async function loadQuestions(): Promise<StudyQuestion[]> {
  const ds = await loadDataset();
  return ds.questions;
}

export async function loadCategory(category: string): Promise<StudyQuestion[]> {
  const qs = await loadQuestions();
  return qs.filter(q => q.category === category);
}

export async function loadQuestion(id: string): Promise<StudyQuestion | undefined> {
  const qs = await loadQuestions();
  return qs.find(q => q.id === id);
}
