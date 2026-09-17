import { useMemo, type ReactElement } from 'react';
import { Text, type GestureResponderEvent } from 'react-native';

import { segmentWords } from '@/features/reader/engine/wordSegments';

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
  const segments = useMemo(() => segmentWords(text), [text]);
  const children: (string | ReactElement)[] = [];
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    const word = segment.isWordLike ? cleanWord(segment.text) : '';
    if (!word) {
      children.push(segment.text);
      continue;
    }
    let trailingText = '';
    let trailingIndex = index + 1;
    while (trailingIndex < segments.length && !segments[trailingIndex].isWordLike) {
      trailingText += segments[trailingIndex].text;
      trailingIndex += 1;
    }
    children.push(
      <Text
        key={index}
        onLongPress={(e: GestureResponderEvent) =>
          onWordLongPress(word, { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY })
        }
      >
        {segment.text}
        {trailingText}
      </Text>,
    );
    index = trailingIndex - 1;
  }
  return <Text style={style}>{children}</Text>;
}
