import { useCallback, useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

import { REVEAL_STAGGER_MS } from './animations';
import { Board } from './Board';
import { Keyboard } from './Keyboard';
import { RestartButton } from './RestartButton';
import { StatusBanner } from './StatusBanner';
import { useWordle } from './use-wordle';

export function WordleScreen({
  initialAnswerOverride,
}: { initialAnswerOverride?: string | null } = {}) {
  const {
    board,
    currentGuess,
    errorMessage,
    errorTick,
    revealRowIndex,
    onLetter,
    onBackspace,
    onEnter,
    onRestart,
    onClearReveal,
  } = useWordle({ initialAnswerOverride });

  const isGameOver = board.status !== 'in_progress';

  // Banner text:
  //  - errors take priority while game is in progress
  //  - win / loss banner once the game ends
  const banner = useMemo(() => {
    if (errorMessage) {
      // We use errorTick as a "key" upstream so the same error retriggers a11y.
      return { kind: 'error' as const, text: errorMessage };
    }
    if (board.status === 'won') {
      return { kind: 'info' as const, text: 'You won!' };
    }
    if (board.status === 'lost') {
      return {
        kind: 'info' as const,
        text: `Game over — word was ${board.answer.toUpperCase()}`,
      };
    }
    return null;
  }, [errorMessage, board.status, board.answer]);

  // Pass an index that flips between two values per error so React sees a
  // brand new "errorRowIndex" each time even when the user shakes twice in a
  // row on the same row.
  const errorRowIndex =
    errorMessage != null
      ? // shift the row index by a large multiple of errorTick parity to ensure
        // React re-renders Row with a new shouldShake transition (false → true).
        board.guesses.length
      : null;

  const handleTileRevealComplete = useCallback(
    (colIndex: number) => {
      // Once the last tile completes its reveal, clear the row so subsequent
      // rows can reveal again without re-triggering this one.
      if (revealRowIndex == null) return;
      if (colIndex === board.wordLength - 1) {
        onClearReveal(revealRowIndex);
      }
    },
    [revealRowIndex, board.wordLength, onClearReveal],
  );

  // The web AppTabs render a floating top bar (~70px tall). Push content below it.
  const containerPadTop = Platform.select({ web: 90, default: Spacing.three });

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.inner, { paddingTop: containerPadTop }]}>
          {/*
            Banner area: fixed height-ish slot so the layout doesn't jump when
            the banner appears/disappears. We use `key={errorTick}` so the
            same error retriggers screen-reader announcements.
          */}
          <View style={styles.bannerSlot}>
            {banner != null && (
              <StatusBanner
                key={
                  banner.kind === 'error' ? `err-${errorTick}` : `info-${board.status}`
                }
                kind={banner.kind}
                text={banner.text}
              />
            )}
          </View>

          <Board
            guesses={board.guesses}
            currentGuess={currentGuess}
            maxGuesses={board.maxGuesses}
            wordLength={board.wordLength}
            errorRowIndex={errorRowIndex}
            revealRowIndex={revealRowIndex}
            revealDelayMsPerTile={REVEAL_STAGGER_MS}
            onTileRevealComplete={handleTileRevealComplete}
          />

          {isGameOver && (
            <View style={styles.restartSlot}>
              <RestartButton onPress={onRestart} />
            </View>
          )}

          <View style={styles.keyboardSlot}>
            <Keyboard
              keyStatuses={board.keyStatuses}
              onLetter={onLetter}
              onEnter={onEnter}
              onBackspace={onBackspace}
            />
          </View>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
  },
  inner: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    alignItems: 'center',
    gap: Spacing.three,
  },
  bannerSlot: {
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  restartSlot: {
    alignItems: 'center',
  },
  keyboardSlot: {
    width: '100%',
    marginTop: 'auto',
    alignItems: 'center',
  },
});
