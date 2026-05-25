/**
 * Per SPEC §3.6: `getSeededAnswer()` must return null when `__DEV__` is false,
 * so the production gate keeps the dev seed out of release builds.
 *
 * We use `require()` (not `import`) deliberately: the module reads `__DEV__` at
 * eval time, so each test flips the flag, resets modules, then requires fresh.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
import { afterEach, describe, expect, it, jest } from '@jest/globals';

// Mock the native modules we don't want jest to touch.
jest.mock('react-native', () => ({
  Platform: { OS: 'web' },
}));

jest.mock('expo-linking', () => ({
  addEventListener: jest.fn(),
  getInitialURL: jest.fn(() => Promise.resolve(null)),
}));

describe('getSeededAnswer', () => {
  const originalDev = (globalThis as { __DEV__?: boolean }).__DEV__;

  afterEach(() => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = originalDev;
    jest.resetModules();
  });

  it('returns null when __DEV__ is false (production gate)', () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
    // Pretend a query string is present; the dev gate must still nullify it.
    (globalThis as { window?: unknown }).window = {
      location: { search: '?answer=apple' },
    };

    // Require after flipping __DEV__ so module-eval-time constants pick it up.
    const mod = require('./dev-seed') as typeof import('./dev-seed');
    mod.__resetSeedCacheForTests();

    expect(mod.getSeededAnswer()).toBeNull();
  });

  it('returns the seeded answer from the query string when __DEV__ is true', () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    (globalThis as { window?: unknown }).window = {
      location: { search: '?answer=crane' },
    };

    const mod = require('./dev-seed') as typeof import('./dev-seed');
    mod.__resetSeedCacheForTests();

    expect(mod.getSeededAnswer()).toBe('crane');
  });

  it('ignores malformed seeds (wrong length or non-letters)', () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    (globalThis as { window?: unknown }).window = {
      location: { search: '?answer=12345' },
    };

    const mod = require('./dev-seed') as typeof import('./dev-seed');
    mod.__resetSeedCacheForTests();

    expect(mod.getSeededAnswer()).toBeNull();
  });
});
