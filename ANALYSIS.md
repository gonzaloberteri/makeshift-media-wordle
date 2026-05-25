# Wordle Implementation Analysis

The four PDF deliverables are already implemented and committed. Here's how the code maps to each question.

## Q1 — Board data type

`src/game/types.ts:14` — `BoardState` carries everything needed to describe game state and completion:

- `answer`, `wordLength`, `maxGuesses` — invariant config
- `guesses: SubmittedGuess[]` — every submitted row with per-tile `LetterStatus` (`'correct' | 'present' | 'absent'`)
- `status: GameStatus` (`'in_progress' | 'won' | 'lost'`) — completion + win/loss
- `keyStatuses: Record<'a'..'z', KeyStatus>` — aggregate per-letter state for the keyboard

`SubmitResult` (`src/game/types.ts:28`) is the discriminated union returned by the function in Q2 — `{ ok: true, board, evaluation, transition }` or `{ ok: false, error }`.

## Q2 — (board, guess) → newState

`src/game/engine.ts` exposes three layers:

- `validateGuess` (`src/game/engine.ts:51`) — `too_short` / `not_in_word_list` checks, returns normalized lowercase
- `applyGuess` (`src/game/engine.ts:116`) — pure reducer over `BoardState`. Two-pass duplicate-letter evaluation (`src/game/engine.ts:67`), monotonic key-status merge (`correct > present > absent > unused`, never downgrades), terminal-transition resolution
- `submitGuess` (`src/game/engine.ts:151`) — convenience wrapper composing the two

Returns map directly to the three states asked for:

- (a) `transition: 'won'`, `board.status: 'won'`
- (b) `transition: 'continue'`, evaluated `tiles`, updated `keyStatuses`, remaining = `maxGuesses - guesses.length`
- (c) `transition: 'lost'`, `board.status: 'lost'`
- Plus `{ ok: false, error }` for invalid input / post-terminal submissions

## Q3 — Tests

`src/game/engine.test.ts` — 19 cases via ts-jest, well past the 1+1 minimum:

- **Positive:** first-try win, sixth-try win, mixed greens/yellows/greys, canonical `ALLOY` vs `ALOHA` duplicate trap, `LLAMA` vs `ALOHA`, key-status precedence upward + no-downgrade
- **Negative:** `too_short` (short + long), `not_in_word_list`, sixth wrong → `lost`, submit after `won`, submit after `lost`
- Plus wordlist sanity checks and an immutability test

All passing per the `phase 1` commit.

## Q4 — Front-end

Implemented and playable on iOS + web:

- `useWordle` hook (`src/features/wordle/use-wordle.ts`) — `useReducer`, web physical keyboard, dev-only deep-link/query seeding
- Presentational components: `Board`, `Row`, `Tile`, `Keyboard`, `KeyboardKey`, `StatusBanner`, `RestartButton`
- `WordleScreen` mounted at `src/app/index.tsx`
- Six Maestro E2E flows (iOS + chromium × win/loss/invalid) passing per the `phase 4` commit

## Notable design choices

- `currentGuess` lives in UI state, not `BoardState` — keeps the engine pure/serializable
- `validateGuess` / `applyGuess` split lets the UI shake on invalid input without touching board state
- Engine tested with plain `ts-jest` (no `jest-expo` / RTL) to dodge React 19.2 / RN 0.85 version skew
