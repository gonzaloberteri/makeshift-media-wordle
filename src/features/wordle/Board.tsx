import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import type { LetterStatus, SubmittedGuess } from '@/game/types';

import { Row, type RowTile } from './Row';

export type BoardProps = {
  guesses: SubmittedGuess[];
  currentGuess: string; // current in-progress typed row (0..wordLength chars)
  maxGuesses: number;
  wordLength: number;
  /** Index of the row that should shake (invalid input); null when none. */
  errorRowIndex?: number | null;
  /** Index of the row that should run the reveal animation; null when none. */
  revealRowIndex?: number | null;
  /** Per-tile delay used by Phase 3 reveal animation; passed through. */
  revealDelayMsPerTile?: number;
  /** Forwarded to the revealing row's tiles. */
  onTileRevealComplete?: (colIndex: number) => void;
};

function buildSubmittedRow(guess: SubmittedGuess, wordLength: number): RowTile[] {
  const tiles: RowTile[] = [];
  for (let i = 0; i < wordLength; i += 1) {
    const t = guess.tiles[i];
    tiles.push({
      letter: t?.letter ?? '',
      status: (t?.status as LetterStatus | undefined) ?? null,
    });
  }
  return tiles;
}

function buildCurrentRow(currentGuess: string, wordLength: number): RowTile[] {
  const tiles: RowTile[] = [];
  for (let i = 0; i < wordLength; i += 1) {
    tiles.push({ letter: currentGuess[i] ?? '', status: null });
  }
  return tiles;
}

function buildEmptyRow(wordLength: number): RowTile[] {
  const tiles: RowTile[] = [];
  for (let i = 0; i < wordLength; i += 1) {
    tiles.push({ letter: '', status: null });
  }
  return tiles;
}

export function Board({
  guesses,
  currentGuess,
  maxGuesses,
  wordLength,
  errorRowIndex = null,
  revealRowIndex = null,
  revealDelayMsPerTile,
  onTileRevealComplete,
}: BoardProps) {
  const currentRowIndex = guesses.length;
  const rows: RowTile[][] = [];
  for (let i = 0; i < maxGuesses; i += 1) {
    if (i < guesses.length) {
      rows.push(buildSubmittedRow(guesses[i]!, wordLength));
    } else if (i === currentRowIndex) {
      rows.push(buildCurrentRow(currentGuess, wordLength));
    } else {
      rows.push(buildEmptyRow(wordLength));
    }
  }

  return (
    <View testID="board" accessibilityLabel="Wordle board" style={styles.board}>
      {rows.map((tiles, rowIndex) => (
        <Row
          key={rowIndex}
          rowIndex={rowIndex}
          tiles={tiles}
          isCurrent={rowIndex === currentRowIndex}
          shouldShake={errorRowIndex === rowIndex}
          revealDelayMsPerTile={revealRowIndex === rowIndex ? revealDelayMsPerTile : undefined}
          onTileRevealComplete={revealRowIndex === rowIndex ? onTileRevealComplete : undefined}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    gap: Spacing.one,
    alignItems: 'center',
  },
});
