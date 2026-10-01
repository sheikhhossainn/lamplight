import { useLocalSearchParams } from 'expo-router';

import { ScriptureInquiryDeck } from '@/features/scripture-qa/ScriptureInquiryDeck';

export default function ScriptureInquiryScreen() {
  const { question, query, tradition } = useLocalSearchParams<{
    question?: string;
    query?: string;
    tradition?: string;
  }>();

  const targetQuery = question ?? query ?? '';

  return <ScriptureInquiryDeck questionQuery={targetQuery} initialTradition={tradition} />;
}
