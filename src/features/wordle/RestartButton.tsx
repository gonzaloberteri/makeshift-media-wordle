import { Pressable, StyleSheet, Text } from 'react-native';

import { Spacing, WordleColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type RestartButtonProps = {
  onPress?: () => void;
  label?: string;
};

export function RestartButton({ onPress, label = 'Play again' }: RestartButtonProps) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const palette = WordleColors[scheme].restartButton;

  return (
    <Pressable
      testID="restart-button"
      accessibilityLabel="Play again"
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: palette.background },
        pressed ? styles.pressed : null,
      ]}
    >
      <Text style={[styles.label, { color: palette.text }]} allowFontScaling={false}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    alignSelf: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.7,
  },
});
