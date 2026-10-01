import { useLocalSearchParams } from 'expo-router';

import { ScriptureTableDeck } from '@/features/scripture-verses/ScriptureTableDeck';

export default function VerseTableScreen() {
  const { text, feeling, query } = useLocalSearchParams<{
    text?: string;
    feeling?: string;
    query?: string;
  }>();

  const userFeelingText = feeling ?? text ?? query ?? '';

  return <ScriptureTableDeck userFeelingText={userFeelingText} />;
}
