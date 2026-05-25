# RUN.md — Orchestrator prompt for executing SPEC.md

Paste the prompt below into a fresh Claude Code session at the repo root.
It uses subagents (one per phase) so each phase gets isolated context —
the in-session equivalent of `/clear` between steps.

---

You are the orchestrator for executing SPEC.md in /Users/gonza/dev/makeshift-media.
Read SPEC.md first. The four phases are defined in §7.

Your job: run Phase 1 → 2 → 3 → 4 sequentially. You DO NOT implement anything
yourself. Each phase runs inside its own general-purpose subagent so that
phase's context is isolated. You orchestrate, verify, and log.

## Per-phase workflow

1. Pre-flight. Check the prereqs the phase needs:
   - Phase 1: bun installed (`bun --version`).
   - Phase 2: web dev server (`bun run web`) — start it in background if not
     running. Confirm port.
   - Phase 3: web dev server + an iOS simulator booted (`mcp__maestro__list_devices`).
   - Phase 4: same as Phase 3.
     If any prereq is missing, ASK THE USER to set it up before continuing.

2. Append a starting entry to PROGRESS.md:
   `## Phase N — <name> — started <ISO timestamp>`

3. Spawn a general-purpose subagent (Agent tool, subagent_type=general-purpose).
   The subagent prompt MUST include:
   - "Read SPEC.md sections <list from the phase's 'Read first'> before you start."
   - The phase's full Tasks list verbatim.
   - The phase's Done-when criteria.
   - The phase's Handoff contract.
   - "Do not modify files outside this phase's scope."
   - "Return a structured report: files created/modified, commands run with
     exit codes, blockers encountered, and a Done-when self-check."

4. After the subagent returns, YOU run verification — do not trust the report:
   - Phase 1: `bun run test`. Confirm engine exports match SPEC §3.1 by reading
     `src/game/engine.ts` and `src/game/types.ts`.
   - Phase 2: navigate the running web app to the preview route via
     chrome-devtools MCP, take a screenshot, verify every component renders;
     `inspect_screen` on iOS sim to confirm testIDs exist.
   - Phase 3: web (chrome-devtools MCP) → load `localhost:<port>/?answer=apple`,
     type APPLE via keys, screenshot win banner. Repeat for loss + invalid.
     iOS (maestro MCP) → launchApp + openLink seed + type + screenshot.
   - Phase 4: run each of the six Maestro flows via `mcp__maestro__run` and
     confirm all pass.

5. Append the verification result to PROGRESS.md:
   - pass/fail, files touched, command outputs (trimmed), screenshots saved.

6. If verification fails:
   - If the gap is small and clearly bounded, spawn ONE corrective subagent
     with a tightly-scoped fix prompt (cite the specific failure).
   - If after one retry it still fails, STOP and report to the user. Do not
     loop indefinitely.

7. Only after verification passes, proceed to the next phase.

## Hard rules

- One phase per subagent. Never bundle phases.
- Never start Phase N+1 until Phase N verification passes.
- PROGRESS.md is the audit trail. Every phase entry, verification result,
  retry, and blocker goes there.
- If SPEC.md is ambiguous, ASK the user — do not improvise the spec.
- If a verification tool isn't available (no iOS sim, no chromium), ASK.
- Stop and summarize after all 4 phases pass, OR on the first unrecoverable
  blocker.

Start now: read SPEC.md, then confirm Phase 1 prereqs with the user before
spawning the Phase 1 subagent.

---

## Notes for the human running this

- **Why subagents, not `/clear`:** subagents isolate context programmatically;
  `/clear` requires you to babysit between phases. The orchestrator keeps only
  per-phase summaries; each phase implementer starts fresh.
- **Orchestrator context growth:** verification screenshots and test output
  accumulate. If it gets heavy by Phase 3, tell it to drop older verification
  details — PROGRESS.md is the durable record.
- **Resume after a crash:** new session, re-paste the prompt, tell it
  "PROGRESS.md shows Phases 1-2 complete, start at Phase 3."
