// Wording for the six worded rating scales (see ReviewForm/WordScale). Kept
// here, shared between the form and the export/Sheets code, so the text a
// participant actually saw and picked is exactly what ends up in the
// spreadsheet -- not the raw 1-4 number, which on its own doesn't say what a
// reviewer meant (this is also why the scale was changed from 1-10 to
// worded options in the first place: a bare number is ambiguous).

export interface RatingOption {
  value: number;
  label: string;
}

export const READABILITY_OPTIONS: RatingOption[] = [
  { value: 1, label: 'Hard to follow, poorly formatted' },
  { value: 2, label: 'Cluttered, takes real effort to scan' },
  { value: 3, label: 'Clear, reasonably easy to scan' },
  { value: 4, label: 'Clean and effortless to read' },
];

export const UNDERSTANDABILITY_OPTIONS: RatingOption[] = [
  { value: 1, label: "Unclear, couldn't work out its purpose" },
  { value: 2, label: 'Understood it, but only after real effort' },
  { value: 3, label: 'Understood it fairly quickly' },
  { value: 4, label: 'Immediately clear what it does' },
];

export const ROBUSTNESS_OPTIONS: RatingOption[] = [
  { value: 1, label: 'Not confident, likely breaks on edge cases' },
  { value: 2, label: 'Somewhat confident, but real doubts remain' },
  { value: 3, label: 'Fairly confident, only minor gaps possible' },
  { value: 4, label: 'Fully confident it handles edge cases' },
];

export const MAINTENANCE_OPTIONS: RatingOption[] = [
  { value: 1, label: "Not confident, I'd be wary to touch it" },
  { value: 2, label: "Somewhat confident, but it'd take real care" },
  { value: 3, label: 'Fairly confident I could work with it' },
  { value: 4, label: 'Fully confident, straightforward to extend' },
];

export const COMPETENCE_OPTIONS: RatingOption[] = [
  { value: 1, label: 'Not skilled, shows clear gaps in practice' },
  { value: 2, label: 'Somewhat skilled, mixed signs of experience' },
  { value: 3, label: 'Skilled, solid and mostly sound practice' },
  { value: 4, label: 'Highly skilled, expert-level craftsmanship' },
];

export const HIDDEN_COMPLEXITY_OPTIONS: RatingOption[] = [
  { value: 1, label: 'None, everything is as it appears' },
  { value: 2, label: 'A little, a few subtleties beneath the surface' },
  { value: 3, label: "A fair amount, a few things I might've missed" },
  { value: 4, label: 'A lot, this needs a close, careful look' },
];

export function labelForValue(options: RatingOption[], value: number): string {
  return options.find(o => o.value === value)?.label ?? '';
}
