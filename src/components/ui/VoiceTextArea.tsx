import { useEffect, useRef, useState } from 'react';
import { blobToWhisperPCM } from '../../utils/audio';

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
  | 'transcribing'
  | 'loading-model'
  | 'denied'
  | 'unsupported'
  | 'error';

type Mode = 'native' | 'whisper' | 'unsupported';

function detectMode(): Mode {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  if (w.SpeechRecognition || w.webkitSpeechRecognition) return 'native';
  if (navigator.mediaDevices && w.MediaRecorder) return 'whisper';
  return 'unsupported';
}

/**
 * Free, browser-native speech-to-text. The textarea is read-only — the only
 * way to fill it in is by recording, so participants can't just type a
 * canned answer instead of speaking one.
 *
 * Two backends, picked automatically per device:
 *  - "native": the Web Speech API (instant, streaming, no download) —
 *    available on desktop Chrome/Edge and Android Chrome. Mobile browsers
 *    silently end `continuous` recognition after a short pause, so we detect
 *    unintentional stops and transparently restart to keep listening.
 *  - "whisper": a Whisper speech-to-text model run fully client-side via
 *    WebAssembly in a Web Worker (free, no server, no per-request cost) —
 *    used wherever the Web Speech API isn't available, notably iOS
 *    Safari/Chrome (both share Apple's WebKit engine, which has no built-in
 *    speech recognition). The model downloads once (~40MB) and is cached by
 *    the browser after that.
 */
export function VoiceTextArea({ id, value, onChange, placeholder, rows = 3 }: VoiceTextAreaProps) {
  const modeRef = useRef<Mode>('unsupported');
  const [state, setState] = useState<EngineState>('idle');
  const [modelProgress, setModelProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  // Native Web Speech API refs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const baseTextRef = useRef('');
  const intentionalStopRef = useRef(false);

  // Whisper fallback refs
  const workerRef = useRef<Worker | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    modeRef.current = detectMode();
    if (modeRef.current === 'unsupported') setState('unsupported');
    return () => {
      intentionalStopRef.current = true;
      recognitionRef.current?.stop();
      mediaRecorderRef.current?.stop();
      streamRef.current?.getTracks().forEach(t => t.stop());
      workerRef.current?.terminate();
    };
  }, []);

  // ── Native Web Speech API path ────────────────────────────────────────────

  const getSpeechRecognitionCtor = () =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  const createRecognition = () => {
    const SpeechRecognition = getSpeechRecognitionCtor();
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    // Text finalized so far *within the current start/stop cycle*. Rebuilt
    // from scratch on every event rather than appended incrementally: Android
    // Chrome's `resultIndex` is unreliable and can replay already-finalized
    // results, which previously caused the same sentence to be transcribed
    // multiple times. Recomputing the full finalized text each time is
    // idempotent regardless of what Android replays.
    let sessionFinal = '';
    let sessionStartedAt = Date.now();
    // Consecutive sessions that ended almost instantly — a sign the browser
    // is failing to start recognition at all (seen on some Mac browsers),
    // not just a normal mobile pause cutoff. Left unchecked, "restart
    // transparently" turns into a rapid on/off loop that never records
    // anything (the mic indicator flickers) with no visible feedback.
    let quickFailStreak = 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      quickFailStreak = 0;
      let finalText = '';
      let interimText = '';
      for (let i = 0; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += transcript + ' ';
        else interimText += transcript;
      }
      sessionFinal = finalText;
      onChange((baseTextRef.current + sessionFinal + interimText).trim());
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        intentionalStopRef.current = true;
        setState('denied');
      } else if (event.error === 'audio-capture') {
        // No working microphone is available (e.g. the system's selected
        // input device is disconnected) — restarting can't fix this, so
        // don't loop forever silently retrying.
        intentionalStopRef.current = true;
        setErrorMessage('No working microphone was found. Check your system\'s audio input device and try again.');
        setState('error');
      }
      // Other errors (e.g. "no-speech", "network") are recovered by the
      // auto-restart in onend below, so they're not treated as fatal here.
    };

    recognition.onend = () => {
      // Commit this cycle's finalized text before restarting (or stopping),
      // so the next start/stop cycle begins clean and nothing is duplicated.
      baseTextRef.current += sessionFinal;
      sessionFinal = '';

      if (intentionalStopRef.current) {
        setState('idle');
        return;
      }

      const sessionDurationMs = Date.now() - sessionStartedAt;
      quickFailStreak = sessionDurationMs < 300 ? quickFailStreak + 1 : 0;
      if (quickFailStreak >= 3) {
        intentionalStopRef.current = true;
        setErrorMessage('Speech recognition isn\'t responding in this browser. Please try Chrome, or check your microphone.');
        setState('error');
        return;
      }

      // Not a user-initiated stop — the browser cut us off (common on
      // mobile). Restart transparently so recording keeps going.
      try {
        sessionStartedAt = Date.now();
        recognition.start();
      } catch {
        setState('idle');
      }
    };

    return recognition;
  };

  const startNativeRecording = () => {
    const recognition = createRecognition();
    if (!recognition) { setState('unsupported'); return; }

    intentionalStopRef.current = false;
    baseTextRef.current = value ? value.trim() + ' ' : '';
    recognitionRef.current = recognition;
    recognition.start();
    setState('recording');
  };

  const stopNativeRecording = () => {
    intentionalStopRef.current = true;
    recognitionRef.current?.stop();
    setState('idle');
  };

  // ── Whisper (WebAssembly, in a Worker) fallback path ──────────────────────

  const getWorker = () => {
    if (!workerRef.current) {
      const worker = new Worker(new URL('../../workers/whisperWorker.ts', import.meta.url), { type: 'module' });
      // Covers failures the worker itself can't catch and postMessage back
      // (e.g. the module failing to load/evaluate at all).
      worker.addEventListener('error', (event: ErrorEvent) => {
        setErrorMessage(event.message || 'The speech model failed to load.');
        setState('error');
      });
      workerRef.current = worker;
    }
    return workerRef.current;
  };

  const transcribeWhisperRecording = async () => {
    try {
      const blob = new Blob(chunksRef.current, { type: mediaRecorderRef.current?.mimeType });
      const worker = getWorker();
      const pcm = await blobToWhisperPCM(blob);
      const prefix = value ? value.trim() + ' ' : '';

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handleMessage = (event: MessageEvent<any>) => {
        const msg = event.data;
        if (msg.type === 'progress' && typeof msg.progress === 'number') {
          setState('loading-model');
          setModelProgress(msg.progress);
        } else if (msg.type === 'result') {
          onChange((prefix + msg.text).trim());
          setState('idle');
          worker.removeEventListener('message', handleMessage);
        } else if (msg.type === 'error') {
          setErrorMessage(msg.message || 'Transcription failed.');
          setState('error');
          worker.removeEventListener('message', handleMessage);
        }
      };
      worker.addEventListener('message', handleMessage);
      worker.postMessage({ type: 'transcribe', audio: pcm }, [pcm.buffer]);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not process the recording.');
      setState('error');
    }
  };

  const startWhisperRecording = async () => {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      const name = err instanceof Error ? err.name : '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setState('denied');
      } else if (name === 'NotFoundError' || name === 'NotReadableError' || name === 'OverconstrainedError') {
        // No working microphone is available (e.g. the system's selected
        // input device is disconnected), rather than permission being denied.
        setErrorMessage('No working microphone was found. Check your system\'s audio input device and try again.');
        setState('error');
      } else {
        setErrorMessage(err instanceof Error ? err.message : 'Could not access the microphone.');
        setState('error');
      }
      return;
    }
    streamRef.current = stream;

    // Safari (including iOS) doesn't support the same mimeTypes Chrome does —
    // pick the first one it actually supports instead of assuming a default.
    const mimeType = ['audio/mp4', 'audio/webm', 'audio/ogg']
      .find(t => window.MediaRecorder.isTypeSupported?.(t));
    let recorder: MediaRecorder;
    try {
      recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    } catch (err) {
      stream.getTracks().forEach(t => t.stop());
      setErrorMessage(err instanceof Error ? err.message : 'Recording isn\'t supported in this browser.');
      setState('error');
      return;
    }

    chunksRef.current = [];
    recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = () => { transcribeWhisperRecording(); };
    mediaRecorderRef.current = recorder;
    recorder.start();
    setState('recording');
  };

  const stopWhisperRecording = () => {
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach(t => t.stop());
    setState('transcribing');
  };

  // ── Shared controls ────────────────────────────────────────────────────────

  const startRecording = () => {
    if (modeRef.current === 'native') startNativeRecording();
    else if (modeRef.current === 'whisper') startWhisperRecording();
  };

  const stopRecording = () => {
    if (modeRef.current === 'native') stopNativeRecording();
    else if (modeRef.current === 'whisper') stopWhisperRecording();
  };

  const clearText = () => {
    intentionalStopRef.current = true;
    recognitionRef.current?.stop();
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach(t => t.stop());
    baseTextRef.current = '';
    onChange('');
    setState('idle');
  };

  const busy = state === 'transcribing' || state === 'loading-model';

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
        {state === 'loading-model' && (
          <span className="text-xs text-slate-400 dark:text-slate-500">
            Loading speech model (one-time download)… {Math.round(modelProgress)}%
          </span>
        )}
        {state === 'transcribing' && (
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Transcribing your answer…
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
