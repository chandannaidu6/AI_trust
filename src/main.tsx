import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { preloadSpeechModel } from './utils/speechClient';
import './index.css';

// Kick off the voice-input model download/init as early as possible, not
// when a participant first hits "Record" — by the time they reach the final
// assessment step (after the background survey, question selection, and
// code review), it's very likely already warm. Fire-and-forget: a failure
// here just means the first recording attempt loads it the slow way, same
// as before this existed.
preloadSpeechModel().catch(() => {});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);
