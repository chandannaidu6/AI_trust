import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { PageContainer } from '../components/layout/PageContainer';
import { QuestionCard } from '../components/question/QuestionCard';
import { useStudy } from '../state/StudyContext';
import { loadCategory } from '../data/loader';
import { StudyQuestion } from '../types';

function scrollKey(category: string) {
  return `questionListScroll:${category}`;
}

export default function CategoryQuestionListPage() {
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const { state, setCategory } = useStudy();

  const [questions, setQuestions] = useState<StudyQuestion[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const restoredRef = useRef(false);

  if (!state.participant) return <Navigate to="/participant" replace />;

  // Sync category into context
  useEffect(() => {
    if (category && state.selectedCategory !== category) setCategory(category);
  }, [category, state.selectedCategory, setCategory]);

  // Load questions for this category
  useEffect(() => {
    if (!category) return;
    setLoading(true);
    setError('');
    restoredRef.current = false;
    loadCategory(category)
      .then(setQuestions)
      .catch(() => setError('Failed to load questions. Make sure study-dataset.json is in /public/data/.'))
      .finally(() => setLoading(false));
  }, [category]);

  // Restore scroll position once the list has rendered, so returning from a
  // question's review page (or from browser back) lands where the participant left off.
  useEffect(() => {
    if (loading || error || !category || restoredRef.current) return;
    restoredRef.current = true;
    const saved = sessionStorage.getItem(scrollKey(category));
    if (saved) {
      window.scrollTo(0, parseInt(saved, 10));
    }
  }, [loading, error, category]);

  // Remember scroll position whenever we leave this page.
  useEffect(() => {
    if (!category) return;
    const save = () => sessionStorage.setItem(scrollKey(category), String(window.scrollY));
    window.addEventListener('beforeunload', save);
    return () => {
      save();
      window.removeEventListener('beforeunload', save);
    };
  }, [category]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <Header step={3} back="/categories" />
      <PageContainer>

        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Category
            </span>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">{category}</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Select a question to begin reviewing its 2 unlabeled solutions.
            </p>
          </div>
          {!loading && questions.length > 0 && (
            <span className="text-sm text-slate-400 dark:text-slate-500 font-mono shrink-0 mt-1">
              {questions.length} questions
            </span>
          )}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-24 text-slate-400 dark:text-slate-500 gap-2">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm">Loading questions…</span>
          </div>
        )}

        {error && (
          <div role="alert" className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl px-5 py-4 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-1 gap-3">
            {questions.map((q, i) => (
              <QuestionCard
                key={q.id}
                question={q}
                index={i}
                onClick={() => navigate(`/review/${category}/${q.id}`)}
              />
            ))}
          </div>
        )}
      </PageContainer>
    </div>
  );
}
