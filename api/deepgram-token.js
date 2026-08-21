// Vercel serverless function. Mints a short-lived, scoped Deepgram token per
// recording session so the browser never sees the long-lived master API key
// -- that key lives only in this server-side environment variable
// (DEEPGRAM_API_KEY, set in the Vercel project's dashboard, never committed
// to the repo). If the master key were embedded in client code instead, it
// would ship in the JS bundle to every participant's browser and be
// trivially readable from dev tools.
//
// This calls Deepgram's documented token-grant endpoint
// (https://api.deepgram.com/v1/auth/grant) with the master key, and returns
// only the resulting temporary token to the client. The client then opens a
// WebSocket directly to Deepgram using that temporary token (passed as a
// WebSocket subprotocol, since browsers can't set custom headers on a
// WebSocket handshake) -- see src/utils/deepgramClient.ts.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const rawApiKey = process.env.DEEPGRAM_API_KEY;
  if (!rawApiKey) {
    res.status(500).json({ error: 'Deepgram is not configured on the server (missing DEEPGRAM_API_KEY).' });
    return;
  }

  // A real Deepgram API key is a short hex string (~40 chars) with no
  // whitespace. Trim it defensively, and reject anything that still looks
  // wrong with a specific message -- this exact failure mode has already
  // happened once: pasting a whole webpage's text into the Vercel env var
  // field instead of just the key, which produces a value containing line
  // breaks. That's not a valid HTTP header value, so without this check the
  // only symptom is a confusing low-level "invalid header value" error from
  // the fetch call below.
  const apiKey = rawApiKey.trim();
  if (/[\r\n\t]/.test(apiKey) || apiKey.length > 100) {
    res.status(500).json({
      error: 'DEEPGRAM_API_KEY looks malformed (contains line breaks or is unusually long) -- ' +
        'check the value in Vercel\'s Environment Variables settings. It should be only the key ' +
        'itself, nothing else pasted alongside it.',
    });
    return;
  }

  try {
    const dgResponse = await fetch('https://api.deepgram.com/v1/auth/grant', {
      method: 'POST',
      headers: {
        Authorization: `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      // Short TTL -- this token is only used to authenticate the initial
      // WebSocket handshake for one recording session, not held onto.
      body: JSON.stringify({ ttl_seconds: 60 }),
    });

    if (!dgResponse.ok) {
      const detail = await dgResponse.text().catch(() => '');
      res.status(502).json({ error: `Deepgram token request failed (${dgResponse.status}): ${detail}` });
      return;
    }

    const data = await dgResponse.json();
    if (!data.access_token) {
      res.status(502).json({ error: 'Deepgram token response did not include an access_token.' });
      return;
    }

    res.status(200).json({ token: data.access_token });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error minting Deepgram token.' });
  }
}
