import { useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';

import { fetchContextVerses } from '@/features/scripture-verses/contextVersesApi';
import { VerseDeckView } from '@/features/scripture-verses/VerseDeckView';

export default function ReflectScreen() {
  const { text } = useLocalSearchParams<{ text: string }>();

  const fetchVerses = useCallback(() => fetchContextVerses(text), [text]);

  return <VerseDeckView title="For you" source="context" fetchVerses={fetchVerses} />;
}
