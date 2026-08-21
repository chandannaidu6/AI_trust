import { useEffect, useRef, useState } from 'react';
import { blobToPCM } from '../../utils/audio';
import { transcribePCM, isSpeechModelReady } from '../../utils/speechClient';

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

// Re-transcribe the audio captured so far this often while still recording,
// so a rough draft appears as the participant talks instead of only after
// they stop. This is a *preview* only — see finalizeRecording, which always
// re-transcribes the complete, final audio once recording stops, so preview
// quality/timing has no bearing on the answer that actually gets saved.
// Moonshine-tiny is small/fast enough to run this often; untested on real
// devices though, so if it visibly lags recording, raise this first.
const PREVIEW_INTERVAL_MS = 1500;

function isSupported(): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return !!(navigator.mediaDevices && w.MediaRecorder);
}

// Tagged so it's easy to filter in DevTools (console filter: "[VoiceTextArea]").
function logVoiceError(context: string, detail: unknown) {
  console.error(`[VoiceTextArea] ${context}`, detail);
}

/**
 * Free, browser-native-recording speech-to-text. The textarea is read-only —
 * the only way to fill it in is by recording, so participants can't just
 * type a canned answer instead of speaking one.
 *
 * Transcription runs entirely client-side via a Moonshine model in a shared
 * Web Worker (see utils/speechClient — one worker/model instance for the
 * whole page, preloaded from main.tsx so it's normally already warm by the
 * time this is used). While recording, the audio captured so far is
 * periodically re-transcribed to show a live-updating draft; the final
 * answer always comes from one authoritative transcription of the complete
 * recording once the participant stops, so a slow or missed preview cycle
 * never affects what actually gets saved.
 */
export function VoiceTextArea({ id, value, onChange, placeholder, rows = 3 }: VoiceTextAreaProps) {
  const supportedRef = useRef(false);
  const [state, setState] = useState<EngineState>('idle');
  const [modelProgress, setModelProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [liveDraft, setLiveDraft] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const previewTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previewInFlightRef = useRef(false);
  // Bumped on every clear/new recording so a slow preview or final
  // transcription from a since-abandoned recording can detect it's stale and
  // skip applying its result — otherwise clicking "Clear & re-record" mid-
  // recording (stopping it, which still triggers its own async finalize)
  // could have that finalize resolve after the clear and silently overwrite it.
  const generationRef = useRef(0);

  useEffect(() => {
    supportedRef.current = isSupported();
    console.info('[VoiceTextArea] supported:', supportedRef.current);
    if (!supportedRef.current) setState('unsupported');
    return () => {
      stopPreviewTimer();
      mediaRecorderRef.current?.stop();
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopPreviewTimer = () => {
    if (previewTimerRef.current !== null) {
      clearInterval(previewTimerRef.current);
      previewTimerRef.current = null;
    }
  };

  const prefixFor = (base: string) => (base ? base.trim() + ' ' : '');

  const runPreview = async () => {
    if (previewInFlightRef.current || chunksRef.current.length === 0) return;
    previewInFlightRef.current = true;
    const myGeneration = generationRef.current;
    try {
      const blob = new Blob([...chunksRef.current], { type: mediaRecorderRef.current?.mimeType });
      const pcm = await blobToPCM(blob);
      const text = await transcribePCM(pcm);
      if (myGeneration !== generationRef.current) return;
      setLiveDraft(prefixFor(value) + text);
    } catch (err) {
      // A failed preview cycle just means the draft doesn't update this
      // round — recording continues either way, and the final transcription
      // on stop is unaffected.
      logVoiceError('preview transcription cycle failed (non-fatal)', err);
    } finally {
      previewInFlightRef.current = false;
    }
  };

  const finalizeRecording = async () => {
    const myGeneration = generationRef.current;
    try {
      const blob = new Blob(chunksRef.current, { type: mediaRecorderRef.current?.mimeType });
      const pcm = await blobToPCM(blob);
      const text = await transcribePCM(pcm, progress => {
        if (myGeneration !== generationRef.current) return;
        setState('loading-model');
        setModelProgress(progress);
      });
      if (myGeneration !== generationRef.current) return;
      onChange((prefixFor(value) + text).trim());
      setState('idle');
    } catch (err) {
      if (myGeneration !== generationRef.current) return;
      logVoiceError('final transcription failed', err);
      setErrorMessage(err instanceof Error ? err.message : 'Could not process the recording.');
      setState('error');
    }
  };

  const startRecording = async () => {
    let stream: MediaStream;
    try {
      // Browsers enable noiseSuppression by default, and it's tuned
      // aggressively enough that it can suppress quiet speech right along
      // with background noise — a real contributor to dropped words, not
      // just the model. autoGainControl is kept on (it actively boosts a
      // quiet input signal, which is what we want) and so is
      // echoCancellation (harmless here, and worth keeping for anyone using
      // speakers instead of headphones).
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { noiseSuppression: false, autoGainControl: true, echoCancellation: true },
      });
    } catch (err) {
      logVoiceError('getUserMedia failed', err);
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
      logVoiceError('MediaRecorder construction failed', err);
      stream.getTracks().forEach(t => t.stop());
      setErrorMessage(err instanceof Error ? err.message : 'Recording isn\'t supported in this browser.');
      setState('error');
      return;
    }

    generationRef.current++;
    chunksRef.current = [];
    setLiveDraft(value);
    recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = () => { finalizeRecording(); };
    mediaRecorderRef.current = recorder;
    try {
      // A timeslice makes ondataavailable fire periodically instead of only
      // once at the end, so there's audio to preview-transcribe while still
      // recording.
      recorder.start(1000);
      setState('recording');
      previewTimerRef.current = setInterval(runPreview, PREVIEW_INTERVAL_MS);
    } catch (err) {
      logVoiceError('MediaRecorder.start() threw', err);
      stream.getTracks().forEach(t => t.stop());
      setErrorMessage(err instanceof Error ? err.message : 'Could not start recording.');
      setState('error');
    }
  };

  const stopRecording = () => {
    stopPreviewTimer();
    try {
      mediaRecorderRef.current?.stop();
    } catch (err) {
      logVoiceError('MediaRecorder.stop() threw', err);
    }
    streamRef.current?.getTracks().forEach(t => t.stop());
    setState(isSpeechModelReady() ? 'transcribing' : 'loading-model');
  };

  const clearText = () => {
    generationRef.current++;
    stopPreviewTimer();
    try {
      mediaRecorderRef.current?.stop();
    } catch (err) {
      logVoiceError('teardown on clear threw', err);
    }
    streamRef.current?.getTracks().forEach(t => t.stop());
    onChange('');
    setLiveDraft('');
    setState('idle');
  };

  const busy = state === 'transcribing' || state === 'loading-model';
  const displayedValue = state === 'recording' ? liveDraft : value;

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
      {state === 'recording' && (
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Draft updates every few seconds while you talk — the final answer is re-transcribed once
          you stop, so it may differ slightly from what's shown above.
        </p>
      )}
    </div>
  );
}
