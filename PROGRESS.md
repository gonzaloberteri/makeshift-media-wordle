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

