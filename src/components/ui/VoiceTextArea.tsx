import { useEffect, useRef, useState } from 'react';

interface VoiceTextAreaProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

type RecognitionState = 'idle' | 'recording' | 'unsupported' | 'denied';

/**
 * Free, browser-native speech-to-text (Web Speech API — no API key, no cost).
 * The textarea is read-only — the only way to fill it in is by recording, so
 * participants can't just type a canned answer instead of speaking one.
 */
export function VoiceTextArea({ id, value, onChange, placeholder, rows = 3 }: VoiceTextAreaProps) {
  const [state, setState] = useState<RecognitionState>('idle');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const baseTextRef = useRef('');

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) setState('unsupported');
    return () => recognitionRef.current?.stop();
  }, []);

  const startRecording = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { setState('unsupported'); return; }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    baseTextRef.current = value ? value.trim() + ' ' : '';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let finalChunk = '';
      let interimChunk = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalChunk += transcript;
        else interimChunk += transcript;
      }
      if (finalChunk) baseTextRef.current += finalChunk;
      onChange((baseTextRef.current + interimChunk).trim());
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      setState(event.error === 'not-allowed' || event.error === 'permission-denied' ? 'denied' : 'idle');
    };

    recognition.onend = () => setState(s => (s === 'recording' ? 'idle' : s));

    recognitionRef.current = recognition;
    recognition.start();
    setState('recording');
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    setState('idle');
  };

  const clearText = () => {
    recognitionRef.current?.stop();
    baseTextRef.current = '';
    onChange('');
    setState('idle');
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        {state !== 'unsupported' && (
          <button
            type="button"
            onClick={state === 'recording' ? stopRecording : startRecording}
            aria-pressed={state === 'recording'}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors
              focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900
              ${state === 'recording'
                ? 'bg-red-50 dark:bg-red-950 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300'}`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
            {state === 'recording' ? 'Stop recording' : 'Record your answer'}
          </button>
        )}
        {value.trim().length > 0 && (
          <button
            type="button"
            onClick={clearText}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors
              bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400
              hover:border-red-300 hover:text-red-600 dark:hover:text-red-400
              focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9.5 4h5a1 1 0 011 1v2h-7V5a1 1 0 011-1z" />
            </svg>
            Clear &amp; re-record
          </button>
        )}
        {state === 'recording' && (
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" aria-hidden="true" />
            Listening… speak now
          </span>
        )}
        {state === 'denied' && (
          <span className="text-xs text-red-500 dark:text-red-400">
            Microphone access denied. Please allow microphone access and try recording again.
          </span>
        )}
        {state === 'unsupported' && (
          <span className="text-xs text-slate-400 dark:text-slate-500">
            Voice input isn't supported in this browser. Please try Chrome or Edge to answer this question.
          </span>
        )}
      </div>
      <textarea
        id={id}
        value={value}
        readOnly
        placeholder={placeholder}
        rows={rows}
        aria-readonly="true"
        className="w-full text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5
                   text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/60
                   placeholder:text-slate-300 dark:placeholder:text-slate-500
                   focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none cursor-default"
      />
    </div>
  );
}
