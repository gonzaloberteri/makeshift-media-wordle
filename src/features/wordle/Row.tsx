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
  tiles: RowTile[]; // length === wordLength
  /** No-op stub in Phase 2; Phase 3 wires shake animation. */
  shouldShake?: boolean;
  /** Marker for current/active row; presentational only in Phase 2. */
  isCurrent?: boolean;
  /** Optional reveal animation delay applied per-tile by Phase 3. */
  revealDelayMsPerTile?: number;
  /** Optional reveal completion callback per-tile (forwarded to Tile). */
  onTileRevealComplete?: (colIndex: number) => void;
};

export function Row({
  rowIndex,
  tiles,
  shouldShake: _shouldShake,
  isCurrent: _isCurrent,
  revealDelayMsPerTile,
  onTileRevealComplete,
}: RowProps) {
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
          onRevealComplete={
            onTileRevealComplete ? () => onTileRevealComplete(colIndex) : undefined
          }
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
