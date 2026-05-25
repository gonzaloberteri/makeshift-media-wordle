import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Spacing, WordleColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { KeyStatus } from '@/game/types';

export type KeyboardKeyProps = {
  /** Lowercase 'a'..'z' for letter keys; 'enter' or 'backspace' for action keys. */
  label: string;
  /** Visual hint status for letter keys. Undefined for action keys. */
  status?: KeyStatus;
  onPress?: () => void;
  /** Wide action keys (Enter / Backspace). */
  wide?: boolean;
  /** Pre-built testID; if unset, derived from label. */
  testID?: string;
  /** Pre-built accessibilityLabel; if unset, derived from label. */
  accessibilityLabel?: string;
  /** Override displayed text (e.g. 'ENTER', symbol for backspace). */
  displayText?: string;
};

export function KeyboardKey({
  label,
  status,
  onPress,
  wide = false,
  testID,
  accessibilityLabel,
  displayText,
}: KeyboardKeyProps) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const palette = WordleColors[scheme].key;

  const resolvedTestID = testID ?? `key-${label.toLowerCase()}`;
  const resolvedA11yLabel =
    accessibilityLabel ??
    (label === 'enter'
      ? 'Enter'
      : label === 'backspace'
        ? 'Backspace'
        : `Key ${label.toUpperCase()}`);
  const resolvedDisplay = displayText ?? label.toUpperCase();

  let backgroundColor: string = palette.unusedBackground;
  let textColor: string = palette.unusedText;
  if (status === 'correct') {
    backgroundColor = palette.correctBackground;
    textColor = palette.revealedText;
  } else if (status === 'present') {
    backgroundColor = palette.presentBackground;
    textColor = palette.revealedText;
  } else if (status === 'absent') {
    backgroundColor = palette.absentBackground;
    textColor = palette.revealedText;
  }

  const content = (
    <View style={[styles.key, wide ? styles.wide : styles.normal, { backgroundColor }]}>
      <Text
        style={[styles.label, wide ? styles.labelWide : null, { color: textColor }]}
        allowFontScaling={false}
      >
        {resolvedDisplay}
      </Text>
    </View>
  );

  if (!onPress) {
    return (
      <View testID={resolvedTestID} accessibilityLabel={resolvedA11yLabel} accessible>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      testID={resolvedTestID}
      accessibilityLabel={resolvedA11yLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => (pressed ? styles.pressed : null)}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  key: {
    height: 58,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
  normal: {
    minWidth: 34,
    flexBasis: 34,
    flexGrow: 1,
  },
  wide: {
    minWidth: 56,
    flexBasis: 56,
    flexGrow: 1.5,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  labelWide: {
    fontSize: 12,
  },
  pressed: {
    opacity: 0.7,
  },
});
