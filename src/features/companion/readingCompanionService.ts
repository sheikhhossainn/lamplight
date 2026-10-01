/**
 * AI Reading Companion Service (FULLAPP.md §16)
 *
 * Provides intelligent, spoiler-safe literary assistance:
 * - Explaining complex passages and classical/historical allusions
 * - Simplifying dense, archaic prose while preserving meaning
 * - Summarizing the current chapter strictly without future spoilers
 * - Recapping named characters encountered up to the active reading position
 * - Generating reflective questions to deepen literary appreciation
 *
 * Rules:
 * - Gated on the `ai_companion` entitlement.
 * - Strict spoiler control: bounded to chapters <= current position.
 * - AI failure never blocks reading or alters source text.
 * - User feedback reporting for inaccuracies or spoilers.
 */

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

export type CompanionResponse<T> = {
  success: boolean;
  data?: T;
  cached?: boolean;
  error?: string;
  requiresPremium?: boolean;
  offline?: boolean;
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
 * Examples:
 * - "Selected Passage (32 words)"
 * - "Chapter 4: A Quiet Evening (Strictly spoiler-free)"
 * - "Reading Journey: Chapters 1 to 4 (Page 52 of 240)"
 */
export function computeScopeLabel(params: CompanionScopeParams): string {
  if (params.selectedWords && params.selectedWords > 0) {
    return `Selected Passage (${params.selectedWords} word${params.selectedWords === 1 ? '' : 's'})`;
  }

  const chNum = params.chapterIndex + 1;
  const titlePart = params.chapterTitle ? `: ${params.chapterTitle}` : '';

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

  // If text is larger than maxTotalChars, prioritize the most recent context
  // (the active chapter and immediately preceding chapters)
  return joined.slice(-maxTotalChars).trim();
}

/**
 * Evaluates whether AI Companion can run locally before making network requests.
 */
async function canInvokeCompanion(): Promise<{ allowed: boolean; requiresPremium?: boolean; offline?: boolean; error?: string }> {
  try {
    const { canUse } = await import('@/features/subscription/subscriptionState');
    if (!canUse('ai_companion')) {
      return { allowed: false, requiresPremium: true };
    }
  } catch {
    // In headless test runner without RN store
  }

  return { allowed: true };
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
}): Promise<CompanionResponse<CompanionExplainResult>> {
  const check = await canInvokeCompanion();
  if (!check.allowed) {
    return { success: false, requiresPremium: check.requiresPremium, offline: check.offline, error: check.error };
  }

  const bounded = boundExcerpt(params.excerpt, 1500);
  if (!bounded) {
    return { success: false, error: 'Passage excerpt cannot be empty' };
  }

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
    });

    if (res?.requiresPremium) {
      return { success: false, requiresPremium: true };
    }
    if (res?.success && res.data) {
      return { success: true, data: res.data, cached: res.cached };
    }
    return { success: false, error: res?.error || 'Unable to explain passage.' };
  } catch (err) {
    return { success: false, error: 'Network failure during companion request.' };
  }
}

/**
 * Simplifies a dense or archaic literary sentence.
 */
export async function simplifySentence(params: {
  sentence: string;
  bookTitle?: string;
  bookAuthor?: string;
  chapterIndex?: number;
}): Promise<CompanionResponse<CompanionSimplifyResult>> {
  const check = await canInvokeCompanion();
  if (!check.allowed) {
    return { success: false, requiresPremium: check.requiresPremium, offline: check.offline, error: check.error };
  }

  const bounded = boundExcerpt(params.sentence, 600);
  if (!bounded) {
    return { success: false, error: 'Sentence cannot be empty' };
  }

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
    });

    if (res?.requiresPremium) {
      return { success: false, requiresPremium: true };
    }
    if (res?.success && res.data) {
      return { success: true, data: res.data, cached: res.cached };
    }
    return { success: false, error: res?.error || 'Unable to simplify sentence.' };
  } catch (err) {
    return { success: false, error: 'Network failure during sentence simplification.' };
  }
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
}): Promise<CompanionResponse<CompanionSummaryResult>> {
  const check = await canInvokeCompanion();
  if (!check.allowed) {
    return { success: false, requiresPremium: check.requiresPremium, offline: check.offline, error: check.error };
  }

  const bounded = boundExcerpt(params.chapterExcerpt, 4000);
  if (!bounded) {
    return { success: false, error: 'Chapter content cannot be empty' };
  }

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
    });

    if (res?.requiresPremium) {
      return { success: false, requiresPremium: true };
    }
    if (res?.success && res.data) {
      return { success: true, data: res.data, cached: res.cached };
    }
    return { success: false, error: res?.error || 'Unable to summarize chapter.' };
  } catch (err) {
    return { success: false, error: 'Network failure during chapter summary.' };
  }
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
}): Promise<CompanionResponse<CompanionCharactersResult>> {
  const check = await canInvokeCompanion();
  if (!check.allowed) {
    return { success: false, requiresPremium: check.requiresPremium, offline: check.offline, error: check.error };
  }

  const bounded = boundExcerpt(params.textUpToNow, 4000);
  if (!bounded) {
    return { success: false, error: 'Reading context cannot be empty' };
  }

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
    });

    if (res?.requiresPremium) {
      return { success: false, requiresPremium: true };
    }
    if (res?.success && res.data) {
      return { success: true, data: res.data, cached: res.cached };
    }
    return { success: false, error: res?.error || 'Unable to recap characters.' };
  } catch (err) {
    return { success: false, error: 'Network failure during character recap.' };
  }
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
}): Promise<CompanionResponse<CompanionReflectionsResult>> {
  const check = await canInvokeCompanion();
  if (!check.allowed) {
    return { success: false, requiresPremium: check.requiresPremium, offline: check.offline, error: check.error };
  }

  const bounded = boundExcerpt(params.chapterExcerpt, 4000);
  if (!bounded) {
    return { success: false, error: 'Chapter content cannot be empty' };
  }

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
    });

    if (res?.requiresPremium) {
      return { success: false, requiresPremium: true };
    }
    if (res?.success && res.data) {
      return { success: true, data: res.data, cached: res.cached };
    }
    return { success: false, error: res?.error || 'Unable to generate reflection questions.' };
  } catch (err) {
    return { success: false, error: 'Network failure during questions generation.' };
  }
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
    return { success: false, error: res?.error || 'Could not submit report.' };
  } catch {
    return { success: false, error: 'Network failure while submitting report.' };
  }
}
