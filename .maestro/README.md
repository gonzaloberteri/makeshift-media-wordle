# Maestro E2E flows

Six end-to-end flows covering the three Wordle scenarios (win / loss / invalid)
across two platforms (iOS simulator + chromium). All flows run locally; cloud is
out of scope for this exercise.

## Flow inventory

| File                     | Platform | Scenario           | Seed    | Verifies                            |
| ------------------------ | -------- | ------------------ | ------- | ----------------------------------- |
| `ios-win.yaml`           | iOS sim  | Win on first guess | `apple` | `You won!` + `restart-button`       |
| `ios-loss.yaml`          | iOS sim  | Six wrong guesses  | `zebra` | `Game over.*` + `restart-button`    |
| `ios-invalid-shake.yaml` | iOS sim  | Invalid word       | `apple` | `error-banner` + `Not in word list` |
| `web-win.yaml`           | chromium | Win on first guess | `apple` | `You won!` + `Play again`           |
| `web-loss.yaml`          | chromium | Six wrong guesses  | `zebra` | `Game over.*` + `Play again`        |
| `web-invalid-shake.yaml` | chromium | Invalid word       | `apple` | `Not in word list`                  |

## Prerequisites

- Maestro 2.6+ (`brew install maestro`)
- For iOS flows: an iPhone simulator booted with the makeshift-media app
  installed (`com.makeshiftmedia.wordle`).
- For web flows: the Expo web dev server running on port `8081`
  (`bun run web`). If you've changed the port, set `MAESTRO_WEB_URL`
  (e.g. `MAESTRO_WEB_URL=http://localhost:8082`).
- Chromium driver: Maestro launches one on demand for web flows; just
  pass `--headless` (or omit for a headed browser).

## Running

```bash
# Single iOS flow
maestro --udid <SIM_UDID> test .maestro/ios-win.yaml

# Single web flow
MAESTRO_WEB_URL=http://localhost:8081 maestro test --headless .maestro/web-win.yaml

# All iOS flows
maestro --udid <SIM_UDID> test --include-tags=ios .maestro/

# All web flows
MAESTRO_WEB_URL=http://localhost:8081 maestro test --include-tags=web --headless .maestro/

# Discover the iOS sim UDID
xcrun simctl list devices booted
```

## How seeding works

Both platforms read a dev-only seed answer so flows are deterministic. The
seed is gated by `__DEV__` so Metro strips the path in release builds.

- **Web** — the page reads `?answer=<word>` from `window.location.search`
  (see `src/features/wordle/dev-seed.ts`). Flows open
  `${MAESTRO_WEB_URL}/?answer=<word>`.
- **iOS** — the app handles the deep link `makeshiftmedia://seed/<word>`
  via `Linking.getInitialURL()` + `Linking.addEventListener('url', …)` in
  `useWordle` (see `src/features/wordle/use-wordle.ts`). The
  `useWordle` hook dispatches a `restart` with the seeded answer when the
  URL handler fires. Because the URL handler runs asynchronously after
  React mounts, iOS flows insert `assertVisible: { id: board }` between
  `launchApp` and `openLink` to make sure the listener has been attached
  before the deep link fires, then `waitForAnimationToEnd: 5000` after
  the deep link to let the dispatch settle before the first tap.

## Selector convention (cross-platform gotcha)

`react-native-web` and the iOS XCUITest driver expose accessibility data
differently to Maestro:

- **iOS**: `id:` matches `testID` (forwarded to `accessibilityIdentifier`).
  So `id: "key-a"` works.
- **Web (chromium)**: Maestro's CDP driver maps `id:` to the element's
  `accessibilityLabel` (rendered as `aria-label`). So `id: "Key A"` works
  on web, but `id: "key-a"` does not.

This is why the iOS and web flows use different selector strings even
though they exercise the same UI elements. Every component sets BOTH a
stable `testID` (kebab-case, machine-friendly) and a human-readable
`accessibilityLabel` per SPEC §5.

## Why no Maestro Cloud

The exercise is a local demo; cloud runs require an org account and an
uploaded build artifact, neither of which is in scope. Local flows on a
booted simulator + chromium are sufficient for the verification checklist.

## Known caveats

- **Animations are scope-cut.** Phase 3 fell back to static color
  transitions when reanimated worklets crashed Hermes on iOS. The
  invalid-word flows therefore assert the error banner only and do not
  assert the shake animation itself, per SPEC §6.2.
- **iOS deep-link timing.** The `Linking` URL event is async, so flows
  rely on the `assertVisible: board` + `waitForAnimationToEnd: 5000` pair
  above to settle the seed before tapping. Reducing those waits is
  likely to cause sporadic failures.
- **Web seed answer can be anything in `?answer=`.** The engine doesn't
  validate the answer against the allowed word list (only guesses are
  validated). Seed answers like `zebra` work even though they are not in
  `src/game/wordlist/allowed.ts`.
