import { useMemo, type ReactElement } from 'react';
import { Text, type GestureResponderEvent } from 'react-native';

import { tokenizeParagraph } from '@/features/reader/engine/words';

type TappableWordsProps = {
  text: string;
  // Extracts the lookup-clean word from a raw token (strips punctuation/
  // diacritics at its edges) — callers pass a script-appropriate cleaner
  // (see reader/engine/words.ts for English, quran-content/verseWords.ts for
  // Arabic) rather than this component knowing about any specific language.
  cleanWord: (token: string) => string;
  style: object;
  onWordLongPress: (word: string, anchor: { x: number; y: number }) => void;
};

// Renders short verse-length text as tappable word spans (nested <Text>, not
// the prose reader's pixel-precise hit-testing in ReaderPageView) — a verse
// is a handful of words, so per-word spans are cheap and this sidesteps
// needing a glyph-width model for every script it might render.
export function TappableWords({ text, cleanWord, style, onWordLongPress }: TappableWordsProps) {
  const tokens = useMemo(() => tokenizeParagraph(text), [text]);
  const children: (string | ReactElement)[] = tokens.map((token, i) => {
    const word = cleanWord(token);
    if (!word) return token;
    return (
      <Text
        key={i}
        onLongPress={(e: GestureResponderEvent) =>
          onWordLongPress(word, { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY })
        }
      >
        {token}
      </Text>
    );
  });
  return <Text style={style}>{children}</Text>;
}
