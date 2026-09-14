import { useLocalSearchParams } from 'expo-router';

import { ScriptureInquiryDeck } from '@/features/scripture-qa/ScriptureInquiryDeck';

export default function ReflectScreen() {
  const { text, query, question, tradition } = useLocalSearchParams<{
    text?: string;
    query?: string;
    question?: string;
    tradition?: string;
  }>();

  const targetQuery = question ?? query ?? text ?? '';

  return <ScriptureInquiryDeck questionQuery={targetQuery} initialTradition={tradition} />;
}
