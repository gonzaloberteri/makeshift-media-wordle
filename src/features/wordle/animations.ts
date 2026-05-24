/**
 * Shared reanimated 4 configs for the Wordle UI.
 *
 * Notes:
 *  - React Compiler is enabled. We pass these as plain frozen constants so
 *    they keep referential stability across renders.
 *  - Stick to `useAnimatedStyle` + `withTiming` / `withSequence` / `withDelay`.
 */

/** Flip-reveal: duration of a single half-flip (the tile flips in two halves). */
export const FLIP_HALF_DURATION_MS = 175;

/** Stagger between tiles in the same row, applied as `revealDelayMs`. */
export const REVEAL_STAGGER_MS = 250;

/** Row shake on invalid input. */
export const SHAKE_AMPLITUDE_PX = 6;
export const SHAKE_SEGMENT_MS = 55;

/** Win bounce on the winning row. */
export const WIN_BOUNCE_AMPLITUDE_PX = 8;
export const WIN_BOUNCE_SEGMENT_MS = 110;
