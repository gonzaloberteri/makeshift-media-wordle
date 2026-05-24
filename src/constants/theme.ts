/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/**
 * Wordle-specific palette for tiles, keys, and their text/border colors.
 * Indexed by 'light' | 'dark' to match the rest of this module.
 *
 * Tile states:
 *   - empty:            no letter typed yet
 *   - filledUnrevealed: a letter is in the current row but not yet submitted/revealed
 *   - correct/present/absent: post-evaluation colors (canonical Wordle palette)
 *
 * Key states:
 *   - unused/correct/present/absent: aggregated keyboard hint colors
 */
export const WordleColors = {
  light: {
    tile: {
      emptyBackground: '#ffffff',
      emptyBorder: '#d3d6da',
      filledUnrevealedBackground: '#ffffff',
      filledUnrevealedBorder: '#878a8c',
      correctBackground: '#6aaa64',
      presentBackground: '#c9b458',
      absentBackground: '#787c7e',
      emptyText: '#1a1a1b',
      filledUnrevealedText: '#1a1a1b',
      revealedText: '#ffffff',
    },
    key: {
      unusedBackground: '#d3d6da',
      correctBackground: '#6aaa64',
      presentBackground: '#c9b458',
      absentBackground: '#787c7e',
      unusedText: '#1a1a1b',
      revealedText: '#ffffff',
    },
    banner: {
      infoBackground: '#1a1a1b',
      infoText: '#ffffff',
      errorBackground: '#b03a2e',
      errorText: '#ffffff',
    },
    restartButton: {
      background: '#1a1a1b',
      text: '#ffffff',
    },
  },
  dark: {
    tile: {
      emptyBackground: '#121213',
      emptyBorder: '#3a3a3c',
      filledUnrevealedBackground: '#121213',
      filledUnrevealedBorder: '#565758',
      correctBackground: '#538d4e',
      presentBackground: '#b59f3b',
      absentBackground: '#3a3a3c',
      emptyText: '#ffffff',
      filledUnrevealedText: '#ffffff',
      revealedText: '#ffffff',
    },
    key: {
      unusedBackground: '#818384',
      correctBackground: '#538d4e',
      presentBackground: '#b59f3b',
      absentBackground: '#3a3a3c',
      unusedText: '#ffffff',
      revealedText: '#ffffff',
    },
    banner: {
      infoBackground: '#ffffff',
      infoText: '#121213',
      errorBackground: '#d96459',
      errorText: '#121213',
    },
    restartButton: {
      background: '#ffffff',
      text: '#121213',
    },
  },
} as const;

export type WordleColorScheme = (typeof WordleColors)['light'];

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
