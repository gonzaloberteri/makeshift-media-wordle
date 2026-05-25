import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { KEYBOARD_ROWS } from '@/game/keyboard-layout';
import type { KeyStatus } from '@/game/types';

import { KeyboardKey } from './KeyboardKey';

export type KeyboardProps = {
  /** 'a'..'z' → KeyStatus. Missing entries fall through to 'unused'. */
  keyStatuses: Record<string, KeyStatus>;
  onLetter?: (letter: string) => void;
  onEnter?: () => void;
  onBackspace?: () => void;
};

export function Keyboard({ keyStatuses, onLetter, onEnter, onBackspace }: KeyboardProps) {
  return (
    <View style={styles.keyboard}>
      {KEYBOARD_ROWS.map((row, rowIdx) => {
        const isLastRow = rowIdx === KEYBOARD_ROWS.length - 1;
        return (
          <View key={rowIdx} style={styles.row}>
            {isLastRow && (
              <KeyboardKey
                label="enter"
                wide
                displayText="ENTER"
                onPress={onEnter ? () => onEnter() : undefined}
              />
            )}
            {row.map((letter) => (
              <KeyboardKey
                key={letter}
                label={letter}
                status={keyStatuses[letter] ?? 'unused'}
                onPress={onLetter ? () => onLetter(letter) : undefined}
              />
            ))}
            {isLastRow && (
              <KeyboardKey
                label="backspace"
                wide
                displayText="⌫"
                onPress={onBackspace ? () => onBackspace() : undefined}
              />
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  keyboard: {
    gap: Spacing.one,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 500,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.one,
    justifyContent: 'center',
  },
});
