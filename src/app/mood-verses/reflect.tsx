import { useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';

import { drawEmpatheticDeck } from '@/features/scripture-verses/empatheticMatcher';
import { VerseDeckView } from '@/features/scripture-verses/VerseDeckView';

export default function ReflectScreen() {
  const { text } = useLocalSearchParams<{ text: string }>();

  const fetchVerses = useCallback(async () => {
    return drawEmpatheticDeck(text ?? '');
  }, [text]);

  return <VerseDeckView title="Words for you" source="context" fetchVerses={fetchVerses} />;
}

