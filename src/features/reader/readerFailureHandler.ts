export type ReaderFailureCode =
  | 'missing_download'
  | 'network_failure'
  | 'malformed_epub'
  | 'empty_chapters'
  | 'translation_failure'
  | 'pagination_failure'
  | 'unsupported_format'
  | 'unknown';

export type ReaderRecoveryActionType =
  | 'retry'
  | 'redownload'
  | 'choose_file'
  | 'report_issue'
  | 'library'
  | 'reset_typography';

export interface ReaderRecoveryAction {
  type: ReaderRecoveryActionType;
  label: string;
}

export interface ReaderFailureDetails {
  code: ReaderFailureCode;
  title: string;
  message: string;
  primaryAction: ReaderRecoveryAction;
  secondaryAction: ReaderRecoveryAction;
  reportContext?: {
    code: ReaderFailureCode;
    bookId: string;
    isCustomEpub: boolean;
  };
}

export interface ClassifyErrorContext {
  bookId: string;
  isCustomEpub?: boolean;
  hasTextUrl?: boolean;
}

/**
 * Classifies an unknown reader exception into a strongly-typed failure state
 * with deterministic recovery actions per FULLAPP §8.6.
 *
 * Ensures error logging isolates codes rather than raw book or user text.
 */
export function classifyReaderError(
  error: unknown,
  context: ClassifyErrorContext,
): ReaderFailureDetails {
  const raw = error instanceof Error ? error.message.toLowerCase() : String(error ?? '').toLowerCase();
  const errorName = error instanceof Error ? error.name : '';
  const isCustomEpub = Boolean(context.isCustomEpub || context.bookId.startsWith('custom-') || !context.hasTextUrl);

  // 1. Unsupported format (README stubs / non-literary text / BookFormatError)
  if (
    errorName === 'BookFormatError' ||
    raw.includes('unsupported format') ||
    raw.includes('not a gutenberg text') ||
    raw.includes('not an epub')
  ) {
    return {
      code: 'unsupported_format',
      title: 'Book Edition Unavailable',
      message: 'This title has no readable text edition available in our catalog.',
      primaryAction: { type: 'library', label: 'Return to Library' },
      secondaryAction: { type: 'report_issue', label: 'Report Issue' },
      reportContext: { code: 'unsupported_format', bookId: context.bookId, isCustomEpub },
    };
  }

  // 2. Missing download / file not found in local cache
  if (
    raw.includes('enoent') ||
    raw.includes('file not found') ||
    raw.includes('missing download') ||
    raw.includes('does not exist') ||
    raw.includes('not cached')
  ) {
    return {
      code: 'missing_download',
      title: 'Book Not Downloaded',
      message: 'The cached text for this book was removed or is missing from device storage.',
      primaryAction: { type: 'redownload', label: 'Download Book' },
      secondaryAction: { type: 'library', label: 'Return to Library' },
      reportContext: { code: 'missing_download', bookId: context.bookId, isCustomEpub },
    };
  }

  // 3. Network failure / connection timeout / offline
  if (
    raw.includes('network') ||
    raw.includes('fetch') ||
    raw.includes('failed to download') ||
    raw.includes('timeout') ||
    raw.includes('timed out') ||
    raw.includes('offline') ||
    raw.includes('connection refused')
  ) {
    return {
      code: 'network_failure',
      title: 'Connection Error',
      message: 'Could not connect to download this book. Please check your internet connection.',
      primaryAction: { type: 'retry', label: 'Retry Download' },
      secondaryAction: { type: 'library', label: 'Return to Library' },
      reportContext: { code: 'network_failure', bookId: context.bookId, isCustomEpub },
    };
  }

  // 4. Malformed EPUB or corrupted archive
  if (
    raw.includes('epub') ||
    raw.includes('zip') ||
    raw.includes('corrupt') ||
    raw.includes('archive') ||
    raw.includes('manifest') ||
    raw.includes('spine')
  ) {
    return {
      code: 'malformed_epub',
      title: isCustomEpub ? 'Corrupted EPUB File' : 'Book File Error',
      message: isCustomEpub
        ? 'This EPUB file could not be unzipped or read. You can choose another file or re-import it.'
        : 'This book file could not be parsed. Try re-downloading to rebuild the cached copy.',
      primaryAction: isCustomEpub
        ? { type: 'choose_file', label: 'Choose File Again' }
        : { type: 'redownload', label: 'Re-download Book' },
      secondaryAction: { type: 'report_issue', label: 'Report Issue' },
      reportContext: { code: 'malformed_epub', bookId: context.bookId, isCustomEpub },
    };
  }

  // 5. Empty chapters / no readable prose extracted
  if (
    raw.includes('empty chapter') ||
    raw.includes('zero chapter') ||
    raw.includes('no readable chapter') ||
    raw.includes('no chapters') ||
    raw.includes('missing content')
  ) {
    return {
      code: 'empty_chapters',
      title: 'No Readable Content',
      message: 'The book was loaded but contains no readable chapters or text sections.',
      primaryAction: { type: 'redownload', label: 'Re-download' },
      secondaryAction: { type: 'report_issue', label: 'Report Issue' },
      reportContext: { code: 'empty_chapters', bookId: context.bookId, isCustomEpub },
    };
  }

  // 6. Pagination failure
  if (
    raw.includes('paginate') ||
    raw.includes('pagination') ||
    raw.includes('glyph') ||
    raw.includes('layout') ||
    raw.includes('measurement')
  ) {
    return {
      code: 'pagination_failure',
      title: 'Page Layout Error',
      message: 'We were unable to lay out the pages with the current font and scale settings.',
      primaryAction: { type: 'reset_typography', label: 'Reset Typography' },
      secondaryAction: { type: 'library', label: 'Return to Library' },
      reportContext: { code: 'pagination_failure', bookId: context.bookId, isCustomEpub },
    };
  }

  // 7. Translation failure
  if (
    raw.includes('translate') ||
    raw.includes('translation') ||
    raw.includes('interlinear')
  ) {
    return {
      code: 'translation_failure',
      title: 'Translation Unavailable',
      message: 'Interlinear translation could not be generated for this passage.',
      primaryAction: { type: 'retry', label: 'Retry Translation' },
      secondaryAction: { type: 'library', label: 'Read in Original' },
      reportContext: { code: 'translation_failure', bookId: context.bookId, isCustomEpub },
    };
  }

  // 8. Unknown fallback
  return {
    code: 'unknown',
    title: 'Unable to Prepare Book',
    message: 'This book could not be prepared right now. Please try again.',
    primaryAction: { type: 'retry', label: 'Try Again' },
    secondaryAction: { type: 'library', label: 'Return to Library' },
    reportContext: { code: 'unknown', bookId: context.bookId, isCustomEpub },
  };
}
