/**
 * Dev-only seed for deterministic E2E.
 *
 * - Web: read `?answer=<word>` from `window.location.search`.
 * - Native: capture deep link `makeshiftmedia://seed/<word>` via `Linking.getInitialURL()`
 *   + `Linking.addEventListener('url', …)`.
 *
 * Production safety = the `__DEV__` gate; Metro strips this branch in release builds.
 */
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';

let cachedSeed: string | null = null;
let nativeListenerAttached = false;

function normalize(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim().toLowerCase();
  if (!/^[a-z]{5}$/.test(trimmed)) return null;
  return trimmed;
}

/**
 * Extract a seed answer from a deep-link URL of the form
 * `makeshiftmedia://seed/<word>` (also tolerates trailing slashes /
 * query strings, and the `seed=` query-string form on any scheme).
 */
function parseDeepLink(url: string | null | undefined): string | null {
  if (!url) return null;

  // Try query string first: e.g. `?seed=apple` or `?answer=apple`.
  const queryMatch = url.match(/[?&](?:seed|answer)=([^&#]+)/i);
  if (queryMatch) {
    const fromQuery = normalize(decodeURIComponent(queryMatch[1]));
    if (fromQuery) return fromQuery;
  }

  // Path form: scheme://seed/<word>
  const pathMatch = url.match(/\/seed\/([A-Za-z]{5})/);
  if (pathMatch) {
    return normalize(pathMatch[1]);
  }

  return null;
}

function readWebSeed(): string | null {
  if (typeof window === 'undefined' || !window.location) return null;
  try {
    const params = new URLSearchParams(window.location.search);
    return (
      normalize(params.get('answer')) ?? normalize(params.get('seed'))
    );
  } catch {
    return null;
  }
}

function attachNativeListener(): void {
  if (nativeListenerAttached) return;
  nativeListenerAttached = true;
  // Live updates: if the app is foregrounded with a seed link.
  Linking.addEventListener('url', ({ url }) => {
    const parsed = parseDeepLink(url);
    if (parsed) cachedSeed = parsed;
  });
  // Cold start: capture the initial URL the app was launched with.
  Linking.getInitialURL()
    .then((url) => {
      const parsed = parseDeepLink(url);
      if (parsed) cachedSeed = parsed;
    })
    .catch(() => {
      // ignore
    });
}

/**
 * Returns the dev-seeded answer if one is available, otherwise null.
 * Guarded by `__DEV__` so Metro strips it in production builds.
 */
export function getSeededAnswer(): string | null {
  if (!__DEV__) return null;

  if (Platform.OS === 'web') {
    const fromUrl = readWebSeed();
    if (fromUrl) {
      cachedSeed = fromUrl;
      return fromUrl;
    }
    return cachedSeed;
  }

  // Native: ensure the listener is attached so future links update the cache.
  attachNativeListener();
  return cachedSeed;
}

/**
 * Parse a URL string for a seed. Exported for callers that need to react to
 * Linking events themselves (e.g. `useWordle` dispatching `restart`).
 */
export function parseSeedFromUrl(url: string | null | undefined): string | null {
  if (!__DEV__) return null;
  return parseDeepLink(url);
}

/**
 * Test-only helper to reset module-level state between tests.
 * @internal
 */
export function __resetSeedCacheForTests(): void {
  cachedSeed = null;
  nativeListenerAttached = false;
}
