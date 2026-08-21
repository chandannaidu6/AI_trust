import { useEffect, useRef, useState } from 'react';
import { startDeepgramSession, DeepgramSession } from '../../utils/deepgramClient';

interface VoiceTextAreaProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

type EngineState =
  | 'idle'
  | 'recording'
  | 'finalizing'
  | 'denied'
  | 'unsupported'
  | 'error';

function isSupported(): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return !!(navigator.mediaDevices && w.MediaRecorder && w.WebSocket);
}

// Tagged so it's easy to filter in DevTools (console filter: "[VoiceTextArea]").
function logVoiceError(context: string, detail: unknown) {
  console.error(`[VoiceTextArea] ${context}`, detail);
}

/**
 * Speech-to-text via Deepgram's real-time streaming API (Nova-3). The
 * textarea is read-only — the only way to fill it in is by recording, so
 * participants can't just type a canned answer instead of speaking one.
 *
 * This genuinely streams: interim results update the draft continuously
 * while the participant is talking, and Deepgram finalizes each segment on
 * its own (with a configurable silence window — see utils/deepgramClient —
 * instead of the Web Speech API's fixed, opaque one, which is what this
 * replaced it for: a quiet speaker's pauses were getting misread as "done
 * talking"). The API key never reaches the browser; the client only ever
 * talks to our own /api/deepgram-token endpoint, which mints a short-lived
 * token server-side per recording session.
 */
export function VoiceTextArea({ id, value, onChange, placeholder, rows = 3 }: VoiceTextAreaProps) {
  const supportedRef = useRef(false);
  const [state, setState] = useState<EngineState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [liveDraft, setLiveDraft] = useState('');

  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<DeepgramSession | null>(null);
  // Bumped on every clear/new recording so a session's late callbacks (an
  // update or error arriving after the participant already cleared the
  // field, or started a new recording) can detect they're stale and skip
  // applying — otherwise a race could silently resurrect cleared text.
  const generationRef = useRef(0);
  // Mirrors liveDraft so onClose can commit the latest value via onChange as
  // a plain, correctly-timed side effect — not from inside a setState
  // updater, which StrictMode double-invokes and would fire onChange twice.
  const liveDraftRef = useRef('');

  useEffect(() => {
    supportedRef.current = isSupported();
    console.info('[VoiceTextArea] supported:', supportedRef.current);
    if (!supportedRef.current) setState('unsupported');
    return () => {
      sessionRef.current?.stop();
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const prefixFor = (base: string) => (base ? base.trim() + ' ' : '');

  const startRecording = async () => {
    generationRef.current++;
    const myGeneration = generationRef.current;

    let stream: MediaStream;
    try {
      // Browsers enable noiseSuppression by default, and it's tuned
      // aggressively enough that it can suppress quiet speech right along
      // with background noise. autoGainControl is kept on (it actively
      // boosts a quiet input signal) and so is echoCancellation (harmless
      // here, and worth keeping for anyone using speakers instead of
      // headphones).
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { noiseSuppression: false, autoGainControl: true, echoCancellation: true },
      });
    } catch (err) {
      logVoiceError('getUserMedia failed', err);
      const name = err instanceof Error ? err.name : '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setState('denied');
      } else if (name === 'NotFoundError' || name === 'NotReadableError' || name === 'OverconstrainedError') {
        setErrorMessage('No working microphone was found. Check your system\'s audio input device and try again.');
        setState('error');
      } else {
        setErrorMessage(err instanceof Error ? err.message : 'Could not access the microphone.');
        setState('error');
      }
      return;
    }
    streamRef.current = stream;
    liveDraftRef.current = value;
    setLiveDraft(value);

    try {
      const session = await startDeepgramSession(stream, {
        onUpdate: ({ finalText, interimText }) => {
          if (myGeneration !== generationRef.current) return;
          const next = prefixFor(value) + finalText + (interimText ? ` ${interimText}` : '');
          liveDraftRef.current = next;
          setLiveDraft(next);
        },
        onError: message => {
          if (myGeneration !== generationRef.current) return;
          logVoiceError('Deepgram session error', message);
          setErrorMessage(message);
          setState('error');
        },
        onClose: () => {
          if (myGeneration !== generationRef.current) return;
          // Commit whatever the last update held. If an error already fired
          // for this generation, state is 'error' and this shouldn't
          // silently override it back to idle.
          setState(current => (current === 'error' ? current : 'idle'));
          onChange(liveDraftRef.current.trim());
          streamRef.current?.getTracks().forEach(t => t.stop());
        },
      });
      if (myGeneration !== generationRef.current) {
        // A clear/new recording happened while the token fetch/handshake was
        // in flight — don't hang onto a session nobody asked for anymore.
        session.stop();
        return;
      }
      sessionRef.current = session;
      setState('recording');
    } catch (err) {
      logVoiceError('starting Deepgram session failed', err);
      stream.getTracks().forEach(t => t.stop());
      setErrorMessage(err instanceof Error ? err.message : 'Could not start transcription.');
      setState('error');
    }
  };

  const stopRecording = () => {
    setState('finalizing');
    sessionRef.current?.stop();
  };

  const clearText = () => {
    generationRef.current++;
    sessionRef.current?.stop();
    streamRef.current?.getTracks().forEach(t => t.stop());
    onChange('');
    setLiveDraft('');
    setState('idle');
  };

  const busy = state === 'finalizing';
  const displayedValue = state === 'recording' || state === 'finalizing' ? liveDraft : value;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        {state !== 'unsupported' && (
          <button
            type="button"
            onClick={state === 'recording' ? stopRecording : startRecording}
            disabled={busy}
            aria-pressed={state === 'recording'}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
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
        <button
          type="button"
          onClick={clearText}
          disabled={value.trim().length === 0 || busy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors
            bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400
            enabled:hover:border-red-300 enabled:hover:text-red-600 dark:enabled:hover:text-red-400
            disabled:opacity-40 disabled:cursor-not-allowed
            focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9.5 4h5a1 1 0 011 1v2h-7V5a1 1 0 011-1z" />
          </svg>
          Clear &amp; re-record
        </button>
        {state === 'recording' && (
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" aria-hidden="true" />
            Listening… speak now
          </span>
        )}
        {state === 'finalizing' && (
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Finishing up…
          </span>
        )}
        {state === 'denied' && (
          <span className="text-xs text-red-500 dark:text-red-400">
            Microphone access denied. Please allow microphone access and try recording again.
          </span>
        )}
        {state === 'unsupported' && (
          <span className="text-xs text-slate-400 dark:text-slate-500">
            Voice input isn't supported on this device.
          </span>
        )}
        {state === 'error' && (
          <span className="text-xs text-red-500 dark:text-red-400">
            {errorMessage || 'Something went wrong recording your answer.'} Please try recording again.
          </span>
        )}
      </div>
      <textarea
        id={id}
        value={displayedValue}
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
