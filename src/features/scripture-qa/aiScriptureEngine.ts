import { getSurahMeta, getSurahVerses } from '@/features/quran-content/quranData';
import {
  getBookMeta as getBibleOtMeta,
  getBookVerses as getBibleOtBookVerses,
  getChapterVerses as getBibleOtVerses,
  listBooks as listBibleOtBooks,
} from '@/features/bible-content/bibleData';
import {
  getBookMeta as getBibleNtMeta,
  getBookVerses as getBibleNtBookVerses,
  getChapterVerses as getBibleNtVerses,
  listBooks as listBibleNtBooks,
} from '@/features/bible-content/bibleNtData';
import {
  getBookMeta as getVedasMeta,
  getBookVerses as getVedasBookVerses,
  getChapterVerses as getVedasVerses,
  listBooks as listVedasBooks,
} from '@/features/vedas-content/vedasData';

import {
  type ScriptureQAVerse,
  type TraditionGroup,
  type TraditionKey,
  getTraditionSourceAttribution,
} from './curatedScriptureQA';
import type { ScriptureInquiryResult } from './scriptureInquiryApi';
import { parseCitation } from './citationResolver';
import { requestScriptureInquiry } from './scriptureInquiryRemote';

export type AICitation = {
  surahNumber?: number;
  bookId?: string;
  chapter?: number;
  verseNumber: number;
};

type AITraditionBlock = {
  tradition: TraditionKey;
  traditionName: string;
  subtitle: string;
  citations: AICitation[];
};

export type AIResponseSchema = {
  topicBackground: string;
  traditions: AITraditionBlock[];
};

const SYSTEM_PROMPT = `You are a neutral comparative religious studies scholar.
A user asked a question about what scriptures say regarding a specific topic.

NON-NEGOTIABLE DIRECTIVES:
1. STRICT NON-BIAS & ZERO VERDICTS: Do not give a theological conclusion, ruling, or verdict. Do not say which religion is right or wrong. Provide the primary scripture citations and factual context so readers can decide for themselves.
2. CANDID & UNFILTERED TEXTS: Never sanitize or cherry-pick gentle passages while omitting challenging, controversial, or oppressing verses. If a tradition contains passages on domestic hierarchy, physical discipline, servitude, or harsh statutory laws (e.g. in Torah, New Testament, or Vedas just as in Quran), cite those exact passages with their authentic historical setting and classical exegesis.
3. CITATION ACCURACY ACROSS 4 TRADITIONS:
   Provide relevant chapter and verse citations across traditions:
   - Quran: provide "surahNumber" (1-114) and "verseNumber"
   - Torah & Old Testament: provide "bookId" (3-letter uppercase, e.g. GEN, EXO, LEV, NUM, DEU, JOS, JDG, 1SA, 2SA, PSA, PRO, ECC, ISA, JER, MIC, MAL), "chapter" (number), and "verseNumber" (number)
   - Bible New Testament: provide "bookId" (3-letter uppercase, e.g. MAT, MRK, LUK, JHN, ACT, ROM, 1CO, 2CO, GAL, EPH, PHP, COL, 1TI, 2TI, HEB, JAS, 1PE, REV), "chapter" (number), and "verseNumber" (number)
   - Rigveda: provide "bookId" ('RV01' to 'RV10'), "chapter" (hymn number), and "verseNumber" (number)
4. For each citation, provide "historicalContext" (factual occasion, setting, who was addressed) and optional "commentaryNote".
5. RADICAL CONTEXT INTEGRITY: Never invent or sanitize historical occasions. If a verse is statutory tort/purity code without recorded occasion, state: "Preserved as an unanchored legal/wisdom statute." If abrogated or amended in classical tradition (e.g. Quran 4:15 superseded by 24:2), note its historical status.

You must respond ONLY with a valid JSON object matching this schema:
{
  "topicBackground": "Neutral factual background of this topic in religious history...",
  "traditions": [
    {
      "tradition": "quran",
      "traditionName": "The Holy Quran",
      "subtitle": "Brief 3-6 word theme description",
      "citations": [
        { "surahNumber": 24, "verseNumber": 2, "historicalContext": "...", "commentaryNote": "..." }
      ]
    },
    {
      "tradition": "torah",
      "traditionName": "Torah & Old Testament",
      "subtitle": "Brief 3-6 word theme description",
      "citations": [
        { "bookId": "LEV", "chapter": 20, "verseNumber": 10, "historicalContext": "...", "commentaryNote": "..." }
      ]
    },
    {
      "tradition": "bible-nt",
      "traditionName": "New Testament",
      "subtitle": "Brief 3-6 word theme description",
      "citations": [
        { "bookId": "JHN", "chapter": 8, "verseNumber": 7, "historicalContext": "...", "commentaryNote": "..." }
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
 * Resilient JSON extractor supporting markdown code fences and noisy prefixes.
 */
function extractJSON<T>(raw: string): T | null {
  try {
    const clean = raw.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    return JSON.parse(clean) as T;
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Candidate models supported on Groq with graceful cascading fallback.
 */
const GROQ_MODELS = [
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'qwen/qwen3.8-27b',
  'groq/compound-mini',
];

/**
 * Calls the protected server endpoint for citation candidates only.
 */
async function callLLMEndpoint(query: string, signal?: AbortSignal): Promise<AIResponseSchema | null> {
  return requestScriptureInquiry(query, signal);
}

export function normalizeTraditionKey(raw: string): TraditionKey | null {
  const clean = (raw || '').toLowerCase().trim();
  if (clean.includes('quran') || clean.includes('islam') || clean.includes('muslim')) return 'quran';
  if (clean.includes('torah') || clean.includes('old testament') || clean.includes('ot') || clean.includes('hebrew') || clean.includes('judaism') || clean.includes('tanakh')) return 'torah';
  if (clean.includes('nt') || clean.includes('new testament') || clean.includes('gospel') || clean.includes('apostol') || clean.includes('christian')) return 'bible-nt';
  if (clean.includes('veda') || clean.includes('hindu') || clean.includes('sanskrit')) return 'vedas';
  return null;
}

/**
 * Hydrates and strictly validates citations against our local bundled database.
 * Treats AI candidate citations as unverified hints; only canonically matching verses
 * are hydrated into renderable scripture texts (FULLAPP §13.3).
 */
export function hydrateAndVerifyTraditionVerses(
  tradition: TraditionKey,
  citations: AICitation[],
  options?: { isAiAssisted?: boolean },
): ScriptureQAVerse[] {
  const result: ScriptureQAVerse[] = [];
  const attribution = getTraditionSourceAttribution(tradition);
  const isAiAssisted = options?.isAiAssisted ?? true;

  for (const cite of citations) {
    if (!cite || typeof cite !== 'object') continue;
    const vNum = Number(cite.verseNumber);
    if (!Number.isInteger(vNum) || vNum <= 0) continue;

    if (tradition === 'quran') {
      const sNum = Number(cite.surahNumber);
      if (!Number.isInteger(sNum) || sNum < 1 || sNum > 114) continue;
      // Cross-tradition guard: Quran citations cannot carry a non-empty bookId
      if (cite.bookId && typeof cite.bookId === 'string' && cite.bookId.trim().length > 0) {
        continue;
      }
      const meta = getSurahMeta(sNum);
      const verses = getSurahVerses(sNum);
      const verseObj = verses.find((v) => v.number === vNum);

      if (verseObj) {
        result.push({
          id: `ai-quran-${sNum}-${vNum}`,
          tradition: 'quran',
          book: meta ? meta.nameEnglish : `Surah ${sNum}`,
          chapter: sNum,
          verseNumber: vNum,
          originalText: verseObj.textArabic,
          translation: verseObj.textEnglish,
          historicalContext:
            `Surah ${meta?.nameEnglish ?? sNum} (${meta?.revelationType ?? 'Medina'}), Verse ${vNum}.`,
          classicalCommentary:
            verseObj.textTafsir ? `Tafsir al-Jalalayn: ${verseObj.textTafsir}` : undefined,
          translationEdition: attribution.translationEdition,
          commentarySource: verseObj.textTafsir ? attribution.commentarySource : undefined,
          isAiAssistedContext: isAiAssisted,
        });
      }
    } else if (tradition === 'bible-nt') {
      // Cross-tradition guard: Bible NT cannot have surahNumber
      if (cite.surahNumber !== undefined && cite.surahNumber !== null) continue;
      const chNum = Number(cite.chapter);
      if (!Number.isInteger(chNum) || chNum <= 0) continue;
      if (!cite.bookId || typeof cite.bookId !== 'string') continue;

      let bookId = cite.bookId.trim().toUpperCase();
      if (bookId.length > 3 || !getBibleNtMeta(bookId)) {
        const parsed = parseCitation(`${bookId} ${chNum}:${vNum}`);
        if (parsed?.bookId) bookId = parsed.bookId;
      }
      const meta = getBibleNtMeta(bookId);
      // Strictly require that the book exists in the New Testament
      if (!meta) continue;

      const verses = getBibleNtVerses(bookId, chNum);
      const verseObj = verses.find((v) => v.verse.number === vNum);

      if (verseObj) {
        result.push({
          id: `ai-nt-${bookId}-${chNum}-${vNum}`,
          tradition: 'bible-nt',
          book: meta.name,
          bookId,
          chapter: chNum,
          verseNumber: vNum,
          translation: verseObj.verse.text,
          historicalContext:
            `Apostolic record in ${meta.name}, Chapter ${chNum}.`,
          classicalCommentary:
            verseObj.verse.commentary
              ? `Jamieson-Fausset-Brown: ${verseObj.verse.commentary}`
              : undefined,
          translationEdition: attribution.translationEdition,
          commentarySource: verseObj.verse.commentary ? attribution.commentarySource : undefined,
          isAiAssistedContext: isAiAssisted,
        });
      }
    } else if (tradition === 'torah' || tradition === 'bible-ot') {
      // Cross-tradition guard: Torah/OT cannot have surahNumber
      if (cite.surahNumber !== undefined && cite.surahNumber !== null) continue;
      const chNum = Number(cite.chapter);
      if (!Number.isInteger(chNum) || chNum <= 0) continue;
      if (!cite.bookId || typeof cite.bookId !== 'string') continue;

      let bookId = cite.bookId.trim().toUpperCase();
      if (bookId.length > 3 || !getBibleOtMeta(bookId)) {
        const parsed = parseCitation(`${bookId} ${chNum}:${vNum}`);
        if (parsed?.bookId) bookId = parsed.bookId;
      }
      const meta = getBibleOtMeta(bookId);
      // Strictly require that the book exists in the Old Testament / Torah
      if (!meta) continue;

      const verses = getBibleOtVerses(bookId, chNum);
      const verseObj = verses.find((v) => v.verse.number === vNum);

      if (verseObj) {
        result.push({
          id: `ai-ot-${bookId}-${chNum}-${vNum}`,
          tradition: 'torah',
          book: meta.name,
          bookId,
          chapter: chNum,
          verseNumber: vNum,
          translation: verseObj.verse.text,
          historicalContext:
            `Biblical record in ${meta.name}, Chapter ${chNum}.`,
          classicalCommentary:
            verseObj.verse.commentary
              ? `Jamieson-Fausset-Brown: ${verseObj.verse.commentary}`
              : undefined,
          translationEdition: attribution.translationEdition,
          commentarySource: verseObj.verse.commentary ? attribution.commentarySource : undefined,
          isAiAssistedContext: isAiAssisted,
        });
      }
    } else if (tradition === 'vedas') {
      if (cite.surahNumber !== undefined && cite.surahNumber !== null) continue;
      const chNum = Number(cite.chapter);
      if (!Number.isInteger(chNum) || chNum <= 0) continue;
      if (!cite.bookId || typeof cite.bookId !== 'string') continue;

      const bookId = cite.bookId.trim().toUpperCase();
      const meta = getVedasMeta(bookId);
      if (!meta) continue;

      const verses = getVedasVerses(bookId, chNum);
      const verseObj = verses.find((v) => v.verse.number === vNum);

      if (verseObj) {
        result.push({
          id: `ai-vedas-${bookId}-${chNum}-${vNum}`,
          tradition: 'vedas',
          book: meta.name,
          bookId,
          chapter: chNum,
          verseNumber: vNum,
          translation: verseObj.verse.text,
          historicalContext:
            `Vedic hymn in ${meta.name}, Hymn ${chNum}.`,
          classicalCommentary: undefined,
          translationEdition: attribution.translationEdition,
          commentarySource: undefined,
          isAiAssistedContext: isAiAssisted,
        });
      }
    }
  }

  return result;
}

// -----------------------------------------------------------------------------
// Exhaustive Internal Scripture Cross-Checking & Offline Fallback Engine
// -----------------------------------------------------------------------------

const THEOLOGICAL_THEMES: Record<string, { topicTerms: string[]; actionTerms: string[] }> = {
  adultery: {
    topicTerms: [
      'adultery', 'adulterer', 'adulteress', 'adulterous', 'zina', 'fornication',
      'fornicat', 'unlawful sexual', 'sexual intercourse', 'lewdness', 'unchaste',
      'infidelity', 'neighbor’s wife', "neighbor's wife",
    ],
    actionTerms: [
      'punish', 'penalty', 'penalties', 'lash', 'lashes', 'flog', 'flogging',
      'stone', 'stoning', 'put to death', 'both die', 'shall die', 'slain',
      'kill', 'hundred lashes', 'witnesses', 'cast the first stone',
    ],
  },
  divorce: {
    topicTerms: ['divorce', 'divorcing', 'talaq', 'khula', 'khul', 'dissolv', 'remarriage', 'remarry', 'separate', 'separation', 'bill of divorce'],
    actionTerms: ['lawful', 'prohibit', 'permit', 'waiting period', 'iddah', 'mahr', 'send away', 'certificate', 'leave'],
  },
  warfare: {
    topicTerms: ['war', 'warfare', 'battle', 'combat', 'enemy', 'enemies', 'fight', 'fighting', 'jihad', 'civilian', 'non-combatant', 'women and children'],
    actionTerms: ['kill', 'slay', 'transgress', 'peace', 'incline to peace', 'spare', 'treaty', 'captive', 'prisoner'],
  },
  charity: {
    topicTerms: ['charity', 'poor', 'needy', 'zakat', 'alms', 'giving', 'sadaqah', 'beggar', 'destitute', 'widow', 'orphan'],
    actionTerms: ['give', 'spend', 'wealth', 'feed', 'share', 'generous', 'tithe', 'store up'],
  },
  fasting: {
    topicTerms: ['fast', 'fasting', 'sawm', 'ramadan', 'hunger', 'abstain', 'food and drink', 'atonement'],
    actionTerms: ['prescribed', 'commanded', 'discipline', 'dawn', 'sunset', 'purify', 'humble'],
  },
  justice: {
    topicTerms: ['justice', 'judge', 'judgment', 'ruler', 'governance', 'king', 'witness', 'testimony', 'court', 'equity'],
    actionTerms: ['stand firm', 'bribe', 'oppress', 'oppression', 'righteous', 'impartial', 'weigh', 'balance'],
  },
};

function identifyThemes(query: string): { topicTerms: string[]; actionTerms: string[] } {
  const clean = query.toLowerCase();
  const matchedTopics = new Set<string>();
  const matchedActions = new Set<string>();

  for (const [, theme] of Object.entries(THEOLOGICAL_THEMES)) {
    const hasTopic = theme.topicTerms.some((t) => clean.includes(t));
    const hasAction = theme.actionTerms.some((a) => clean.includes(a));
    if (hasTopic || hasAction) {
      theme.topicTerms.forEach((t) => matchedTopics.add(t));
      theme.actionTerms.forEach((a) => matchedActions.add(a));
    }
  }

  // Also include substantive tokens from user query itself
  const words = clean
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !SCRIPTURE_STOP_WORDS.has(w));

  words.forEach((w) => matchedTopics.add(w));

  return {
    topicTerms: Array.from(matchedTopics),
    actionTerms: Array.from(matchedActions),
  };
}

function scoreScriptureVerse(
  text: string,
  topicTerms: string[],
  actionTerms: string[],
): number {
  const lower = text.toLowerCase();
  let topicHits = 0;
  let actionHits = 0;

  for (const t of topicTerms) {
    if (lower.includes(t)) topicHits++;
  }
  for (const a of actionTerms) {
    if (lower.includes(a)) actionHits++;
  }

  // Cross-occurrence bonus: verses that directly address both the ethical theme
  // and the specific legal/statutory inquiry (e.g. adultery + punishment)
  if (topicHits > 0 && actionHits > 0) {
    return 15 + topicHits * 3 + actionHits * 2;
  }
  if (topicHits > 0) {
    return 3 + topicHits * 2;
  }
  if (actionHits > 0 && actionTerms.length > 0) {
    return 1;
  }
  return 0;
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
 * Searches and cross-checks across all bundled scripture datasets (Quran, NT, OT, Vedas).
 */
function searchInternalScriptureDatasets(query: string): TraditionGroup[] {
  const { topicTerms, actionTerms } = identifyThemes(query);
  const matchedTraditions: TraditionGroup[] = [];

  // 1. Quran: Search all 114 surahs
  const quranMatches: { verse: ScriptureQAVerse; score: number }[] = [];
  for (let s = 1; s <= 114; s++) {
    const meta = getSurahMeta(s);
    const verses = getSurahVerses(s);
    for (const v of verses) {
      const fullText = `${v.textEnglish} ${v.textTafsir}`;
      const score = scoreScriptureVerse(fullText, topicTerms, actionTerms);
      if (score >= 4) {
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
            translationEdition: 'Saheeh International',
            commentarySource: v.textTafsir ? 'Tafsir al-Jalalayn' : undefined,
            isAiAssistedContext: false,
          },
        });
      }
    }
  }

  if (quranMatches.length > 0) {
    quranMatches.sort((a, b) => b.score - a.score);
    matchedTraditions.push({
      tradition: 'quran',
      traditionName: 'The Holy Quran',
      subtitle: `Primary Quranic verses addressing your inquiry`,
      verses: quranMatches.slice(0, 5).map((m) => m.verse),
    });
  }

  // 2. Torah & Old Testament: Search all 39 books and all chapters
  const otBooks = listBibleOtBooks();
  const otMatches: { verse: ScriptureQAVerse; score: number }[] = [];
  for (const b of otBooks) {
    const verses = getBibleOtBookVerses(b.id);
    for (const item of verses) {
      const fullText = `${item.verse.text} ${item.verse.commentary ?? ''}`;
      const score = scoreScriptureVerse(fullText, topicTerms, actionTerms);
      if (score >= 4) {
        otMatches.push({
          score,
          verse: {
            id: `ot-${b.id}-${item.chapter}-${item.verse.number}`,
            tradition: 'torah',
            book: b.name,
            bookId: b.id,
            chapter: item.chapter,
            verseNumber: item.verse.number,
            translation: item.verse.text,
            historicalContext: `Hebrew scripture in ${b.name}, Chapter ${item.chapter}.`,
            classicalCommentary: item.verse.commentary
              ? `Jamieson-Fausset-Brown: ${item.verse.commentary}`
              : undefined,
            translationEdition: 'World English Bible (WEB)',
            commentarySource: item.verse.commentary ? 'Jamieson-Fausset-Brown' : undefined,
            isAiAssistedContext: false,
          },
        });
      }
    }
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

  // 3. New Testament: Search all 27 books and all chapters
  const ntBooks = listBibleNtBooks();
  const ntMatches: { verse: ScriptureQAVerse; score: number }[] = [];
  for (const b of ntBooks) {
    const verses = getBibleNtBookVerses(b.id);
    for (const item of verses) {
      const fullText = `${item.verse.text} ${item.verse.commentary ?? ''}`;
      const score = scoreScriptureVerse(fullText, topicTerms, actionTerms);
      if (score >= 4) {
        ntMatches.push({
          score,
          verse: {
            id: `nt-${b.id}-${item.chapter}-${item.verse.number}`,
            tradition: 'bible-nt',
            book: b.name,
            bookId: b.id,
            chapter: item.chapter,
            verseNumber: item.verse.number,
            translation: item.verse.text,
            historicalContext: `Apostolic record in ${b.name}, Chapter ${item.chapter}.`,
            classicalCommentary: item.verse.commentary
              ? `Jamieson-Fausset-Brown: ${item.verse.commentary}`
              : undefined,
            translationEdition: 'World English Bible (WEB)',
            commentarySource: item.verse.commentary ? 'Jamieson-Fausset-Brown' : undefined,
            isAiAssistedContext: false,
          },
        });
      }
    }
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

  // 4. Rigveda: Search across all Mandalas
  const vedaBooks = listVedasBooks();
  const vedaMatches: { verse: ScriptureQAVerse; score: number }[] = [];
  for (const b of vedaBooks) {
    const verses = getVedasBookVerses(b.id);
    for (const item of verses) {
      const fullText = `${item.verse.text} ${item.verse.commentary ?? ''}`;
      const score = scoreScriptureVerse(fullText, topicTerms, actionTerms);
      if (score >= 3) {
        vedaMatches.push({
          score,
          verse: {
            id: `veda-${b.id}-${item.chapter}-${item.verse.number}`,
            tradition: 'vedas',
            book: b.name,
            bookId: b.id,
            chapter: item.chapter,
            verseNumber: item.verse.number,
            translation: item.verse.text,
            historicalContext: `Vedic hymn in ${b.name}, Hymn ${item.chapter}.`,
            classicalCommentary: item.verse.commentary,
            translationEdition: 'Ralph T.H. Griffith (1896)',
            commentarySource: item.verse.commentary ? 'Traditional Rigveda Exegesis' : undefined,
            isAiAssistedContext: false,
          },
        });
      }
    }
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

  return matchedTraditions;
}

/**
 * Main AI Scripture Inference Engine:
 * 1. Requests citation candidates from the protected server endpoint.
 * 2. Hydrates and cross-checks every citation against local verified databases.
 * 3. Merges and supplements missing canons from exhaustive internal search.
 */
export async function askAIScriptureInquiry(
  query: string,
  options: { allowRemote?: boolean; signal?: AbortSignal } = {},
): Promise<ScriptureInquiryResult> {
  // AI returns candidate citations only. Every displayed verse is still hydrated
  // from the bundled scripture data below.
  const aiRaw = options.allowRemote === false ? null : await callLLMEndpoint(query, options.signal);

  if (aiRaw && Array.isArray(aiRaw.traditions) && aiRaw.traditions.length > 0) {
    const hydratedTraditions: TraditionGroup[] = [];

    for (const group of aiRaw.traditions) {
      const canonicalKey = normalizeTraditionKey(group.tradition) || group.tradition;
      const verifiedVerses = hydrateAndVerifyTraditionVerses(canonicalKey, group.citations || []);
      if (verifiedVerses.length > 0) {
        hydratedTraditions.push({
          tradition: canonicalKey,
          traditionName: group.traditionName || canonicalKey,
          subtitle: group.subtitle || 'Scriptural references regarding your inquiry',
          verses: verifiedVerses,
        });
      }
    }

    // Step 3: Cross-check coverage across traditions
    // If a major tradition had 0 citations from the LLM, supplement from internal search
    if (hydratedTraditions.length > 0) {
      const coveredTraditions = new Set(hydratedTraditions.map((t) => t.tradition));
      if (
        !coveredTraditions.has('quran') ||
        !coveredTraditions.has('torah') ||
        !coveredTraditions.has('bible-nt') ||
        !coveredTraditions.has('vedas')
      ) {
        const supplementalTraditions = searchInternalScriptureDatasets(query);
        for (const supp of supplementalTraditions) {
          if (!coveredTraditions.has(supp.tradition)) {
            hydratedTraditions.push(supp);
          }
        }
      }

      return {
        id: `ai-${Date.now()}`,
        question: query,
        shortTitle: query.length > 32 ? `${query.slice(0, 32)}...` : query,
        topicBackground: `AI-guided citation discovery for "${query}". The passages below are verified against Lamplight's bundled scripture texts.`,
        traditions: hydratedTraditions,
        isCurated: false,
        modelVersion: 'openai/gpt-oss-20b',
      };
    }
  }

  // Step 4: Exhaustive Offline Scripture Engine (Guaranteed zero-drop fallback)
  const matchedTraditions = searchInternalScriptureDatasets(query);

  return {
    id: `dyn-${Date.now()}`,
    question: query,
    shortTitle: query.length > 32 ? `${query.slice(0, 32)}...` : query,
    topicBackground: `Comparative scriptural passages examining "${query}". Select a tradition below to examine primary verses and classical commentary without verdicts.`,
    traditions: matchedTraditions,
    isCurated: false,
    modelVersion: 'local-canonical-search',
  };
}
