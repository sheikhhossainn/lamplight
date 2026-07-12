import { useLocalSearchParams } from 'expo-router';

import { ShareCardScreen } from '@/features/reader/components/ShareCardScreen';

export default function VerseShareScreen() {
  const { text, attribution } = useLocalSearchParams<{ text: string; attribution: string }>();
  if (!text || !attribution) return null;
  return <ShareCardScreen text={text} attribution={attribution} />;
}
