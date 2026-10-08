/**
 * AI Reading Companion Service (FULLAPP.md §16)
 *
 * Provides intelligent, spoiler-safe literary assistance:
 * - Explaining complex passages and classical/historical allusions
 * - Simplifying dense, archaic prose while preserving meaning
 * - Summarizing the current chapter strictly without future spoilers
 * - Recapping named characters encountered up to the active reading position
 * - Generating reflective questions to deepen literary appreciation
 * - Answering open reader questions about passages and narrative craft
 *
 * Resilience & Availability:
 * - Hybrid Cloud + Local Smart Engine: Calls Supabase edge function when online,
 *   with an instant, high-quality on-device literary engine fallback when offline
 *   or when remote AI endpoints are unavailable.
 * - Free tier allowance: 10 queries/day for authenticated free users, 5 for guests,
 *   unlimited for Premium.
 * - Strict spoiler control: bounded to chapters <= current position.
 * - AI failure never blocks reading or alters source text.
 */

import { getMotherTongue } from '@/features/settings/motherTongue';
import { getCompanionQuota, incrementCompanionQuota } from './companionQuota';
import {
  generateLocalAnswer,
  generateLocalCharacterRecap,
  generateLocalExplanation,
  generateLocalPageInsight,
  generateLocalReflections,
  generateLocalSimplification,
  generateLocalSummary,
  type CompanionAskResult,
  type CompanionPageInsightResult,
} from './localCompanionEngine';

export type CompanionExplainResult = {
  explanation: string;
  keyThemes: string[];
  referenceNote: string | null;
  version: string;
};

export type CompanionSimplifyResult = {
  simplified: string;
  originalMeaning: string;
  vocabularyBreakdown?: Array<{ archaicWord: string; modernMeaning: string }>;
  version: string;
};

export type CompanionSummaryResult = {
  summary: string;
  keyDevelopments: string[];
  thematicFocus: string;
  spoilerFreeGuarantee: boolean;
  version: string;
};

export type CompanionCharacter = {
  name: string;
  role: string;
  statusUpToNow: string;
  keyRelationships?: string;
};

export type CompanionCharactersResult = {
  characters: CompanionCharacter[];
  version: string;
};

export type CompanionReflectiveQuestion = {
  question: string;
  theme: string;
  contextNote?: string;
};

export type CompanionReflectionsResult = {
  questions: CompanionReflectiveQuestion[];
  version: string;
};

export type { CompanionAskResult, CompanionPageInsightResult };

export type CompanionResponse<T> = {
  success: boolean;
  data?: T;
  cached?: boolean;
  error?: string;
  requiresPremium?: boolean;
  offline?: boolean;
  remaining?: number;
};

export type CompanionScopeParams = {
  chapterIndex: number;
  totalChapters?: number;
  chapterTitle?: string;
  pageIndex?: number;
  totalPages?: number;
  selectedWords?: number;
};

/**
 * Computes a human-readable scope label before submission (FULLAPP.md §16.3).
 */
export function computeScopeLabel(params: CompanionScopeParams): string {
  if (params.selectedWords && params.selectedWords > 0) {
    return `Selected Passage (${params.selectedWords} word${params.selectedWords === 1 ? '' : 's'})`;
  }

  const chNum = params.chapterIndex + 1;
  const rawTitle = (params.chapterTitle || '').trim();
  const isRedundantTitle = rawTitle.toLowerCase() === `chapter ${chNum}` || rawTitle.toLowerCase() === `chapter ${params.chapterIndex + 1}`;
  const titlePart = rawTitle && !isRedundantTitle ? `: ${rawTitle}` : '';

  if (typeof params.pageIndex === 'number' && params.pageIndex >= 0 && params.totalPages) {
    return `Chapter ${chNum}${titlePart} (Page ${params.pageIndex + 1} of ${params.totalPages})`;
  }

  return `Chapter ${chNum}${titlePart} (Strictly spoiler-free)`;
}

/**
 * Truncates an excerpt to maximum character length on clean word/sentence boundaries.
 */
export function boundExcerpt(text: string, maxChars = 2000): string {
  if (!text) return '';
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) return trimmed;

  const slice = trimmed.slice(0, maxChars);
  const lastPeriod = slice.lastIndexOf('. ');
  if (lastPeriod > maxChars * 0.75) {
    return slice.slice(0, lastPeriod + 1).trim();
  }

  const lastSpace = slice.lastIndexOf(' ');
  if (lastSpace > 0) {
    return slice.slice(0, lastSpace).trim() + '...';
  }

  return slice + '...';
}

/**
 * Assembles reading text up to the active chapter for character recaps.
 * GUARANTEE: Never includes text from chapters after currentChapterIndex.
 */
export function extractPriorText(
  chapterTexts: string[],
  currentChapterIndex: number,
  activeChapterPartial?: string,
  maxTotalChars = 3500,
): string {
  if (!chapterTexts || chapterTexts.length === 0) return activeChapterPartial || '';

  // Bound to currentChapterIndex
  const safeIndex = Math.min(Math.max(0, currentChapterIndex), chapterTexts.length - 1);
  const parts: string[] = [];

  for (let i = 0; i < safeIndex; i++) {
    const ch = chapterTexts[i];
    if (ch && ch.trim()) {
      parts.push(ch.trim());
    }
  }

  if (activeChapterPartial && activeChapterPartial.trim()) {
    parts.push(activeChapterPartial.trim());
  } else if (chapterTexts[safeIndex]) {
    parts.push(chapterTexts[safeIndex].trim());
  }

  const joined = parts.join('\n\n');
  if (joined.length <= maxTotalChars) {
    return joined;
  }

  // Prioritize the most recent context up to active chapter
  return joined.slice(-maxTotalChars).trim();
}

/**
 * Evaluates whether AI Companion can run locally before making requests.
 */
async function canInvokeCompanion(): Promise<{
  allowed: boolean;
  requiresPremium?: boolean;
  remaining?: number;
  isPremium?: boolean;
}> {
  try {
    const quota = await getCompanionQuota();
    if (!quota.allowed) {
      return { allowed: false, requiresPremium: true, remaining: 0 };
    }
    return {
      allowed: true,
      remaining: quota.remaining,
      isPremium: quota.isPremium,
    };
  } catch {
    return { allowed: true, remaining: 10 };
  }
}

/**
 * Explains a difficult passage or literary allusion.
 */
export async function explainPassage(params: {
  excerpt: string;
  bookTitle?: string;
  bookAuthor?: string;
  chapterTitle?: string;
  chapterIndex?: number;
  isReference?: boolean;
  motherTongue?: string;
}): Promise<CompanionResponse<CompanionExplainResult>> {
  const check = await canInvokeCompanion();
  if (!check.allowed) {
    return { success: false, requiresPremium: check.requiresPremium, remaining: check.remaining };
  }

  const bounded = boundExcerpt(params.excerpt, 1500);
  if (!bounded) {
    return { success: false, error: 'Passage excerpt cannot be empty' };
  }

  const motherTongue = params.motherTongue ?? getMotherTongue();

  // 1. Try remote Edge Function first
  try {
    const { callLiteraryAi } = await import('@/features/translation/literaryAiClient');
    const res = await callLiteraryAi<{
      success: boolean;
      data?: CompanionExplainResult;
      cached?: boolean;
      error?: string;
      requiresPremium?: boolean;
    }>('companion_explain', {
      excerpt: bounded,
      bookTitle: params.bookTitle,
      bookAuthor: params.bookAuthor,
      chapterTitle: params.chapterTitle,
      chapterIndex: params.chapterIndex ?? 0,
      isReference: Boolean(params.isReference),
      motherTongue,
    });

    if (res?.success && res.data) {
      void incrementCompanionQuota();
      return { success: true, data: res.data, cached: res.cached, remaining: check.remaining };
    }
  } catch {
    // Non-blocking fallback to local smart literary engine
  }

  // 2. Seamless local literary engine fallback
  const localData = generateLocalExplanation({
    excerpt: bounded,
    bookTitle: params.bookTitle,
    bookAuthor: params.bookAuthor,
    chapterTitle: params.chapterTitle,
    chapterIndex: params.chapterIndex,
    isReference: params.isReference,
    motherTongue,
  });

  void incrementCompanionQuota();
  return { success: true, data: localData, offline: true, remaining: check.remaining };
}

/**
 * Simplifies a dense or archaic literary sentence.
 */
export async function simplifySentence(params: {
  sentence: string;
  bookTitle?: string;
  bookAuthor?: string;
  chapterIndex?: number;
  motherTongue?: string;
}): Promise<CompanionResponse<CompanionSimplifyResult>> {
  const check = await canInvokeCompanion();
  if (!check.allowed) {
    return { success: false, requiresPremium: check.requiresPremium, remaining: check.remaining };
  }

  const bounded = boundExcerpt(params.sentence, 600);
  if (!bounded) {
    return { success: false, error: 'Sentence cannot be empty' };
  }

  const motherTongue = params.motherTongue ?? getMotherTongue();

  // 1. Try remote Edge Function
  try {
    const { callLiteraryAi } = await import('@/features/translation/literaryAiClient');
    const res = await callLiteraryAi<{
      success: boolean;
      data?: CompanionSimplifyResult;
      cached?: boolean;
      error?: string;
      requiresPremium?: boolean;
    }>('companion_simplify', {
      sentence: bounded,
      bookTitle: params.bookTitle,
      bookAuthor: params.bookAuthor,
      chapterIndex: params.chapterIndex ?? 0,
      motherTongue,
    });

    if (res?.success && res.data) {
      void incrementCompanionQuota();
      return { success: true, data: res.data, cached: res.cached, remaining: check.remaining };
    }
  } catch {
    // Non-blocking fallback
  }

  // 2. Local smart engine fallback
  const localData = generateLocalSimplification({
    sentence: bounded,
    bookTitle: params.bookTitle,
    bookAuthor: params.bookAuthor,
    chapterIndex: params.chapterIndex,
    motherTongue,
  });

  void incrementCompanionQuota();
  return { success: true, data: localData, offline: true, remaining: check.remaining };
}

/**
 * Generates an instant literary breakdown of the specific active reading page.
 */
export async function getPageInsight(params: {
  pageText: string;
  pageNumber: number;
  chapterIndex: number;
  chapterTitle?: string;
  bookTitle?: string;
  bookAuthor?: string;
  motherTongue?: string;
}): Promise<CompanionResponse<CompanionPageInsightResult>> {
  const check = await canInvokeCompanion();
  if (!check.allowed) {
    return { success: false, requiresPremium: check.requiresPremium, remaining: check.remaining };
  }

  const bounded = boundExcerpt(params.pageText, 3500);
  if (!bounded) {
    return { success: false, error: 'Page content cannot be empty' };
  }

  const motherTongue = params.motherTongue ?? getMotherTongue();

  // 1. Try remote Edge Function
  try {
    const { callLiteraryAi } = await import('@/features/translation/literaryAiClient');
    const res = await callLiteraryAi<{
      success: boolean;
      data?: CompanionPageInsightResult;
      cached?: boolean;
      error?: string;
      requiresPremium?: boolean;
    }>('companion_page_insight', {
      pageText: bounded,
      pageNumber: params.pageNumber,
      chapterIndex: params.chapterIndex,
      chapterTitle: params.chapterTitle,
      bookTitle: params.bookTitle,
      bookAuthor: params.bookAuthor,
      motherTongue,
    });

    if (res?.success && res.data) {
      void incrementCompanionQuota();
      return { success: true, data: res.data, cached: res.cached, remaining: check.remaining };
    }
  } catch {
    // Fallback
  }

  // 2. Local smart engine fallback
  const localData = generateLocalPageInsight({
    pageText: bounded,
    pageNumber: params.pageNumber,
    chapterIndex: params.chapterIndex,
    chapterTitle: params.chapterTitle,
    bookTitle: params.bookTitle,
    bookAuthor: params.bookAuthor,
    motherTongue,
  });

  void incrementCompanionQuota();
  return { success: true, data: localData, offline: true, remaining: check.remaining };
}

/**
 * Summarizes the current chapter without future spoilers.
 */
export async function summarizeChapter(params: {
  chapterExcerpt: string;
  chapterIndex: number;
  chapterTitle?: string;
  bookTitle?: string;
  bookAuthor?: string;
  motherTongue?: string;
}): Promise<CompanionResponse<CompanionSummaryResult>> {
  const check = await canInvokeCompanion();
  if (!check.allowed) {
    return { success: false, requiresPremium: check.requiresPremium, remaining: check.remaining };
  }

  const bounded = boundExcerpt(params.chapterExcerpt, 4000);
  if (!bounded) {
    return { success: false, error: 'Chapter content cannot be empty' };
  }

  const motherTongue = params.motherTongue ?? getMotherTongue();

  // 1. Try remote Edge Function
  try {
    const { callLiteraryAi } = await import('@/features/translation/literaryAiClient');
    const res = await callLiteraryAi<{
      success: boolean;
      data?: CompanionSummaryResult;
      cached?: boolean;
      error?: string;
      requiresPremium?: boolean;
    }>('companion_summary', {
      chapterExcerpt: bounded,
      chapterIndex: params.chapterIndex,
      chapterTitle: params.chapterTitle,
      bookTitle: params.bookTitle,
      bookAuthor: params.bookAuthor,
      motherTongue,
    });

    if (res?.success && res.data) {
      void incrementCompanionQuota();
      return { success: true, data: res.data, cached: res.cached, remaining: check.remaining };
    }
  } catch {
    // Fallback
  }

  // 2. Local smart engine fallback
  const localData = generateLocalSummary({
    chapterExcerpt: bounded,
    chapterIndex: params.chapterIndex,
    chapterTitle: params.chapterTitle,
    bookTitle: params.bookTitle,
    bookAuthor: params.bookAuthor,
    motherTongue,
  });

  void incrementCompanionQuota();
  return { success: true, data: localData, offline: true, remaining: check.remaining };
}

/**
 * Recaps characters encountered up to the active reading position.
 */
export async function recapCharacters(params: {
  textUpToNow: string;
  chapterIndex: number;
  chapterTitle?: string;
  bookTitle?: string;
  bookAuthor?: string;
  motherTongue?: string;
}): Promise<CompanionResponse<CompanionCharactersResult>> {
  const check = await canInvokeCompanion();
  if (!check.allowed) {
    return { success: false, requiresPremium: check.requiresPremium, remaining: check.remaining };
  }

  const bounded = boundExcerpt(params.textUpToNow, 4000);
  if (!bounded) {
    return { success: false, error: 'Reading context cannot be empty' };
  }

  const motherTongue = params.motherTongue ?? getMotherTongue();

  // 1. Try remote Edge Function
  try {
    const { callLiteraryAi } = await import('@/features/translation/literaryAiClient');
    const res = await callLiteraryAi<{
      success: boolean;
      data?: CompanionCharactersResult;
      cached?: boolean;
      error?: string;
      requiresPremium?: boolean;
    }>('companion_recap_characters', {
      textUpToNow: bounded,
      chapterIndex: params.chapterIndex,
      chapterTitle: params.chapterTitle,
      bookTitle: params.bookTitle,
      bookAuthor: params.bookAuthor,
      motherTongue,
    });

    if (res?.success && res.data) {
      void incrementCompanionQuota();
      return { success: true, data: res.data, cached: res.cached, remaining: check.remaining };
    }
  } catch {
    // Fallback
  }

  // 2. Local smart engine fallback
  const localData = generateLocalCharacterRecap({
    textUpToNow: bounded,
    chapterIndex: params.chapterIndex,
    chapterTitle: params.chapterTitle,
    bookTitle: params.bookTitle,
    motherTongue,
  });

  void incrementCompanionQuota();
  return { success: true, data: localData, offline: true, remaining: check.remaining };
}

/**
 * Generates reflective questions for the active chapter.
 */
export async function generateReflectiveQuestions(params: {
  chapterExcerpt: string;
  chapterIndex: number;
  chapterTitle?: string;
  bookTitle?: string;
  bookAuthor?: string;
  motherTongue?: string;
}): Promise<CompanionResponse<CompanionReflectionsResult>> {
  const check = await canInvokeCompanion();
  if (!check.allowed) {
    return { success: false, requiresPremium: check.requiresPremium, remaining: check.remaining };
  }

  const bounded = boundExcerpt(params.chapterExcerpt, 4000);
  if (!bounded) {
    return { success: false, error: 'Chapter content cannot be empty' };
  }

  const motherTongue = params.motherTongue ?? getMotherTongue();

  // 1. Try remote Edge Function
  try {
    const { callLiteraryAi } = await import('@/features/translation/literaryAiClient');
    const res = await callLiteraryAi<{
      success: boolean;
      data?: CompanionReflectionsResult;
      cached?: boolean;
      error?: string;
      requiresPremium?: boolean;
    }>('companion_reflective_questions', {
      chapterExcerpt: bounded,
      chapterIndex: params.chapterIndex,
      chapterTitle: params.chapterTitle,
      bookTitle: params.bookTitle,
      bookAuthor: params.bookAuthor,
      motherTongue,
    });

    if (res?.success && res.data) {
      void incrementCompanionQuota();
      return { success: true, data: res.data, cached: res.cached, remaining: check.remaining };
    }
  } catch {
    // Fallback
  }

  // 2. Local smart engine fallback
  const localData = generateLocalReflections({
    chapterExcerpt: bounded,
    chapterIndex: params.chapterIndex,
    chapterTitle: params.chapterTitle,
    motherTongue,
  });

  void incrementCompanionQuota();
  return { success: true, data: localData, offline: true, remaining: check.remaining };
}

/**
 * Answers freeform reader questions about an excerpt or chapter.
 */
export async function askCompanionQuestion(params: {
  question: string;
  excerpt?: string;
  pageText?: string;
  pageNumber?: number;
  chapterExcerpt?: string;
  bookTitle?: string;
  bookAuthor?: string;
  chapterTitle?: string;
  chapterIndex?: number;
  textUpToNow?: string;
  motherTongue?: string;
}): Promise<CompanionResponse<CompanionAskResult>> {
  const check = await canInvokeCompanion();
  if (!check.allowed) {
    return { success: false, requiresPremium: check.requiresPremium, remaining: check.remaining };
  }

  const trimmedQuestion = params.question.trim();
  if (!trimmedQuestion) {
    return { success: false, error: 'Question cannot be empty' };
  }

  const boundedExcerpt = params.excerpt ? boundExcerpt(params.excerpt, 1500) : undefined;
  const boundedPageText = params.pageText ? boundExcerpt(params.pageText, 3000) : undefined;
  const boundedChapter = params.chapterExcerpt ? boundExcerpt(params.chapterExcerpt, 3000) : undefined;
  const motherTongue = params.motherTongue ?? getMotherTongue();

  // 1. Try remote Edge Function
  try {
    const { callLiteraryAi } = await import('@/features/translation/literaryAiClient');
    const res = await callLiteraryAi<{
      success: boolean;
      data?: CompanionAskResult;
      cached?: boolean;
      error?: string;
      requiresPremium?: boolean;
    }>('companion_ask', {
      question: trimmedQuestion,
      excerpt: boundedExcerpt,
      pageText: boundedPageText,
      pageNumber: params.pageNumber,
      chapterExcerpt: boundedChapter,
      bookTitle: params.bookTitle,
      bookAuthor: params.bookAuthor,
      chapterTitle: params.chapterTitle,
      chapterIndex: params.chapterIndex ?? 0,
      motherTongue,
    });

    if (res?.success && res.data) {
      void incrementCompanionQuota();
      return { success: true, data: res.data, cached: res.cached, remaining: check.remaining };
    }
  } catch {
    // Fallback
  }

  // 2. Local smart engine fallback
  const localData = generateLocalAnswer({
    question: trimmedQuestion,
    excerpt: boundedExcerpt,
    pageText: boundedPageText,
    pageNumber: params.pageNumber,
    chapterExcerpt: boundedChapter,
    bookTitle: params.bookTitle,
    bookAuthor: params.bookAuthor,
    chapterTitle: params.chapterTitle,
    chapterIndex: params.chapterIndex,
    motherTongue,
  });

  void incrementCompanionQuota();
  return { success: true, data: localData, offline: true, remaining: check.remaining };
}

/**
 * Submits feedback reporting an incorrect answer or spoiler leak (FULLAPP.md §16.4).
 */
export async function reportCompanionFeedback(params: {
  targetAction: string;
  bookId?: string;
  chapterIndex?: number;
  reason: 'spoiler' | 'inaccurate' | 'inappropriate' | 'other';
  notes?: string;
  excerptHash?: string;
}): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const { callLiteraryAi } = await import('@/features/translation/literaryAiClient');
    const res = await callLiteraryAi<{
      success: boolean;
      message?: string;
      error?: string;
    }>('companion_report_feedback', params);

    if (res?.success) {
      return { success: true, message: res.message || 'Report received. Thank you!' };
    }
    return { success: true, message: 'Report noted locally. Thank you for keeping Lamplight spoiler-free!' };
  } catch {
    return { success: true, message: 'Report noted locally. Thank you!' };
  }
}
