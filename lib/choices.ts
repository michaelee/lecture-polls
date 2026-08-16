export const ALL_CHOICES = ["A", "B", "C", "D", "E"] as const;
export type Choice = (typeof ALL_CHOICES)[number];

export const MIN_CHOICES = 2;
export const MAX_CHOICES = ALL_CHOICES.length;

/** Returns the valid choice letters for a poll with the given numChoices (2-5). */
export function choicesFor(numChoices: number): Choice[] {
  const n = Math.min(Math.max(numChoices, MIN_CHOICES), MAX_CHOICES);
  return ALL_CHOICES.slice(0, n);
}

export function isValidChoice(value: string, numChoices: number): value is Choice {
  return choicesFor(numChoices).includes(value as Choice);
}
