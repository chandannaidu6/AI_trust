const WHISPER_SAMPLE_RATE = 16000;

/** Decode a recorded audio Blob and resample it to 16kHz mono, the format Whisper expects. */
export async function blobToWhisperPCM(blob: Blob): Promise<Float32Array> {
  const arrayBuffer = await blob.arrayBuffer();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
  const decodeCtx = new AudioContextCtor();
  let audioBuffer: AudioBuffer;
  try {
    audioBuffer = await decodeCtx.decodeAudioData(arrayBuffer);
  } finally {
    // Swallow close() failures so they don't mask a real decodeAudioData error.
    decodeCtx.close().catch(() => {});
  }

  const offlineCtx = new OfflineAudioContext(
    1,
    Math.ceil(audioBuffer.duration * WHISPER_SAMPLE_RATE),
    WHISPER_SAMPLE_RATE,
  );
  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineCtx.destination);
  source.start(0);
  const rendered = await offlineCtx.startRendering();
  return rendered.getChannelData(0);
}
