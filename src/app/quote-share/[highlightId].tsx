import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { getBook, type BookRow } from '@/db/repositories/books';
import { getHighlight, type Highlight } from '@/db/repositories/highlights';
import { ShareCardScreen } from '@/features/reader/components/ShareCardScreen';

export default function QuoteShareScreen() {
  const { highlightId } = useLocalSearchParams<{ highlightId: string }>();
  const [highlight, setHighlight] = useState<Highlight | null>(null);
  const [book, setBook] = useState<BookRow | null>(null);

  useEffect(() => {
    (async () => {
      const h = await getHighlight(highlightId);
      setHighlight(h);
      if (h) setBook(await getBook(h.bookId));
    })();
  }, [highlightId]);

  if (!highlight || !book) return null;

  return <ShareCardScreen text={highlight.quoteText} attribution={`${book.title} · ${book.author}`} />;
}
