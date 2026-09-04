export const ALL_CHOICES = ["A", "B", "C", "D", "E"] as const;
export type Choice = (typeof ALL_CHOICES)[number];

export const MIN_CHOICES = 1;
export const MAX_CHOICES = ALL_CHOICES.length;

/** Returns the valid choice letters for a poll with the given numChoices (1-5). */
export function choicesFor(numChoices: number): Choice[] {
  const n = Math.min(Math.max(numChoices, MIN_CHOICES), MAX_CHOICES);
  return ALL_CHOICES.slice(0, n);
}

export function isValidChoice(value: string, numChoices: number): value is Choice {
  return choicesFor(numChoices).includes(value as Choice);
}

/**
 * A 1-choice poll isn't really a multiple-choice question -- it's a single tappable
 * button used to take attendance (there's nothing to choose between, just "present").
 */
export function isAttendancePoll(numChoices: number): boolean {
  return numChoices === 1;
}
