import { SlotLabel, SlotRating, SLOT_LABELS } from '../types';

/** Generate a simple unique session ID (no crypto dependency). */
export function generateId(): string {
  return 's-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
}

/** Average of the five 1–10 rating dimensions. */
export function avgRating(r: SlotRating): number {
  return (
    r.readability +
    r.perceivedRobustness +
    r.maintenanceConfidence +
    r.perceivedAuthorCompetence +
    r.hiddenComplexity
  ) / 5;
}

/** Count how many slots have been rated. */
export function ratedCount(ratings: Partial<Record<SlotLabel, SlotRating>>): number {
  return SLOT_LABELS.filter(s => !!ratings[s]).length;
}

/** All slots rated? */
export function allRated(ratings: Partial<Record<SlotLabel, SlotRating>>): boolean {
  return ratedCount(ratings) === SLOT_LABELS.length;
}

/** Download an object as a JSON file. */
export function downloadJSON(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
