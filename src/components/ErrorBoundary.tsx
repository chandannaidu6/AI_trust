import { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * There was no error boundary anywhere in the app before this — any uncaught
 * error during render (in any page or component) unmounted the entire tree,
 * leaving a genuinely blank `<div id="root">` with no indication of what
 * broke. This catches that instead, shows the actual error, and offers a
 * reload — which, since app state now persists to sessionStorage, resumes
 * the study rather than losing progress.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('Uncaught render error:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-red-200 dark:border-red-800 rounded-2xl shadow-sm px-6 py-7 text-center space-y-4">
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Something went wrong</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              The page hit an unexpected error. Your progress is saved — reloading should pick up
              right where you left off.
            </p>
            <p className="text-xs font-mono text-left bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-600 dark:text-slate-300 overflow-x-auto">
              {this.state.error.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full px-4 py-2.5 text-sm font-semibold rounded-lg bg-indigo-600 text-white
                         hover:bg-indigo-700 transition-colors focus-visible:outline-none
                         focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
