import { ANSWERS } from './answers';
import { ALLOWED } from './allowed';

export { ANSWERS } from './answers';
export { ALLOWED } from './allowed';

/**
 * Build the lookup set once at module load. Used by the engine to validate
 * guesses without re-iterating the array. Superset of ANSWERS by construction.
 */
export const ALLOWED_SET: ReadonlySet<string> = new Set<string>(ALLOWED);

/**
 * Pick a random answer using the provided RNG (defaults to Math.random).
 * Injecting the RNG keeps the function deterministic in tests.
 */
export function pickRandomAnswer(rng: () => number = Math.random): string {
  const idx = Math.floor(rng() * ANSWERS.length);
  return ANSWERS[idx];
}
