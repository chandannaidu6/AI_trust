// Real-time streaming transcription via Deepgram's WebSocket API (model:
// Nova-3). Unlike the local-model approaches tried before this, this is
// genuinely streaming end-to-end -- audio is sent to Deepgram continuously
// while recording, and interim + final transcripts arrive back over the
// same connection within a few hundred milliseconds, the same interim-then-
// revise behavior as the Web Speech API but with a configurable endpointing
// window (see DEEPGRAM_WS_URL below) instead of a fixed, opaque one -- that
// tunable silence window is the whole reason for this over the Web Speech
// API: a quiet speaker's natural pauses were getting misread as "done
// talking" and cutting the recognition off early.
//
// The master API key never reaches the browser -- see api/deepgram-token.js.

export interface DeepgramTranscriptUpdate {
  /** Accumulated text Deepgram has finalized so far (won't change again). */
  finalText: string;
  /** Deepgram's current in-progress guess for the segment being spoken right now. */
  interimText: string;
}

export interface DeepgramSessionHandlers {
  onUpdate: (update: DeepgramTranscriptUpdate) => void;
  onError: (message: string) => void;
  /** Fires once the session has fully wound down, whether stopped intentionally or not. */
  onClose: () => void;
}

export interface DeepgramSession {
  /** Stop recording and close the session gracefully (flushes any final result first). */
  stop: () => void;
}

const DEEPGRAM_WS_URL =
  'wss://api.deepgram.com/v1/listen' +
  '?model=nova-3' +
  '&language=en-US' +
  '&interim_results=true' +
  // How long a silence has to last before Deepgram decides the speaker is
  // done and finalizes the segment. The Web Speech API doesn't expose this
  // at all; 1.5s gives a quiet/slow speaker meaningfully more room than
  // typical defaults without making the final answer feel laggy to submit.
  '&endpointing=1500' +
  // Detects the end of an utterance from word-timing gaps rather than pure
  // volume/silence -- more robust for a quiet speaker specifically, since a
  // volume-only detector can mistake "quiet" for "silence". Requires
  // interim_results=true, which is already set above.
  '&utterance_end_ms=1500' +
  '&smart_format=true' +
  '&punctuate=true';

async function fetchToken(): Promise<string> {
  const res = await fetch('/api/deepgram-token', { method: 'POST' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Could not get a transcription token (${res.status}).`);
  }
  const data = await res.json();
  if (!data.token) throw new Error('Transcription token response was empty.');
  return data.token as string;
}

export async function startDeepgramSession(
  stream: MediaStream,
  handlers: DeepgramSessionHandlers,
): Promise<DeepgramSession> {
  const token = await fetchToken();

  // Browsers can't set an Authorization header on a WebSocket handshake --
  // Deepgram's documented workaround for browser clients is to pass the
  // token as a subprotocol instead. The temporary token from /v1/auth/grant
  // is a JWT, which Deepgram authenticates as "Authorization: Bearer <jwt>"
  // (unlike a long-lived master API key, which uses "Token <key>") -- so the
  // subprotocol scheme has to be 'bearer' here, not 'token', or Deepgram
  // rejects the handshake outright and the browser only ever sees a generic
  // WebSocket error event with no detail.
  const socket = new WebSocket(DEEPGRAM_WS_URL, ['bearer', token]);

  let finalText = '';
  let interimText = '';
  let recorder: MediaRecorder | null = null;
  let stoppedByUs = false;

  const teardownRecorder = () => {
    try {
      recorder?.stop();
    } catch {
      // Already stopped — fine.
    }
  };

  socket.addEventListener('open', () => {
    const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
      .find(t => window.MediaRecorder.isTypeSupported?.(t));
    try {
      recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    } catch (err) {
      handlers.onError(err instanceof Error ? err.message : 'Recording is not supported in this browser.');
      socket.close();
      return;
    }
    recorder.ondataavailable = e => {
      if (e.data.size > 0 && socket.readyState === WebSocket.OPEN) {
        e.data.arrayBuffer().then(buf => {
          if (socket.readyState === WebSocket.OPEN) socket.send(buf);
        });
      }
    };
    // Small, frequent chunks so Deepgram sees audio with low latency instead
    // of one big blob at the end.
    recorder.start(250);
  });

  socket.addEventListener('message', event => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let msg: any;
    try {
      msg = JSON.parse(event.data);
    } catch {
      return; // Not a JSON message we understand — ignore rather than crash the session.
    }

    if (msg.type === 'Results') {
      const transcript = msg.channel?.alternatives?.[0]?.transcript ?? '';
      if (!transcript) return;
      if (msg.is_final) {
        finalText = finalText ? `${finalText} ${transcript}` : transcript;
        interimText = '';
      } else {
        interimText = transcript;
      }
      handlers.onUpdate({ finalText, interimText });
    } else if (msg.type === 'Error') {
      handlers.onError(msg.description || msg.message || 'Deepgram reported an error.');
    }
  });

  socket.addEventListener('error', () => {
    handlers.onError('Lost connection to the transcription service.');
  });

  socket.addEventListener('close', () => {
    teardownRecorder();
    handlers.onClose();
  });

  return {
    stop: () => {
      if (stoppedByUs) return;
      stoppedByUs = true;
      teardownRecorder();
      if (socket.readyState === WebSocket.OPEN) {
        // Tells Deepgram no more audio is coming so it flushes a final
        // result for whatever's left in its buffer before we close.
        socket.send(JSON.stringify({ type: 'CloseStream' }));
        setTimeout(() => {
          if (socket.readyState === WebSocket.OPEN) socket.close();
        }, 600);
      } else if (socket.readyState === WebSocket.CONNECTING) {
        socket.close();
      }
    },
  };
}
