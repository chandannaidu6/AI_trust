// Runs entirely in a Web Worker so the (multi-MB, WASM-backed) model never
// blocks the main thread. Used only as a fallback on browsers without the
// native Web Speech API (notably iOS Safari/Chrome, which share Apple's
// WebKit engine and have no built-in speech recognition at all).
import { pipeline, env } from '@xenova/transformers';

// Always fetch from the Hugging Face hub CDN (and let the browser cache it),
// never look for locally-hosted model files.
env.allowLocalModels = false;

// onnxruntime-web defaults to multi-threaded WASM, which requires
// SharedArrayBuffer — only available when the page is served with
// Cross-Origin-Opener-Policy/Cross-Origin-Embedder-Policy headers. This
// static deployment doesn't set those, so without this, the runtime can fail
// to initialize entirely on browsers that enforce the restriction (this is
// what broke transcription on iOS Safari). Single-threaded is slower but
// works with zero server configuration.
env.backends.onnx.wasm.numThreads = 1;

type WorkerRequest =
  | { type: 'load' }
  | { type: 'transcribe'; audio: Float32Array };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ctx: any = self;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pipelinePromise: Promise<any> | null = null;

function getPipeline() {
  if (!pipelinePromise) {
    pipelinePromise = pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en', {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      progress_callback: (data: any) => ctx.postMessage({ type: 'progress', ...data }),
    });
  }
  return pipelinePromise;
}

ctx.addEventListener('message', async (event: MessageEvent<WorkerRequest>) => {
  const msg = event.data;
  try {
    if (msg.type === 'load') {
      await getPipeline();
      ctx.postMessage({ type: 'ready' });
      return;
    }

    if (msg.type === 'transcribe') {
      const transcriber = await getPipeline();
      const output = await transcriber(msg.audio, {
        language: 'english',
        task: 'transcribe',
        chunk_length_s: 30,
        stride_length_s: 5,
      });
      const text = Array.isArray(output) ? output.map(o => o.text).join(' ') : output.text;
      ctx.postMessage({ type: 'result', text: (text ?? '').trim() });
    }
  } catch (err) {
    ctx.postMessage({ type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
});
