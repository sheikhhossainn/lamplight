import { useLocalSearchParams } from 'expo-router';

import { ScriptureTableDeck } from '@/features/scripture-verses/ScriptureTableDeck';

export default function ReflectScreen() {
  const { text } = useLocalSearchParams<{ text: string }>();

  return <ScriptureTableDeck userFeelingText={text ?? ''} />;
}


