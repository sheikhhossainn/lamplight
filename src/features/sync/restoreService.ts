import { resolveReadingPositionConflict } from './syncTypes';

export type RestoreCategory = 'metadata' | 'positions' | 'learning' | 'books';
export type RestoreItemStatus = 'pending' | 'in_progress' | 'restored' | 'failed' | 'skipped';

export type RestoreItem = {
  id: string;
  label: string;
  category: RestoreCategory;
  status: RestoreItemStatus;
  detail?: string;
  errorMessage?: string;
  timestamp?: number;
};

export type RestoreSessionState = {
  stage: 'idle' | 'restoring_metadata' | 'restoring_learning' | 'restoring_books' | 'completed' | 'failed';
  totalCount: number;
  restoredCount: number;
  failedCount: number;
  items: RestoreItem[];
  startedAt: number;
  completedAt?: number;
  isPartialUsable: boolean;
};

export const RESTORE_STORAGE_KEY = 'restore_session_state';

/**
 * Evaluates whether an incoming cloud reading position should be restored,
 * guaranteeing that newer local progress is NEVER replaced by older cloud progress (FULLAPP §15.5 item 5).
 */
export function shouldRestoreCloudPosition(
  local: { percentComplete: number; updatedAt: number } | null | undefined,
  remote: { percentComplete: number; updatedAt: number },
): boolean {
  if (!local) return true;
  const resolution = resolveReadingPositionConflict(local, remote);
  return resolution.source === 'remote';
}

/**
 * Initializes a structured restore plan with dependency ordering (FULLAPP §15.5 item 2):
 * 1. Small metadata first (shelves, settings)
 * 2. Reading positions & goals
 * 3. Vocabulary, highlights, notes
 * 4. Book files (enqueued lazily or explicitly)
 */
export function createInitialRestorePlan(summary: {
  hasShelves: boolean;
  positionCount: number;
  savedWordCount: number;
  noteCount: number;
  bookCount: number;
  bookTitles?: Array<{ id: string; title: string }>;
}): RestoreSessionState {
  const items: RestoreItem[] = [];

  // Stage 1: Small metadata first so library becomes useful quickly
  if (summary.hasShelves) {
    items.push({
      id: 'meta_shelves',
      label: 'Shelves & Organization',
      category: 'metadata',
      status: 'pending',
      detail: 'Custom reading shelves and collections',
    });
  }

  // Stage 2: Positions
  if (summary.positionCount > 0) {
    items.push({
      id: 'meta_positions',
      label: 'Reading Positions',
      category: 'positions',
      status: 'pending',
      detail: `${summary.positionCount} book progress checkpoints`,
    });
  }

  // Stage 3: Learning & notes
  if (summary.savedWordCount > 0) {
    items.push({
      id: 'meta_vocabulary',
      label: 'Saved Words & SRS History',
      category: 'learning',
      status: 'pending',
      detail: `${summary.savedWordCount} vocabulary cards with mastery boxes`,
    });
  }

  if (summary.noteCount > 0) {
    items.push({
      id: 'meta_notes',
      label: 'Reader Notes & Highlights',
      category: 'learning',
      status: 'pending',
      detail: `${summary.noteCount} private annotations`,
    });
  }

  // Stage 4: Books
  if (summary.bookTitles && summary.bookTitles.length > 0) {
    for (const b of summary.bookTitles) {
      items.push({
        id: `book_${b.id}`,
        label: b.title,
        category: 'books',
        status: 'pending',
        detail: 'Catalog book manifest and cache verification',
      });
    }
  } else if (summary.bookCount > 0) {
    items.push({
      id: 'books_catalog',
      label: 'Saved Books & EPUB Manifests',
      category: 'books',
      status: 'pending',
      detail: `${summary.bookCount} books in cloud library`,
    });
  }

  return {
    stage: 'idle',
    totalCount: items.length,
    restoredCount: 0,
    failedCount: 0,
    items,
    startedAt: Date.now(),
    isPartialUsable: true,
  };
}

/**
 * Pure transition: updates one item in the restore plan and re-computes counters.
 */
export function updateRestoreItemStatus(
  state: RestoreSessionState,
  itemId: string,
  newStatus: RestoreItemStatus,
  errorMessage?: string,
): RestoreSessionState {
  const nextItems = state.items.map((item) => {
    if (item.id === itemId) {
      return {
        ...item,
        status: newStatus,
        errorMessage: newStatus === 'failed' ? errorMessage : undefined,
      };
    }
    return item;
  });

  const restoredCount = nextItems.filter((i) => i.status === 'restored').length;
  const failedCount = nextItems.filter((i) => i.status === 'failed').length;
  const pendingCount = nextItems.filter((i) => i.status === 'pending' || i.status === 'in_progress').length;

  let nextStage = state.stage;
  if (pendingCount === 0) {
    nextStage = failedCount > 0 && restoredCount === 0 ? 'failed' : 'completed';
  }

  return {
    ...state,
    items: nextItems,
    restoredCount,
    failedCount,
    stage: nextStage,
    completedAt: nextStage === 'completed' || nextStage === 'failed' ? Date.now() : undefined,
    // As soon as metadata is restored, partial restore is immediately usable
    isPartialUsable: restoredCount > 0 || state.isPartialUsable,
  };
}

/**
 * Pure transition: marks a single failed item for retry (FULLAPP §15.5 item 4).
 */
export function retrySingleRestoreItem(
  state: RestoreSessionState,
  itemId: string,
): RestoreSessionState {
  const nextItems = state.items.map((item) => {
    if (item.id === itemId) {
      return {
        ...item,
        status: 'pending' as RestoreItemStatus,
        errorMessage: undefined,
      };
    }
    return item;
  });

  const restoredCount = nextItems.filter((i) => i.status === 'restored').length;
  const failedCount = nextItems.filter((i) => i.status === 'failed').length;

  return {
    ...state,
    items: nextItems,
    restoredCount,
    failedCount,
    stage: 'restoring_metadata',
    completedAt: undefined,
  };
}
