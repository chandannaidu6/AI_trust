// Runs entirely in a Web Worker so the (multi-MB, WASM-backed) model never
// blocks the main thread. This is the only transcription backend (see
// VoiceTextArea) — the browser's native Web Speech API was dropped in favor
// of this fully local, no-cost, no-third-party-data-sharing model for every
// participant.
//
// Model: Moonshine (Useful Sensors), not Whisper. Whisper's chunk-and-hope
// approach isn't built for repeated low-latency calls on short, growing
// clips — Moonshine's encoder is specifically designed for that, and at
// ~28MB (quantized tiny) it's small/fast enough to re-transcribe every
// couple seconds while still recording (see PREVIEW_INTERVAL_MS in
// VoiceTextArea) without the browser tab stalling. It's also meaningfully
// smaller to download than the Whisper model this replaced.
import { pipeline, env } from '@huggingface/transformers';

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
env.backends.onnx.wasm!.numThreads = 1;

type WorkerRequest =
  | { type: 'load' }
  | { type: 'transcribe'; audio: Float32Array; requestId: number };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ctx: any = self;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pipelinePromise: Promise<any> | null = null;

function getPipeline() {
  if (!pipelinePromise) {
    pipelinePromise = pipeline('automatic-speech-recognition', 'onnx-community/moonshine-tiny-ONNX', {
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
      // No language/task options here (unlike Whisper) — Moonshine is
      // English-only with no multitask conditioning tokens, and these clips
      // are short enough that the pipeline's long-audio chunking isn't needed.
      const output = await transcriber(msg.audio);
      const text = Array.isArray(output) ? output.map(o => o.text).join(' ') : output.text;
      ctx.postMessage({ type: 'result', text: (text ?? '').trim(), requestId: msg.requestId });
    }
  } catch (err) {
    // Logged here (not just on the main thread) so the full error/stack is
    // visible in DevTools right where it happened — Worker console output
    // shows up in the same console as the main thread.
    console.error('[speechWorker]', msg.type, err);
    const requestId = msg.type === 'transcribe' ? msg.requestId : undefined;
    ctx.postMessage({ type: 'error', message: err instanceof Error ? err.message : String(err), requestId });
  }
});
