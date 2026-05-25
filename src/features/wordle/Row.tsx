import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import type { LetterStatus } from '@/game/types';

import { Tile } from './Tile';

export type RowTile = {
  letter: string;
  status: LetterStatus | null;
};

export type RowProps = {
  rowIndex: number;
  tiles: RowTile[];
  /** Phase 3 scope-cut: shake animation dropped; prop kept for stable API. */
  shouldShake?: boolean;
  isCurrent?: boolean;
  revealDelayMsPerTile?: number;
  onTileRevealComplete?: (colIndex: number) => void;
};

export function Row({ rowIndex, tiles, revealDelayMsPerTile, onTileRevealComplete }: RowProps) {
  return (
    <View testID={`row-${rowIndex}`} style={styles.row}>
      {tiles.map((tile, colIndex) => (
        <Tile
          key={colIndex}
          rowIndex={rowIndex}
          colIndex={colIndex}
          letter={tile.letter}
          status={tile.status}
          revealDelayMs={revealDelayMsPerTile != null ? revealDelayMsPerTile * colIndex : undefined}
          onRevealComplete={onTileRevealComplete ? () => onTileRevealComplete(colIndex) : undefined}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
});
