/**
 * TEMPORARY Phase-2 dev preview route — visual QA for the Wordle UI primitives.
 * Phase 3 deletes this file.
 *
 * Reachable at: /dev/components-preview (file-based routing, non-underscored
 * folder because Expo Router treats `_`-prefixed folders as private/excluded).
 */
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { KeyStatus, LetterStatus, SubmittedGuess } from '@/game/types';

import { Board } from '@/features/wordle/Board';
import { Keyboard } from '@/features/wordle/Keyboard';
import { KeyboardKey } from '@/features/wordle/KeyboardKey';
import { RestartButton } from '@/features/wordle/RestartButton';
import { Row } from '@/features/wordle/Row';
import { StatusBanner } from '@/features/wordle/StatusBanner';
import { Tile } from '@/features/wordle/Tile';

function makeGuess(letters: string, statuses: LetterStatus[]): SubmittedGuess {
  return {
    tiles: letters.split('').map((letter, i) => ({
      letter,
      status: statuses[i] ?? 'absent',
    })),
  };
}

const SAMPLE_GUESSES: SubmittedGuess[] = [
  makeGuess('apple', ['correct', 'correct', 'absent', 'present', 'absent']),
  makeGuess('crane', ['absent', 'present', 'absent', 'absent', 'absent']),
];

const SAMPLE_KEY_STATUSES: Record<string, KeyStatus> = {
  a: 'correct',
  p: 'correct',
  l: 'present',
  e: 'absent',
  c: 'absent',
  r: 'present',
  n: 'absent',
  q: 'unused',
  w: 'unused',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText type="subtitle">{title}</ThemedText>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

export default function ComponentsPreviewScreen() {
  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ThemedText type="title">Wordle UI preview</ThemedText>
        <ThemedText type="small">
          Phase 2 visual QA — components only, no game wiring.
        </ThemedText>

        <Section title="Tile — all states">
          <View style={styles.row}>
            <Tile rowIndex={0} colIndex={0} letter="" status={null} />
            <Tile rowIndex={0} colIndex={1} letter="a" status={null} />
            <Tile rowIndex={0} colIndex={2} letter="b" status="correct" />
            <Tile rowIndex={0} colIndex={3} letter="c" status="present" />
            <Tile rowIndex={0} colIndex={4} letter="d" status="absent" />
          </View>
        </Section>

        <Section title="Row — current row (in-progress)">
          <Row
            rowIndex={1}
            isCurrent
            tiles={[
              { letter: 'a', status: null },
              { letter: 'p', status: null },
              { letter: 'p', status: null },
              { letter: '', status: null },
              { letter: '', status: null },
            ]}
          />
        </Section>

        <Section title="Row — submitted (mixed statuses)">
          <Row
            rowIndex={2}
            tiles={[
              { letter: 'g', status: 'absent' },
              { letter: 'r', status: 'present' },
              { letter: 'a', status: 'correct' },
              { letter: 'p', status: 'present' },
              { letter: 'e', status: 'absent' },
            ]}
          />
        </Section>

        <Section title="Row — shouldShake stub (visually identical in Phase 2)">
          <Row
            rowIndex={3}
            shouldShake
            isCurrent
            tiles={[
              { letter: 'x', status: null },
              { letter: 'x', status: null },
              { letter: 'x', status: null },
              { letter: 'x', status: null },
              { letter: 'x', status: null },
            ]}
          />
        </Section>

        <Section title="Board — mid-game (2 submitted + 1 in-progress)">
          <Board
            guesses={SAMPLE_GUESSES}
            currentGuess="gr"
            maxGuesses={6}
            wordLength={5}
          />
        </Section>

        <Section title="Board — empty">
          <Board guesses={[]} currentGuess="" maxGuesses={6} wordLength={5} />
        </Section>

        <Section title="KeyboardKey — individual states">
          <View style={styles.row}>
            <KeyboardKey label="q" status="unused" />
            <KeyboardKey label="w" status="correct" />
            <KeyboardKey label="e" status="present" />
            <KeyboardKey label="r" status="absent" />
            <KeyboardKey label="enter" wide displayText="ENTER" />
            <KeyboardKey label="backspace" wide displayText="⌫" />
          </View>
        </Section>

        <Section title="Keyboard — partial statuses">
          <Keyboard keyStatuses={SAMPLE_KEY_STATUSES} />
        </Section>

        <Section title="StatusBanner — info (win)">
          <StatusBanner kind="info" text="You won!" />
        </Section>

        <Section title="StatusBanner — info (loss)">
          <StatusBanner kind="info" text="Game over — word was APPLE" />
        </Section>

        <Section title="StatusBanner — error">
          <StatusBanner kind="error" text="Not in word list" />
        </Section>

        <Section title="RestartButton">
          <RestartButton />
        </Section>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    padding: Spacing.three,
    gap: Spacing.four,
    alignItems: 'center',
  },
  section: {
    gap: Spacing.two,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  sectionBody: {
    alignItems: 'center',
    gap: Spacing.two,
    alignSelf: 'stretch',
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.one,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
});
