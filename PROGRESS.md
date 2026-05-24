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



