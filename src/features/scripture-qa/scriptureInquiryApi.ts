import {
  CURATED_SCRIPTURE_QA,
  type CuratedScriptureQA,
  type ScriptureQAVerse,
  type TraditionGroup,
  type TraditionKey,
} from './curatedScriptureQA';
import { askAIScriptureInquiry } from './aiScriptureEngine';
import { getCachedInquiry } from './inquiryCache';
import { checkAIRateLimit, recordAIRequest } from './inquiryRateLimit';
import { ScriptureInquiryRateLimitError } from './scriptureInquiryRemote';
import {
  matchCitationToCuratedQA,
  resolveDirectScriptureVerse,
  normalizeCitationQuery,
} from './citationResolver';
import {
  findCriticalControversy,
  convertControversyToInquiryResult,
  type CriticalControversyVerse,
} from './criticalControversies';

export type ScriptureInquiryResult = {
  id: string;
  question: string;
  shortTitle: string;
  topicBackground: string;
  traditions: TraditionGroup[];
  isCurated: boolean;
  isFromCache?: boolean;
  rateLimitNote?: string;
  initialTradition?: TraditionKey;
  criticalControversy?: CriticalControversyVerse;
  modelVersion?: string;
};

/**
 * Strict, high-precision matcher for curated questions.
 * Only matches if the query explicitly targets the specific, distinct subject matter.
 * Never matches on generic words like "what", "does", "say", "about", "islam", "religion".
 */
export function matchCuratedQA(query: string): { qa: CuratedScriptureQA; initialTradition?: TraditionKey } | null {
  const clean = query.trim().toLowerCase();
  if (!clean) return null;

  // 1. Direct scripture citation matching (e.g. "1 Timothy 2:12", "1 Cor 14:33b-35", "Ephesians 5:22", "1 Peter 3:7")
  const citationMatch = matchCitationToCuratedQA(query);
  if (citationMatch) {
    return citationMatch;
  }

  // 2. Exact or near-exact match against curated questions, titles, or explicit search keywords
  const normalized = normalizeCitationQuery(clean);
  for (const item of CURATED_SCRIPTURE_QA) {
    const qLower = item.question.toLowerCase();
    const titleLower = item.shortTitle.toLowerCase();
    if (clean === qLower || clean.includes(qLower)) {
      return { qa: item };
    }
    // Match substring only if user typed a substantial phrase of at least 25 characters and 4 words
    if (clean.length >= 25 && clean.split(/\s+/).length >= 4 && qLower.includes(clean)) {
      return { qa: item };
    }
    if (clean.includes(titleLower)) {
      return { qa: item };
    }
    // Check keywords with normalized citation matching
    for (const kw of item.searchKeywords) {
      const kwClean = kw.toLowerCase();
      if (clean === kwClean || normalized === kwClean || clean.includes(kwClean) || normalized.includes(kwClean)) {
        return { qa: item };
      }
    }
  }

  // 2. Strict topic-specific semantic rules:
  // Marital conduct / Domestic discipline / Beating women / Verse 4:34
  const hasDomesticDiscipline =
    (clean.includes('beat') ||
      clean.includes('hit') ||
      clean.includes('strike') ||
      clean.includes('daraba') ||
      clean.includes('violence') ||
      clean.includes('abuse') ||
      clean.includes('discipline') ||
      clean.includes('harm') ||
      clean.includes('oppress') ||
      clean.includes('4:34')) &&
    (clean.includes('women') ||
      clean.includes('woman') ||
      clean.includes('wife') ||
      clean.includes('wives') ||
      clean.includes('female'));

  if (hasDomesticDiscipline) {
    const item = CURATED_SCRIPTURE_QA.find((q) => q.id === 'qa-marital-conduct');
    return item ? { qa: item } : null;
  }

  // Female-initiated divorce / Can women divorce their husbands
  const hasFemaleDivorce =
    (clean.includes('can women divorce') ||
      clean.includes('can a woman divorce') ||
      clean.includes('can wife divorce') ||
      clean.includes('women divorce') ||
      clean.includes('woman divorce') ||
      clean.includes('wife divorce') ||
      clean.includes('khula') ||
      clean.includes('khul') ||
      clean.includes('faskh') ||
      clean.includes('agunah') ||
      clean.includes('chained woman') ||
      ((clean.includes('divorce') ||
        clean.includes('dissolve') ||
        clean.includes('dissolution') ||
        clean.includes('leave') ||
        clean.includes('separate')) &&
        (clean.includes('women') ||
          clean.includes('woman') ||
          clean.includes('wife') ||
          clean.includes('female')) &&
        (clean.includes('husband') ||
          clean.includes('husbands') ||
          clean.includes('man') ||
          clean.includes('men'))));

  // Divorce & Marital Dissolution (General & Female Initiative)
  const hasDivorce =
    clean.includes('divorce') ||
    clean.includes('talaq') ||
    clean.includes('remarriage') ||
    clean.includes('remarry') ||
    clean.includes('dissolution') ||
    clean.includes('separate from wife') ||
    clean.includes('separate from husband') ||
    clean.includes('sefer keritut') ||
    clean.includes('iddah') ||
    clean.includes('porneia');

  if (hasFemaleDivorce || hasDivorce) {
    const item = CURATED_SCRIPTURE_QA.find((q) => q.id === 'qa-female-divorce');
    if (item) return { qa: item };
  }

  // Rape & 4 witnesses rule
  const hasRapeWitness =
    (clean.includes('rape') || clean.includes('rapist') || clean.includes('sexual assault') || clean.includes('qadhf')) &&
    (clean.includes('witness') || clean.includes('witnesses') || clean.includes('4') || clean.includes('four') || clean.includes('punish'));

  if (hasRapeWitness) {
    const item = CURATED_SCRIPTURE_QA.find((q) => q.id === 'qa-rape-and-witnesses');
    return item ? { qa: item } : null;
  }

  // Women in leadership
  const hasLeadership =
    (clean.includes('lead') || clean.includes('leader') || clean.includes('leadership') || clean.includes('ruler') || clean.includes('govern') || clean.includes('preach') || clean.includes('speak in church') || clean.includes('deborah') || clean.includes('bilqis') || clean.includes('phoebe') || clean.includes('junia')) &&
    (clean.includes('women') || clean.includes('female'));

  if (hasLeadership) {
    const item = CURATED_SCRIPTURE_QA.find((q) => q.id === 'qa-women-leadership');
    return item ? { qa: item } : null;
  }

  // Non-combatants, civilians, women and children in war
  const hasCivilianWarfare =
    (clean.includes('kill') ||
      clean.includes('slay') ||
      clean.includes('harm') ||
      clean.includes('target') ||
      clean.includes('attack') ||
      clean.includes('permit') ||
      clean.includes('sanction') ||
      clean.includes('spare')) &&
    (clean.includes('civilian') ||
      clean.includes('civilians') ||
      clean.includes('non-combatant') ||
      clean.includes('non combatant') ||
      clean.includes('not fighting') ||
      clean.includes('innocent') ||
      clean.includes('amalek')) &&
    (clean.includes('war') ||
      clean.includes('battle') ||
      clean.includes('enemy') ||
      clean.includes('enemies') ||
      clean.includes('combat') ||
      clean.includes('fighter') ||
      clean.includes('fighters') ||
      clean.includes('soldiers') ||
      clean.includes('amalek'));

  const hasWomenChildrenWar =
    (clean.includes('women') ||
      clean.includes('child') ||
      clean.includes('children') ||
      clean.includes('infant') ||
      clean.includes('infants') ||
      clean.includes('baby') ||
      clean.includes('babies')) &&
    (clean.includes('war') ||
      clean.includes('battle') ||
      clean.includes('enemy') ||
      clean.includes('enemies') ||
      clean.includes('fighter') ||
      clean.includes('fighters') ||
      clean.includes('siege') ||
      clean.includes('amalek')) &&
    (clean.includes('kill') ||
      clean.includes('slay') ||
      clean.includes('strike') ||
      clean.includes('destroy') ||
      clean.includes('permit') ||
      clean.includes('not fighting'));

  if (hasCivilianWarfare || hasWomenChildrenWar) {
    const item = CURATED_SCRIPTURE_QA.find((q) => q.id === 'qa-killing-civilians-war');
    return item ? { qa: item } : null;
  }

  // Warfare & Peace
  const hasWarfare =
    clean.includes('jihad') ||
    clean.includes('holy war') ||
    clean.includes('sword verse') ||
    clean.includes('turn the other cheek') ||
    clean.includes('turn other cheek') ||
    ((clean.includes('war') || clean.includes('warfare') || clean.includes('violence')) &&
      (clean.includes('peace') ||
        clean.includes('infidels') ||
        clean.includes('non-believers')));

  if (hasWarfare) {
    const item = CURATED_SCRIPTURE_QA.find((q) => q.id === 'qa-warfare-peace');
    return item ? { qa: item } : null;
  }

  // No high-confidence curated match -> treat as a new question for the AI Engine
  return null;
}

/**
 * Main query resolver:
 * 1. Checks strict curated & citation matchers.
 * 2. If an arbitrary scripture citation is requested (e.g. John 3:16, Psalm 23:1), resolves offline directly from bundled assets.
 * 3. If no match, checks on-device cache.
 * 4. Novel questions route to the Groq AI Scripture Inference Engine.
 * Always preserves the exact question string the user asked!
 */
export async function queryScriptureInquiry(
  query: string,
  options: { signal?: AbortSignal } = {},
): Promise<ScriptureInquiryResult> {
  const trimmed = query.trim();
  if (!trimmed) {
    const defaultQA = CURATED_SCRIPTURE_QA[0];
    return {
      id: defaultQA.id,
      question: defaultQA.question,
      shortTitle: defaultQA.shortTitle,
      topicBackground: defaultQA.topicBackground,
      traditions: defaultQA.traditions,
      isCurated: true,
      modelVersion: 'curated-scholarly-archive',
    };
  }

  // 1. Critical Controversies Check (Highest priority: scholar-vetted critical passages with context status)
  const criticalMatch = findCriticalControversy(trimmed);
  if (criticalMatch) {
    const result = convertControversyToInquiryResult(criticalMatch);
    return { ...result, modelVersion: 'curated-critical-controversy' };
  }

  // 2. Strict Curated Check (Includes thematic questions and keyword mapping)
  const curatedMatch = matchCuratedQA(trimmed);
  if (curatedMatch) {
    const { qa, initialTradition } = curatedMatch;
    return {
      id: qa.id,
      question: trimmed.length >= 6 ? trimmed : qa.question,
      shortTitle: qa.shortTitle,
      topicBackground: qa.topicBackground,
      traditions: qa.traditions,
      isCurated: true,
      initialTradition,
      modelVersion: 'curated-scholarly-archive',
    };
  }

  // 3. Offline Scripture Citation Lookup for ANY Bible (OT/NT) or Quran passage
  const directVerseResult = resolveDirectScriptureVerse(trimmed);
  if (directVerseResult) {
    return { ...directVerseResult, modelVersion: 'local-canonical-verse' };
  }

  // 3. Check Device Persistent Cache (Instant Offline Load, Zero API Token Consumption)
  const cached = await getCachedInquiry(trimmed);
  if (cached) {
    return cached;
  }

  // 4. Novel / Unseen Question: Send to AI Scripture Inference Engine
  const rateLimit = checkAIRateLimit();
  if (!rateLimit.allowed) {
    const offlineResult = await askAIScriptureInquiry(trimmed, { allowRemote: false });
    offlineResult.rateLimitNote = rateLimit.adviceMessage;
    return offlineResult;
  }

  try {
    const aiResult = await askAIScriptureInquiry(trimmed, options);
    recordAIRequest();
    return aiResult;
  } catch (error) {
    if (error instanceof ScriptureInquiryRateLimitError) {
      const offlineResult = await askAIScriptureInquiry(trimmed, { allowRemote: false });
      offlineResult.rateLimitNote = `AI query cooldown active (${error.retryAfterSeconds}s remaining). Showing offline scripture matches instead.`;
      return offlineResult;
    }
    throw error;
  }
}
