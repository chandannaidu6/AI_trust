import { createHmac } from 'node:crypto';

// Vercel serverless function. Mints a short, signed, single-use proof that
// a participant reached this study's completion page having finished all
// required reviews. The "Enter the gift card drawing" link on the
// completion page embeds this token, so the drawing page (a separate
// deployment) can refuse to open for anyone who didn't get there by
// finishing the study -- a bare copy-pasted link to the drawing site,
// with no valid token, shows a locked message instead of the form.
//
// The token is `<base64url(participantId.issuedAt)>.<hmac signature>`,
// signed with RAFFLE_LINK_SECRET -- a server-only env var set in this
// project's Vercel dashboard, and the *same* value set on the drawing
// app's Vercel project. Never commit the actual secret to either repo.
//
// This function only proves "someone holding the secret signed this
// payload" and stamps an issue time for expiry. It does not by itself
// stop a token being reused by someone it was shared with -- that
// single-use enforcement happens on the drawing side, which records
// spent tokens before accepting an entry.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const secret = process.env.RAFFLE_LINK_SECRET;
  if (!secret) {
    res.status(500).json({ error: 'Raffle linking is not configured on the server (missing RAFFLE_LINK_SECRET).' });
    return;
  }

  const participantId = typeof req.body?.participantId === 'string' ? req.body.participantId.trim() : '';
  // generateId() produces 's-<base36 timestamp>-<5 base36 chars>'. This is
  // a sanity bound, not a strict format check, so a harmless future change
  // to that format doesn't break token minting.
  if (!participantId || participantId.length > 64) {
    res.status(400).json({ error: 'Missing or invalid participantId.' });
    return;
  }

  const issuedAt = Date.now();
  const payload = `${participantId}.${issuedAt}`;
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  const token = `${Buffer.from(payload, 'utf8').toString('base64url')}.${signature}`;

  res.status(200).json({ token });
}
