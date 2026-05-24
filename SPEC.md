# Wordle Implementation Spec

> Spec-driven development document for the Timeshift Media coding exercise.
> Designed for execution in 4 sequential, self-contained Claude sessions.
> When approved, move this file to `SPEC.md` at the repo root before starting Phase 1.

---

## 1. Context

The exercise (`Timeshift Media Coding Exercise.pdf`) asks for a Wordle implementation in React Native + TypeScript:

1. A data type representing the board state (in-progress / won / lost)
2. A pure `(board, guess) → newState` function returning game state
3. At least one positive + one negative unit test for #2
4. (Bonus) A front-end form

The repo (`/Users/gonza/dev/makeshift-media`) is a clean Expo SDK 56 scaffold (React 19.2, RN 0.85, expo-router file-based routing, react-native-web 0.21, reanimated 4, iOS prebuilt as `com.makeshiftmedia.wordle`, themed primitives in `src/components/`, bun package manager, no tests, empty `.maestro/`). React Compiler is enabled.

**Target platforms:** iOS simulator + web (chromium). Android is not in scope.
**Verification tools available to future sessions:** chrome devtools MCP, iOS simulator, Maestro MCP.

**Approach:** ship the PDF's literal deliverables (the engine + unit tests fully satisfy #1-#3) plus a polished bonus #4: a canonical Wordle UX with on-screen colored keyboard, flip/shake animations, and Maestro E2E flows on both iOS and web.

---

## 2. Deliverables, mapped to PDF questions

| PDF question | Deliverable | Where |
| --- | --- | --- |
| Q1 — board data type | `BoardState`, `SubmittedGuess`, status enums | `src/game/types.ts` |
| Q2 — guess function | `submitGuess(board, raw)` + `validateGuess` + `applyGuess` | `src/game/engine.ts` |
| Q3 — tests | ts-jest unit suite, ~12-15 cases, both positive + negative | `src/game/engine.test.ts` |
| Q4 — front-end | Tappable colored keyboard, flip-reveal tiles, shake-on-invalid, restart | `src/features/wordle/**`, mounted in `src/app/index.tsx` |
| Extra credit | Maestro E2E on iOS + web | `.maestro/*.yaml` |

---

## 3. Architecture

### 3.1 Engine (pure TS, no React)

```ts
// src/game/types.ts
export type LetterStatus = 'correct' | 'present' | 'absent';
export type KeyStatus = LetterStatus | 'unused';
export type GameStatus = 'in_progress' | 'won' | 'lost';

export interface EvaluatedTile { letter: string; status: LetterStatus }
export interface SubmittedGuess { tiles: EvaluatedTile[] }

export interface BoardState {
  answer: string;                          // lowercase, length === wordLength
  wordLength: number;                      // 5
  maxGuesses: number;                      // 6
  guesses: SubmittedGuess[];               // submitted only, never the in-progress row
  status: GameStatus;
  keyStatuses: Record<string, KeyStatus>;  // 'a'..'z' aggregate
}

export type ValidationError =
  | { kind: 'too_short' }
  | { kind: 'not_in_word_list' }
  | { kind: 'game_over' };

export type SubmitResult =
  | { ok: true; board: BoardState; evaluation: SubmittedGuess; transition: 'won' | 'lost' | 'continue' }
  | { ok: false; error: ValidationError };
```

```ts
// src/game/engine.ts — exported surface
export function createBoard(opts: { answer: string; wordLength?: 5; maxGuesses?: 6 }): BoardState;
export function validateGuess(raw: string, opts: { wordLength: number; wordSet: ReadonlySet<string> }):
  | { ok: true; normalized: string }
  | { ok: false; error: ValidationError };
export function applyGuess(board: BoardState, normalizedGuess: string): SubmitResult;
export function submitGuess(board: BoardState, raw: string, wordSet: ReadonlySet<string>): SubmitResult;
```

**Split rationale:** `validateGuess` lets the UI shake the row for invalid input without mutating state; `applyGuess` is the pure reducer step; `submitGuess` is the convenience wrapper used by the hook.

### 3.2 Duplicate-letter algorithm (the canonical Wordle correctness trap)

Worked example: guess `ALLOY` vs answer `ALOHA`. The second `L` must be **absent**, not **present** (the answer has only one L, already consumed at position 1).

Two-pass evaluation:

1. **Pass 1 — greens.** Initialize `pool = Counter(answer)`. For each position `i`, if `guess[i] === answer[i]`, set tile status to `correct` and decrement `pool[guess[i]]`. Mark the slot resolved.
2. **Pass 2 — yellows / greys.** For each unresolved position, if `pool[guess[i]] > 0`, set `present` and decrement; otherwise `absent`.

Then re-derive `keyStatuses` by combining the previous value with each evaluated tile using the precedence `correct (3) > present (2) > absent (1) > unused (0)` — never downgrade.

### 3.3 State (UI layer)

`useReducer` inside `useWordle()`, no external store. Engine state is the reducer state; the in-progress typed row stays in UI state because it changes on every tap and isn't game state.

```ts
// src/features/wordle/use-wordle.ts
type Action =
  | { type: 'press_letter'; letter: string }
  | { type: 'press_backspace' }
  | { type: 'press_enter' }
  | { type: 'restart'; answer: string }
  | { type: 'clear_error' };

interface UiState {
  board: BoardState;
  currentGuess: string;                    // 0..wordLength chars, UI-only
  lastError: ValidationError | null;       // drives shake; cleared on next keypress
  revealRowIndex: number | null;           // signals reveal anim; nulled after completion
}
```

### 3.4 Components (visual primitives, dumb)

| File | Responsibility |
| --- | --- |
| `Tile.tsx` | Single cell. Owns flip-reveal `SharedValue`. Props: `letter`, `status \| null`, `revealDelayMs`, `onRevealComplete`. |
| `Row.tsx` | 5 tiles. Owns shake `translateX`. Props: `tiles`, `shouldShake`, `isCurrent`. |
| `Board.tsx` | 6 rows. Pure layout. Props: `guesses`, `currentGuess`, `maxGuesses`, `wordLength`, `errorRowIndex`, `revealRowIndex`. |
| `KeyboardKey.tsx` | One key. Props: `label`, `status`, `onPress`, `wide?`. |
| `Keyboard.tsx` | QWERTY layout. Props: `keyStatuses`, `onLetter`, `onEnter`, `onBackspace`. |
| `StatusBanner.tsx` | "You won" / "Game over — word was APPLE" / nothing. |
| `RestartButton.tsx` | Tap → dispatch `restart` with fresh random answer. |

Phase 2 ships these as **purely presentational** with `testID` + `accessibilityLabel` baked in. Phase 3 wires them through `useWordle()`.

### 3.5 Word lists

`src/game/wordlist/answers.ts` — ~300 common 5-letter answers (curated).
`src/game/wordlist/allowed.ts` — ~2000 valid guesses (superset; includes all answers).
`src/game/wordlist/index.ts` exports `ANSWERS`, `ALLOWED_SET` (built once via `new Set(ALLOWED)`), `pickRandomAnswer(rng = Math.random): string`.

### 3.6 Dev-only seed for deterministic E2E

`src/features/wordle/dev-seed.ts` reads the seeded answer from one of two places, both gated by `if (!__DEV__) return null;`:

- **Web:** `?answer=apple` query string parsed from `window.location.search`.
- **Native:** deep link `makeshiftmedia://seed/<word>` captured via `Linking.getInitialURL()` + `Linking.addEventListener('url', …)`. Cached in module-level state; consumed by `useWordle` on init and on `restart`.

The app already declares `scheme: "makeshiftmedia"` in `app.json`, so the native side requires no config changes. Production safety = the `__DEV__` gate (Metro strips the branch in release builds).

Unit test: `getSeededAnswer()` returns `null` when `__DEV__` is patched to `false`.

---

## 4. File layout

```
src/
  game/
    types.ts
    engine.ts
    engine.test.ts                      # Phase 1
    wordlist/
      answers.ts
      allowed.ts
      index.ts
    keyboard-layout.ts                  # QWERTY rows, pure data
  features/
    wordle/
      use-wordle.ts                     # Phase 3
      WordleScreen.tsx                  # Phase 3
      Board.tsx                         # Phase 2
      Row.tsx                           # Phase 2
      Tile.tsx                          # Phase 2 (anim stubs) → Phase 3 (anim impl)
      Keyboard.tsx                      # Phase 2
      KeyboardKey.tsx                   # Phase 2
      StatusBanner.tsx                  # Phase 2
      RestartButton.tsx                 # Phase 2
      animations.ts                     # Phase 3 — shared reanimated configs
      dev-seed.ts                       # Phase 3
  app/
    _layout.tsx                         # unchanged
    index.tsx                           # Phase 3: replace body with <WordleScreen />
    explore.tsx                         # Phase 3 (optional): convert to "How to play"

.maestro/
  ios-win.yaml
  ios-loss.yaml
  ios-invalid-shake.yaml
  web-win.yaml
  web-loss.yaml
  web-invalid-shake.yaml
  README.md                             # how to run, seeding mechanism

jest.config.js                          # Phase 1, ts-jest preset, node env
SPEC.md                                 # this file, moved here after approval
```

---

## 5. Cross-platform element identification (Maestro)

- **iOS:** RN forwards `testID` → `accessibilityIdentifier`. Maestro's XCUITest driver matches on it. ✅
- **Web:** `react-native-web` forwards `testID` → `data-testid`. Maestro's chromium driver matches via CSS selector / text. ✅
- **Always set both** `testID` and `accessibilityLabel`. The label gives Maestro a `text:` fallback on web (it surfaces as `aria-label`) and improves a11y.

### Naming convention

| Element | `testID` | `accessibilityLabel` |
| --- | --- | --- |
| Board container | `board` | `"Wordle board"` |
| Row | `row-${rowIndex}` | — |
| Tile | `tile-${rowIndex}-${colIndex}` | `"row N column M, <status or empty>, <letter or empty>"` |
| Letter key | `key-${letter}` (lowercase) | `"Key <LETTER>"` |
| Enter | `key-enter` | `"Enter"` |
| Backspace | `key-backspace` | `"Backspace"` |
| Status banner | `status-banner` | banner text |
| Error banner | `error-banner` | error text |
| Restart | `restart-button` | `"Play again"` |

In Maestro flows, prefer `tapOn: { id: "key-a" }` over text matching for keys (avoids collisions with same-letter tiles).

---

## 6. Testing strategy

### 6.1 Unit tests (Phase 1)

**Use plain `jest` + `ts-jest`, NOT `jest-expo`.** Engine is pure TS with no JSX, no native deps, no React. This sidesteps the jest-expo / RN 0.85 / React 19.2 version-skew risk.

```js
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.test.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
};
```

`package.json` script: `"test": "jest"`.

Required cases (~12-15 total, name them descriptively):

**Positive**
- correct guess on first try → `transition: 'won'`, `status: 'won'`, all tiles `correct`
- correct guess on sixth try → `transition: 'won'` (not `lost`)
- partial match: greens + yellows + greys distinct positions
- **duplicate letter beyond answer count is absent** — guess `ALLOY` vs `ALOHA`: pos 0 A correct, pos 1 L correct, pos 2 L absent, pos 3 O present, pos 4 Y absent
- duplicate letter where answer has duplicates too — guess `LLAMA` vs `ALOHA`: assert second-A handling
- `keyStatuses` aggregates with correct precedence (no downgrade from correct → present)

**Negative**
- guess shorter than `wordLength` → `not ok`, error `too_short`
- guess not in allowed list → `not ok`, error `not_in_word_list`
- guess after `status === 'won'` → `not ok`, error `game_over`
- sixth wrong guess → `status: 'lost'`, `transition: 'lost'`

### 6.2 E2E (Phase 4)

Maestro flows, one YAML per scenario × platform (6 total). Local runs only; cloud is out of scope.

Three scenarios:
1. **happy-path win** — seed answer `apple`, type it, assert `"You won"`
2. **full-loss** — seed answer `zebra`, type 6 valid wrong guesses, assert `"Game over"` + revealed answer
3. **invalid-word shake** — type `xxxxx`, assert error banner visible (skip asserting the shake animation itself)

### 6.3 No component-level RN tests in scope

Skip `@testing-library/react-native` to avoid React 19.2 compatibility risk. The engine tests fully satisfy the PDF, and Maestro covers the UI end-to-end.

---

## 7. Phases

Each phase = a fresh Claude session with a clean context budget. Phase prompts below are ready to copy-paste.

### Phase 1 — Engine + unit tests

**Goal:** ship Q1, Q2, Q3 of the PDF, fully tested, no React.

**Read first:** `SPEC.md` §3.1, §3.2, §5.1, §6.1; `package.json`; `tsconfig.json`.
**Do not read:** any UI files; no need.

**Tasks:**
1. `bun add -d jest @types/jest ts-jest`. Verify `bunx jest --version`.
2. Create `jest.config.js` per §6.1. Add `"test": "jest"` to `package.json`.
3. Create `src/game/types.ts`, `src/game/engine.ts`, `src/game/wordlist/{answers,allowed,index}.ts`, `src/game/keyboard-layout.ts`.
4. Curate the two word lists. Source: any public Wordle list; commit verbatim. Ensure `ANSWERS ⊆ ALLOWED`.
5. Write `src/game/engine.test.ts` with all cases from §6.1.
6. `bun run test` → all green.

**Done when:** `bun run test` passes, the engine surface matches §3.1 exactly, the duplicate-letter case is named and passing.

**Handoff contract:** the public exports of `src/game/engine.ts` and `src/game/types.ts` are frozen. Phase 2 and 3 import only from there.

### Phase 2 — UI primitives (visual only)

**Goal:** ship the dumb presentational components. No game wiring, no animations beyond the prop stubs.

**Read first:** `SPEC.md` §3.4, §4, §5; `src/game/types.ts`; `src/constants/theme.ts`; `src/components/themed-text.tsx`, `src/components/themed-view.tsx`; `src/app/_layout.tsx`.
**Do not read:** engine internals; word lists.

**Tasks:**
1. Extend `src/constants/theme.ts` with `WordleColors` for light/dark: tile background empty / filled-unrevealed / correct / present / absent; key background unused / correct / present / absent; tile/key text colors for each state.
2. Build `Tile`, `Row`, `Board`, `KeyboardKey`, `Keyboard`, `StatusBanner`, `RestartButton` per §3.4. All `testID`s + `accessibilityLabel`s baked in per §5.
3. `Tile` accepts animation stub props (`revealDelayMs?`, `onRevealComplete?`) as no-ops. `Row` accepts `shouldShake?` as a no-op.
4. Build a temporary preview route at `src/app/_dev/components-preview.tsx` (file-based routing picks it up at `/(dev)/components-preview` — verify the path) showing each component in multiple states for visual QA.
5. Verify on web via chrome-devtools MCP (navigate to the preview route, take screenshot, inspect light + dark) and on iOS sim (`take_screenshot` via maestro MCP after `list_devices`).

**Done when:** preview route renders every component in every state on both platforms; all `testID`s present in the rendered tree.

**Handoff contract:** component props match §3.4. `Tile` and `Row` already accept animation hook props as stubs — Phase 3 implements without changing the API.

### Phase 3 — Game wiring + animations

**Goal:** ship the playable game.

**Read first:** `SPEC.md` §3.3, §3.4, §3.6, §5; `src/game/engine.ts`; `src/game/types.ts`; the phase-2 component files; `src/app/_layout.tsx`; `src/app/index.tsx`.
**Do not read:** word-list contents; engine internals beyond the exported types.

**Tasks:**
1. Implement `src/features/wordle/dev-seed.ts` per §3.6. Wire `Linking` listener on native; `URLSearchParams` on web.
2. Implement `src/features/wordle/use-wordle.ts` — `useReducer` over `UiState` per §3.3. Initialize answer via `getSeededAnswer() ?? pickRandomAnswer()`. Expose `{ board, currentGuess, lastError, revealRowIndex, onLetter, onBackspace, onEnter, onRestart }`.
3. Implement `src/features/wordle/animations.ts` — shared reanimated 4 configs for flip (timing 350ms, staggered 250ms per tile), shake (sequence of translateX), win bounce (sequence of translateY on winning row).
4. Wire `Tile` to consume `revealDelayMs` + `onRevealComplete`; wire `Row` to consume `shouldShake`. Use `useSharedValue` + `useAnimatedStyle` + `useAnimatedReaction` (NOT `useEffect`-driven imperative starts — React Compiler is enabled).
5. On web only (`Platform.OS === 'web'`), attach `window.addEventListener('keydown', …)` for physical keyboard: A-Z → letter, Backspace, Enter. Detach on unmount.
6. Build `src/features/wordle/WordleScreen.tsx` composing `Board` + `Keyboard` + `StatusBanner` + `RestartButton` and consuming `useWordle`.
7. Replace `src/app/index.tsx` body with `<WordleScreen />`. Delete the temporary `src/app/_dev/` preview route from Phase 2.
8. (Optional) convert `src/app/explore.tsx` to a short "How to play" screen using existing `ThemedText` / `HintRow`.
9. Self-test:
   - **Web** via chrome-devtools MCP: navigate to `localhost:8081/?answer=apple`, type `APPLE`, screenshot win state. Then `localhost:8081/?answer=zebra`, type 6 wrong guesses, screenshot loss state. Then type `xxxxx`, screenshot error banner.
   - **iOS** via maestro MCP `inspect_screen` + `take_screenshot`: launch the app, run a deep-link seed, tap keys, screenshot each terminal state.

**Done when:** all three scenarios (win, loss, invalid) work on both platforms with animations.

**Handoff contract:** `Board`, `Keyboard`, etc. expose their `testID`s exactly per §5. Phase 4 targets only those IDs.

**Scope-cut fallback:** if animations stall, ship static color transitions (no flip, no shake) and move on. Game correctness > animation polish.

### Phase 4 — Maestro E2E

**Goal:** ship the six flows, all passing locally on iOS + chromium.

**Read first:** `SPEC.md` §5, §6.2; `.maestro/` (verify empty); `app.json` (confirm `scheme` and bundle id).
**Do not read:** game source.

**Tasks:**
1. `list_devices` (maestro MCP). Confirm an iOS simulator boots and `chromium` is available. If not, ask the user to boot one.
2. Confirm `bun run web` is running on a known port (default 8081); set `MAESTRO_WEB_URL` if different.
3. Write the six YAML files per §6.2:
   - `ios-win.yaml`, `ios-loss.yaml`, `ios-invalid-shake.yaml` — start with `launchApp { stopApp: true }` then `openLink: makeshiftmedia://seed/<answer>`.
   - `web-win.yaml`, `web-loss.yaml`, `web-invalid-shake.yaml` — start with `openLink: ${MAESTRO_WEB_URL}/?answer=<answer>` (use `${MAESTRO_WEB_URL:-http://localhost:8081}`).
4. Each flow: assert `board` visible, tap key sequence by `{ id: "key-<letter>" }`, tap `{ id: "key-enter" }`, assert banner text.
5. `.maestro/README.md` — one-pager: prereqs (sim booted, web server running), how to run a single flow, how seeding works, why we don't ship to Maestro Cloud.
6. Run each flow individually via `mcp__maestro__run`. Use `inspect_screen` on any failure to debug. Iterate until all 6 pass.

**Done when:** all six flows pass cleanly back-to-back.

---

## 8. Risks (load-bearing only)

- **React Compiler is on** (`experiments.reactCompiler: true` in `app.json`). For animations, use `useSharedValue` + `useAnimatedReaction` rather than `useEffect`-driven imperative animation starts. Mark all worklets explicitly. Don't pass fresh objects as `useEffect` deps.
- **Reanimated 4 + worklets 0.8** is the new-architecture runtime. Most online examples target v3. Stick to `useAnimatedStyle` + `withTiming/withSequence/withDelay` — these are stable.
- **jest-expo / @testing-library/react-native version skew** vs React 19.2 / RN 0.85. Avoided by using plain `ts-jest` for engine tests only (§6.1).
- **`expo-router/unstable-native-tabs`** is `unstable`-prefixed. Working today; if it breaks, fall back to the existing `app-tabs.web.tsx` custom-tabs pattern.
- **Dev seed in production:** the `__DEV__` gate is sufficient (Metro tree-shakes). Add the unit test asserting null when `__DEV__` is false.
- **Web dev port drift:** `expo start --web` sometimes lands on 8082. Maestro web flows must read `MAESTRO_WEB_URL` env var with a sensible default.

---

## 9. Verification checklist (end of Phase 4)

- [ ] `bun run test` → green, ≥12 cases including the duplicate-letter case
- [ ] `bun run web` → typing the seeded answer wins the game
- [ ] iOS sim → deep-link seed + typed answer wins the game
- [ ] All six Maestro flows pass locally
- [ ] No `_dev/` preview route left in `src/app/`
- [ ] `getSeededAnswer()` returns null under production conditions (unit-tested)
- [ ] No `@testing-library/react-native` or `jest-expo` in deps (we chose ts-jest-only)
- [ ] `package.json` `test` script wired
- [ ] `.maestro/README.md` documents how to run flows + the seed mechanism

---

## 10. Decisions log

- **Input:** on-screen tappable colored keyboard; web also wires physical keyboard.
- **Word list:** embedded TS arrays (~300 answers + ~2000 allowed), random per game, dev-only seed override.
- **Polish:** Wordle-faithful (flip reveal + row shake + win bounce).
- **Tabs:** keep existing `AppTabs`; replace `index.tsx` body with the game; convert `explore.tsx` to "How to play" if time.
- **Unit tests:** ts-jest, engine-only — avoids jest-expo version skew.
- **E2E:** Maestro local, one YAML per scenario × platform, native seed via deep link, web seed via `?answer=`.
- **No external state store** — `useReducer` inside `useWordle()`.
- **`currentGuess` lives in UI state**, not engine state (engine stays pure-data and serializable).
