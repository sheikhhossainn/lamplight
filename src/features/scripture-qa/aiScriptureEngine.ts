import { getSurahMeta, getSurahVerses } from '@/features/quran-content/quranData';
import { getBookMeta as getBibleOtMeta, getChapterVerses as getBibleOtVerses } from '@/features/bible-content/bibleData';
import { getBookMeta as getBibleNtMeta, getChapterVerses as getBibleNtVerses } from '@/features/bible-content/bibleNtData';
import { getBookMeta as getVedasMeta, getChapterVerses as getVedasVerses } from '@/features/vedas-content/vedasData';

import type {
  ScriptureQAVerse,
  TraditionGroup,
  TraditionKey,
} from './curatedScriptureQA';
import type { ScriptureInquiryResult } from './scriptureInquiryApi';

type AICitation = {
  surahNumber?: number;
  bookId?: string;
  chapter?: number;
  verseNumber: number;
  historicalContext?: string;
  commentaryNote?: string;
};

type AITraditionBlock = {
  tradition: TraditionKey;
  traditionName: string;
  subtitle: string;
  citations: AICitation[];
};

type AIResponseSchema = {
  topicBackground: string;
  traditions: AITraditionBlock[];
};

const SYSTEM_PROMPT = `You are a neutral comparative religious studies scholar.
A user asked a question about what scriptures say regarding a specific topic.

NON-NEGOTIABLE DIRECTIVES:
1. STRICT NON-BIAS & ZERO VERDICTS: Do not give a theological conclusion, ruling, or verdict. Do not say which religion is right or wrong. Provide the primary scripture citations and factual context so readers can decide for themselves.
2. CANDID & UNFILTERED TEXTS: Never sanitize or cherry-pick gentle passages while omitting challenging, controversial, or oppressing verses. If a tradition contains passages on domestic hierarchy, physical discipline, servitude, or harsh laws (e.g., in Torah, New Testament, or Vedas just as in Quran), cite those exact passages with their authentic historical setting and classical exegesis.
3. SEMANTIC INTENT UNDERSTANDING: Discern the deep theological and ethical intent of the question. Ensure the selected citations directly address the specific ethical concern the user is probing.
4. MULTI-TRADITION CITATIONS:
   Provide relevant chapter and verse citations across all traditions:
   - Quran: provide "surahNumber" (1-114) and "verseNumber"
   - Bible New Testament: provide "bookId" (3-letter uppercase, e.g. MAT, MRK, LUK, JHN, ACT, ROM, 1CO, 2CO, GAL, EPH, PHP, COL, 1TI, 2TI, HEB, JAS, 1PE, REV), "chapter" (number), and "verseNumber" (number)
   - Torah & Old Testament: provide "bookId" (3-letter uppercase, e.g. GEN, EXO, LEV, NUM, DEU, JOS, JDG, 1SA, 2SA, PSA, PRO, ECC, ISA, JER, MIC, MAL), "chapter" (number), and "verseNumber" (number)
   - Rigveda: provide "bookId" ('RV01' to 'RV10'), "chapter" (hymn number), and "verseNumber" (verse number)
5. For each citation, provide "historicalContext" (factual occasion, setting, who was addressed) and optional "commentaryNote".
6. RADICAL CONTEXT INTEGRITY: Never invent, sanitize, or fabricate historical occasions. If classical scholars and texts do not record an occasion of revelation or historical narrative for a statutory statute (e.g., Leviticus purity codes, Deuteronomy statutory torts, or Proverbs aphorisms), state explicitly: "No narrative historical occasion recorded; preserved as an unanchored legal/wisdom statute." If a verse is dramatic character dialogue (e.g., Rigveda 10.95 Pururavas lamenting Urvashi), clarify that it is poetic character speech rather than a religious commandment. If an early verse was formally abrogated in tradition (e.g., Quran 4:15), note its classical abrogation.

You must respond ONLY with a valid JSON object matching this schema:
{
  "topicBackground": "Neutral factual background of this topic in religious history...",
  "traditions": [
    {
      "tradition": "quran",
      "traditionName": "The Holy Quran",
      "subtitle": "Brief 3-6 word theme description",
      "citations": [
        { "surahNumber": 2, "verseNumber": 183, "historicalContext": "...", "commentaryNote": "..." }
      ]
    },
    {
      "tradition": "bible-nt",
      "traditionName": "New Testament",
      "subtitle": "Brief 3-6 word theme description",
      "citations": [
        { "bookId": "MAT", "chapter": 6, "verseNumber": 16, "historicalContext": "...", "commentaryNote": "..." }
      ]
    },
    {
      "tradition": "torah",
      "traditionName": "Torah & Old Testament",
      "subtitle": "Brief 3-6 word theme description",
      "citations": [
        { "bookId": "LEV", "chapter": 16, "verseNumber": 29, "historicalContext": "...", "commentaryNote": "..." }
      ]
    },
    {
      "tradition": "vedas",
      "traditionName": "Rigveda",
      "subtitle": "Brief 3-6 word theme description",
      "citations": [
        { "bookId": "RV10", "chapter": 117, "verseNumber": 1, "historicalContext": "...", "commentaryNote": "..." }
      ]
    }
  ]
}`;

/**
 * Hydrates raw AI citation references with exact texts, original Arabic script,
 * Sahih International translations, Tafsir al-Jalalayn, and JFB commentary from
 * our bundled database.
 */
function hydrateTraditionVerses(
  tradition: TraditionKey,
  citations: AICitation[],
): ScriptureQAVerse[] {
  const result: ScriptureQAVerse[] = [];

  for (const cite of citations) {
    if (tradition === 'quran' && cite.surahNumber && cite.verseNumber) {
      const meta = getSurahMeta(cite.surahNumber);
      const verses = getSurahVerses(cite.surahNumber);
      const verseObj = verses.find((v) => v.number === cite.verseNumber);

      if (verseObj) {
        result.push({
          id: `ai-quran-${cite.surahNumber}-${cite.verseNumber}`,
          tradition: 'quran',
          book: meta ? meta.nameEnglish : `Surah ${cite.surahNumber}`,
          chapter: cite.surahNumber,
          verseNumber: cite.verseNumber,
          originalText: verseObj.textArabic,
          translation: verseObj.textEnglish,
          historicalContext:
            cite.historicalContext ||
            `Revealed in ${meta?.revelationType ?? 'Medina/Mecca'} addressing this principle.`,
          classicalCommentary:
            verseObj.textTafsir ? `Tafsir al-Jalalayn: ${verseObj.textTafsir}` : cite.commentaryNote,
        });
      }
    } else if (tradition === 'bible-nt' && cite.bookId && cite.chapter && cite.verseNumber) {
      const meta = getBibleNtMeta(cite.bookId);
      const verses = getBibleNtVerses(cite.bookId, cite.chapter);
      const verseObj = verses.find((v) => v.verse.number === cite.verseNumber);

      if (verseObj) {
        result.push({
          id: `ai-nt-${cite.bookId}-${cite.chapter}-${cite.verseNumber}`,
          tradition: 'bible-nt',
          book: meta ? meta.name : cite.bookId,
          bookId: cite.bookId,
          chapter: cite.chapter,
          verseNumber: cite.verseNumber,
          translation: verseObj.verse.text,
          historicalContext:
            cite.historicalContext || `Apostolic record in ${meta?.name ?? cite.bookId}.`,
          classicalCommentary:
            verseObj.verse.commentary
              ? `Jamieson-Fausset-Brown: ${verseObj.verse.commentary}`
              : cite.commentaryNote,
        });
      }
    } else if (
      (tradition === 'torah' || tradition === 'bible-ot') &&
      cite.bookId &&
      cite.chapter &&
      cite.verseNumber
    ) {
      const meta = getBibleOtMeta(cite.bookId);
      const verses = getBibleOtVerses(cite.bookId, cite.chapter);
      const verseObj = verses.find((v) => v.verse.number === cite.verseNumber);

      if (verseObj) {
        result.push({
          id: `ai-ot-${cite.bookId}-${cite.chapter}-${cite.verseNumber}`,
          tradition: 'torah',
          book: meta ? meta.name : cite.bookId,
          bookId: cite.bookId,
          chapter: cite.chapter,
          verseNumber: cite.verseNumber,
          translation: verseObj.verse.text,
          historicalContext:
            cite.historicalContext || `Biblical record in ${meta?.name ?? cite.bookId}.`,
          classicalCommentary:
            verseObj.verse.commentary
              ? `Jamieson-Fausset-Brown: ${verseObj.verse.commentary}`
              : cite.commentaryNote,
        });
      }
    } else if (tradition === 'vedas' && cite.bookId && cite.chapter && cite.verseNumber) {
      const meta = getVedasMeta(cite.bookId);
      const verses = getVedasVerses(cite.bookId, cite.chapter);
      const verseObj = verses.find((v) => v.verse.number === cite.verseNumber);

      if (verseObj) {
        result.push({
          id: `ai-vedas-${cite.bookId}-${cite.chapter}-${cite.verseNumber}`,
          tradition: 'vedas',
          book: meta ? meta.name : `Rigveda Mandala ${cite.bookId.replace('RV', '')}`,
          bookId: cite.bookId,
          chapter: cite.chapter,
          verseNumber: cite.verseNumber,
          translation: verseObj.verse.text,
          historicalContext:
            cite.historicalContext || `Hymn in ${meta?.name ?? cite.bookId}.`,
          classicalCommentary: cite.commentaryNote,
        });
      }
    }
  }

  return result;
}

/**
 * Calls Groq AI endpoint (Llama 3.3 70B) if EXPO_PUBLIC_GROQ_API_KEY is configured.
 */
async function callLLMEndpoint(query: string): Promise<AIResponseSchema | null> {
  const groqKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;

  if (!groqKey) {
    return null;
  }

  const endpoint = 'https://api.groq.com/openai/v1/chat/completions';
  const model = 'llama-3.3-70b-versatile';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 18000);

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: query },
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) return null;

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    return JSON.parse(content) as AIResponseSchema;
  } catch {
    return null;
  }
}

const SCRIPTURE_STOP_WORDS = new Set([
  'what', 'does', 'do', 'say', 'says', 'saying', 'said', 'tells', 'tell',
  'about', 'regarding', 'concerning', 'the', 'and', 'for', 'are', 'but',
  'not', 'you', 'all', 'any', 'can', 'her', 'was', 'one', 'our', 'out',
  'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old',
  'see', 'two', 'way', 'who', 'did', 'its', 'let', 'put', 'she', 'too',
  'use', 'with', 'from', 'this', 'that', 'these', 'those', 'them', 'they',
  'their', 'there', 'then', 'than', 'into', 'have', 'had', 'were', 'will',
  'would', 'could', 'should', 'been', 'each', 'other', 'which', 'some',
  'such', 'very', 'even', 'most', 'also', 'many', 'much', 'only', 'own',
  'same', 'religion', 'religions', 'religious', 'scripture', 'scriptures',
  'quran', 'koran', 'bible', 'torah', 'vedas', 'veda', 'rigveda',
]);

/**
 * Main AI Scripture Inference Engine:
 * 1. Checks live LLM endpoint (Groq / OpenAI) with objective comparative prompt.
 * 2. Hydrates verified primary texts, original scripts, and commentaries from local assets.
 * 3. Falls back gracefully to intelligent keyword search across all local scripture datasets (Quran, NT, OT, Vedas) if offline.
 */
export async function askAIScriptureInquiry(query: string): Promise<ScriptureInquiryResult> {
  // 1. Try Live AI Model if API key is present
  const aiRaw = await callLLMEndpoint(query);

  if (aiRaw && Array.isArray(aiRaw.traditions) && aiRaw.traditions.length > 0) {
    const hydratedTraditions: TraditionGroup[] = [];

    for (const group of aiRaw.traditions) {
      const verses = hydrateTraditionVerses(group.tradition, group.citations || []);
      if (verses.length > 0) {
        hydratedTraditions.push({
          tradition: group.tradition,
          traditionName: group.traditionName,
          subtitle: group.subtitle || 'Scriptural references regarding your inquiry',
          verses,
        });
      }
    }

    if (hydratedTraditions.length > 0) {
      return {
        id: `ai-${Date.now()}`,
        question: query,
        shortTitle: query.length > 32 ? `${query.slice(0, 32)}...` : query,
        topicBackground:
          aiRaw.topicBackground ||
          `Comparative scriptural examination for "${query}". Explore the primary texts and verified contexts across traditions below.`,
        traditions: hydratedTraditions,
        isCurated: false,
      };
    }
  }

  // 2. Offline Dynamic Scripture Engine
  // Extract meaningful topic keywords, excluding conversational stop words
  const rawWords = query
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3);

  const filteredWords = rawWords.filter((w) => !SCRIPTURE_STOP_WORDS.has(w));
  const searchTerms = filteredWords.length > 0 ? filteredWords : rawWords;

  const matchedTraditions: TraditionGroup[] = [];

  // Search Quran
  const quranMatches: { verse: ScriptureQAVerse; score: number }[] = [];
  for (let s = 1; s <= 114; s++) {
    const meta = getSurahMeta(s);
    const verses = getSurahVerses(s);
    for (const v of verses) {
      const text = `${v.textEnglish} ${v.textTafsir}`.toLowerCase();
      let score = 0;
      for (const term of searchTerms) {
        if (text.includes(term)) {
          score += 1;
        }
      }
      if (score > 0) {
        quranMatches.push({
          score,
          verse: {
            id: `q-${s}-${v.number}`,
            tradition: 'quran',
            book: meta ? meta.nameEnglish : `Surah ${s}`,
            chapter: s,
            verseNumber: v.number,
            originalText: v.textArabic,
            translation: v.textEnglish,
            historicalContext: `Surah ${meta?.nameEnglish ?? s} (${meta?.revelationType ?? 'Medina'}), Verse ${v.number}.`,
            classicalCommentary: v.textTafsir ? `Tafsir al-Jalalayn: ${v.textTafsir}` : undefined,
          },
        });
      }
    }
    if (quranMatches.length >= 25) break;
  }

  if (quranMatches.length > 0) {
    quranMatches.sort((a, b) => b.score - a.score);
    matchedTraditions.push({
      tradition: 'quran',
      traditionName: 'The Holy Quran',
      subtitle: `Primary Quranic verses addressing your inquiry`,
      verses: quranMatches.slice(0, 6).map((m) => m.verse),
    });
  }

  // Search New Testament
  const ntBooks = ['MAT', 'MRK', 'LUK', 'JHN', 'ACT', 'ROM', '1CO', 'GAL', 'EPH', '1TI', 'JAS', '1PE'];
  const ntMatches: { verse: ScriptureQAVerse; score: number }[] = [];
  for (const bId of ntBooks) {
    const meta = getBibleNtMeta(bId);
    const chapterCount = meta?.chapterCount ?? 1;
    for (let c = 1; c <= Math.min(chapterCount, 12); c++) {
      const verses = getBibleNtVerses(bId, c);
      for (const v of verses) {
        const text = `${v.verse.text} ${v.verse.commentary ?? ''}`.toLowerCase();
        let score = 0;
        for (const term of searchTerms) {
          if (text.includes(term)) {
            score += 1;
          }
        }
        if (score > 0) {
          ntMatches.push({
            score,
            verse: {
              id: `nt-${bId}-${c}-${v.verse.number}`,
              tradition: 'bible-nt',
              book: meta ? meta.name : bId,
              bookId: bId,
              chapter: c,
              verseNumber: v.verse.number,
              translation: v.verse.text,
              historicalContext: `Apostolic record in ${meta?.name ?? bId}, Chapter ${c}.`,
              classicalCommentary: v.verse.commentary
                ? `Jamieson-Fausset-Brown: ${v.verse.commentary}`
                : undefined,
            },
          });
        }
      }
      if (ntMatches.length >= 25) break;
    }
    if (ntMatches.length >= 25) break;
  }

  if (ntMatches.length > 0) {
    ntMatches.sort((a, b) => b.score - a.score);
    matchedTraditions.push({
      tradition: 'bible-nt',
      traditionName: 'New Testament',
      subtitle: `New Testament scriptures and apostolic records`,
      verses: ntMatches.slice(0, 5).map((m) => m.verse),
    });
  }

  // Search Torah & Old Testament
  const otBooks = ['GEN', 'EXO', 'LEV', 'DEU', 'PSA', 'PRO', 'ISA', 'MIC'];
  const otMatches: { verse: ScriptureQAVerse; score: number }[] = [];
  for (const bId of otBooks) {
    const meta = getBibleOtMeta(bId);
    const chapterCount = meta?.chapterCount ?? 1;
    for (let c = 1; c <= Math.min(chapterCount, 10); c++) {
      const verses = getBibleOtVerses(bId, c);
      for (const v of verses) {
        const text = `${v.verse.text} ${v.verse.commentary ?? ''}`.toLowerCase();
        let score = 0;
        for (const term of searchTerms) {
          if (text.includes(term)) {
            score += 1;
          }
        }
        if (score > 0) {
          otMatches.push({
            score,
            verse: {
              id: `ot-${bId}-${c}-${v.verse.number}`,
              tradition: 'torah',
              book: meta ? meta.name : bId,
              bookId: bId,
              chapter: c,
              verseNumber: v.verse.number,
              translation: v.verse.text,
              historicalContext: `Hebrew scripture in ${meta?.name ?? bId}, Chapter ${c}.`,
              classicalCommentary: v.verse.commentary
                ? `Jamieson-Fausset-Brown: ${v.verse.commentary}`
                : undefined,
            },
          });
        }
      }
      if (otMatches.length >= 25) break;
    }
    if (otMatches.length >= 25) break;
  }

  if (otMatches.length > 0) {
    otMatches.sort((a, b) => b.score - a.score);
    matchedTraditions.push({
      tradition: 'torah',
      traditionName: 'Torah & Old Testament',
      subtitle: `Hebrew scriptures and wisdom texts`,
      verses: otMatches.slice(0, 5).map((m) => m.verse),
    });
  }

  // Search Rigveda
  const vedaBooks = ['RV01', 'RV03', 'RV10'];
  const vedaMatches: { verse: ScriptureQAVerse; score: number }[] = [];
  for (const bId of vedaBooks) {
    const meta = getVedasMeta(bId);
    const chapterCount = meta?.chapterCount ?? 1;
    for (let c = 1; c <= Math.min(chapterCount, 15); c++) {
      const verses = getVedasVerses(bId, c);
      for (const v of verses) {
        const text = `${v.verse.text} ${v.verse.commentary ?? ''}`.toLowerCase();
        let score = 0;
        for (const term of searchTerms) {
          if (text.includes(term)) {
            score += 1;
          }
        }
        if (score > 0) {
          vedaMatches.push({
            score,
            verse: {
              id: `veda-${bId}-${c}-${v.verse.number}`,
              tradition: 'vedas',
              book: meta ? meta.name : `Rigveda Mandala ${bId.replace('RV', '')}`,
              bookId: bId,
              chapter: c,
              verseNumber: v.verse.number,
              translation: v.verse.text,
              historicalContext: `Vedic hymn in ${meta?.name ?? bId}, Hymn ${c}.`,
              classicalCommentary: v.verse.commentary,
            },
          });
        }
      }
      if (vedaMatches.length >= 20) break;
    }
    if (vedaMatches.length >= 20) break;
  }

  if (vedaMatches.length > 0) {
    vedaMatches.sort((a, b) => b.score - a.score);
    matchedTraditions.push({
      tradition: 'vedas',
      traditionName: 'Rigveda',
      subtitle: `Vedic hymns and ancient Sanskrit wisdom`,
      verses: vedaMatches.slice(0, 4).map((m) => m.verse),
    });
  }

  return {
    id: `dyn-${Date.now()}`,
    question: query,
    shortTitle: query.length > 32 ? `${query.slice(0, 32)}...` : query,
    topicBackground: `Scriptural passages examining "${query}". Select a tradition below to examine primary verses and classical commentary without verdicts.`,
    traditions: matchedTraditions,
    isCurated: false,
  };
}
