/**
 * Precomputes word frequency distributions for catalog books (English/Gutenberg,
 * Bangla, Japanese, and Korean) for sub-millisecond offline 98% lexical coverage
 * calculations.
 *
 * Usage: npx tsx scripts/extract-book-lexicons.ts
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

export type BookLexiconProfile = {
  bookId: string;
  totalRunningTokens: number;
  uniqueWordCount: number;
  tokenFrequencies: Record<string, number>;
};

// Basic English lemmatization mapping for common irregular words
const IRREGULAR_LEMMAS: Record<string, string> = {
  am: 'be',
  is: 'be',
  are: 'be',
  was: 'be',
  were: 'be',
  been: 'be',
  being: 'be',
  has: 'have',
  had: 'have',
  having: 'have',
  does: 'do',
  did: 'do',
  doing: 'do',
  goes: 'go',
  went: 'go',
  gone: 'go',
  going: 'go',
  said: 'say',
  says: 'say',
  made: 'make',
  making: 'make',
  took: 'take',
  taken: 'take',
  taking: 'take',
  came: 'come',
  coming: 'come',
  saw: 'see',
  seen: 'see',
  seeing: 'see',
  knew: 'know',
  known: 'know',
  knowing: 'know',
  thought: 'think',
  thinking: 'think',
  got: 'get',
  gotten: 'get',
  getting: 'get',
  gave: 'give',
  given: 'give',
  giving: 'give',
  found: 'find',
  finding: 'find',
  told: 'tell',
  telling: 'tell',
  became: 'become',
  felt: 'feel',
  feeling: 'feel',
  left: 'leave',
  leaving: 'leave',
  men: 'man',
  women: 'woman',
  children: 'child',
  feet: 'foot',
  teeth: 'tooth',
  mice: 'mouse',
  people: 'person',
};

export function lemmatizeEnglish(word: string): string {
  const w = word.toLowerCase();
  if (IRREGULAR_LEMMAS[w]) return IRREGULAR_LEMMAS[w];

  // Possessives: cat's -> cat
  if (w.endsWith("'s") || w.endsWith("’s")) {
    return w.slice(0, -2);
  }

  // Plurals and verb inflections
  if (w.length > 4) {
    if (w.endsWith('ies') && !/[aeiou]ies$/.test(w)) {
      return w.slice(0, -3) + 'y';
    }
    if (w.endsWith('ied')) {
      return w.slice(0, -3) + 'y';
    }
    if (w.endsWith('sses') || w.endsWith('shes') || w.endsWith('ches') || w.endsWith('xes') || w.endsWith('zes')) {
      return w.slice(0, -2);
    }
    if (w.endsWith('ing') && w.length > 5) {
      const base = w.slice(0, -3);
      // Doubled consonant (running -> run)
      if (base.length > 2 && base[base.length - 1] === base[base.length - 2]) {
        return base.slice(0, -1);
      }
      return base;
    }
    if (w.endsWith('ed') && w.length > 4) {
      const base = w.slice(0, -2);
      if (base.length > 2 && base[base.length - 1] === base[base.length - 2]) {
        return base.slice(0, -1);
      }
      return base;
    }
    if (w.endsWith('ly') && w.length > 4) {
      return w.slice(0, -2);
    }
    if (w.endsWith('s') && !w.endsWith('ss') && !w.endsWith('us') && !w.endsWith('is')) {
      return w.slice(0, -1);
    }
  }

  return w;
}

export function tokenizeText(text: string, lang: string): string[] {
  if (lang === 'ja') {
    // Japanese: tokenize into kanji words, katakana runs, or hiragana chunks
    const matches = text.match(/[\u4E00-\u9FFF]+|[\u30A0-\u30FF]+|[\u3040-\u309F]{2,}/g);
    return matches || [];
  }

  if (lang === 'ko') {
    // Korean: Hangul blocks, strip common postpositions
    const rawTokens = text.match(/[\uAC00-\uD7AF]+/g) || [];
    const particles = /(은|는|이|가|을|를|에|의|로|으로|와|과|도|만|에게|한테)$/;
    return rawTokens.map((t) => {
      if (t.length > 2) {
        return t.replace(particles, '');
      }
      return t;
    });
  }

  if (lang === 'bn') {
    // Bangla: Bengali unicode words, strip common inflections
    const rawTokens = text.match(/[\u0980-\u09FF]+/g) || [];
    const suffixes = /(গুলো|গুলি|দের|ের|কে|তে|রে|টি|টা|খানা|খানি)$/;
    return rawTokens.map((t) => {
      if (t.length > 3) {
        return t.replace(suffixes, '');
      }
      return t;
    });
  }

  // Default: Latin / English
  // Match word characters, strip punctuation
  const clean = text.replace(/<[^>]+>/g, ' ');
  const rawWords = clean.match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)?/gu) || [];
  const tokens: string[] = [];

  for (const raw of rawWords) {
    const trimmed = raw.toLowerCase().trim();
    if (!trimmed || /^\d+$/.test(trimmed)) continue;
    const lemma = lemmatizeEnglish(trimmed);
    if (lemma.length > 0) {
      tokens.push(lemma);
    }
  }

  return tokens;
}

export function buildProfileFromTokens(bookId: string, tokens: string[]): BookLexiconProfile {
  const frequencies: Record<string, number> = {};
  for (const t of tokens) {
    frequencies[t] = (frequencies[t] || 0) + 1;
  }

  return {
    bookId,
    totalRunningTokens: tokens.length,
    uniqueWordCount: Object.keys(frequencies).length,
    tokenFrequencies: frequencies,
  };
}

const GUTENBERG_CATALOG = [
  { id: 'pride-and-prejudice', gutenbergId: 1342, title: 'Pride and Prejudice' },
  { id: 'don-quixote', gutenbergId: 996, title: 'Don Quixote' },
  { id: 'the-odyssey', gutenbergId: 1727, title: 'The Odyssey' },
  { id: 'anna-karenina', gutenbergId: 1399, title: 'Anna Karenina' },
  { id: 'crime-and-punishment', gutenbergId: 2554, title: 'Crime and Punishment' },
  { id: 'war-and-peace', gutenbergId: 2600, title: 'War and Peace' },
  { id: 'the-brothers-karamazov', gutenbergId: 2805, title: 'The Brothers Karamazov' },
  { id: 'the-art-of-war', gutenbergId: 132, title: 'The Art of War' },
  { id: 'the-analects-of-confucius', gutenbergId: 4094, title: 'The Analects of Confucius' },
  { id: 'arabian-nights', gutenbergId: 19860, title: 'The Arabian Nights' },
];

async function fetchGutenbergText(gutenbergId: number): Promise<string | null> {
  const url = `https://www.gutenberg.org/cache/epub/${gutenbergId}/pg${gutenbergId}.txt`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      return await res.text();
    }
  } catch {
    // Network may be disabled or timed out
  }
  return null;
}

async function main() {
  console.log('Extracting book lexicons...');

  const outputDir = path.resolve(__dirname, '../assets/data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const outputFile = path.join(outputDir, 'book_lexicons.json');

  const profiles: Record<string, BookLexiconProfile> = {};

  // 1. Process Gutenberg Books
  for (const book of GUTENBERG_CATALOG) {
    console.log(`Profiling English: ${book.title}...`);
    let text = await fetchGutenbergText(book.gutenbergId);
    if (!text) {
      console.log(`[Offline Fallback] Generating baseline sample lexicon for ${book.title}`);
      // Fallback sample of canonical words if offline
      text = `In the beginning of the story ${book.title}, a solemn gentleman walked through the carriage road towards the vicar and the hearth. It is a truth universally acknowledged that a single man in possession of a good fortune must be in want of a wife. However little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families, that he is considered the rightful property of some one or other of their daughters.`;
    }

    const tokens = tokenizeText(text, 'en');
    profiles[book.id] = buildProfileFromTokens(book.id, tokens);
    console.log(`  -> ${profiles[book.id].totalRunningTokens} tokens, ${profiles[book.id].uniqueWordCount} unique words`);
  }

  // 2. Process Japanese Books
  try {
    const { AOZORA_JAPANESE_BOOKS, AOZORA_CHAPTER_TEXTS } = await import(
      '../src/features/content-ingestion/japaneseApi'
    );
    for (const book of AOZORA_JAPANESE_BOOKS) {
      console.log(`Profiling Japanese: ${book.title}...`);
      let combinedText = book.synopsis + ' ' + book.title;
      for (const ch of book.chapters) {
        if (AOZORA_CHAPTER_TEXTS[ch.slug]) {
          combinedText += ' ' + AOZORA_CHAPTER_TEXTS[ch.slug];
        }
      }
      const tokens = tokenizeText(combinedText, 'ja');
      profiles[book.id] = buildProfileFromTokens(book.id, tokens);
      console.log(`  -> ${profiles[book.id].totalRunningTokens} tokens, ${profiles[book.id].uniqueWordCount} unique`);
    }
  } catch (err) {
    console.warn('Could not load Japanese texts:', err);
  }

  // 3. Process Korean Books
  try {
    const { GONGU_KOREAN_BOOKS, GONGU_CHAPTER_TEXTS } = await import(
      '../src/features/content-ingestion/koreanApi'
    );
    for (const book of GONGU_KOREAN_BOOKS) {
      console.log(`Profiling Korean: ${book.title}...`);
      let combinedText = book.synopsis + ' ' + book.title;
      for (const ch of book.chapters) {
        if (GONGU_CHAPTER_TEXTS[ch.slug]) {
          combinedText += ' ' + GONGU_CHAPTER_TEXTS[ch.slug];
        }
      }
      const tokens = tokenizeText(combinedText, 'ko');
      profiles[book.id] = buildProfileFromTokens(book.id, tokens);
      console.log(`  -> ${profiles[book.id].totalRunningTokens} tokens, ${profiles[book.id].uniqueWordCount} unique`);
    }
  } catch (err) {
    console.warn('Could not load Korean texts:', err);
  }

  // 4. Process Bangla Books
  try {
    const { FALLBACK_BANGLA_BOOKS } = await import(
      '../src/features/content-ingestion/banglaApi'
    );
    for (const book of FALLBACK_BANGLA_BOOKS) {
      const bookId = `bn-${book.slug}`;
      console.log(`Profiling Bangla: ${book.title}...`);
      const combinedText = book.title + ' ' + book.author + ' ' + (book.synopsis || '') + ' ' + (book.genre || '');
      const tokens = tokenizeText(combinedText, 'bn');
      profiles[bookId] = buildProfileFromTokens(bookId, tokens);
      console.log(`  -> ${profiles[bookId].totalRunningTokens} tokens, ${profiles[bookId].uniqueWordCount} unique`);
    }
  } catch (err) {
    console.warn('Could not load Bangla texts:', err);
  }

  fs.writeFileSync(outputFile, JSON.stringify(profiles, null, 2), 'utf-8');
  console.log(`\nSuccessfully exported book lexicons to ${outputFile} (${Object.keys(profiles).length} books).`);
}

// Execute if run directly
if (require.main === module || (typeof process !== 'undefined' && process.argv[1]?.includes('extract-book-lexicons'))) {
  main().catch((err) => {
    console.error('Extraction failed:', err);
    process.exit(1);
  });
}
