const ASR_SAMPLE_RATE = 16000;

/**
 * Decode a recorded audio Blob, resample it to 16kHz mono (the format both
 * Moonshine and Whisper expect), and boost quiet speech on the way through.
 *
 * Participants who speak quietly were getting dropped words because the
 * recording was too soft for the model to pick up. A DynamicsCompressorNode
 * raises quiet passages more than loud ones (rather than a flat gain
 * multiplier, which would just as happily clip/distort anyone already
 * speaking at a normal volume), followed by a modest makeup gain.
 */
export async function blobToPCM(blob: Blob): Promise<Float32Array> {
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
    Math.ceil(audioBuffer.duration * ASR_SAMPLE_RATE),
    ASR_SAMPLE_RATE,
  );
  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;

  const compressor = offlineCtx.createDynamicsCompressor();
  compressor.threshold.value = -50; // start compressing well before normal speech peaks
  compressor.knee.value = 30;       // soft knee — gradual, not an abrupt clamp
  compressor.ratio.value = 12;      // strong compression, quiet passages come up a lot
  compressor.attack.value = 0.003;
  compressor.release.value = 0.25;

  const makeupGain = offlineCtx.createGain();
  makeupGain.gain.value = 1.6;      // additional flat boost on top of the compressed signal

  // The makeup gain can push an already-loud peak over 0dB — a second,
  // near-brickwall compressor catches that instead of letting it clip.
  const limiter = offlineCtx.createDynamicsCompressor();
  limiter.threshold.value = -3;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.001;
  limiter.release.value = 0.1;

  source.connect(compressor);
  compressor.connect(makeupGain);
  makeupGain.connect(limiter);
  limiter.connect(offlineCtx.destination);
  source.start(0);

  const rendered = await offlineCtx.startRendering();
  return rendered.getChannelData(0);
}
