/**
 * Seedable PRNG utilities for stable, reproducible randomisation.
 *
 * The slot assignment for a given participant+question+language triple is
 * derived from a deterministic seed so that:
 *   - Every participant sees a different order.
 *   - The same participant always sees the same order for the same question
 *     (important if the page is reloaded mid-session).
 *
 * Algorithm: Mulberry32 — simple, fast, well-distributed 32-bit PRNG.
 */

/** Mulberry32 seeded PRNG. Returns a function producing floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** djb2 string hash → 32-bit unsigned integer. */
export function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

/**
 * Build a reproducible seed from participant ID + question ID + language.
 * Combining three values with primes keeps the distribution uniform.
 */
export function buildSeed(participantId: string, questionId: string, language: string): number {
  return (hashString(participantId) * 1000003 + hashString(questionId) * 999983 + hashString(language)) >>> 0;
}

/** Fisher-Yates shuffle driven by a seeded PRNG. Returns a new array. */
export function seededShuffle<T>(arr: readonly T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** One-shot convenience: shuffle `arr` using a seed derived from the three keys. */
export function shuffleForSession<T>(
  arr: readonly T[],
  participantId: string,
  questionId: string,
  language: string,
): T[] {
  const seed = buildSeed(participantId, questionId, language);
  const rng = mulberry32(seed);
  return seededShuffle(arr, rng);
}
