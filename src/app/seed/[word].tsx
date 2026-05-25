import { useLocalSearchParams } from 'expo-router';

import { WordleScreen } from '@/features/wordle/WordleScreen';

// Dev-only deep-link target: `makeshiftmedia://seed/<word>`.
// Reads the route param synchronously and passes it to WordleScreen so the
// game initializes with the seeded answer before the first render. The
// `__DEV__` gate inside dev-seed protects against shipping this in prod.
export default function SeedRoute() {
  const { word } = useLocalSearchParams<{ word: string }>();
  const seed =
    typeof word === 'string' && /^[a-z]{5}$/.test(word.toLowerCase()) ? word.toLowerCase() : null;
  return <WordleScreen initialAnswerOverride={__DEV__ ? seed : null} />;
}
