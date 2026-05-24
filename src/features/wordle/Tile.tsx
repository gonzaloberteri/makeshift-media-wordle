import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Spacing, WordleColors } from '@/constants/theme';
import type { LetterStatus } from '@/game/types';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type TileProps = {
  rowIndex: number;
  colIndex: number;
  letter: string;
  status: LetterStatus | null;
  /** Phase 3 scope-cut: animations dropped; reveal is static. */
  revealDelayMs?: number;
  /** Fires once when status transitions from null → revealed. */
  onRevealComplete?: () => void;
};

function describeStatus(status: LetterStatus | null, hasLetter: boolean): string {
  if (status === 'correct') return 'correct';
  if (status === 'present') return 'present';
  if (status === 'absent') return 'absent';
  return hasLetter ? 'filled' : 'empty';
}

export function Tile({
  rowIndex,
  colIndex,
  letter,
  status,
  onRevealComplete,
}: TileProps) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const palette = WordleColors[scheme].tile;
  const hasLetter = letter.length > 0;
  const upper = letter.toUpperCase();

  useEffect(() => {
    if (status != null && onRevealComplete) onRevealComplete();
  }, [status, onRevealComplete]);

  let backgroundColor: string = palette.emptyBackground;
  let borderColor: string = palette.emptyBorder;
  let textColor: string = palette.emptyText;

  if (status === 'correct') {
    backgroundColor = palette.correctBackground;
    borderColor = palette.correctBackground;
    textColor = palette.revealedText;
  } else if (status === 'present') {
    backgroundColor = palette.presentBackground;
    borderColor = palette.presentBackground;
    textColor = palette.revealedText;
  } else if (status === 'absent') {
    backgroundColor = palette.absentBackground;
    borderColor = palette.absentBackground;
    textColor = palette.revealedText;
  } else if (hasLetter) {
    backgroundColor = palette.filledUnrevealedBackground;
    borderColor = palette.filledUnrevealedBorder;
    textColor = palette.filledUnrevealedText;
  }

  const statusWord = describeStatus(status, hasLetter);
  const letterWord = hasLetter ? upper : 'empty';
  const accessibilityLabel = `row ${rowIndex + 1} column ${colIndex + 1}, ${statusWord}, ${letterWord}`;

  return (
    <View
      testID={`tile-${rowIndex}-${colIndex}`}
      accessibilityLabel={accessibilityLabel}
      accessible
      style={[styles.tile, { backgroundColor, borderColor }]}
    >
      <Text style={[styles.letter, { color: textColor }]} allowFontScaling={false}>
        {upper}
      </Text>
    </View>
  );
}

const TILE_SIZE = 56;

const styles = StyleSheet.create({
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderWidth: 2,
    borderRadius: Spacing.half,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: {
    fontSize: 30,
    fontWeight: '700',
    lineHeight: 34,
    textTransform: 'uppercase',
  },
});
