// Module-level singleton: the Worker (and the model loaded inside it) is
// created once and reused for the lifetime of the page, not per-component.
// That's what makes preloading actually useful — if VoiceTextArea instances
// each created their own Worker, preloading one wouldn't warm up the one a
// component later uses, since the loaded pipeline lives in the Worker's own
// memory and isn't shared across separate Worker instances even though the
// underlying model files are cached by the browser either way.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ProgressPayload = { progress?: number; [key: string]: any };

let worker: Worker | null = null;
let loadPromise: Promise<void> | null = null;
let nextRequestId = 1;
const progressListeners = new Set<(progress: number) => void>();

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('../workers/speechWorker.ts', import.meta.url), { type: 'module' });
  }
  return worker;
}

/** Subscribe to model-download progress (0-100). Returns an unsubscribe function. */
export function onSpeechLoadProgress(fn: (progress: number) => void): () => void {
  progressListeners.add(fn);
  return () => progressListeners.delete(fn);
}

/**
 * Start downloading/initializing the model immediately, without waiting for
 * a recording. Safe to call multiple times or before any component that
 * uses voice input has mounted — it's a no-op after the first call. Call
 * this as early as possible (see main.tsx) so the ~1-2 minutes a participant
 * spends on earlier steps (background survey, reading the problem, reviewing
 * code) hides the download instead of the participant waiting on it the
 * first time they hit "Record".
 */
export function preloadSpeechModel(): Promise<void> {
  if (loadPromise) return loadPromise;

  const w = getWorker();
  loadPromise = new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleMessage = (event: MessageEvent<any>) => {
      const msg = event.data;
      if (msg.type === 'progress' && typeof msg.progress === 'number') {
        progressListeners.forEach(fn => fn(msg.progress));
      } else if (msg.type === 'ready') {
        w.removeEventListener('message', handleMessage);
        resolve();
      } else if (msg.type === 'error') {
        w.removeEventListener('message', handleMessage);
        reject(new Error(msg.message || 'The speech model failed to load.'));
      }
    };
    w.addEventListener('message', handleMessage);
    w.postMessage({ type: 'load' });
  });

  return loadPromise;
}

/** True once the model has finished loading and transcription won't have to wait on it. */
export function isSpeechModelReady(): boolean {
  return loadPromise !== null;
}

/**
 * Transcribe one clip of 16kHz mono PCM. Concurrent calls are supported
 * (each is tagged with a request id and resolved independently), but the
 * underlying model still only runs one inference at a time, so overlapping
 * calls queue up rather than run in parallel — callers doing periodic
 * preview transcriptions should avoid firing a new one while a previous one
 * is still in flight instead of relying on this to do it for them.
 */
export function transcribePCM(
  audio: Float32Array,
  onProgress?: (progress: number) => void,
): Promise<string> {
  const w = getWorker();
  const requestId = nextRequestId++;
  const unsubscribe = onProgress ? onSpeechLoadProgress(onProgress) : null;

  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleMessage = (event: MessageEvent<any>) => {
      const msg = event.data as ProgressPayload & { type: string; requestId?: number; text?: string; message?: string };
      if (msg.type === 'result' && msg.requestId === requestId) {
        cleanup();
        resolve(msg.text ?? '');
      } else if (msg.type === 'error' && msg.requestId === requestId) {
        cleanup();
        reject(new Error(msg.message || 'Transcription failed.'));
      }
    };
    const cleanup = () => {
      w.removeEventListener('message', handleMessage);
      unsubscribe?.();
    };
    w.addEventListener('message', handleMessage);
    w.postMessage({ type: 'transcribe', audio, requestId }, [audio.buffer]);
  });
}
