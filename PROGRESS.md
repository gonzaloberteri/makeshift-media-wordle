# PROGRESS.md — orchestrator audit trail

## Phase 1 — Engine + unit tests — started 2026-05-24T22:39:46Z

- Prereqs verified: `bun --version` → 1.3.11, repo is clean Expo scaffold, `.maestro/` empty, no prior PROGRESS.md.

### Verification — 2026-05-24T22:53:48Z — PASS

- `bun run test` → `22 passed, 22 total` (independently re-run by orchestrator, not just subagent report).
- Engine surface in `src/game/engine.ts` and `src/game/types.ts` matches SPEC §3.1 verbatim (types + signatures).
- Duplicate-letter algorithm in `evaluateGuess` is the two-pass per §3.2; `mergeKeyStatuses` uses `STATUS_RANK` precedence (never downgrades).
- Duplicate-letter test case present and named `'duplicate letter beyond answer count is absent (ALLOY vs ALOHA)'`.
- Word lists: `ANSWERS.length = 300`, `ALLOWED_SET.size = 3512`, `ANSWERS ⊆ ALLOWED` (asserted by a passing test).
- Files touched (final): `package.json` (`"test": "jest"` script), `jest.config.js`, `src/game/{types,engine,engine.test,keyboard-layout}.ts`, `src/game/wordlist/{answers,allowed,index}.ts`.
- Orchestrator fix: added `import { describe, expect, it } from '@jest/globals'` to `engine.test.ts` to clear IDE diagnostics (root `tsconfig.json` doesn't include jest types; this avoids modifying the Expo-owned tsconfig).
- Handoff: `src/game/{engine,types}` surface frozen — Phase 2/3 import only from there.
- Committed: `717caf2 phase 1: pure-TS Wordle engine + ts-jest unit suite`.

## Phase 2 — UI primitives (visual only) — started 2026-05-24T22:55:04Z

- Prereqs verified: web dev server already running on port 8081 (Expo node PID 5795 listening, HTTP 200, Chrome and iOS app connected).

### Verification — 2026-05-24T23:09:48Z — PASS (with deferred iOS check)

- Loaded `http://localhost:8081/dev/components-preview` via chrome-devtools MCP.
- DOM scan via `evaluate_script`: 68 unique `data-testid`s, 0 missing from the required §5 list (board, row-0..5, tile-0-0..5-4, key-a..z, key-enter, key-backspace, status-banner, error-banner, restart-button).
- Console: no errors, no warnings.
- Visual: light + dark screenshots saved to `.phase2-screenshots/orchestrator-verify-{light,dark}.png`. Canonical Wordle palette (green/yellow/grey) renders correctly in both modes; all required Tile/Row/Board/Keyboard/StatusBanner/RestartButton states are visible.
- Engine surface unchanged. `bun run test` still green (subagent re-ran).
- `Tile` accepts `revealDelayMs?` + `onRevealComplete?` as stub props (the stub fires the callback in a useEffect — Phase 3 will replace with real reanimated flip). `Row` accepts `shouldShake?` stub.
- Files created: `src/features/wordle/{Tile,Row,Board,KeyboardKey,Keyboard,StatusBanner,RestartButton}.tsx`, `src/app/dev/components-preview.tsx`.
- Files modified: `src/constants/theme.ts` (added `WordleColors` light/dark palette + `WordleColorScheme` type), `src/components/app-tabs.web.tsx` (added a `__DEV__`-gated "Preview" TabTrigger so the dev route is reachable on web).
- **Deferred to Phase 3:** iOS verification of the preview route. NativeTabs only declares `index` + `explore`; the dev route isn't reachable on native, and the spec accepts deferring iOS preview QA. iPhone 17 sim is booted (device 6D6A1ACA-…), ready for Phase 3 to verify Wordle on-device once `WordleScreen` is mounted at `index`.
- **Phase 3 cleanup pending:** delete `src/app/dev/components-preview.tsx` AND the `__DEV__` TabTrigger in `src/components/app-tabs.web.tsx`.
- Committed: `98f2d58 phase 2: presentational Wordle UI primitives + dev preview route`.

## Phase 3 — Game wiring + animations — started 2026-05-24T23:10:51Z

- Prereqs verified: web dev server on port 8081 (confirmed earlier); iOS sim iPhone 17 (device `6D6A1ACA-3560-44E0-84D0-D47EB9440814`) connected.

### Verification — 2026-05-24T23:43:06Z — PASS (with scope-cut + deferred iOS-seed)

**Web (chrome-devtools MCP):** all three scenarios pass.

- `localhost:8081/?answer=apple` + type APPLE via physical keyboard dispatch → `You won!` banner, all 5 tiles green, restart visible. Screenshot: `.phase3-screenshots/web-win-apple.png`.
- `localhost:8081/?answer=zebra` + 6 valid wrong guesses → `Game over — word was ZEBRA`, 6 rows submitted, restart visible. Screenshot: `.phase3-screenshots/web-loss-zebra.png`.
- `localhost:8081/?answer=apple` + type XXXXX + Enter → error banner `Not in word list`. Screenshot: `.phase3-screenshots/web-invalid-xxxxx.png`.
- Physical keyboard wired correctly (window.keydown for A-Z + Enter + Backspace, attached only on `Platform.OS === 'web'`).

**iOS (maestro MCP, device 6D6A1ACA-…):** app launches, board renders, on-screen taps work end-to-end (typed CRANE → mixed results, key colors updated). `bun run test` → 25/25 (engine 22 + dev-seed 3).

**Scope-cut applied (per SPEC §7 Phase 3 fallback "if animations stall, ship static color transitions"):** Tile/Row reanimated worklets crashed Hermes on iOS during typing. Replaced with static color transitions — props (`revealDelayMs`, `onRevealComplete`, `shouldShake`) preserved as no-ops. `animations.ts` still exports the timing constants for any future re-add. Web side never had the crash but uses the same simplified Tile/Row.

**Deferred to Phase 4 (iOS seed deep link):** the SPEC's `makeshiftmedia://seed/<word>` deep link does not currently seed the iOS game. Tried multiple approaches in this phase: (a) `Linking.addEventListener('url', …)` inside `useWordle` to dispatch `restart`; (b) `src/app/seed/[word].tsx` route stub passing `initialAnswerOverride` to `WordleScreen`. Neither successfully seeded — most likely the `NativeTabs` layout in `src/components/app-tabs.tsx` only registers `index` and `explore` as triggers, so non-tab routes don't mount, and the async `getInitialURL` doesn't return until after `useReducer` lazy-init has already picked a random answer. Web works because URL is synchronous. Phase 4 will need to either (i) wire the seed via a route that NativeTabs accepts, (ii) restart-on-URL inside useWordle with deps that re-run, or (iii) ship iOS Maestro flows that don't rely on seeding (e.g. probe the current answer via testIDs, or just run loss/invalid flows that don't need a specific answer).

- Files created: `src/features/wordle/{dev-seed.ts,dev-seed.test.ts,use-wordle.ts,animations.ts,WordleScreen.tsx}`, `src/app/seed/[word].tsx`.
- Files modified: `src/app/index.tsx` (body → `<WordleScreen />`), `src/components/app-tabs.web.tsx` (removed Phase 2's `__DEV__` dev-preview TabTrigger), `src/features/wordle/{Tile,Row}.tsx` (scope-cut: static transitions), `.gitignore` (added `.tmp-screenshots/`).
- Files deleted: `src/app/dev/components-preview.tsx` + parent directory (Phase 2 cleanup as planned).
- Tests: `bun run test` → 25/25 (engine 22, dev-seed 3 including the `__DEV__`-false null case).
- Committed: `8d07587 phase 3: playable Wordle on web + iOS, animations scope-cut`.

## Phase 4 — Maestro E2E flows — started 2026-05-24T23:44:27Z

- Prereqs verified: web dev server on 8081, iOS sim iPhone 17 (6D6A1ACA-…) booted, `chromium` device available.
- Open item from Phase 3 to resolve here: iOS deep-link seed (`makeshiftmedia://seed/<word>`) doesn't currently set the answer.

### Verification — 2026-05-25T00:30:45Z — PASS (6/6 flows green)

Independently re-ran via `maestro` CLI (the MCP had a stale chromedriver session from the subagent's run — known caveat, CLI is the source of truth):

| Flow                     | Device                 | Run via                   | Outcome                                                         |
| ------------------------ | ---------------------- | ------------------------- | --------------------------------------------------------------- |
| `ios-win.yaml`           | iPhone 17 (6D6A1ACA-…) | `maestro --udid … test`   | PASS — `Assert that "You won!" is visible... COMPLETED`         |
| `ios-loss.yaml`          | iPhone 17              | `maestro --udid … test`   | PASS — `Assert that "Game over.*" is visible... COMPLETED`      |
| `ios-invalid-shake.yaml` | iPhone 17              | `maestro --udid … test`   | PASS — `Assert that "Not in word list" is visible... COMPLETED` |
| `web-win.yaml`           | chromium (headless)    | `maestro test --headless` | PASS                                                            |
| `web-loss.yaml`          | chromium               | `maestro test --headless` | PASS                                                            |
| `web-invalid-shake.yaml` | chromium               | `maestro test --headless` | PASS                                                            |

- iOS seed mechanism worked from Phase 3 code; the fix lived in the flow YAMLs (add `extendedWaitUntil` + `waitForAnimationToEnd` after `openLink` so the async `Linking` listener has time to dispatch `restart` before taps begin). No source changes in Phase 4.
- Cross-platform selector convention discovered/documented: Maestro's iOS driver maps `id:` → `testID`; chromium driver maps `id:` → `aria-label`. SPEC §5 already requires both `testID` + `accessibilityLabel` on every element, so both flow styles work.
- `bun run test` → 25/25 (unchanged).
- Files created: `.maestro/{ios-win,ios-loss,ios-invalid-shake,web-win,web-loss,web-invalid-shake}.yaml` + `.maestro/README.md`. No source files modified.
- Caveat: maestro MCP chromedriver session cached an aborted run; future MCP-based runs may need an MCP restart. CLI runs unaffected.

## Orchestrator log — subagent token usage + runtime

Reported by each subagent (`<usage>` block on completion). Times are wall-clock subagent durations, not human time.

| Phase           | total_tokens | tool_uses |             duration_ms | notes                                                                           |
| --------------- | -----------: | --------: | ----------------------: | ------------------------------------------------------------------------------- |
| 1 (1st attempt) |            0 |        14 |                 148,699 | Blocked by content filter mid-stream; no output reached the orchestrator.       |
| 1 (retry)       |       82,188 |        28 |                 542,288 | Engine + 22 tests, green.                                                       |
| 2               |       81,746 |        61 |                 768,368 | UI primitives + preview route.                                                  |
| 3               |      167,817 |       128 |                 829,515 | Returned mid-iOS-verification; orchestrator completed the iOS path + scope-cut. |
| 4               |      174,557 |       136 |               2,392,182 | 6/6 Maestro flows + iOS seed timing fix in YAML.                                |
| **Total**       |  **506,308** |   **367** | **4,681,052** (~78 min) | Plus the 148 s blocked attempt.                                                 |

Orchestrator itself (main session) and human review time are not included.
