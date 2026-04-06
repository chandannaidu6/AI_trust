import { Routes, Route, Navigate } from 'react-router-dom';
import { StudyProvider } from './state/StudyContext';
import LandingPage from './pages/LandingPage';
import ParticipantInfoPage from './pages/ParticipantInfoPage';
import CategorySelectionPage from './pages/CategorySelectionPage';
import CategoryQuestionListPage from './pages/CategoryQuestionListPage';
import QuestionReviewPage from './pages/QuestionReviewPage';
import CompletionPage from './pages/CompletionPage';

export default function App() {
  return (
    <StudyProvider>
      <Routes>
        <Route path="/"                           element={<LandingPage />} />
        <Route path="/participant"                element={<ParticipantInfoPage />} />
        <Route path="/categories"                 element={<CategorySelectionPage />} />
        <Route path="/categories/:category"       element={<CategoryQuestionListPage />} />
        <Route path="/review/:category/:questionId" element={<QuestionReviewPage />} />
        <Route path="/complete"                   element={<CompletionPage />} />
        <Route path="*"                           element={<Navigate to="/" replace />} />
      </Routes>
    </StudyProvider>
  );
}
