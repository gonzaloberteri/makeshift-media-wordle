import { StyleSheet, Text, View } from 'react-native';

import { Spacing, WordleColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type StatusBannerProps = {
  /** Drives container/text + testID. 'info' is win/loss/etc; 'error' is invalid input. */
  kind: 'info' | 'error';
  text: string;
};

export function StatusBanner({ kind, text }: StatusBannerProps) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const palette = WordleColors[scheme].banner;
  const isError = kind === 'error';
  const backgroundColor = isError ? palette.errorBackground : palette.infoBackground;
  const color = isError ? palette.errorText : palette.infoText;
  const testID = isError ? 'error-banner' : 'status-banner';

  return (
    <View
      testID={testID}
      accessibilityLabel={text}
      accessible
      accessibilityRole={isError ? 'alert' : 'text'}
      style={[styles.banner, { backgroundColor }]}
    >
      <Text style={[styles.text, { color }]} allowFontScaling={false}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    alignSelf: 'center',
    minHeight: 36,
    justifyContent: 'center',
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
});
